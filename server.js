const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Parse command line arguments
const args = process.argv.slice(2);
let customPort;
let listenOnAllInterfaces = false;

// Process command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-p' || args[i] === '--port') {
    // Check if there's a value after the -p flag
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      customPort = parseInt(args[i + 1], 10);
      i++; // Skip the next argument since we've used it
    }
  } else if (args[i] === '--all-interfaces') {
    listenOnAllInterfaces = true;
  }
}

// Use the custom port if provided, otherwise use the environment variable or default
const port = customPort || process.env.PORT || 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware
// Configure body-parser with increased size limits and more permissive parsing
app.use(bodyParser.json({
  limit: '1gb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('JSON parse error:', e);
      // Don't reject immediately - let the route handler deal with it
    }
  },
  // Extremely permissive JSON parsing
  strict: false
}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '1gb'
}));

// Add a raw body parser for handling problematic JSON
app.use((req, res, next) => {
  // Only capture raw body if it hasn't been parsed by body-parser
  if ((req.method === 'POST' || req.method === 'PUT') && !req.body) {
    console.log('Capturing raw body for request');
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      console.log('Raw body captured, length:', data.length);
      next();
    });
  } else {
    // If body-parser has already parsed the body, just store it as rawBody too
    if (req.body && typeof req.body === 'object') {
      try {
        req.rawBody = JSON.stringify(req.body);
        console.log('Using parsed body as raw body');
      } catch (error) {
        console.error('Error stringifying parsed body:', error);
      }
    }
    next();
  }
});
app.use(express.static('public'));

// Create quizzes directory if it doesn't exist
const quizzesDir = path.join(__dirname, 'quizzes');
if (!fs.existsSync(quizzesDir)) {
  fs.mkdirSync(quizzesDir);
}

// Routes
// Get all quizzes
app.get('/api/quizzes', (req, res) => {
  fs.readdir(quizzesDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve quizzes' });
    }
    
    const quizzes = [];
    files.forEach(file => {
      if (path.extname(file) === '.json') {
        const quizData = fs.readFileSync(path.join(quizzesDir, file), 'utf8');
        try {
          const quiz = JSON.parse(quizData);
          quizzes.push(quiz);
        } catch (e) {
          console.error(`Error parsing quiz file ${file}:`, e);
        }
      }
    });
    
    res.json(quizzes);
  });
});

// Get a specific quiz
app.get('/api/quizzes/:id', (req, res) => {
  const quizId = req.params.id;
  const quizPath = path.join(quizzesDir, `${quizId}.json`);
  
  fs.readFile(quizPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    try {
      const quiz = JSON.parse(data);
      res.json(quiz);
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse quiz data' });
    }
  });
});

// Create a new quiz
app.post('/api/quizzes', (req, res) => {
  console.log('Create quiz endpoint called');
  let quiz;
  
  // Try to get the quiz data from the request body
  try {
    quiz = req.body;
    console.log('Request body parsed successfully');
  } catch (error) {
    // If there was an error parsing the JSON, try to parse the raw body
    console.error('Error parsing request body:', error);
    try {
      if (req.rawBody) {
        console.log('Attempting to parse raw body');
        quiz = JSON.parse(req.rawBody);
        console.log('Raw body parsed successfully');
      } else {
        console.error('No raw body available');
        return res.status(400).json({ error: 'Invalid quiz data format' });
      }
    } catch (e) {
      console.error('Error parsing raw body:', e);
      return res.status(400).json({ error: 'Could not parse quiz data' });
    }
  }
  
  // Validate that we have a quiz object
  if (!quiz || typeof quiz !== 'object') {
    console.error('Invalid quiz data:', quiz);
    return res.status(400).json({ error: 'Invalid quiz data' });
  }
  
  // Generate a unique ID if not provided
  if (!quiz.id) {
    quiz.id = Date.now().toString();
    console.log('Generated new quiz ID:', quiz.id);
  } else {
    console.log('Using existing quiz ID:', quiz.id);
  }
  
  const quizPath = path.join(quizzesDir, `${quiz.id}.json`);
  console.log('Quiz path:', quizPath);
  
  // Safely stringify the quiz object with error handling
  let quizData;
  try {
    quizData = JSON.stringify(quiz, null, 2);
    console.log('Quiz data stringified successfully');
  } catch (error) {
    console.error('Error stringifying quiz:', error);
    
    // Try a more aggressive approach for problematic strings
    try {
      console.log('Attempting fallback stringification');
      quizData = JSON.stringify(quiz, (key, value) => {
        if (typeof value === 'string' &&
            (value.includes('<') || value.includes('>') ||
             value.includes('`') || value.includes('\\') ||
             value.includes('script'))) {
          console.log('Found problematic string in key:', key);
          // Store problematic strings as they are - they'll be escaped when displayed
          return value;
        }
        return value;
      }, 2);
      console.log('Fallback stringification successful');
    } catch (e) {
      console.error('Fallback stringification failed:', e);
      console.error('Error stack:', e.stack);
      return res.status(500).json({ error: 'Failed to process quiz data' });
    }
  }
  
  fs.writeFile(quizPath, quizData, err => {
    if (err) {
      console.error('Error writing quiz file:', err);
      return res.status(500).json({ error: 'Failed to save quiz' });
    }
    
    console.log('Quiz file written successfully');
    res.status(201).json(quiz);
  });
});

