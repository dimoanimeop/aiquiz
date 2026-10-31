
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

// Generate Quiz API
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Groq API key is missing. Check your .env file."
      });
    }

    const {
      topic,
      difficulty,
      questionCount,
      questionType,
      extraInstructions
    } = req.body;

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({
        error: "Please enter a quiz topic."
      });
    }

    const count = Math.min(
      Math.max(parseInt(questionCount, 10) || 5, 1),
      20
    );

    const prompt = `
Create a quiz using these settings:

Topic: ${topic}
Difficulty: ${difficulty || "Medium"}
Number of questions: ${count}
Question type: ${questionType || "Multiple Choice"}
Extra instructions: ${extraInstructions || "None"}

Return ONLY valid JSON in this exact structure:

{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Correct option",
      "hint": "A helpful hint",
      "explanation": "Explanation of the correct answer",
      "type": "multiple-choice"
    }
  ]
}

Rules:
- Generate exactly ${count} questions.
- Make sure every question is accurate.
- For multiple-choice questions, provide exactly four options.
- correctAnswer must exactly match one of the options.
- For true/false questions, use True and False as options.
- Include a useful hint and explanation for every question.
- Do not include markdown or text outside the JSON.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
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
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(response.status).json({
        error: data.error?.message || "AI quiz generation failed."
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("The AI returned an empty response.");
    }

    const quiz = JSON.parse(content);

    if (!Array.isArray(quiz.questions)) {
      throw new Error("Invalid quiz format returned by AI.");
    }

    res.json(quiz);

  } catch (error) {
    console.error("Quiz generation error:", error);

    res.status(500).json({
      error: error.message || "Something went wrong while generating the quiz."
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Quizify AI running at http://localhost:${PORT}`);
});
