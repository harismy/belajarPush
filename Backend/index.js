import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { GoogleGenAI } from "@google/genai";
import profile from "./data.json" with { type: "json" };

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ----- basic middleware -----
app.use(express.json());
app.use(cors());

// ----- serve Frontend as static -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend/.. -> project basic
const frontendPath = path.resolve(__dirname, "../Frontend");
app.use(express.static(frontendPath));

// ----- GEN AI (optional) -----
const genAI = new GoogleGenAI({
  apiKey: process.env.SECRET_KEY_GEMINI_API,
});

// ----- helpers: guestbook storage -----
const guestbookFile = path.join(__dirname, "guestbook.json");

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

// ----- API: profile -----
app.get("/profile", (req, res) => {
  return res.json({
    status: true,
    statusCode: 200,
    data: profile,
  });
});

// ----- API: chat (uses Gemini if key exists; fallback to simple bot) -----
app.get("/chat", async (req, res) => {
  try {
    const prompt = req.query.prompt || "Halo!";

    // fallback kalau apiKey belum ada
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
      config: {
        systemInstruction:
          "Kamu adalah CODEX Bot, yang membantu pengunjung website untuk memberikan informasi dan menjawab pertanyaan mereka.",
      },
    });

    const response = result.text;

    res.status(200).json({
      status: "success",
      message: {
        id: Date.now(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.log(" ~ error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server AI",
    });
  }
});

// ----- API: guestbook -----
app.get("/guestbook", (req, res) => {
  const messages = readGuestbook();
  return res.json({
    status: "success",
    data: messages,
  });
});

app.post("/guestbook", (req, res) => {
  const { name, message } = req.body || {};
  if (!name || !message) {
    return res.status(400).json({
      status: "error",
      message: "name dan message wajib diisi",
    });
  }

  const messages = readGuestbook();
  const newMessage = {
    id: Date.now(),
    name: String(name),
    message: String(message),
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  writeGuestbook(messages);

  return res.status(201).json({
    status: "success",
    data: newMessage,
  });
});

// ----- SPA fallback: buka FE kalau route tidak ditemukan -----
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
