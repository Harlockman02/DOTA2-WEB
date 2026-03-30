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

const GROQ_API_KEY = "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"; // Reemplaza con tu clave de Groq

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
            3. Responde en español técnico y profesional.
            4. ¡SÉ CREATIVO CON EL FORMATO!: 
               - Puedes usar Markdown (negritas, listas, tablas).
               - Puedes resaltar texto con colores usando la sintaxis: [color:#HEX]texto[/color] (ej: [color:#e63946]Peligro[/color]).` 
          },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    if (data.error) {
      res.status(500).json({ reply: "Error en la IA: " + data.error.message });
    } else {
      res.json({ reply: data.choices[0].message.content });
    }
  } catch (err) {
    res.status(500).json({ reply: "Error en el chat: " + err.message });
  }
});

app.get("/api/heroes", async (req, res) => {
  const r = await fetch("https://api.opendota.com/api/heroStats");
  res.json(await r.json());
});

app.get("/api/abilities", async (req, res) => {
  try {
    const r = await fetch("https://api.opendota.com/api/constants/abilities");
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/translate", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ translation: text });
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "gemma-7b-it",
        messages: [
          { 
            role: "system", 
            content: "Eres un traductor experto en Dota 2. Traduce el siguiente texto al español, manteniendo términos técnicos como nombres de habilidades, estadísticas y mecánicas del juego sin traducir. Responde solo con la traducción." 
          },
          { role: "user", content: text }
        ]
      })
    });
    const data = await response.json();
    res.json({ translation: data.choices[0].message.content });
  } catch (e) {
    res.json({ translation: text });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
