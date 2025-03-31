// Global state
let currentView = 'home-view';
let quizzes = [];
let currentQuiz = null;
let currentQuizData = null;
let currentQuestionIndex = 0;
let userAnswers = [];
window.savedUserAnswers = []; // Store user answers when editing a quiz, make it globally accessible

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Quizmaster application...');
    
    // Load quizzes when the page loads
    loadQuizzes();
});

// DOM Elements
const views = {
    home: document.getElementById('home-view'),
    create: document.getElementById('create-view'),
    preview: document.getElementById('preview-view'),
    takeQuiz: document.getElementById('take-quiz-view'),
    results: document.getElementById('results-view')
};

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('change', function() {
    if (this.checked) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('darkMode', 'false');
    }
    console.log('Dark mode toggled:', this.checked);
});

// Check for saved theme preference
if (localStorage.getItem('darkMode') === 'true') {
    themeToggle.checked = true;
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
} else {
    themeToggle.checked = false;
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
}

// Navigation
function showView(viewId) {
    // Hide all views
    Object.values(views).forEach(view => {
        view.style.display = 'none';
    });
    
    // Show the requested view
    document.getElementById(viewId).style.display = 'block';
    currentView = viewId;
}

// Home view functionality
document.getElementById('create-quiz-btn').addEventListener('click', () => {
    resetQuizForm();
    showView('create-view');
});

document.getElementById('import-quiz-btn').addEventListener('click', () => {
    // Open the file dialog for the user to select a file
    document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const quiz = JSON.parse(event.target.result);
                importQuiz(quiz);
            } catch (error) {
                showModal('Error', 'Invalid JSON file. Please upload a valid quiz file.');
            }
        };
        reader.readAsText(file);
    }
});

// Back buttons
document.getElementById('back-to-home').addEventListener('click', () => {
    showView('home-view');
});

document.getElementById('back-to-edit').addEventListener('click', () => {
    showView('create-view');
});

document.getElementById('exit-quiz').addEventListener('click', () => {
    // Save the current user answers if we're in the take-quiz-view
    if (currentView === 'take-quiz-view') {
        // Save user answers with question text as key
        window.savedUserAnswers = [];
        userAnswers.forEach((answer, index) => {
            if (index < currentQuizData.questions.length) {
                const question = currentQuizData.questions[index];
                window.savedUserAnswers.push({
                    questionText: question.text,
                    selectedAnswers: answer.selectedAnswers,
                    isCorrect: answer.isCorrect
                });
            }
        });
        console.log('Saved user answers when exiting quiz:', window.savedUserAnswers);
    }
    showView('home-view');
});

document.getElementById('back-to-home-from-results').addEventListener('click', () => {
    showView('home-view');
});

// Quiz form functionality
const quizForm = document.getElementById('quiz-form');
const targetTypeRadios = document.querySelectorAll('input[name="target-type"]');
const saveButton = document.querySelector('button[type="submit"]');

// Add a direct click event listener to the save button
saveButton.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Save button clicked');
    
    try {
        // Check if the form exists
        if (!quizForm) {
            console.error('Quiz form not found');
            showModal('Error', 'Quiz form not found. Please refresh the page and try again.');
            return;
        }
        
        console.log('Validating form...');
        // Check if validateQuizForm exists
        if (typeof validateQuizForm !== 'function') {
            console.error('validateQuizForm is not a function');
            showModal('Error', 'Internal error: validateQuizForm is not a function');
            return;
        }
        
        if (validateQuizForm()) {
            console.log('Form validation passed');
            
            // Check if getQuizFromForm exists
            if (typeof getQuizFromForm !== 'function') {
                console.error('getQuizFromForm is not a function');
                showModal('Error', 'Internal error: getQuizFromForm is not a function');
                return;
            }
            
            const quiz = getQuizFromForm();
            console.log('Quiz data:', quiz);
            
            // Check if saveQuiz exists
            if (typeof saveQuiz !== 'function') {
                console.error('saveQuiz is not a function');
                showModal('Error', 'Internal error: saveQuiz is not a function');
                return;
            }
            
            // Call saveQuiz directly
            try {
                saveQuiz(quiz);
            } catch (saveError) {
                console.error('Error in saveQuiz:', saveError);
                showModal('Error', `Error saving quiz: ${saveError.message}`);
            }
        } else {
            console.log('Form validation failed');
        }
    } catch (error) {
        console.error('Error in save button click:', error);
        showModal('Error', `An unexpected error occurred: ${error.message}`);
    }
});
const targetNumberGroup = document.getElementById('target-number-group');
const targetPercentageGroup = document.getElementById('target-percentage-group');

targetTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'number') {
            targetNumberGroup.style.display = 'block';
            targetPercentageGroup.style.display = 'none';
        } else {
            targetNumberGroup.style.display = 'none';
            targetPercentageGroup.style.display = 'block';
        }
    });
});

document.getElementById('add-question-btn').addEventListener('click', () => {
    addQuestionToForm();
});

// Check if preview button exists before adding event listener
const previewQuizBtn = document.getElementById('preview-quiz-btn');
if (previewQuizBtn) {
    previewQuizBtn.addEventListener('click', () => {
        if (validateQuizForm()) {
            const quiz = getQuizFromForm();
            previewQuiz(quiz);
            showView('preview-view');
        }
    });
}

quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    try {
        if (validateQuizForm()) {
            console.log('Form validation passed');
            const quiz = getQuizFromForm();
            console.log('Quiz data:', quiz);
            saveQuiz(quiz);
        } else {
            console.log('Form validation failed');
        }
    } catch (error) {
        console.error('Error in form submission:', error);
        showModal('Error', 'An unexpected error occurred. Please try again.');
    }
});

// Quiz taking functionality
// Event listener for prev-question is now in quiz.js

// Event listener for next-question is now in quiz.js

// Event listener for submit-quiz is now in quiz.js

// Event listener for retake-quiz is now in quiz.js

// Review answers button has been removed

// Modal functionality
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const closeModal = document.querySelector('.close');

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Helper functions
function showModal(title, content) {
    modalContent.innerHTML = `
        <h3>${safeText(title)}</h3>
        <div>${safeText(content)}</div>
    `;
    modal.style.display = 'block';
}

