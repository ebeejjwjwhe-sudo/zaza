import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI. It will pick up process.env.GEMINI_API_KEY or custom header key
const getAIClient = (customKey?: string) => {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined and no custom Gemini API Key was entered in the app settings.");
  }
  return new GoogleGenAI({ apiKey });
};

enum ThinkingLevel {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  OFF = "OFF"
}

// API endpoint for High Thinking Gemini Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages array in request body." });
      return;
    }

    const customKey = req.headers["x-gemini-key"] as string | undefined;
    const ai = getAIClient(customKey);

    // Map message list to Gemini standard structures
    // @google/genai generateContent format expects: contents: [{ role: 'user' | 'model', parts: [{ text: '...' }] }]
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const selectedModel = model || "gemini-3.5-flash";
    const config: any = {};

    // Only apply thinkingConfig for supported models (Gemini 3.1 Pro)
    if (selectedModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = {
        thinkingLevel: "HIGH"
      };
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: config
    });

    // Extract the text and any thoughts if available
    const text = response.text || "";
    
    // Some responses provide the thinking process in candidate.thinking_process or similar.
    // Let's attempt to extract it if present, or let's inspect the response candidate
    let thoughts = "";
    try {
      const candidate = response.candidates?.[0];
      if (candidate && (candidate as any).thinkingProcess) {
        thoughts = (candidate as any).thinkingProcess.parts?.[0]?.text || "";
      }
    } catch (e) {
      // ignore
    }

    res.json({
      content: text,
      thoughts: thoughts || undefined
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred during text generation.",
      details: error.toString()
    });
  }
});

// Endpoint to reliably download the workspace ZIP
app.get("/api/download-zip", (req, res) => {
  const zipPath = path.join(process.cwd(), "public", "workspace.zip");
  res.download(zipPath, "workspace.zip", (err) => {
    if (err) {
      console.error("Error downloading zip:", err);
      res.status(404).send("Zip file not found. Please try again or refresh.");
    }
  });
});

// Endpoint to reliably download the workspace TAR.GZ
app.get("/api/download-tar", (req, res) => {
  const tarPath = path.join(process.cwd(), "public", "workspace.tar.gz");
  res.download(tarPath, "workspace.tar.gz", (err) => {
    if (err) {
      console.error("Error downloading tar:", err);
      res.status(404).send("Tar.gz file not found. Please try again or refresh.");
    }
  });
});

// Start server and mount Vite
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
