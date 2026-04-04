# DocChat AI — RAG Document Chat Application

Upload PDF/TXT documents and chat with them using AI-powered Retrieval-Augmented Generation.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Neon) with pgvector
- **Auth**: Firebase Authentication (Google login)
- **AI**: OpenRouter API (embeddings + chat)

## Setup Instructions

### 1. Prerequisites

- **Node.js** v18+ installed
- **Neon PostgreSQL** database (free at [neon.tech](https://neon.tech))
  - Enable the `pgvector` extension in your Neon dashboard
- **Firebase** project (free at [firebase.google.com](https://firebase.google.com))
  - Enable Google sign-in under Authentication → Sign-in method
- **OpenRouter** API key (free at [openrouter.ai](https://openrouter.ai))

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials:
#   DATABASE_URL=postgresql://...
#   OPENROUTER_API_KEY=sk-or-v1-...
npm install
npm run dev
```

Server starts at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your credentials:
#   VITE_API_URL=http://localhost:5000
#   VITE_FIREBASE_API_KEY=...
#   VITE_FIREBASE_AUTH_DOMAIN=...
#   VITE_FIREBASE_PROJECT_ID=...
npm install
npm run dev
```

Frontend starts at `http://localhost:5173`

### 4. Usage

1. Open `http://localhost:5173` in your browser
2. Sign in with your Google account
3. Upload a PDF or TXT document from the Dashboard
4. Go to Chat and ask questions about your documents
5. The AI answers using **only** the content from your uploaded files

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload and process a PDF/TXT file |
| GET | `/api/documents` | List user's uploaded documents |
| DELETE | `/api/documents/:id` | Delete a document |
| POST | `/api/chat` | Ask a question (RAG query) |
| GET | `/api/history` | Get chat history |
| DELETE | `/api/history` | Clear chat history |

## Project Structure

```
rag-project3/
├── backend/
│   ├── server.js          # Express server + auth middleware
│   ├── db.js              # PostgreSQL connection + table setup
│   ├── routes/
│   │   ├── upload.js      # File upload, text extraction, embeddings
│   │   └── chat.js        # RAG chat + history
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Router + auth wrapper
│   │   ├── main.jsx       # Entry point
│   │   ├── index.css      # Tailwind + custom styles
│   │   ├── firebase.js    # Firebase config
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── ChatPage.jsx
│   │   └── services/
│   │       └── api.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## Deployment

- **Frontend** → Deploy to [Vercel](https://vercel.com) (set env vars in project settings)
- **Backend** → Deploy to [Render](https://render.com) or [Railway](https://railway.app) (set env vars)
- Update `VITE_API_URL` in frontend to point to your deployed backend URL