function resetQuizForm() {
    quizForm.reset();
    document.getElementById('questions-container').innerHTML = '';
    addQuestionToForm(); // Add one question by default
    targetNumberGroup.style.display = 'block';
    targetPercentageGroup.style.display = 'none';
}

function addQuestionToForm(question = null) {
    const questionsContainer = document.getElementById('questions-container');
    const questionId = Date.now();
    
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';
    questionCard.dataset.id = questionId;
    
    questionCard.innerHTML = `
        <div class="question-header">
            <h4>Question ${questionsContainer.children.length + 1}</h4>
            <select class="question-type-select">
                <option value="multiple-choice" ${question && question.type === 'multiple-choice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="true-false" ${question && question.type === 'true-false' ? 'selected' : ''}>True/False</option>
            </select>
            <button type="button" class="btn text remove-question"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-group">
            <label>Question Text</label>
            <textarea class="question-text" rows="2" required>${question ? safeText(question.text) : ''}</textarea>
        </div>
        <div class="form-group">
            <label>Question Image (Optional)</label>
            <div class="image-upload-container">
                <input type="file" class="question-image-input" accept="image/*">
                <button type="button" class="btn text remove-image" style="display: none;"><i class="fas fa-times"></i> Remove Image</button>
                <div class="image-preview" style="display: none;">
                    ${question && question.imageData ? `<img src="${question.imageData}" alt="Question Image">` : ''}
                </div>
            </div>
        </div>
        <div class="answers-container">
            ${question && question.type === 'true-false' ?
                `<div class="answer-option">
                    <input type="checkbox" name="correct-tf-${safeText(questionId.toString())}" value="0" ${(question.correctAnswer === 0 || (question.correctAnswers && question.correctAnswers.includes(0))) ? 'checked' : ''}>
                    <div class="answer-text">
                        <input type="text" value="True" readonly>
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference" value="${question.answers[0].reference ? safeText(question.answers[0].reference) : ''}">
                        </div>
                    </div>
                </div>
                <div class="answer-option">
                    <input type="checkbox" name="correct-tf-${safeText(questionId.toString())}" value="1" ${(question.correctAnswer === 1 || (question.correctAnswers && question.correctAnswers.includes(1))) ? 'checked' : ''}>
                    <div class="answer-text">
                        <input type="text" value="False" readonly>
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference" value="${question.answers[1].reference ? safeText(question.answers[1].reference) : ''}">
                        </div>
                    </div>
                </div>` :
                `<div class="answer-option">
                    <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="0" ${question && ((question.correctAnswers && question.correctAnswers.includes(0)) || question.correctAnswer === 0) ? 'checked' : ''}>
                    <div class="answer-text">
                        <input type="text" placeholder="Answer option" value="${question ? safeText(question.answers[0].text) : 'Option 1'}">
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference" value="${question && question.answers[0].reference ? safeText(question.answers[0].reference) : ''}">
                        </div>
                    </div>
                    <button type="button" class="btn text remove-answer"><i class="fas fa-times"></i></button>
                </div>
                <div class="answer-option">
                    <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="1" ${question && ((question.correctAnswers && question.correctAnswers.includes(1)) || question.correctAnswer === 1) ? 'checked' : ''}>
                    <div class="answer-text">
                        <input type="text" placeholder="Answer option" value="${question && question.answers.length > 1 ? safeText(question.answers[1].text) : 'Option 2'}">
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference" value="${question && question.answers.length > 1 && question.answers[1].reference ? safeText(question.answers[1].reference) : ''}">
                        </div>
                    </div>
                    <button type="button" class="btn text remove-answer"><i class="fas fa-times"></i></button>
                </div>`
            }
        </div>
        ${question && question.type !== 'true-false' ? 
            `<button type="button" class="btn text add-answer-btn"><i class="fas fa-plus"></i> Add Answer</button>` : ''}
    `;
    
    questionsContainer.appendChild(questionCard);
    
    // Add more answers if provided in the question object
    if (question && question.type !== 'true-false' && question.answers.length > 2) {
        const answersContainer = questionCard.querySelector('.answers-container');
        for (let i = 2; i < question.answers.length; i++) {
            const answerOption = document.createElement('div');
            answerOption.className = 'answer-option';
            answerOption.innerHTML = `
                <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="${i}" ${(question.correctAnswer === i || (question.correctAnswers && question.correctAnswers.includes(i))) ? 'checked' : ''}>
                <div class="answer-text">
                    <input type="text" placeholder="Answer option" value="${safeText(question.answers[i].text)}">
                    <div class="form-group">
                        <label>Reference (Optional)</label>
                        <input type="text" class="answer-reference" value="${question.answers[i].reference ? safeText(question.answers[i].reference) : ''}">
                    </div>
                </div>
                <button type="button" class="btn text remove-answer"><i class="fas fa-times"></i></button>
            `;
            answersContainer.appendChild(answerOption);
        }
    }
    
    // Event listeners for the question card
    const typeSelect = questionCard.querySelector('.question-type-select');
    typeSelect.addEventListener('change', () => {
        const answersContainer = questionCard.querySelector('.answers-container');
        const addAnswerBtn = questionCard.querySelector('.add-answer-btn');
        
        if (typeSelect.value === 'true-false') {
            answersContainer.innerHTML = `
                <div class="answer-option">
                    <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="0" checked>
                    <div class="answer-text">
                        <input type="text" value="True" readonly>
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference">
                        </div>
                    </div>
                </div>
                <div class="answer-option">
                    <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="1">
                    <div class="answer-text">
                        <input type="text" value="False" readonly>
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference">
                        </div>
                    </div>
                </div>
            `;
            
            // Remove add answer button if it exists
            if (addAnswerBtn) {
                addAnswerBtn.remove();
            }
        } else {
            answersContainer.innerHTML = `
                <div class="answer-option">
                    <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="0" checked>
                    <div class="answer-text">
                        <input type="text" placeholder="Answer option" value="Option 1">
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference">
                        </div>
                    </div>
                    <button type="button" class="btn text remove-answer"><i class="fas fa-times"></i></button>
                </div>
                <div class="answer-option">
                    <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="1">
                    <div class="answer-text">
                        <input type="text" placeholder="Answer option" value="Option 2">
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" class="answer-reference">
                        </div>
                    </div>
                    <button type="button" class="btn text remove-answer"><i class="fas fa-times"></i></button>
                </div>
            `;
            
            // Add the "Add Answer" button if it doesn't exist
            if (!addAnswerBtn) {
                const addBtn = document.createElement('button');
                addBtn.type = 'button';
                addBtn.className = 'btn text add-answer-btn';
                addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Answer';
                addBtn.addEventListener('click', function() {
                    addAnswerOption(this.parentElement);
                });
                questionCard.appendChild(addBtn);
            }
        }
    });
    
    // Add answer button for multiple choice questions
    if (question && question.type !== 'true-false' || (!question && typeSelect.value !== 'true-false')) {
        // Check if the button already exists
        let addAnswerBtn = questionCard.querySelector('.add-answer-btn');
        
        // If it doesn't exist, create and append it
        if (!addAnswerBtn) {
            addAnswerBtn = document.createElement('button');
            addAnswerBtn.type = 'button';
            addAnswerBtn.className = 'btn text add-answer-btn';
            addAnswerBtn.innerHTML = '<i class="fas fa-plus"></i> Add Answer';
            questionCard.appendChild(addAnswerBtn);
        }
        
        // Add event listener
        addAnswerBtn.addEventListener('click', function() {
            addAnswerOption(this.parentElement);
        });
    }
    
    // Remove question button
    const removeQuestionBtn = questionCard.querySelector('.remove-question');
    removeQuestionBtn.addEventListener('click', function() {
        if (document.querySelectorAll('.question-card').length > 1) {
            this.closest('.question-card').remove();
            // Update question numbers
            document.querySelectorAll('.question-card').forEach((card, index) => {
                card.querySelector('h4').textContent = `Question ${index + 1}`;
            });
        } else {
            showModal('Error', 'You must have at least one question.');
        }
    });
    
    // Image upload handling
    const imageInput = questionCard.querySelector('.question-image-input');
    const imagePreview = questionCard.querySelector('.image-preview');
    const removeImageBtn = questionCard.querySelector('.remove-image');
    
    // If the question already has an image, show it
    if (question && question.imageData) {
        imagePreview.style.display = 'block';
        removeImageBtn.style.display = 'inline-block';
    }
    
    // Handle image upload
    imageInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showModal('Error', 'Image size must be less than 5MB.');
                this.value = ''; // Clear the input
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Create image element to check dimensions
                const img = new Image();
                img.onload = function() {
                    // Limit dimensions to reasonable size (max 800px width/height)
                    const maxDimension = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round(height * (maxDimension / width));
                            width = maxDimension;
                        } else {
                            width = Math.round(width * (maxDimension / height));
                            height = maxDimension;
                        }
                    }
                    
                    // Create canvas to resize image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw resized image to canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Get base64 data URL
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    
                    // Update preview
                    imagePreview.innerHTML = `<img src="${dataUrl}" alt="Question Image">`;
                    imagePreview.style.display = 'block';
                    removeImageBtn.style.display = 'inline-block';
                    
                    // Store the data URL in a data attribute for later retrieval
                    imagePreview.dataset.imageData = dataUrl;
                };
                
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // Handle image removal
    removeImageBtn.addEventListener('click', function() {
        imageInput.value = ''; // Clear the input
        imagePreview.innerHTML = ''; // Clear the preview
        imagePreview.style.display = 'none';
        removeImageBtn.style.display = 'none';
        delete imagePreview.dataset.imageData; // Remove stored data
    });
    
    // Remove answer buttons
    questionCard.querySelectorAll('.remove-answer').forEach(btn => {
        btn.addEventListener('click', function() {
            const answersContainer = this.closest('.answers-container');
            if (answersContainer.querySelectorAll('.answer-option').length > 2) {
                this.closest('.answer-option').remove();
                // Update input values for all answer options to ensure they have sequential indices
                answersContainer.querySelectorAll('.answer-option').forEach((option, index) => {
                    // Update checkbox/radio value
                    const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
                    if (input) {
                        input.value = index;
                    }
                    
                    // Update the placeholder text to match the new index
                    const textInput = option.querySelector('.answer-text input[type="text"]');
                    if (textInput && textInput.value.startsWith('Option ')) {
                        textInput.value = `Option ${index + 1}`;
                    }
                });
            } else {
                showModal('Error', 'You must have at least two answer options.');
            }
        });
    });
}

