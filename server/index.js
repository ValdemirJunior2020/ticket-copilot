// FILE: /server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`✅ Server listening on http://localhost:${port}`));
