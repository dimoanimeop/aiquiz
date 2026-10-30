
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

app.post("/api/generate-quiz", async (req, res) => {
  try {
    const {
      topic,
      difficulty,
      questionCount,
      questionType,
      extraInstructions
    } = req.body;

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Groq API key is missing. Check your .env file."
      });
    }

    // Validate inputs
    if (
      typeof topic !== "string" ||
      !topic.trim() ||
      topic.length > 150
    ) {
      return res.status(400).json({
        error: "Enter a valid topic (maximum 150 characters)."
      });
    }

    if (!["Easy", "Medium", "Hard"].includes(difficulty)) {
      return res.status(400).json({
        error: "Invalid difficulty."
      });
    }

    const count = Number(questionCount);

    if (![5, 10, 15, 20].includes(count)) {
      return res.status(400).json({
        error: "Invalid question count."
      });
    }

    if (
      !["multiple-choice", "true-false", "mixed"].includes(questionType)
    ) {
      return res.status(400).json({
        error: "Invalid question type."
      });
    }

    const instructions =
      typeof extraInstructions === "string"
        ? extraInstructions.slice(0, 500)
        : "";

    const prompt = `
You are an expert quiz generator.

Create a quiz with these settings:

Topic: ${topic.trim()}
Difficulty: ${difficulty}
Number of questions: ${count}
Question type: ${questionType}
Extra instructions: ${instructions || "None"}

RULES:
- Generate exactly ${count} questions.
- Questions must be accurate and relevant.
- Avoid duplicate questions.
- Every question must have a clear correct answer.
- Multiple-choice questions must have exactly 4 options.
- True-false questions must have exactly 2 options: True and False.
- For mixed quizzes, include both types.
- correctAnswer must be a zero-based integer.
- Include a short hint and explanation for every question.
- Use "multiple-choice" or "true-false" as the type.
- Return only valid JSON.

Required JSON format:

{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "hint": "Helpful hint",
      "explanation": "Explanation of the answer",
      "type": "multiple-choice"
    }
  ]
}
`;

    // Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You generate accurate quizzes and follow JSON instructions exactly."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: {
            type: "json_object"
          },
          temperature: 0.5,
          max_completion_tokens: 8192
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(502).json({
        error:
          data.error?.message ||
          "Groq could not generate your quiz. Try again."
      });
    }

    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      return res.status(502).json({
        error: "Groq returned an empty response. Try again."
      });
    }

    // Parse AI response
    let quizData;

    try {
      quizData = JSON.parse(generatedText);
    } catch (error) {
      console.error("Invalid JSON from Groq:", generatedText);

      return res.status(502).json({
        error: "The AI returned an invalid quiz. Please try again."
      });
    }

    // Check question count
    if (
      !Array.isArray(quizData.questions) ||
      quizData.questions.length !== count
    ) {
      return res.status(502).json({
        error: "AI generated an incomplete quiz. Please try again."
      });
    }

    // Validate each question
    for (const question of quizData.questions) {
      if (
        !question ||
        typeof question.question !== "string" ||
        !question.question.trim() ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        !question.options.every(
          option => typeof option === "string" && option.trim()
        ) ||
        !Number.isInteger(question.correctAnswer) ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= question.options.length
      ) {
        return res.status(502).json({
          error: "AI generated an invalid question. Please try again."
        });
      }

      if (
        question.type !== "multiple-choice" &&
        question.type !== "true-false"
      ) {
        question.type = "multiple-choice";
      }

      question.hint =
        typeof question.hint === "string" ? question.hint : "";

      question.explanation =
        typeof question.explanation === "string"
          ? question.explanation
          : "No explanation available.";
    }

    // Send quiz to frontend
    res.json({
      success: true,
      questions: quizData.questions
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Quizify AI running at http://localhost:${PORT}`);
});