function addAnswerOption(questionCard) {
    const answersContainer = questionCard.querySelector('.answers-container');
    const answerOptions = answersContainer.querySelectorAll('.answer-option');
    const questionId = questionCard.dataset.id;
    
    const newAnswerOption = document.createElement('div');
    newAnswerOption.className = 'answer-option';
    
    // Calculate the new index for this answer option
    const newIndex = answerOptions.length;
    
    newAnswerOption.innerHTML = `
        <input type="checkbox" name="correct-${safeText(questionId.toString())}" value="${newIndex}">
        <div class="answer-text">
            <input type="text" placeholder="Answer option" value="Option ${newIndex + 1}">
            <div class="form-group">
                <label>Reference (Optional)</label>
                <input type="text" class="answer-reference">
            </div>
        </div>
        <button type="button" class="btn text remove-answer"><i class="fas fa-times"></i></button>
    `;
    
    answersContainer.appendChild(newAnswerOption);
    
    // Add event listener to the remove button
    const removeBtn = newAnswerOption.querySelector('.remove-answer');
    removeBtn.addEventListener('click', function() {
        if (answersContainer.querySelectorAll('.answer-option').length > 2) {
            this.closest('.answer-option').remove();
            
            // Update input values for all answer options to ensure they have sequential indices
            answersContainer.querySelectorAll('.answer-option').forEach((option, index) => {
                // Update checkbox/radio value
                const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
                if (input) {
                    input.value = index;
                }
                
                // Update the placeholder text to match the new index
                const textInput = option.querySelector('.answer-text input[type="text"]');
                if (textInput && textInput.value.startsWith('Option ')) {
                    textInput.value = `Option ${index + 1}`;
                }
            });
        } else {
            showModal('Error', 'You must have at least two answer options.');
        }
    });
}

