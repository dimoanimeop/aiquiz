
/* ==========================================
   QUIZIFY AI
   Main JavaScript
   Version: 1.0
========================================== */


/* ==========================================
   1. DOM ELEMENTS
========================================== */

const quizForm = document.getElementById("quizForm");

const topicInput = document.getElementById("topic");
const difficultyInput = document.getElementById("difficulty");
const questionCountInput = document.getElementById("questionCount");
const questionTypeInput = document.getElementById("questionType");
const extraInstructionsInput = document.getElementById("extraInstructions");

const generateBtn = document.getElementById("generateBtn");
const generateBtnText = document.getElementById("generateBtnText");

const generatorSection = document.getElementById("generator");
const heroSection = document.querySelector(".hero-section");
const featuresSection = document.getElementById("features");
const bottomCTA = document.querySelector(".bottom-cta");

const loadingSection = document.getElementById("loadingSection");
const loadingMessage = document.getElementById("loadingMessage");

const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

const quizSection = document.getElementById("quizSection");

const questionProgress = document.getElementById("questionProgress");
const quizPercentage = document.getElementById("quizPercentage");
const progressFill = document.getElementById("progressFill");

const questionNumber = document.getElementById("questionNumber");
const questionText = document.getElementById("questionText");
const questionTypeBadge = document.getElementById("questionTypeBadge");

const optionsContainer = document.getElementById("optionsContainer");

const hintBtn = document.getElementById("hintBtn");
const hintText = document.getElementById("hintText");

const answerFeedback = document.getElementById("answerFeedback");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");

const resultsSection = document.getElementById("resultsSection");
const finalScore = document.getElementById("finalScore");

const correctCount = document.getElementById("correctCount");
const incorrectCount = document.getElementById("incorrectCount");
const accuracy = document.getElementById("accuracy");

const resultHeading = document.getElementById("resultHeading");
const resultDescription = document.getElementById("resultDescription");
const resultsIcon = document.getElementById("resultsIcon");
const scoreCircle = document.getElementById("scoreCircle");

const reviewSection = document.getElementById("reviewSection");
const answerReviewList = document.getElementById("answerReviewList");

const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");


/* ==========================================
   2. QUIZ STATE
========================================== */

let questions = [];

let currentQuestionIndex = 0;

let selectedAnswers = [];

let currentTopic = "";

let currentDifficulty = "";

let quizCompleted = false;

let history = [];

const HISTORY_KEY = "quizify_ai_history";


/* ==========================================
   3. LOAD QUIZ HISTORY
========================================== */

function loadHistory() {

    try {

        const savedHistory = localStorage.getItem(HISTORY_KEY);

        history = savedHistory ? JSON.parse(savedHistory) : [];

        if (!Array.isArray(history)) {
            history = [];
        }

    } catch (error) {

        console.error("History loading error:", error);

        history = [];

    }

}


/* ==========================================
   4. SAVE QUIZ HISTORY
========================================== */

function saveHistory() {

    try {

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );

    } catch (error) {

        console.error("History saving error:", error);

    }

}


/* ==========================================
   5. GENERAL SCREEN MANAGEMENT
========================================== */

function hideAllScreens() {

    heroSection.classList.add("hidden");
    generatorSection.classList.add("hidden");
    featuresSection.classList.add("hidden");
    bottomCTA.classList.add("hidden");

    loadingSection.classList.add("hidden");
    quizSection.classList.add("hidden");
    resultsSection.classList.add("hidden");
    historySection.classList.add("hidden");

    errorMessage.classList.add("hidden");

}


