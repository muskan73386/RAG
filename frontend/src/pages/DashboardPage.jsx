import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { uploadFile, getDocuments, deleteDocument } from "../services/api";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await getDocuments(user.uid);
      setDocuments(docs);
    } catch (err) {
      setError("Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    const validTypes = ["application/pdf", "text/plain"];
    if (!validTypes.includes(file.type)) {
      setError("Only PDF and TXT files are allowed");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      const result = await uploadFile(file, user.uid);
      setSuccess(`"${result.document.name}" uploaded — ${result.document.chunks} chunks processed`);
      loadDocuments();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    handleUpload(e.target.files[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files[0]);
  };

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId, user.uid);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess("Document deleted");
    } catch (err) {
      setError("Failed to delete document");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-100">DocChat AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/chat")} className="btn-secondary text-sm py-2 px-4">
              💬 Chat
            </button>
            <div className="flex items-center gap-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-700" />
              )}
              <span className="text-sm text-gray-400 hidden sm:block">{user.displayName}</span>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Upload Area */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Upload Documents</h2>
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
              dragOver
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-gray-700 hover:border-gray-600"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-gray-400">Processing file...</p>
              </div>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-gray-400 mb-2">Drag & drop a PDF or TXT file here</p>
                <p className="text-gray-500 text-sm mb-4">or</p>
                <label className="btn-primary cursor-pointer inline-block">
                  Browse Files
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError("")} className="text-red-400/60 hover:text-red-400">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess("")} className="text-emerald-400/60 hover:text-emerald-400">✕</button>
          </div>
        )}

        {/* Documents List */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Your Documents</h2>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p>No documents uploaded yet</p>
              <p className="text-sm text-gray-600 mt-1">Upload a PDF or TXT file to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <span className="text-indigo-400 text-lg">
                        {doc.name.endsWith(".pdf") ? "📄" : "📝"}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-200 font-medium">{doc.name}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(doc.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-2"
                    title="Delete document"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