function validateQuizForm() {
    const title = document.getElementById('quiz-title').value.trim();
    if (!title) {
        showModal('Error', 'Please enter a quiz title.');
        return false;
    }
    
    try {
        // Check if there are any question cards
        const questionCards = document.querySelectorAll('.question-card');
        console.log(`Found ${questionCards.length} question cards`);
        
        // Log all question cards for debugging
        questionCards.forEach((card, index) => {
            console.log(`Question card ${index + 1} ID: ${card.dataset.id}`);
            console.log(`Question card ${index + 1} HTML:`, card.innerHTML.substring(0, 100) + '...');
        });
        
        if (questionCards.length === 0) {
            showModal('Error', 'No questions found. Please add at least one question.');
            return false;
        }
        
        // Create a copy of the NodeList to avoid any potential issues with live collections
        const questionCardsArray = Array.from(questionCards);
        console.log(`Created array with ${questionCardsArray.length} question cards for validation`);
        
        // Double-check the array length to make sure it's accurate
        if (questionCardsArray.length !== questionCards.length) {
            console.error(`Array length (${questionCardsArray.length}) doesn't match NodeList length (${questionCards.length})`);
        }
        
        // Log each question card for debugging
        questionCardsArray.forEach((card, idx) => {
            console.log(`Question card ${idx + 1} exists: ${!!card}`);
        });
        
        // Validate each question card
        for (let i = 0; i < questionCardsArray.length; i++) {
            try {
                console.log(`Validating question ${i + 1} of ${questionCardsArray.length}`);
                
                // Check if we're trying to validate a question that doesn't exist
                if (i >= questionCardsArray.length) {
                    console.error(`Attempting to validate question ${i + 1} but only ${questionCardsArray.length} questions exist`);
                    showModal('Error', `Internal error: Attempting to validate question ${i + 1} but only ${questionCardsArray.length} questions exist`);
                    return false;
                }
                
                // Check if the question card at this index is valid
                if (!questionCardsArray[i]) {
                    console.error(`Question card at index ${i} is null or undefined`);
                    showModal('Error', `Internal error: Question ${i + 1} is missing. Please refresh the page and try again.`);
                    return false;
                }
                
                // Check if question text element exists
                const questionTextElement = questionCardsArray[i].querySelector('.question-text');
                if (!questionTextElement) {
                    console.error(`Question text element not found for question ${i + 1}`);
                    showModal('Error', `Question ${i + 1} is missing the text field. Please refresh the page and try again.`);
                    return false;
                }
                
                const questionText = questionTextElement.value.trim();
                if (!questionText) {
                    showModal('Error', `Please enter text for Question ${i + 1}.`);
                    return false;
                }
                
                // Get all text inputs in answer-text divs
                const allInputs = questionCardsArray[i].querySelectorAll('.answer-text input[type="text"]');
                
                // Filter out the reference inputs and readonly inputs
                const answerInputs = Array.from(allInputs).filter(input => {
                    // Exclude inputs with class answer-reference and readonly inputs
                    return !input.classList.contains('answer-reference') && !input.readOnly;
                });
                
                // Validate that answer inputs have text - but be very permissive
                for (let j = 0; j < answerInputs.length; j++) {
                    // If the input is completely empty, add a default value
                    if (answerInputs[j].value.trim() === '') {
                        answerInputs[j].value = `Option ${j + 1}`;
                    }
                }
                
                // Check if question type element exists
                const questionTypeElement = questionCardsArray[i].querySelector('.question-type-select');
                if (!questionTypeElement) {
                    console.error(`Question type element not found for question ${i + 1}`);
                    showModal('Error', `Question ${i + 1} is missing the type selector. Please refresh the page and try again.`);
                    return false;
                }
                
                const questionType = questionTypeElement.value;
                let correctAnswerSelected;
                
                // Use checkboxes for all question types
                correctAnswerSelected = questionCardsArray[i].querySelector('input[type="checkbox"]:checked');
                
                if (!correctAnswerSelected) {
                    showModal('Error', `Please select a correct answer for Question ${i + 1}.`);
                    return false;
                }
            } catch (error) {
                console.error(`Error validating question ${i + 1}:`, error);
                showModal('Error', `An error occurred while validating Question ${i + 1}. Please refresh the page and try again.`);
                return false;
            }
        }
    } catch (error) {
        console.error('Unexpected error in validateQuizForm:', error);
        showModal('Error', 'An unexpected error occurred while validating the form. Please refresh the page and try again.');
        return false;
    }
    
    return true;
}

