import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Server-side Gemini API endpoint
  app.post("/api/gemini/description", async (req, res) => {
    const { itemName, category } = req.body;

    if (!itemName) {
      return res.status(400).json({ error: "itemName is required", description: "" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "GEMINI_API_KEY not configured",
        description: "",
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Escreva uma descrição curta, apetitosa e vendedora para um item de menu de uma pastelaria brasileira chamada "Pastelaria do Joel".
Item: ${itemName}
Categoria: ${category || "Geral"}
Limite: Máximo 20 palavras.
Tom: Divertido e caseiro.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text?.trim() || "";
      return res.json({ description: text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate description",
        description: "",
      });
    }
  });

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
