// --- /server/index.js ---
// 1) Bind to Render PORT + 0.0.0.0 (REQUIRED)
// 2) Add CORS for localhost + Netlify

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: "server/.env" }); // local dev only; Render uses Dashboard env vars

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://ticket-copilot.netlify.app", // CHANGE to your real Netlify URL later
    ],
    methods: ["GET", "POST"],
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ IMPORTANT: Render uses process.env.PORT (NOT 5050)
const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