function getQuizFromForm() {
    try {
        const id = currentQuiz ? currentQuiz.id : Date.now().toString();
        
        // Get title with error handling
        let title = '';
        try {
            const titleElement = document.getElementById('quiz-title');
            if (titleElement) {
                title = titleElement.value.trim();
            } else {
                console.error('Quiz title element not found');
            }
        } catch (error) {
            console.error('Error getting quiz title:', error);
        }
        
        // Get description with error handling
        let description = '';
        try {
            const descriptionElement = document.getElementById('quiz-description');
            if (descriptionElement) {
                description = descriptionElement.value.trim();
            } else {
                console.error('Quiz description element not found');
            }
        } catch (error) {
            console.error('Error getting quiz description:', error);
        }
        
        // Get target type with error handling
        let targetType = 'number'; // Default
        try {
            const targetTypeElement = document.querySelector('input[name="target-type"]:checked');
            if (targetTypeElement) {
                targetType = targetTypeElement.value;
            } else {
                console.error('Target type element not found');
            }
        } catch (error) {
            console.error('Error getting target type:', error);
        }
        
        // Get target values with error handling
        let targetNumber = 1; // Default
        let targetPercentage = 70; // Default
        try {
            const targetNumberElement = document.getElementById('target-number');
            if (targetNumberElement) {
                targetNumber = parseInt(targetNumberElement.value) || 1;
            } else {
                console.error('Target number element not found');
            }
            
            const targetPercentageElement = document.getElementById('target-percentage');
            if (targetPercentageElement) {
                targetPercentage = parseInt(targetPercentageElement.value) || 70;
            } else {
                console.error('Target percentage element not found');
            }
        } catch (error) {
            console.error('Error getting target values:', error);
        }
        
        const questions = [];
        
        // Check if there are any question cards
        const questionCards = document.querySelectorAll('.question-card');
        console.log(`Found ${questionCards.length} question cards for form submission`);
        
        if (questionCards.length === 0) {
            console.warn('No questions found in the form');
        }
        
        // Create a copy of the NodeList to avoid any potential issues with live collections
        const questionCardsArray = Array.from(questionCards);
        console.log(`Created array with ${questionCardsArray.length} question cards`);
        
        // Log all question cards for debugging
        questionCardsArray.forEach((card, index) => {
            console.log(`Question card ${index + 1} ID: ${card.dataset.id}`);
            console.log(`Question card ${index + 1} HTML:`, card.innerHTML.substring(0, 100) + '...');
        });
        
        // Process each question card
        for (let index = 0; index < questionCardsArray.length; index++) {
            const card = questionCardsArray[index];
            try {
                console.log(`Processing question ${index + 1} of ${questionCardsArray.length} for form submission`);
                
                // Check if the card is valid
                if (!card) {
                    console.error(`Question card at index ${index} is null or undefined`);
                    throw new Error(`Question ${index + 1} is missing`);
                }
                
                // Check if question text element exists
                const questionTextElement = card.querySelector('.question-text');
                if (!questionTextElement) {
                    console.error(`Question text element not found for question ${index + 1}`);
                    throw new Error(`Question ${index + 1} is missing the text field`);
                }
                
                const questionText = questionTextElement.value.trim();
                console.log(`Question ${index + 1} text: "${questionText.substring(0, 30)}${questionText.length > 30 ? '...' : ''}"`);
                
                // Get image data if available
                const imagePreview = card.querySelector('.image-preview');
                let imageData = null;
                if (imagePreview && imagePreview.dataset.imageData) {
                    imageData = imagePreview.dataset.imageData;
                    console.log(`Question ${index + 1} has an image`);
                } else if (imagePreview && imagePreview.querySelector('img')) {
                    // If there's an existing image from a loaded quiz
                    imageData = imagePreview.querySelector('img').src;
                    console.log(`Question ${index + 1} has an existing image`);
                }
                
                // Check if question type element exists
                const questionTypeElement = card.querySelector('.question-type-select');
                if (!questionTypeElement) {
                    console.error(`Question type element not found for question ${index + 1}`);
                    throw new Error(`Question ${index + 1} is missing the type selector`);
                }
                
                const questionType = questionTypeElement.value;
                console.log(`Question ${index + 1} type: ${questionType}`);
                
                // Handle different question types
                let correctAnswers = [];
                
                // Use checkboxes for all question types
                const checkedBoxes = card.querySelectorAll('input[type="checkbox"]:checked');
                console.log(`Question ${index + 1} has ${checkedBoxes.length} checked answers`);
                
                checkedBoxes.forEach(checkbox => {
                    correctAnswers.push(parseInt(checkbox.value));
                });
                
                const answers = [];
                const answerOptions = card.querySelectorAll('.answer-option');
                
                for (let optionIndex = 0; optionIndex < answerOptions.length; optionIndex++) {
                    const option = answerOptions[optionIndex];
                    try {
                        // Check if answer text element exists
                        const answerTextElement = option.querySelector('.answer-text input[type="text"]');
                        if (!answerTextElement) {
                            console.error(`Answer text element not found for question ${index + 1}, option ${optionIndex + 1}`);
                            throw new Error(`Question ${index + 1}, option ${optionIndex + 1} is missing the text field`);
                        }
                        
                        // Get the raw value without trimming to preserve all characters
                        const answerText = answerTextElement.value;
                        
                        // Check if reference element exists
                        const referenceElement = option.querySelector('.answer-reference');
                        const reference = referenceElement ? referenceElement.value : '';
                        
                        // If the answer is empty, provide a default
                        const finalAnswerText = answerText.trim() === '' ? `Option ${answers.length + 1}` : answerText;
                        
                        answers.push({
                            text: finalAnswerText,
                            reference: reference
                        });
                    } catch (error) {
                        console.error(`Error processing answer option ${optionIndex + 1} for question ${index + 1}:`, error);
                        // Use a default answer if there's an error
                        answers.push({
                            text: `Option ${answers.length + 1}`,
                            reference: ''
                        });
                    }
                }
                
                // Ensure we have at least one correct answer for true/false questions
                if (questionType === 'true-false' && correctAnswers.length === 0) {
                    correctAnswers.push(0); // Default to "True" if nothing selected
                }
                
                questions.push({
                    text: questionText,
                    type: questionType,
                    answers: answers,
                    correctAnswers: correctAnswers,
                    // Keep correctAnswer for backward compatibility
                    correctAnswer: correctAnswers.length > 0 ? correctAnswers[0] : 0,
                    // Include image data if available
                    imageData: imageData
                });
            } catch (error) {
                console.error(`Error processing question ${index + 1}:`, error);
                // Add a default question if there's an error
                questions.push({
                    text: `Question ${index + 1}`,
                    type: 'multiple-choice',
                    answers: [
                        { text: 'Option 1', reference: '' },
                        { text: 'Option 2', reference: '' }
                    ],
                    correctAnswers: [0],
                    correctAnswer: 0,
                    imageData: null
                });
            }
        }
    
    return {
        id,
        title,
        description,
        targetType,
        targetValue: targetType === 'number' ? targetNumber : targetPercentage,
        questions,
        createdAt: currentQuiz ? currentQuiz.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    } catch (error) {
        console.error('Unexpected error in getQuizFromForm:', error);
        showModal('Error', `An unexpected error occurred: ${error.message}`);
        
        // Return a minimal valid quiz object
        return {
            id: currentQuiz ? currentQuiz.id : Date.now().toString(),
            title: 'Error Occurred',
            description: 'An error occurred while creating the quiz.',
            targetType: 'number',
            targetValue: 1,
            questions: [
                {
                    text: 'Default Question',
                    type: 'multiple-choice',
                    answers: [
                        { text: 'Option 1', reference: '' },
                        { text: 'Option 2', reference: '' }
                    ],
                    correctAnswers: [0],
                    correctAnswer: 0
                }
            ],
            createdAt: currentQuiz ? currentQuiz.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
}

function previewQuiz(quiz) {
    const previewContent = document.getElementById('preview-content');
    
    let questionsHtml = '';
    quiz.questions.forEach((question, index) => {
        let answersHtml = '';
        question.answers.forEach((answer, ansIndex) => {
            answersHtml += `
                <div class="answer-option preview">
                    <input type="checkbox" name="preview-q${index}" ${question.correctAnswers ? question.correctAnswers.includes(ansIndex) : ansIndex === question.correctAnswer ? 'checked' : ''} disabled>
                    <div class="answer-text">
                        <span>${makeUrlsClickable(answer.text)}</span>
                        ${answer.reference ? `<div class="answer-reference">Reference: ${makeUrlsClickable(answer.reference)}</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        questionsHtml += `
            <div class="question-card preview">
                <h4>Question ${index + 1}</h4>
                <p>${safeText(question.text)}</p>
                ${question.imageData ? `
                <div class="image-preview" style="display: block; margin: 10px 0;">
                    <img src="${question.imageData}" alt="Question Image">
                </div>
                ` : ''}
                <div class="answers-container">
                    ${answersHtml}
                </div>
            </div>
        `;
    });
    
    previewContent.innerHTML = `
        <div class="quiz-preview-header">
            <h3>${safeText(quiz.title)}</h3>
            ${quiz.description ? `<p>${safeText(quiz.description)}</p>` : ''}
        </div>
        <div class="quiz-preview-target">
            <p><strong>Target:</strong> ${quiz.targetType === 'number' ?
                `${safeText(quiz.targetValue.toString())} correct questions` :
                `${safeText(quiz.targetValue.toString())}% correct answers`}
            </p>
        </div>
        <div class="quiz-preview-questions">
            ${questionsHtml}
        </div>
    `;
}

function saveQuiz(quiz) {
    try {
        console.log('saveQuiz function called');
        
        // Check if quiz is valid
        if (!quiz) {
            console.error('Quiz is null or undefined');
            showModal('Error', 'Quiz data is missing');
            return;
        }
        
        // For updating a quiz, we need to include the ID in the URL
        const url = currentQuiz ? `/api/quizzes/${quiz.id}` : '/api/quizzes';
        
        // Log the quiz data for debugging
        try {
            console.log('Saving quiz:', JSON.stringify(quiz, null, 2));
        } catch (error) {
            console.error('Error stringifying quiz for logging:', error);
        }
        console.log('Current quiz:', currentQuiz);
        console.log('URL:', url);
    
        // Validate quiz data before sending
        if (!quiz.questions || quiz.questions.length === 0) {
            showModal('Error', 'Quiz must have at least one question');
            return;
        }
        
        // Check each question has answers
        for (let i = 0; i < quiz.questions.length; i++) {
            const question = quiz.questions[i];
            if (!question.answers || question.answers.length === 0) {
                showModal('Error', `Question ${i+1} has no answers`);
                return;
            }
            if (!question.correctAnswers || question.correctAnswers.length === 0) {
                showModal('Error', `Question ${i+1} has no correct answers selected`);
                return;
            }
        }
        
        // Check if any answer contains complex strings that might cause issues
        const hasComplexStrings = quiz.questions.some(question =>
            question.answers.some(answer => {
                const text = answer.text || '';
                return text.includes('<') || text.includes('>') ||
                       text.includes('`') || text.includes('\\') ||
                       text.includes('script') || text.includes('onerror') ||
                       text.includes('alert') || text.length > 100;
            })
        );
        
        if (hasComplexStrings) {
            console.log('Quiz contains complex strings, using special endpoint');
            
            // Use the special endpoint for complex strings
            try {
                // Convert the quiz to a string and encode it as base64
                const quizString = JSON.stringify(quiz);
                const encodedData = btoa(unescape(encodeURIComponent(quizString)));
                
                // Send the encoded data to the special endpoint
                console.log('Sending data to complex endpoint');
                
                // Create an AbortController to handle timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                fetch('/api/quizzes/complex', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ encodedData }),
                    signal: controller.signal
                })
                .catch(error => {
                    if (error.name === 'AbortError') {
                        console.error('Request timed out');
                        throw new Error('Request timed out. The server took too long to respond.');
                    }
                    throw error;
                })
                .finally(() => {
                    clearTimeout(timeoutId);
                })
                .then(response => {
                    console.log('Complex endpoint response received:', response.status, response.statusText);
                    if (!response.ok) {
                        console.error('Complex endpoint response not OK:', response.status, response.statusText);
                        return response.json().then(errorData => {
                            console.error('Complex endpoint error data:', errorData);
                            throw new Error(errorData.error || 'Failed to save quiz');
                        }).catch(jsonError => {
                            console.error('Error parsing complex endpoint error response:', jsonError);
                            throw new Error(`Failed to save quiz: ${response.status} ${response.statusText}`);
                        });
                    }
                    console.log('Complex endpoint response OK, parsing JSON');
                    return response.json().catch(jsonError => {
                        console.error('Error parsing complex endpoint success response:', jsonError);
                        throw new Error('Failed to parse server response');
                    });
                })
                .then(savedQuiz => {
                    if (!currentQuiz) {
                        quizzes.push(savedQuiz);
                    } else {
                        const index = quizzes.findIndex(q => q.id === savedQuiz.id);
                        if (index !== -1) {
                            quizzes[index] = savedQuiz;
                        }
                    }
                    
                    showModal('Success', 'Quiz saved successfully!');
                    currentQuiz = null;
                    loadQuizzes();
                    showView('home-view');
                })
                .catch(error => {
                    console.error('Error saving quiz:', error);
                    console.error('Error stack:', error.stack);
                    showModal('Error', error.message || 'Failed to save quiz. Please try again.');
                });
            } catch (error) {
                console.error('Error preparing quiz data:', error);
                showModal('Error', 'Failed to prepare quiz data. Please try again.');
            }
        } else {
            // Use the standard endpoint for normal strings
            // Prepare the quiz data for sending
            let quizData;
            try {
                quizData = JSON.stringify(quiz);
            } catch (error) {
                console.error('Error stringifying quiz data:', error);
                showModal('Error', 'Failed to prepare quiz data. Please try again.');
                return;
            }
            
            console.log('Sending data to standard endpoint');
            
            // Create an AbortController to handle timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            fetch(url, {
                method: currentQuiz ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: quizData,
                signal: controller.signal
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    console.error('Request timed out');
                    throw new Error('Request timed out. The server took too long to respond.');
                }
                throw error;
            })
            .finally(() => {
                clearTimeout(timeoutId);
            })
            .then(response => {
                console.log('Response received:', response.status, response.statusText);
                if (!response.ok) {
                    console.error('Response not OK:', response.status, response.statusText);
                    return response.json().then(errorData => {
                        console.error('Error data:', errorData);
                        throw new Error(errorData.error || 'Failed to save quiz');
                    }).catch(jsonError => {
                        console.error('Error parsing error response:', jsonError);
                        throw new Error(`Failed to save quiz: ${response.status} ${response.statusText}`);
                    });
                }
                console.log('Response OK, parsing JSON');
                return response.json().catch(jsonError => {
                    console.error('Error parsing success response:', jsonError);
                    throw new Error('Failed to parse server response');
                });
            })
            .then(savedQuiz => {
                if (!currentQuiz) {
                    quizzes.push(savedQuiz);
                } else {
                    const index = quizzes.findIndex(q => q.id === savedQuiz.id);
                    if (index !== -1) {
                        quizzes[index] = savedQuiz;
                    }
                }
                
                showModal('Success', 'Quiz saved successfully!');
                currentQuiz = null;
                loadQuizzes();
                showView('home-view');
            })
            .catch(error => {
                console.error('Error saving quiz:', error);
                console.error('Error stack:', error.stack);
                showModal('Error', error.message || 'Failed to save quiz. Please try again.');
            });
        }
    } catch (error) {
        console.error('Unexpected error in saveQuiz:', error);
        showModal('Error', 'An unexpected error occurred while saving the quiz. Please try again.');
    }
}

