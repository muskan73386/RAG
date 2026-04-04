const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// Generate embedding via OpenRouter API
async function generateEmbedding(text) {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter embeddings error: ${response.status} - ${errBody}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Chat completion via OpenRouter API
async function chatCompletion(context, question) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful document assistant. Answer the user's question ONLY based on the provided context below. If the answer is not found in the context, respond with: "Not found in documents".

CONTEXT:
${context}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter chat error: ${response.status} - ${errBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ---------- Routes ----------

// POST /api/chat — RAG query
router.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.userId;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(question);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Vector similarity search — top 5 most relevant chunks for this user's documents
    const searchResult = await pool.query(
      `SELECT c.content, c.document_id, d.name as doc_name
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE d.user_id = $1
       ORDER BY c.embedding <-> $2::vector
       LIMIT 5`,
      [userId, embeddingStr]
    );

    if (searchResult.rows.length === 0) {
      const noDocsAnswer = "You haven't uploaded any documents yet. Please upload a document first.";
      await pool.query(
        "INSERT INTO chats (user_id, question, answer) VALUES ($1, $2, $3)",
        [userId, question, noDocsAnswer]
      );
      return res.json({ answer: noDocsAnswer, sources: [] });
    }

    // Build context from retrieved chunks
    const context = searchResult.rows
      .map((row, i) => `[Source: ${row.doc_name}]\n${row.content}`)
      .join("\n\n---\n\n");

    // Get AI answer
    const answer = await chatCompletion(context, question);

    // Save to chat history
    await pool.query(
      "INSERT INTO chats (user_id, question, answer) VALUES ($1, $2, $3)",
      [userId, question, answer]
    );

    // Return answer with source info
    const sources = [...new Set(searchResult.rows.map((r) => r.doc_name))];
    res.json({ answer, sources });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Failed to process question: " + err.message });
  }
});

// GET /api/history — chat history
router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, question, answer, created_at FROM chats WHERE user_id = $1 ORDER BY created_at ASC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("History error:", err.message);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// DELETE /api/history — clear chat history
router.delete("/history", async (req, res) => {
  try {
    await pool.query("DELETE FROM chats WHERE user_id = $1", [req.userId]);
    res.json({ message: "Chat history cleared" });
  } catch (err) {
    console.error("Clear history error:", err.message);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

module.exports = router;
