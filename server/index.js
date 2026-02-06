// FILE: C:\Users\Valdemir Goncalves\Desktop\Projetos-2026\ticket-copilot\server\index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ FORCE: load ONLY /server/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// ✅ PROOF (prints only first 7 chars)
console.log("[server] ENV:", path.join(__dirname, ".env"));
console.log("[server] OPENAI_API_KEY starts:", (process.env.OPENAI_API_KEY || "").slice(0, 7));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/debug-key", (_req, res) =>
  res.json({ startsWith: (process.env.OPENAI_API_KEY || "").slice(0, 7) })
);

app.post("/api/draft", async (req, res) => {
  try {
    const { raw = "" } = req.body || {};
    const r = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: `Write a professional Zendesk email reply. Raw notes:\n\n${raw}`,
      temperature: 0.2,
      max_output_tokens: 300,
    });
    res.json({ text: (r.output_text || "").trim() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "OpenAI draft failed" });
  }
});

app.listen(process.env.PORT || 5050, () => {
  console.log(`✅ Server listening on http://localhost:${process.env.PORT || 5050}`);
});