function loadQuizzes() {
    fetch('/api/quizzes')
    .then(response => response.json())
    .then(data => {
        quizzes = data;
        renderQuizList();
    })
    .catch(error => {
        console.error('Error loading quizzes:', error);
    });
}

function renderQuizList() {
    const quizList = document.getElementById('quiz-list');
    
    if (quizzes.length === 0) {
        quizList.innerHTML = '<p>No quizzes available. Create a new quiz to get started!</p>';
        return;
    }
    
    quizList.innerHTML = '';
    
    quizzes.forEach(quiz => {
        const quizItem = document.createElement('div');
        quizItem.className = 'quiz-item';
        
        const quizTitle = document.createElement('h3');
        quizTitle.textContent = quiz.title;
        
        const quizActions = document.createElement('div');
        quizActions.className = 'quiz-actions';
        
        // Play button
        const playButton = document.createElement('button');
        playButton.className = 'btn primary';
        playButton.innerHTML = '<i class="fas fa-play"></i> Play';
        playButton.addEventListener('click', () => startQuiz(quiz));
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.className = 'btn secondary';
        editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editButton.addEventListener('click', () => editQuiz(quiz));
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn danger';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteButton.addEventListener('click', () => confirmDeleteQuiz(quiz));
        
        quizActions.appendChild(playButton);
        quizActions.appendChild(editButton);
        quizActions.appendChild(deleteButton);
        
        quizItem.appendChild(quizTitle);
        quizItem.appendChild(quizActions);
        
        quizList.appendChild(quizItem);
    });
}

