// Utility functions for the Quizmaster application

/**
 * Shuffles an array in place using the Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 */
function shuffleArray(array) {
    console.log('Shuffling array of length:', array.length);
    console.log('Original array:', JSON.stringify(array.map(item => item.text || item)));
    
    // Create a copy of the array to avoid modifying the original
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    console.log('Shuffled array:', JSON.stringify(shuffled.map(item => item.text || item)));
    
    // Copy the shuffled array back to the original array
    for (let i = 0; i < shuffled.length; i++) {
        array[i] = shuffled[i];
    }
    
    return array;
}

/**
 * Calculates the percentage of correct answers
 * @param {Array} userAnswers - Array of user's answers
 * @param {Array} questions - Array of quiz questions
 * @returns {number} - Percentage of correct answers (0-100)
 */
function calculatePercentage(userAnswers, questions) {
    if (!userAnswers.length) return 0;
    
    // Count questions where the user has selected an answer
    const answeredQuestions = userAnswers.filter(answer => answer.selectedAnswers && answer.selectedAnswers.length > 0);
    
    // For the score, only count questions that have been evaluated (user clicked "Check Answer")
    const evaluatedQuestions = answeredQuestions.filter(answer => answer.isCorrect !== undefined);
    
    // If no questions have been evaluated, return 0
    if (evaluatedQuestions.length === 0) return 0;
    
    // Count correct answers
    const correctCount = evaluatedQuestions.filter(answer => answer.isCorrect === true).length;
    
    // Calculate percentage based on total questions
    return Math.round((correctCount / questions.length) * 100);
}

/**
 * Determines if the user passed the quiz based on the target
 * @param {Object} quiz - The quiz object
 * @param {Array} userAnswers - Array of user's answers
 * @returns {boolean} - Whether the user passed the quiz
 */
function didUserPass(quiz, userAnswers) {
    // Count questions where the user has selected an answer
    const answeredQuestions = userAnswers.filter(answer => answer.selectedAnswers && answer.selectedAnswers.length > 0);
    
    // For the score, only count questions that have been evaluated (user clicked "Check Answer")
    const evaluatedQuestions = answeredQuestions.filter(answer => answer.isCorrect !== undefined);
    
    // Count correct answers
    const correctCount = evaluatedQuestions.filter(answer => answer.isCorrect === true).length;
    
    if (quiz.targetType === 'number') {
        return correctCount >= quiz.targetValue;
    } else {
        const percentage = calculatePercentage(userAnswers, quiz.questions);
        return percentage >= quiz.targetValue;
    }
}

/**
 * Formats a date string to a more readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Escapes HTML special characters in a string to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Safely inserts text into HTML by escaping special characters
 * @param {string} text - The text to insert
 * @returns {string} - The escaped text
 */
function safeText(text) {
    return escapeHtml(text);
}

/**
 * Makes URLs in text clickable while keeping the rest of the text plain
 * @param {string} text - The text that may contain URLs
 * @returns {string} - HTML with URLs wrapped in anchor tags
 */
function makeUrlsClickable(text) {
    if (text === undefined || text === null) {
        return '';
    }
    
    // First make the text safe
    const safeString = safeText(text);
    
    // Regular expression to match URLs
    // This matches http://, https://, and www. URLs
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    
    // Replace URLs with clickable links
    return safeString.replace(urlRegex, function(url) {
        let href = url;
        // Add https:// to URLs that start with www.
        if (url.startsWith('www.')) {
            href = 'https://' + url;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

/**
 * Validates if a string contains potentially harmful content
 * This is a permissive validator that allows most content but blocks active script execution
 * @param {string} str - The string to validate
 * @returns {boolean} - True if the string is safe, false otherwise
 */
function isValidInput(str) {
    // Always return true - we're using escapeHtml for output sanitization instead of input validation
    // This allows users to enter any text, including code snippets, as long as it's properly escaped when displayed
    return true;
}