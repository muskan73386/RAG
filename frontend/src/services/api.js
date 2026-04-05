const API_URL = import.meta.env.VITE_API_URL;

async function request(endpoint, options = {}) {
  const { method = "GET", body, userId, isFormData = false } = options;

  const headers = {};
  if (userId) headers["x-user-id"] = userId;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const config = { method, headers };
  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export async function uploadFile(file, userId) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/upload", {
    method: "POST",
    body: formData,
    userId,
    isFormData: true,
  });
}

export async function getDocuments(userId) {
  return request("/documents", { userId });
}

export async function deleteDocument(docId, userId) {
  return request(`/documents/${docId}`, { method: "DELETE", userId });
}

export async function sendChat(question, userId) {
  return request("/chat", {
    method: "POST",
    body: { question },
    userId,
  });
}

export async function getChatHistory(userId) {
  return request("/history", { userId });
}

export async function clearChatHistory(userId) {
  return request("/history", { method: "DELETE", userId });
}
