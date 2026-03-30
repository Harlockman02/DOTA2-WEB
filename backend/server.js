import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const GROQ_API_KEY = "TU_KEY_AQUI"; // Reemplaza con tu clave de Groq

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: `Eres un analista experto de Dota 2. 
            REGLAS:
            1. No inventes datos. Si no sabes un cambio de parche, admítelo.
            2. Usa siempre [Nombre] para Héroes, Items o Habilidades (ej: [Pudge], [Blink Dagger]).
            3. Responde en español técnico y profesional.` 
          },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: "Error en el chat" });
  }
});

app.get("/api/heroes", async (req, res) => {
  const r = await fetch("https://api.opendota.com/api/heroStats");
  res.json(await r.json());
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
