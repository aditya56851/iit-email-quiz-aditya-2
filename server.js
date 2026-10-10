const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const RESULTS_FILE = path.join(__dirname, "results.json");
const ACTIVE_BATCH_FILE = path.join(__dirname, "active-batch.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const questions = [
  {
    question: "What does email stand for?",
    options: ["Electronic Mail", "Easy Message", "Extra Mail", "Express Message"],
    answer: 0,
    explanation: "Email stands for Electronic Mail."
  },
  {
    question: "Which of these is an email service?",
    options: ["Excel", "Gmail", "Paint", "Calculator"],
    answer: 1,
    explanation: "Gmail is an email service provided by Google."
  },
  {
    question: "Where do received emails usually appear?",
    options: ["Sent", "Drafts", "Inbox", "Trash"],
    answer: 2,
    explanation: "Received emails usually appear in the Inbox."
  },
  {
    question: "Where might an unwanted or suspicious email be filtered?",
    options: ["Starred", "Spam", "Contacts", "Drafts"],
    answer: 1,
    explanation: "Spam can contain unwanted or suspicious emails."
  },
  {
    question: "What does the Star option help you do?",
    options: [
      "Delete an email permanently",
      "Mark an email so it is easier to find",
      "Change your password",
      "Send an attachment"
    ],
    answer: 1,
    explanation: "Starred emails are easier to find later."
  },
  {
    question: "Which folder contains emails you have sent?",
    options: ["Inbox", "Spam", "Sent", "Trash"],
    answer: 2,
    explanation: "The Sent folder contains emails you have sent."
  },
  {
    question: "What is an email attachment?",
    options: [
      "A file sent with an email",
      "An email address",
      "A password",
      "A spam folder"
    ],
    answer: 0,
    explanation: "An attachment can be a document, photo, PDF, or another file."
  },
  {
    question: "What should you do if an unknown email asks for your password?",
    options: [
      "Reply with your password",
      "Click every link",
      "Do not share it; report or delete the suspicious email",
      "Forward it to everyone"
    ],
    answer: 2,
    explanation: "Never share your password in response to a suspicious email."
  },
  {
    question: "Where can a shopping order confirmation arrive?",
    options: [
      "Only in Trash",
      "In Inbox or a category such as Updates",
      "Only in Drafts",
      "It cannot arrive by email"
    ],
    answer: 1,
    explanation: "Order confirmations often appear in Inbox or a category such as Updates."
  },
  {
    question: "What should you check before opening an unexpected attachment?",
    options: [
      "Whether the file name is funny",
      "Whether the sender and attachment are trustworthy",
      "Whether your screen is bright",
      "Nothing; open it immediately"
    ],
    answer: 1,
    explanation: "Check the sender and make sure the attachment is expected and safe."
  }
];

