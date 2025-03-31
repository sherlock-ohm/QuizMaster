// Quiz taking functionality for the Quizmaster application

// Initialize quiz-related event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Quiz navigation buttons
    document.getElementById('prev-question').addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
        }
    });
    
    // Add event listener for the Next button
    document.getElementById('next-question').addEventListener('click', () => {
        // The Next button should be disabled until the answer is checked,
        // so this handler will only run after checking the answer
        console.log('Next button clicked. Current question index:', currentQuestionIndex);
        
        if (currentQuestionIndex < currentQuizData.questions.length - 1) {
            currentQuestionIndex++;
            console.log('Incrementing to question index:', currentQuestionIndex);
            showQuestion(currentQuestionIndex);
        } else {
            console.log('Already at the last question. Cannot increment further.');
        }
    });
    
    // Ensure navigation buttons work properly
    // Note: We've removed the setInterval as it's unnecessary and could cause performance issues

    document.getElementById('submit-quiz').addEventListener('click', () => {
        showQuizResults();
    });

    document.getElementById('retake-quiz').addEventListener('click', () => {
        startQuiz(currentQuiz);
    });

    // Review answers button has been removed
});

/**
 * Starts a quiz
 * @param {Object} quiz - The quiz object to start
 */
function startQuiz(quiz) {
    console.log('Starting quiz:', quiz.title);
    console.log('Quiz has', quiz.questions.length, 'questions');
    
    currentQuiz = quiz;
    currentQuizData = JSON.parse(JSON.stringify(quiz)); // Deep copy
    currentQuestionIndex = 0;
    
    // Initialize userAnswers array
    userAnswers = [];
    
    console.log('Before randomization, questions:', currentQuizData.questions.map(q => q.text));
    
    // Randomize questions
    shuffleArray(currentQuizData.questions);
    
    console.log('After randomization, questions:', currentQuizData.questions.map(q => q.text));
    
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
    if (window.savedUserAnswers) {
        window.savedUserAnswers = [];
    }
    
    // Update quiz header
    document.getElementById('quiz-title-header').textContent = currentQuizData.title;
    document.getElementById('quiz-description-display').textContent = currentQuizData.description || '';
    
    // Update progress
    document.getElementById('total-questions').textContent = currentQuizData.questions.length;
    
    // Show first question
    console.log('Starting quiz with first question (index 0)');
    showQuestion(0);
    
    // Show the quiz view
    showView('take-quiz-view');
    
    // Log the current state
    console.log('Quiz initialized with', currentQuizData.questions.length, 'questions');
    console.log('Current question index:', currentQuestionIndex);
}

/**
 * Shows a specific question in the quiz
 * @param {number} index - The index of the question to show
 */