// Update an existing quiz
app.put('/api/quizzes/:id', (req, res) => {
  console.log('Update quiz endpoint called');
  const quizId = req.params.id;
  console.log('Quiz ID from URL:', quizId);
  
  let quiz;
  
  // Try to get the quiz data from the request body
  try {
    quiz = req.body;
    console.log('Request body parsed successfully');
  } catch (error) {
    // If there was an error parsing the JSON, try to parse the raw body
    console.error('Error parsing request body:', error);
    try {
      if (req.rawBody) {
        console.log('Attempting to parse raw body');
        quiz = JSON.parse(req.rawBody);
        console.log('Raw body parsed successfully');
      } else {
        console.error('No raw body available');
        return res.status(400).json({ error: 'Invalid quiz data format' });
      }
    } catch (e) {
      console.error('Error parsing raw body:', e);
      return res.status(400).json({ error: 'Could not parse quiz data' });
    }
  }
  
  // Validate that we have a quiz object
  if (!quiz || typeof quiz !== 'object') {
    console.error('Invalid quiz data:', quiz);
    return res.status(400).json({ error: 'Invalid quiz data' });
  }
  
  // Validate that the ID in the URL matches the ID in the request body
  if (quiz.id !== quizId) {
    console.error('Quiz ID mismatch. URL ID:', quizId, 'Body ID:', quiz.id);
    return res.status(400).json({ error: 'Quiz ID in URL does not match ID in request body' });
  }
  
  const quizPath = path.join(quizzesDir, `${quizId}.json`);
  console.log('Quiz path:', quizPath);
  
  // Check if the quiz file exists
  try {
    if (!fs.existsSync(quizPath)) {
      console.error('Quiz file does not exist:', quizPath);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    console.log('Quiz file exists');
  } catch (error) {
    console.error('Error checking if quiz file exists:', error);
  }
  
  // Safely stringify the quiz object with error handling
  let quizData;
  try {
    quizData = JSON.stringify(quiz, null, 2);
    console.log('Quiz data stringified successfully');
  } catch (error) {
    console.error('Error stringifying quiz:', error);
    
    // Try a more aggressive approach for problematic strings
    try {
      console.log('Attempting fallback stringification');
      quizData = JSON.stringify(quiz, (key, value) => {
        if (typeof value === 'string' &&
            (value.includes('<') || value.includes('>') ||
             value.includes('`') || value.includes('\\') ||
             value.includes('script'))) {
          console.log('Found problematic string in key:', key);
          // Store problematic strings as they are - they'll be escaped when displayed
          return value;
        }
        return value;
      }, 2);
      console.log('Fallback stringification successful');
    } catch (e) {
      console.error('Fallback stringification failed:', e);
      console.error('Error stack:', e.stack);
      return res.status(500).json({ error: 'Failed to process quiz data' });
    }
  }
  
  console.log('Writing quiz file:', quizPath);
  fs.writeFile(quizPath, quizData, err => {
    if (err) {
      console.error('Error writing quiz file:', err);
      return res.status(500).json({ error: 'Failed to update quiz' });
    }
    
    console.log('Quiz file updated successfully');
    res.json(quiz);
  });
});

// Delete a quiz
app.delete('/api/quizzes/:id', (req, res) => {
  const quizId = req.params.id;
  const quizPath = path.join(quizzesDir, `${quizId}.json`);
  
  fs.unlink(quizPath, err => {
    if (err) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.status(204).send();
  });
});

// Import a quiz from a file
app.post('/api/import/file', upload.single('quizFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  fs.readFile(req.file.path, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read uploaded file' });
    }
    
    try {
      const quiz = JSON.parse(data);
      
      // Always generate a new ID for imported quizzes to prevent overwriting existing quizzes
      const originalId = quiz.id; // Store the original ID for reference if needed
      quiz.id = Date.now().toString();
      console.log(`Importing quiz: Original ID ${originalId || 'not provided'}, New ID: ${quiz.id}`);
      
      const quizPath = path.join(quizzesDir, `${quiz.id}.json`);
      
      // Safely stringify the quiz object with error handling
      let quizData;
      try {
        quizData = JSON.stringify(quiz, null, 2);
      } catch (error) {
        console.error('Error stringifying quiz:', error);
        return res.status(500).json({ error: 'Failed to process quiz data' });
      }
      
      fs.writeFile(quizPath, quizData, err => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save imported quiz' });
        }
        
        // Delete the uploaded file with error handling
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting uploaded file:', unlinkErr);
            // Continue with the response as the quiz was saved successfully
          }
        });
        
        res.status(201).json(quiz);
      });
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON format' });
    }
  });
});

