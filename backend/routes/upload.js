const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { pool } = require("../db");

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and TXT files are allowed"));
    }
  },
});

// ---------- Helpers ----------

// Split text into chunks of ~500-1000 characters
function splitIntoChunks(text, maxLen = 800) {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  // If no sentence splitting happened (e.g. no punctuation), fall back to character splitting
  if (chunks.length === 0 && text.trim().length > 0) {
    for (let i = 0; i < text.length; i += maxLen) {
      chunks.push(text.slice(i, i + maxLen).trim());
    }
  }

  return chunks.filter((c) => c.length > 10); // skip tiny fragments
}

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

// ---------- Route ----------

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.userId;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Extract text content
    let text = "";
    if (file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(file.buffer);
      text = pdfData.text;
    } else {
      text = file.buffer.toString("utf-8");
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "File is empty or could not be read" });
    }

    console.log(`📄 Processing file: ${file.originalname} (${text.length} chars)`);

    // Save document record
    const docResult = await pool.query(
      "INSERT INTO documents (user_id, name) VALUES ($1, $2) RETURNING id",
      [userId, file.originalname]
    );
    const documentId = docResult.rows[0].id;

    // Split into chunks
    const chunks = splitIntoChunks(text);
    console.log(`✂️ Split into ${chunks.length} chunks`);

    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🧠 Generating embedding for chunk ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunk);
      
      const embeddingStr = `[${embedding.join(",")}]`;
      await pool.query(
        "INSERT INTO chunks (document_id, content, embedding) VALUES ($1, $2, $3::vector)",
        [documentId, chunk, embeddingStr]
      );
    }

    console.log(`✅ File processing complete: ${file.originalname}`);

    res.json({
      message: "File uploaded and processed successfully",
      document: {
        id: documentId,
        name: file.originalname,
        chunks: chunks.length,
      },
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Failed to process file: " + err.message });
  }
});

// Get user's documents
router.get("/documents", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Documents fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Delete a document
router.delete("/documents/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM documents WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
