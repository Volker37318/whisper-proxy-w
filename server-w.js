// server-w.js — Whisper-Proxy (ESM, Node >=18)
console.log("DEBUG: process.env.PORT =", process.env.PORT);

import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data"; // wichtig: FormData aus dem Paket, nicht native
import dotenv from "dotenv";
dotenv.config();

const app = express();

// CORS (später gern auf deine Domains einschränken)
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// Upload (bis ~25 MB, je nach Bedarf anpassen)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const PORT = process.env.PORT || 8000;

// Health-Check (für Browser & Koyeb HTTP-Check)
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Kleiner Root-Test
app.get("/", (_req, res) => {
  res.send("Whisper-Proxy läuft!");
});

// Whisper-Endpoint
app.post("/whisper", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'No file uploaded. Use field name "file".' });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "audio.webm",
      contentType: req.file.mimetype || "audio/webm",
    });
    formData.append("model", "whisper-1");
    if (req.body.language) formData.append("language", String(req.body.language));
    formData.append("response_format", "json");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: text });
    }
    // normalisiert zurückgeben (falls OpenAI mal kein valides JSON liefern sollte)
    try {
      const data = JSON.parse(text);
      return res.json(data);
    } catch {
      return res.type("application/json").send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`Whisper-Proxy läuft auf Port ${PORT}`);
});