// Import a quiz from JSON data
app.post('/api/import', (req, res) => {
  const quiz = req.body;
  
  // Validate quiz format
  if (!quiz || !quiz.title || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return res.status(400).json({ error: 'Invalid quiz format' });
  }
  
  // Always generate a new ID for imported quizzes to prevent overwriting existing quizzes
  const originalId = quiz.id; // Store the original ID for reference if needed
  quiz.id = Date.now().toString();
  console.log(`Importing quiz: Original ID ${originalId || 'not provided'}, New ID: ${quiz.id}`);
  
  const quizPath = path.join(quizzesDir, `${quiz.id}.json`);
  
  fs.writeFile(quizPath, JSON.stringify(quiz, null, 2), err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save imported quiz' });
    }
    
    res.status(201).json(quiz);
  });
});

// Start the server
// Special endpoint for handling complex strings
app.post('/api/quizzes/complex', (req, res) => {
  console.log('Complex endpoint called');
  try {
    // Get the quiz data from the request body
    console.log('Request body:', req.body);
    const encodedData = req.body.encodedData;
    if (!encodedData) {
      console.error('No encoded data provided');
      return res.status(400).json({ error: 'No encoded data provided' });
    }
    
    console.log('Encoded data length:', encodedData.length);
    
    // Decode the base64 data
    let quizString;
    try {
      quizString = Buffer.from(encodedData, 'base64').toString('utf8');
      console.log('Successfully decoded base64 data, length:', quizString.length);
    } catch (error) {
      console.error('Error decoding base64 data:', error);
      return res.status(400).json({ error: 'Invalid base64 data' });
    }
    
    // Parse the quiz data
    let quiz;
    try {
      quiz = JSON.parse(quizString);
      console.log('Successfully parsed quiz data');
    } catch (error) {
      console.error('Error parsing quiz data:', error);
      return res.status(400).json({ error: 'Invalid quiz data format' });
    }
    
    // Generate a unique ID if not provided
    if (!quiz.id) {
      quiz.id = Date.now().toString();
      console.log('Generated new quiz ID:', quiz.id);
    } else {
      console.log('Using existing quiz ID:', quiz.id);
    }
    
    const quizPath = path.join(quizzesDir, `${quiz.id}.json`);
    console.log('Quiz path:', quizPath);
    
    // Write the quiz data to a file
    fs.writeFile(quizPath, quizString, err => {
      if (err) {
        console.error('Error writing quiz file:', err);
        return res.status(500).json({ error: 'Failed to save quiz' });
      }
      
      console.log('Quiz file written successfully');
      
      // Return the full quiz object to match the standard endpoint
      res.status(201).json(quiz);
    });
  } catch (error) {
    console.error('Unexpected error in complex endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: `An unexpected error occurred: ${error.message}` });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error in request:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ error: 'An unexpected error occurred on the server' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  console.error('Error stack:', err.stack);
  // Keep the server running despite the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
  // Keep the server running despite the error
});

// Determine the hostname based on the listenOnAllInterfaces flag
const hostname = listenOnAllInterfaces ? '0.0.0.0' : 'localhost';

app.listen(port, hostname, () => {
  if (listenOnAllInterfaces) {
    console.log(`Quizmaster app listening on all interfaces at port ${port}`);
    console.log(`Access the application from other devices using http://YOUR_IP_ADDRESS:${port}`);
  } else {
    console.log(`Quizmaster app listening at http://localhost:${port}`);
  }
});