function showHome() {

    hideAllScreens();

    heroSection.classList.remove("hidden");
    generatorSection.classList.remove("hidden");
    featuresSection.classList.remove("hidden");
    bottomCTA.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showGenerator() {

    showHome();

    document.getElementById("generator").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


function showHistory() {

    hideAllScreens();

    historySection.classList.remove("hidden");

    renderHistory();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ==========================================
   6. TOPIC SUGGESTIONS
========================================== */

document.querySelectorAll(".topic-chip").forEach(button => {

    button.addEventListener("click", () => {

        topicInput.value = button.dataset.topic;

        topicInput.focus();

    });

});


/* ==========================================
   7. AI QUIZ GENERATION
========================================== */

quizForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const topic = topicInput.value.trim();

    const difficulty = difficultyInput.value;

    const count = Number(questionCountInput.value);

    const questionType = questionTypeInput.value;

    const extraInstructions = extraInstructionsInput.value.trim();


    // Validate input

    if (!topic) {

        showError("Please enter a topic for your quiz.");

        topicInput.focus();

        return;

    }

    if (topic.length > 150) {

        showError("Topic cannot exceed 150 characters.");

        return;

    }

    if (extraInstructions.length > 500) {

        showError("Additional instructions are too long.");

        return;

    }


    // Store quiz details

    currentTopic = topic;

    currentDifficulty = difficulty;


    // Show loading screen

    hideAllScreens();

    loadingSection.classList.remove("hidden");

    loadingMessage.textContent =
        "AI is generating questions about " + topic + "...";

    generateBtn.disabled = true;

    generateBtnText.textContent = "Generating...";


    try {

        // Send request to backend

        const response = await fetch("/api/generate-quiz", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                topic: topic,

                difficulty: difficulty,

                questionCount: count,

                questionType: questionType,

                extraInstructions: extraInstructions

            })

        });


        // Read backend response

        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Unable to generate your quiz."
            );

        }


        if (!Array.isArray(data.questions)) {

            throw new Error("Invalid quiz data received from AI.");

        }


        if (data.questions.length !== count) {

            throw new Error(
                "AI returned an incorrect number of questions. Please try again."
            );

        }


        // Validate questions

        questions = data.questions.map(normalizeQuestion);

        currentQuestionIndex = 0;

        selectedAnswers = new Array(questions.length).fill(null);

        quizCompleted = false;


        // Open quiz

        startQuiz();


    } catch (error) {

        console.error("Quiz generation error:", error);

        showHome();

        showError(error.message || "Something went wrong. Please try again.");

    } finally {

        generateBtn.disabled = false;

        generateBtnText.textContent = "Generate My Quiz";

    }

});


/* ==========================================
   8. NORMALIZE AI QUESTIONS
========================================== */

function normalizeQuestion(question) {

    if (!question || typeof question.question !== "string") {

        throw new Error("AI returned an invalid question.");

    }

    const type = question.type || "multiple-choice";

    const options = Array.isArray(question.options)
        ? question.options.map(option => String(option))
        : [];


    if (options.length < 2) {

        throw new Error("A question has insufficient answer options.");

    }


    const correctAnswer = question.correctAnswer;

    if (
        correctAnswer === undefined ||
        correctAnswer === null
    ) {

        throw new Error("A correct answer is missing.");

    }


    let correctIndex = -1;


    // Accept a numeric answer index

    if (
        Number.isInteger(correctAnswer) &&
        correctAnswer >= 0 &&
        correctAnswer < options.length
    ) {

        correctIndex = correctAnswer;

    }

    // Accept a numeric string index

    else if (
        typeof correctAnswer === "string" &&
        /^\d+$/.test(correctAnswer) &&
        Number(correctAnswer) < options.length
    ) {

        correctIndex = Number(correctAnswer);

    }

    // Accept the actual answer text

    else {

        correctIndex = options.findIndex(option =>
            option.trim().toLowerCase() ===
            String(correctAnswer).trim().toLowerCase()
        );

    }


    if (correctIndex === -1) {

        throw new Error("AI returned an invalid correct answer.");

    }


    return {

        question: question.question,

        options: options,

        correctIndex: correctIndex,

        explanation: question.explanation || "No explanation provided.",

        hint: question.hint || "Think carefully about the question.",

        type: type

    };

}