function readResults() {
  try {
    if (!fs.existsSync(RESULTS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read results:", error.message);
    return [];
  }
}

function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf8");
}


function readActiveBatch() {
  try {
    if (!fs.existsSync(ACTIVE_BATCH_FILE)) return "";
    const data = JSON.parse(fs.readFileSync(ACTIVE_BATCH_FILE, "utf8"));
    return clean(data.activeBatch, 60);
  } catch (error) {
    console.error("Could not read active batch:", error.message);
    return "";
  }
}

function requireAdminPin(req, res) {
  const expectedPin = process.env.ADMIN_PIN;
  const providedPin = req.get("x-admin-pin");
  if (!expectedPin || !providedPin || providedPin !== expectedPin) {
    res.status(401).json({ error: "Admin PIN is missing or incorrect. Set ADMIN_PIN in your hosting environment." });
    return false;
  }
  return true;
}

function clean(value, max = 60) {
  return String(value ?? "").trim().slice(0, max);
}

app.get("/api/active-batch", (req, res) => {
  res.json({ activeBatch: readActiveBatch() });
});

app.get("/api/quiz", (req, res) => {
  const activeBatch = readActiveBatch();
  if (!activeBatch) {
    return res.status(503).json({ error: "Quiz abhi admin ne start nahi kiya hai. Institute se contact karein." });
  }
  res.json({
    title: "IIT Computer Institute - Email Quiz",
    activeBatch,
    questions: questions.map((q, id) => ({
      id,
      question: q.question,
      options: q.options
    }))
  });
});

app.post("/api/admin/new-batch", (req, res) => {
  if (!requireAdminPin(req, res)) return;
  const activeBatch = clean(req.body.batchName, 60);
  if (!activeBatch) {
    return res.status(400).json({ error: "Batch name enter karein." });
  }
  try {
    fs.writeFileSync(ACTIVE_BATCH_FILE, JSON.stringify({
      activeBatch,
      startedAt: new Date().toISOString()
    }, null, 2), "utf8");
    res.json({ ok: true, activeBatch, message: `New batch "${activeBatch}" start ho gaya.` });
  } catch (error) {
    console.error("Could not set active batch:", error.message);
    res.status(500).json({ error: "Batch save nahi ho saka. Server storage check karein." });
  }
});

app.post("/api/submit", (req, res) => {
  const name = clean(req.body.name);
  const roll = clean(req.body.roll);
  const batch = clean(req.body.batch);
  const answers = req.body.answers;

  const activeBatch = readActiveBatch();
  if (!activeBatch) {
    return res.status(503).json({ error: "Quiz abhi available nahi hai. Admin se batch start karwayein." });
  }
  if (!name || !roll) {
    return res.status(400).json({ error: "Enter your name and roll number." });
  }
  if (batch.toLowerCase() !== activeBatch.toLowerCase()) {
    return res.status(400).json({ error: "Aap current active batch mein registered nahi hain. Page refresh karein." });
  }
  if (!Array.isArray(answers) || answers.length !== questions.length ||
      answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) {
    return res.status(400).json({ error: "Answer all 10 questions before submitting." });
  }

  const results = readResults();
  const duplicate = results.some(r =>
    r.roll.toLowerCase() === roll.toLowerCase() &&
    r.batch.toLowerCase() === batch.toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({
      error: "A quiz attempt is already recorded for this roll number and batch."
    });
  }

  const reviewedAnswers = questions.map((q, i) => ({
    question: q.question,
    selected: q.options[answers[i]],
    correctAnswer: q.options[q.answer],
    correct: answers[i] === q.answer,
    explanation: q.explanation
  }));

  const score = reviewedAnswers.filter(a => a.correct).length;
  const result = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    roll,
    batch,
    score,
    total: questions.length,
    percentage: Math.round(score / questions.length * 100),
    submittedAt: new Date().toISOString(),
    reviewedAnswers
  };

  results.push(result);
  try {
    saveResults(results);
  } catch (error) {
    console.error("Could not save result:", error.message);
    return res.status(500).json({ error: "Result could not be saved. Check folder permissions." });
  }

  res.json({ message: "Quiz submitted successfully.", result });
});

app.get("/api/leaderboard", (req, res) => {
  const activeBatch = readActiveBatch();
  const results = readResults()
    .filter(r => activeBatch && String(r.batch).toLowerCase() === activeBatch.toLowerCase())
    .sort((a, b) =>
      b.score - a.score || new Date(a.submittedAt) - new Date(b.submittedAt)
    );

  // Only return the fields needed by the leaderboard.
  res.json(results.map((r, index) => ({
    rank: index + 1,
    name: r.name,
    roll: r.roll,
    batch: r.batch,
    score: r.score,
    total: r.total,
    percentage: r.percentage
  })));
});

// Teacher-only CSV export. Set ADMIN_PIN in the terminal before starting the server.
app.get("/api/admin/export", (req, res) => {
  if (!requireAdminPin(req, res)) return;

  const results = readResults();
  const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Name", "Roll Number", "Batch", "Score", "Total", "Percentage", "Submitted At"].join(","),
    ...results.map(r => [
      r.name, r.roll, r.batch, r.score, r.total, r.percentage, r.submittedAt
    ].map(quote).join(","))
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="email-quiz-results.csv"');
  res.send("\uFEFF" + lines.join("\r\n"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`IIT Email Quiz running at http://localhost:${PORT}`);
  console.log(`Results file: ${RESULTS_FILE}`);
});