function loadQuizzes() {
    fetch('/api/quizzes')
    .then(response => response.json())
    .then(data => {
        quizzes = data;
        renderQuizList();
    })
    .catch(error => {
        console.error('Error loading quizzes:', error);
    });
}

function renderQuizList() {
    const quizList = document.getElementById('quiz-list');
    
    if (quizzes.length === 0) {
        quizList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list fa-3x"></i>
                <p>No quizzes found. Create a new quiz or import one to get started!</p>
            </div>
        `;
        return;
    }
    
    quizList.innerHTML = '';
    
    quizzes.forEach(quiz => {
        const quizItem = document.createElement('div');
        quizItem.className = 'quiz-item';
        quizItem.innerHTML = `
            <div class="quiz-item-header">
                <div>
                    <div class="quiz-item-title">${safeText(quiz.title)}</div>
                    <div class="quiz-item-stats">
                        ${quiz.questions.length} question${quiz.questions.length !== 1 ? 's' : ''}
                        • Target: ${quiz.targetType === 'number' ?
                            `${safeText(quiz.targetValue.toString())} correct` :
                            `${safeText(quiz.targetValue.toString())}%`}
                    </div>
                </div>
            </div>
            <div class="quiz-item-description">${quiz.description || 'No description'}</div>
            <div class="quiz-item-footer">
                <div class="quiz-item-date">
                    Updated: ${new Date(quiz.updatedAt).toLocaleDateString()}
                </div>
                <div class="quiz-item-actions">
                    <button class="take-quiz" data-id="${quiz.id}" title="Take Quiz">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="edit-quiz" data-id="${quiz.id}" title="Edit Quiz">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="export-quiz" data-id="${quiz.id}" title="Export Quiz">
                        <i class="fas fa-file-export"></i>
                    </button>
                    <button class="delete-quiz" data-id="${quiz.id}" title="Delete Quiz">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        quizList.appendChild(quizItem);
        
        // Add event listeners
        quizItem.querySelector('.take-quiz').addEventListener('click', function() {
            const quizId = this.dataset.id;
            const quiz = quizzes.find(q => q.id === quizId);
            startQuiz(quiz);
        });
        
        quizItem.querySelector('.edit-quiz').addEventListener('click', function() {
            const quizId = this.dataset.id;
            const quiz = quizzes.find(q => q.id === quizId);
            editQuiz(quiz);
        });
        
        quizItem.querySelector('.export-quiz').addEventListener('click', function() {
            const quizId = this.dataset.id;
            const quiz = quizzes.find(q => q.id === quizId);
            exportQuiz(quiz);
        });
        
        quizItem.querySelector('.delete-quiz').addEventListener('click', function() {
            const quizId = this.dataset.id;
            deleteQuiz(quizId);
        });
    });
}

