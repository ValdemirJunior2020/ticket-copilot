// ✅ FILE: /server/index.js
// Render deploy-ready:
// - binds to process.env.PORT and 0.0.0.0
// - CORS for localhost + your Netlify site
// - /api/openai-draft route

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: "server/.env" }); // local dev only; Render uses Dashboard env vars

const app = express();
app.use(express.json({ limit: "2mb" }));

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://ticket-copilot.netlify.app", // change if your Netlify URL is different
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / server-to-server
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

// ---- OpenAI setup ----
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client = null;
if (OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// ---- Draft endpoint ----
app.post("/api/openai-draft", async (req, res) => {
  try {
    if (!client) {
      return res.status(400).json({ error: "Missing OPENAI_API_KEY on server." });
    }

    const notes = String(req.body?.notes || "");
    const extracted = req.body?.extracted || {};

    const itinerary = extracted?.itinerary ? `Itinerary # ${extracted.itinerary}` : "the reservation";
    const guest = extracted?.guest || "Guest";
    const issue = extracted?.issue || "the request";

    const prompt = `You are a hotel reservations support agent. Write a short, professional reply email.

Rules:
- Do NOT promise refunds unless approved.
- If refund mentioned, say timing depends on bank/payment method and can take several business days once approved.
- Keep it concise and calm.

Context:
Guest: ${guest}
${itinerary}
Issue: ${issue}

Zendesk notes:
${notes}

Return ONLY the email body (no subject line).`;

    const r = await client.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 250,
    });

    const draft = r.output_text || "";
    return res.json({ draft });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// ✅ IMPORTANT: Render uses process.env.PORT (NOT 5050)
const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