/* ==========================================
   9. START QUIZ
========================================== */

function startQuiz() {

    hideAllScreens();

    quizSection.classList.remove("hidden");

    document.getElementById("quizTopicDisplay").textContent =
        currentTopic;

    document.getElementById("quizDifficultyDisplay").textContent =
        currentDifficulty;

    renderQuestion();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ==========================================
   10. RENDER QUESTION
========================================== */

function renderQuestion() {

    const question = questions[currentQuestionIndex];

    if (!question) return;


    // Progress

    const total = questions.length;

    const current = currentQuestionIndex + 1;

    const percentage = Math.round((current / total) * 100);

    questionProgress.textContent =
        `Question ${current} of ${total}`;

    quizPercentage.textContent =
        percentage + "% completed";

    progressFill.style.width =
        percentage + "%";


    // Question content

    questionNumber.textContent =
        "QUESTION " + String(current).padStart(2, "0");

    questionText.textContent =
        question.question;


    questionTypeBadge.textContent =
        question.type.toUpperCase().replace("-", " ");


    // Reset hint

    hintText.classList.add("hidden");

    hintText.textContent = "";

    hintBtn.disabled = false;


    // Reset feedback

    answerFeedback.className = "answer-feedback hidden";

    answerFeedback.textContent = "";


    // Reset options

    optionsContainer.replaceChildren();


    // Create answer options

    question.options.forEach((option, index) => {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "answer-option";


        const letter = document.createElement("span");

        letter.className = "option-letter";

        letter.textContent = String.fromCharCode(65 + index);


        const text = document.createElement("span");

        text.className = "option-text";

        text.textContent = option;


        button.appendChild(letter);

        button.appendChild(text);


        button.addEventListener("click", () => {

            selectAnswer(index);

        });


        optionsContainer.appendChild(button);

    });


    // Reset next button

    nextQuestionBtn.disabled = true;

    nextQuestionBtn.textContent =
        current === total
            ? "See Results →"
            : "Next Question →";


    // Restore previously selected answer if applicable

    const previousAnswer = selectedAnswers[currentQuestionIndex];

    if (previousAnswer !== null) {

        showAnswerFeedback(previousAnswer);

    }

}


/* ==========================================
   11. SELECT ANSWER
========================================== */

function selectAnswer(selectedIndex) {

    if (selectedAnswers[currentQuestionIndex] !== null) {

        return;

    }

    selectedAnswers[currentQuestionIndex] = selectedIndex;

    showAnswerFeedback(selectedIndex);

}


/* ==========================================
   12. ANSWER FEEDBACK
========================================== */

function showAnswerFeedback(selectedIndex) {

    const question = questions[currentQuestionIndex];

    const correctIndex = question.correctIndex;

    const isCorrect = selectedIndex === correctIndex;


    const optionButtons =
        optionsContainer.querySelectorAll(".answer-option");


    optionButtons.forEach((button, index) => {

        button.disabled = true;

        if (index === correctIndex) {

            button.classList.add("correct");

        }

        if (index === selectedIndex && !isCorrect) {

            button.classList.add("incorrect");

        }

    });


    // Feedback message

    answerFeedback.classList.remove(
        "hidden",
        "correct-feedback",
        "incorrect-feedback"
    );


    if (isCorrect) {

        answerFeedback.classList.add("correct-feedback");

        answerFeedback.textContent =
            "✓ Correct! " + question.explanation;

    } else {

        answerFeedback.classList.add("incorrect-feedback");

        answerFeedback.textContent =
            "✕ Incorrect. Correct answer: " +
            question.options[correctIndex] +
            ". " +
            question.explanation;

    }


    nextQuestionBtn.disabled = false;

    document.getElementById("scoreDisplay").textContent =
        "Score: " +
        selectedAnswers.filter((answer, index) =>
            answer !== null &&
            answer === questions[index].correctIndex
        ).length;

}


/* ==========================================
   13. HINT SYSTEM
========================================== */

hintBtn.addEventListener("click", () => {

    const question = questions[currentQuestionIndex];

    if (!question) return;

    hintText.textContent = "💡 " + question.hint;

    hintText.classList.remove("hidden");

    hintBtn.disabled = true;

});


/* ==========================================
   14. NEXT QUESTION
========================================== */

nextQuestionBtn.addEventListener("click", () => {

    if (selectedAnswers[currentQuestionIndex] === null) {

        return;

    }


    if (currentQuestionIndex < questions.length - 1) {

        currentQuestionIndex++;

        renderQuestion();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } else {

        finishQuiz();

    }

});


/* ==========================================
   15. FINISH QUIZ
========================================== */

function finishQuiz() {

    if (quizCompleted) return;

    quizCompleted = true;


    const total = questions.length;

    let correct = 0;


    questions.forEach((question, index) => {

        if (selectedAnswers[index] === question.correctIndex) {

            correct++;

        }

    });


    const incorrect = total - correct;

    const percentage = Math.round((correct / total) * 100);


    // Display score

    finalScore.textContent =
        correct + "/" + total;

    correctCount.textContent = correct;

    incorrectCount.textContent = incorrect;

    accuracy.textContent = percentage + "%";


    // Score circle

    const degrees = (percentage / 100) * 360;

    scoreCircle.style.background =
        `conic-gradient(
            #8b5cf6 ${degrees}deg,
            #29253d ${degrees}deg
        )`;


    // Result message

    if (percentage === 100) {

        resultsIcon.textContent = "🏆";

        resultHeading.textContent = "Perfect Score!";

        resultDescription.textContent =
            "Amazing! You answered every question correctly.";

    } else if (percentage >= 80) {

        resultsIcon.textContent = "🌟";

        resultHeading.textContent = "Excellent Work!";

        resultDescription.textContent =
            "You have an excellent understanding of this topic.";

    } else if (percentage >= 60) {

        resultsIcon.textContent = "🎉";

        resultHeading.textContent = "Good Job!";

        resultDescription.textContent =
            "Nice work! Keep practicing to improve.";

    } else if (percentage >= 40) {

        resultsIcon.textContent = "💪";

        resultHeading.textContent = "Keep Improving!";

        resultDescription.textContent =
            "You are making progress. Try again!";

    } else {

        resultsIcon.textContent = "📚";

        resultHeading.textContent = "Keep Learning!";

        resultDescription.textContent =
            "Every attempt is a chance to learn something new.";

    }


    // Save quiz history

    const quizRecord = {

        id: Date.now(),

        topic: currentTopic,

        difficulty: currentDifficulty,

        total: total,

        correct: correct,

        incorrect: incorrect,

        percentage: percentage,

        date: new Date().toLocaleString(),

        questions: questions,

        answers: selectedAnswers

    };


    history.unshift(quizRecord);

    history = history.slice(0, 50);

    saveHistory();


    // Display results

    hideAllScreens();

    resultsSection.classList.remove("hidden");

    reviewSection.classList.add("hidden");

    renderAnswerReview();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ==========================================
   16. ANSWER REVIEW
========================================== */

function renderAnswerReview() {

    answerReviewList.replaceChildren();


    questions.forEach((question, index) => {

        const selectedIndex = selectedAnswers[index];

        const isCorrect =
            selectedIndex === question.correctIndex;


        const item = document.createElement("article");

        item.className = "review-item";


        const heading = document.createElement("h3");

        heading.textContent =
            `${index + 1}. ${question.question}`;


        const yourAnswer = document.createElement("p");

        yourAnswer.textContent =
            "Your answer: " +
            question.options[selectedIndex];


        yourAnswer.className =
            isCorrect ? "review-correct" : "review-incorrect";


        const correctAnswer = document.createElement("p");

        correctAnswer.className = "review-correct";

        correctAnswer.textContent =
            "Correct answer: " +
            question.options[question.correctIndex];


        const explanation = document.createElement("p");

        explanation.textContent =
            "Explanation: " + question.explanation;


        item.appendChild(heading);

        item.appendChild(yourAnswer);

        item.appendChild(correctAnswer);

        item.appendChild(explanation);


        answerReviewList.appendChild(item);

    });

}


/* ==========================================
   17. REVIEW ANSWERS BUTTON
========================================== */

document.getElementById("reviewAnswersBtn")
    .addEventListener("click", () => {

        reviewSection.classList.toggle("hidden");

        if (!reviewSection.classList.contains("hidden")) {

            reviewSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    });


/* ==========================================
   18. RETRY QUIZ
========================================== */

document.getElementById("retryBtn")
    .addEventListener("click", () => {

        questions = [];

        selectedAnswers = [];

        currentQuestionIndex = 0;

        quizCompleted = false;

        showGenerator();

    });


/* ==========================================
   19. EXIT QUIZ
========================================== */

document.getElementById("exitQuizBtn")
    .addEventListener("click", () => {

        const confirmed = confirm(
            "Are you sure you want to exit this quiz? Your current progress will be lost."
        );

        if (confirmed) {

            questions = [];

            selectedAnswers = [];

            currentQuestionIndex = 0;

            quizCompleted = false;

            showHome();

        }

    });


/* ==========================================
   20. QUIZ HISTORY DISPLAY
========================================== */

function renderHistory() {

    historyList.replaceChildren();

    emptyHistory.classList.toggle(
        "hidden",
        history.length > 0
    );


    history.forEach(record => {

        const item = document.createElement("div");

        item.className = "history-item";


        const details = document.createElement("div");

        const title = document.createElement("h3");

        title.textContent = record.topic;


        const description = document.createElement("p");

        description.textContent =
            `${record.difficulty} • ${record.correct}/${record.total} correct • ${record.date}`;


        details.appendChild(title);

        details.appendChild(description);


        const score = document.createElement("div");

        score.className = "history-score";

        score.textContent = record.percentage + "%";


        item.appendChild(details);

        item.appendChild(score);


        historyList.appendChild(item);

    });

}


/* ==========================================
   21. HISTORY BUTTON
========================================== */

document.getElementById("historyBtn")
    .addEventListener("click", showHistory);


/* ==========================================
   22. CLEAR HISTORY
========================================== */

document.getElementById("clearHistoryBtn")
    .addEventListener("click", () => {

        if (history.length === 0) return;

        const confirmed = confirm(
            "Are you sure you want to delete all quiz history?"
        );

        if (!confirmed) return;

        history = [];

        saveHistory();

        renderHistory();

    });


/* ==========================================
   23. CREATE FIRST QUIZ
========================================== */

document.getElementById("createFirstQuizBtn")
    .addEventListener("click", showGenerator);


/* ==========================================
   24. NAVIGATION BUTTONS
========================================== */

document.getElementById("homeBtn")
    .addEventListener("click", event => {

        event.preventDefault();

        showHome();

    });


document.getElementById("startCreatingBtn")
    .addEventListener("click", showGenerator);


document.getElementById("bottomCreateBtn")
    .addEventListener("click", showGenerator);


/* ==========================================
   25. ERROR HANDLING
========================================== */

function showError(message) {

    errorText.textContent = message;

    errorMessage.classList.remove("hidden");

    errorMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


document.getElementById("closeErrorBtn")
    .addEventListener("click", () => {

        errorMessage.classList.add("hidden");

    });


/* ==========================================
   26. INITIALIZE APPLICATION
========================================== */

function initializeApp() {

    loadHistory();

    showHome();

    console.log("Quizify AI initialized successfully.");

}


initializeApp();


/* ==========================================
   END OF QUIZIFY AI JAVASCRIPT
========================================== */