function importQuiz(quiz) {
    // Validate the imported quiz
    if (!quiz.title || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        showModal('Error', 'Invalid quiz format. Please upload a valid quiz file.');
        return;
    }
    
    // Add missing properties if needed
    if (!quiz.id) {
        quiz.id = Date.now().toString();
    }
    
    if (!quiz.createdAt) {
        quiz.createdAt = new Date().toISOString();
    }
    
    quiz.updatedAt = new Date().toISOString();
    
    // Save the imported quiz
    fetch('/api/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(quiz)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to import quiz');
        }
        return response.json();
    })
    .then(importedQuiz => {
        quizzes.push(importedQuiz);
        showModal('Success', 'Quiz imported successfully!');
        loadQuizzes();
    })
    .catch(error => {
        console.error('Error importing quiz:', error);
        showModal('Error', 'Failed to import quiz. Please try again.');
    });
}

function editQuiz(quiz) {
    // Save the current user answers if we're in the take-quiz-view
    if (currentView === 'take-quiz-view') {
        window.savedUserAnswers = JSON.parse(JSON.stringify(userAnswers)); // Deep copy
        console.log('Saved user answers:', window.savedUserAnswers);
    }
    
    currentQuiz = quiz;
    
    // Fill the form with quiz data
    document.getElementById('quiz-title').value = quiz.title;
    document.getElementById('quiz-description').value = quiz.description || '';
    
    // Set target type
    const targetTypeRadios = document.querySelectorAll('input[name="target-type"]');
    targetTypeRadios.forEach(radio => {
        if (radio.value === quiz.targetType) {
            radio.checked = true;
        }
    });
    
    // Show/hide target input based on type
    if (quiz.targetType === 'number') {
        targetNumberGroup.style.display = 'block';
        targetPercentageGroup.style.display = 'none';
        document.getElementById('target-number').value = quiz.targetValue;
    } else {
        targetNumberGroup.style.display = 'none';
        targetPercentageGroup.style.display = 'block';
        document.getElementById('target-percentage').value = quiz.targetValue;
    }
    
    // Clear existing questions
    document.getElementById('questions-container').innerHTML = '';
    
    // Add questions from the quiz
    quiz.questions.forEach(question => {
        addQuestionToForm(question);
    });
    
    showView('create-view');
}

function exportQuiz(quiz) {
    const dataStr = JSON.stringify(quiz, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${quiz.title.replace(/\s+/g, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function deleteQuiz(quizId) {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        fetch(`/api/quizzes/${quizId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete quiz');
            }
            
            quizzes = quizzes.filter(quiz => quiz.id !== quizId);
            renderQuizList();
            showModal('Success', 'Quiz deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting quiz:', error);
            showModal('Error', 'Failed to delete quiz. Please try again.');
        });
    }
}

function startQuiz(quiz) {
    currentQuiz = quiz;
    currentQuizData = JSON.parse(JSON.stringify(quiz)); // Deep copy
    
    // Randomize questions
    shuffleArray(currentQuizData.questions);
    
    // Randomize answer options for each question
    currentQuizData.questions.forEach(question => {
        // Handle both single and multiple correct answers
        if (question.correctAnswers && Array.isArray(question.correctAnswers)) {
            // Store references to all correct answers
            const correctAnswers = question.correctAnswers.map(index => question.answers[index]);
            
            // Shuffle the answers
            shuffleArray(question.answers);
            
            // Update correctAnswers indices after shuffling
            question.correctAnswers = correctAnswers.map(correctAnswer =>
                question.answers.findIndex(answer => answer.text === correctAnswer.text)
            );
            
            // Update correctAnswer for backward compatibility
            question.correctAnswer = question.correctAnswers.length > 0 ? question.correctAnswers[0] : 0;
        } else {
            // Handle legacy format with single correctAnswer
            const correctAnswer = question.answers[question.correctAnswer];
            shuffleArray(question.answers);
            // Update correctAnswer index
            question.correctAnswer = question.answers.findIndex(answer =>
                answer.text === correctAnswer.text
            );
            // Initialize correctAnswers array for consistency
            question.correctAnswers = [question.correctAnswer];
        }
    });
    
    // Initialize userAnswers array
    userAnswers = [];
    
    // Create new user answers array
    for (let i = 0; i < currentQuizData.questions.length; i++) {
        const question = currentQuizData.questions[i];
        const newAnswer = {
            questionIndex: i,
            selectedAnswer: null, // Keep for backward compatibility
            selectedAnswers: [], // Array for multiple selections
            isCorrect: undefined // Set to undefined so we can detect unanswered questions
        };
        
        // Try to restore saved answer for this question
        if (window.savedUserAnswers && window.savedUserAnswers.length > 0) {
            const savedAnswer = window.savedUserAnswers.find(a => a.questionText === question.text);
            if (savedAnswer) {
                newAnswer.selectedAnswers = savedAnswer.selectedAnswers;
                newAnswer.isCorrect = savedAnswer.isCorrect;
                console.log('Restored answer for question:', question.text);
            }
        }
        
        userAnswers.push(newAnswer);
    }
    
    // Clear saved answers after restoring
    window.savedUserAnswers = [];
    
    // Update quiz header
    document.getElementById('quiz-title-header').textContent = currentQuizData.title;
    document.getElementById('quiz-description-display').textContent = currentQuizData.description || '';
    
    // Update progress
    document.getElementById('total-questions').textContent = currentQuizData.questions.length;
    
    // Show first question
    currentQuestionIndex = 0;
    showQuestion(0);
    
    // Show the quiz view
    showView('take-quiz-view');
}
