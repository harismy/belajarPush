import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { GoogleGenAI } from "@google/genai";
import profile from "../data.json" with { type: "json" };

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// path helper
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend. Current project keeps web assets in /public/Frontend.
const publicPath = fs.existsSync(path.resolve(__dirname, "../public/Frontend"))
  ? path.resolve(__dirname, "../public/Frontend")
  : path.resolve(__dirname, "../public");
app.use(express.static(publicPath));

// guestbook file in project root
const guestbookFile = path.resolve(__dirname, "../guestbook.json");

function readGuestbook() {
  try {
    if (!fs.existsSync(guestbookFile)) return [];
    const raw = fs.readFileSync(guestbookFile, "utf-8");
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeGuestbook(messages) {
  fs.writeFileSync(guestbookFile, JSON.stringify(messages, null, 2));
}

// Gemini (optional)
const genAI = new GoogleGenAI({
  apiKey: process.env.SECRET_KEY_GEMINI_API,
});

// API routes (tetap sama seperti punyamu)
app.get("/profile", (req, res) => res.json({ status: true, statusCode: 200, data: profile }));

app.get("/chat", async (req, res) => {
  try {
    const prompt = req.query.prompt || "Halo!";
    if (!process.env.SECRET_KEY_GEMINI_API) {
      return res.status(200).json({
        status: "success",
        message: {
          id: Date.now(),
          role: "assistant",
          content: `Aku belum tersambung ke AI. Kamu tanya: "${prompt}"`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.status(200).json({
      status: "success",
      message: {
        id: Date.now(),
        role: "assistant",
        content: result.text,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server AI" });
  }
});

app.get("/guestbook", (req, res) => res.json({ status: "success", data: readGuestbook() }));

app.post("/guestbook", (req, res) => {
  const { name, message } = req.body || {};
  if (!name || !message) return res.status(400).json({ status: "error", message: "name dan message wajib diisi" });

  const messages = readGuestbook();
  const newMessage = { id: Date.now(), name: String(name), message: String(message), createdAt: new Date().toISOString() };
  messages.push(newMessage);
  writeGuestbook(messages);
  res.status(201).json({ status: "success", data: newMessage });
});

// fallback SPA
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Local dev: start server only when this file is run directly.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun && !process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// For Vercel serverless deployment.
export default app;