function showQuestion(index) {
    console.log(`Showing question ${index + 1} of ${currentQuizData.questions.length}`);
    
    // Check if the index is valid
    if (index < 0 || index >= currentQuizData.questions.length) {
        console.error(`Invalid question index: ${index}. Total questions: ${currentQuizData.questions.length}`);
        return;
    }
    
    const question = currentQuizData.questions[index];
    console.log('Question text:', question.text);
    
    const questionContainer = document.getElementById('question-container');
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const submitButton = document.getElementById('submit-quiz');
    
    // Clear any previous feedback
    if (document.getElementById('answer-feedback')) {
        document.getElementById('answer-feedback').style.display = 'none';
    }
    
    // Reset the check answer button if it exists
    if (document.getElementById('check-answer')) {
        document.getElementById('check-answer').style.display = 'none';
    }
    
    // Disable the Next button until the user checks their answer
    if (nextButton) {
        nextButton.disabled = true;
        nextButton.classList.remove('highlight');
    }
    
    // Update progress
    document.getElementById('current-question').textContent = index + 1;
    const progressFill = document.querySelector('.progress-fill');
    progressFill.style.width = `${((index + 1) / currentQuizData.questions.length) * 100}%`;
    
    // Enable/disable navigation buttons
    prevButton.disabled = index === 0;
    
    if (index === currentQuizData.questions.length - 1) {
        nextButton.style.display = 'none';
        submitButton.style.display = 'block';
    } else {
        nextButton.style.display = 'block';
        submitButton.style.display = 'none';
    }
    
    // Build question HTML
    let answersHtml = '';
    // Use checkbox for all question types
    const inputType = 'checkbox';
    const userAnswer = userAnswers[index];
    
    // Initialize selectedAnswers array if it doesn't exist
    if (!userAnswer.selectedAnswers) {
        userAnswer.selectedAnswers = [];
    }
    
    question.answers.forEach((answer, ansIndex) => {
        // Check if this answer is selected
        const isChecked = userAnswer.selectedAnswers.includes(ansIndex);
        
        answersHtml += `
            <div class="answer-option">
                <input type="${inputType}" name="quiz-answer" value="${ansIndex}"
                    ${isChecked ? 'checked' : ''}>
                <div class="answer-text">
                    <span>${safeText(answer.text)}</span>
                </div>
            </div>
        `;
    });
    
    questionContainer.innerHTML = `
        <div class="question-card">
            <h3>Question ${index + 1}</h3>
            <p class="question-text">${makeUrlsClickable(question.text)}</p>
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
    
    // Add feedback container and check answer button
    questionContainer.innerHTML += `
        <div id="answer-feedback" class="answer-feedback" style="display: none; margin-top: 20px;"></div>
        <button id="check-answer" class="btn btn-primary" style="margin-top: 20px;">Check Answers</button>
    `;
    
    // Add event listeners to answer options
    const answerInputs = questionContainer.querySelectorAll('input[name="quiz-answer"]');
    const feedbackContainer = document.getElementById('answer-feedback');
    const checkAnswerButton = document.getElementById('check-answer');
    
    // Store the selected answers when options are clicked
    answerInputs.forEach(input => {
        input.addEventListener('change', () => {
            const answerIndex = parseInt(input.value);
            
            // For checkboxes (multiple selection)
            if (input.type === 'checkbox') {
                if (input.checked) {
                    // Add to selected answers if not already there
                    if (!userAnswer.selectedAnswers.includes(answerIndex)) {
                        userAnswer.selectedAnswers.push(answerIndex);
                    }
                } else {
                    // Remove from selected answers
                    const index = userAnswer.selectedAnswers.indexOf(answerIndex);
                    if (index > -1) {
                        userAnswer.selectedAnswers.splice(index, 1);
                    }
                }
            }
            // For radio buttons (single selection)
            else {
                userAnswer.selectedAnswers = [answerIndex];
            }
            
            // Enable the check answer button when at least one answer is selected
            checkAnswerButton.disabled = userAnswer.selectedAnswers.length === 0;
        });
    });
    
    // Add event listener to the check answer button
    checkAnswerButton.addEventListener('click', () => {
        console.log('Check Answer button clicked for question index:', currentQuestionIndex);
        
        // Make sure at least one answer is selected
        if (userAnswer.selectedAnswers.length === 0) {
            alert('Please select at least one answer first.');
            return;
        }
        
        console.log('User selected answers:', userAnswer.selectedAnswers);
        
        // For single correct answer questions
        let isCorrect = false;
        let correctAnswerIndices = [];
        
        // Handle different question types
        if (question.correctAnswers && Array.isArray(question.correctAnswers)) {
            // Multiple correct answers
            correctAnswerIndices = question.correctAnswers;
            
            // Check if user selected all correct answers and no incorrect ones
            isCorrect = userAnswer.selectedAnswers.length === correctAnswerIndices.length &&
                        userAnswer.selectedAnswers.every(ans => correctAnswerIndices.includes(ans));
        } else if (question.type === 'true-false' || question.correctAnswer !== undefined) {
            // Single correct answer (backward compatibility)
            correctAnswerIndices = [question.correctAnswer];
            isCorrect = userAnswer.selectedAnswers.length === 1 &&
                        userAnswer.selectedAnswers[0] === question.correctAnswer;
        } else {
            // Fallback (should not happen)
            correctAnswerIndices = [0];
            isCorrect = userAnswer.selectedAnswers.includes(0);
        }
        
        // Get the correct answer text
        const correctAnswerTexts = correctAnswerIndices.map(idx => question.answers[idx].text);
        const correctAnswer = question.answers[correctAnswerIndices[0]];
        
        // Update the user's answer with the correctness
        userAnswer.isCorrect = isCorrect;
        
        // Generate feedback HTML
        let feedbackHtml = '';
        if (isCorrect) {
            feedbackHtml = `
                <div class="feedback correct">
                    <i class="fas fa-check-circle"></i> <strong>Correct!</strong>
                    <div class="reference">
                        ${correctAnswerIndices.map(idx => {
                            const answer = question.answers[idx];
                            return answer.reference && answer.reference.trim() !== '' ?
                                `<div><strong>Reference for "${safeText(answer.text)}":</strong> ${makeUrlsClickable(answer.reference)}</div>` : '';
                        }).filter(ref => ref !== '').join('')}
                    </div>
                </div>
            `;
        } else {
            // For multiple correct answers
            let correctAnswerDisplay = '';
            if (correctAnswerTexts.length === 1) {
                correctAnswerDisplay = correctAnswerTexts[0];
            } else {
                correctAnswerDisplay = correctAnswerTexts.join(', ');
            }
            
            feedbackHtml = `
                <div class="feedback incorrect">
                    <i class="fas fa-times-circle"></i> <strong>Incorrect!</strong>
                    <div style="margin-top: 8px; color: var(--text-color);">
                        <strong>The correct answer${correctAnswerTexts.length > 1 ? 's are' : ' is'}:</strong> ${safeText(correctAnswerDisplay)}
                    </div>
                    <div class="reference">
                        ${correctAnswerIndices.map(idx => {
                            const answer = question.answers[idx];
                            return answer.reference && answer.reference.trim() !== '' ?
                                `<div><strong>Reference for "${safeText(answer.text)}":</strong> ${makeUrlsClickable(answer.reference)}</div>` : '';
                        }).filter(ref => ref !== '').join('')}
                    </div>
                </div>
            `;
        }
        
        // Display the feedback
        feedbackContainer.innerHTML = feedbackHtml;
        feedbackContainer.style.display = 'block';
        
        // Hide the check answer button
        checkAnswerButton.style.display = 'none';
        
        // Disable the answer inputs
        answerInputs.forEach(inp => {
            inp.disabled = true;
        });
        
        // Enable and highlight the Next button
        if (index < currentQuizData.questions.length - 1) {
            const nextButton = document.getElementById('next-question');
            console.log('Next button found in Check Answer handler:', !!nextButton);
            
            if (nextButton) {
                console.log('Next button before enabling - disabled:', nextButton.disabled, 'display:', nextButton.style.display);
                nextButton.disabled = false;
                nextButton.classList.add('highlight');
                console.log('Next button after enabling - disabled:', nextButton.disabled, 'display:', nextButton.style.display);
            } else {
                console.error('Next button not found in Check Answer handler');
            }
        } else {
            const submitButton = document.getElementById('submit-quiz');
            submitButton.disabled = false;
            submitButton.classList.add('highlight');
        }
    });
    
    // Don't update currentQuestionIndex here, it should only be updated by the navigation buttons
    // currentQuestionIndex = index;
}

/**
 * Shows the quiz results
 */
function showQuizResults() {
    console.log('Showing quiz results');
    console.log('Total questions in quiz:', currentQuizData.questions.length);
    console.log('Total user answers:', userAnswers.length);
    
    // Evaluate all answers before showing results
    // This ensures score is calculated correctly even if user didn't click "Check Answer"
    userAnswers.forEach((userAnswer, index) => {
        if (index < currentQuizData.questions.length) {
            const question = currentQuizData.questions[index];
            
            // Determine if answer is correct
            let isCorrect = false;
            
            // Only count questions that have been answered
            if (userAnswer.selectedAnswers && userAnswer.selectedAnswers.length > 0) {
                if (question.correctAnswers && Array.isArray(question.correctAnswers)) {
                    // Multiple correct answers
                    isCorrect = userAnswer.selectedAnswers.length === question.correctAnswers.length &&
                                userAnswer.selectedAnswers.every(ans => question.correctAnswers.includes(ans));
                } else if (question.type === 'true-false' || question.correctAnswer !== undefined) {
                    // Single correct answer
                    isCorrect = userAnswer.selectedAnswers.length === 1 &&
                                userAnswer.selectedAnswers[0] === question.correctAnswer;
                }
                
                // Update the isCorrect property only for answered questions
                userAnswer.isCorrect = isCorrect;
            } else {
                // For unanswered questions, mark as not evaluated
                userAnswer.isCorrect = undefined;
            }
        }
    });
    
    // Log user answers for debugging
    console.log('User answers after evaluation:', JSON.stringify(userAnswers, null, 2));
    
    // Count questions where the user has selected an answer, even if they haven't clicked "Check Answer"
    const answeredQuestions = userAnswers.filter(answer => answer.selectedAnswers && answer.selectedAnswers.length > 0);
    
    // For the score, only count questions that have been evaluated (user clicked "Check Answer")
    const evaluatedQuestions = answeredQuestions.filter(answer => answer.isCorrect !== undefined);
    const correctAnswers = evaluatedQuestions.filter(answer => answer.isCorrect === true);
    
    console.log('Questions with selections:', answeredQuestions.length);
    console.log('Questions evaluated (checked):', evaluatedQuestions.length);
    console.log('Correct answers count:', correctAnswers.length);
    
    const percentage = calculatePercentage(userAnswers, currentQuizData.questions);
    console.log('Percentage:', percentage);
    
    const passed = didUserPass(currentQuizData, userAnswers);
    console.log('Passed:', passed);
    
    // Update score display
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    
    // Show fraction of correct answers out of total questions
    document.getElementById('score-fraction').textContent =
        `${correctAnswers.length}/${currentQuizData.questions.length} questions`;
    
    // Update pass/fail message
    const passFailMessage = document.getElementById('pass-fail-message');
    if (passed) {
        passFailMessage.textContent = 'Congratulations! You passed the quiz.';
        passFailMessage.className = 'pass';
    } else {
        passFailMessage.textContent = 'Sorry, you did not pass the quiz.';
        passFailMessage.className = 'fail';
    }
    
    // Show the results view
    showView('results-view');
}

// Review answers feature has been removed

// Rating feature has been removed