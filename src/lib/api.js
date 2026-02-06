// FILE: C:\Users\Valdemir Goncalves\Desktop\Projetos-2026\ticket-copilot\src\lib\api.js
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5050";

export async function openAiDraft({ raw, fields, macro }) {
  const res = await fetch(`${API_BASE}/api/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, fields, macro }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `OpenAI Draft failed (${res.status})`);
  }

  return data; // { text: "..." }
}
