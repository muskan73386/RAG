const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: [".env.local", ".env"] });

const { initDB } = require("./db");
const uploadRoutes = require("./routes/upload");
const chatRoutes = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware — extracts user_id from header
function authMiddleware(req, res, next) {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Missing user ID. Please log in." });
  }
  req.userId = userId;
  next();
}

// Apply auth middleware to API routes
app.use("/api", authMiddleware);

// Routes
app.use("/api", uploadRoutes);
app.use("/api", chatRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "RAG Chat API is running" });
});

// Initialize database and start server
console.log("🛠️  Checking environment...");
if (!process.env.DATABASE_URL) console.warn("⚠️  DATABASE_URL is missing!");
if (!process.env.OPENROUTER_API_KEY) console.warn("⚠️  OPENROUTER_API_KEY is missing!");

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
