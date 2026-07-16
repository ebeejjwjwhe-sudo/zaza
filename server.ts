import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";

dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// ---------- AI Clients ----------
const getGeminiClient = (customKey?: string) => {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY tanımlı değil ve uygulama ayarlarından da özel anahtar girilmedi."
    );
  }
  return new GoogleGenAI({ apiKey });
};

// xAI Grok client via REST (no official SDK required)
async function callXaiChat(
  apiKey: string,
  messages: { role: string; content: string }[],
  model: string = "grok-3"
) {
  const mapped = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "grok-3",
      messages: mapped,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `xAI API hatası (${res.status})`;
    try {
      const j = JSON.parse(errText);
      msg = j.error?.message || j.message || msg;
    } catch {
      if (errText.length < 300) msg = errText;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  return { content, thoughts: undefined as string | undefined };
}

// ---------- Chat Endpoint (Gemini + xAI) ----------
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, provider } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages dizisi gerekli." });
      return;
    }

    const customKey =
      (req.headers["x-gemini-key"] as string) ||
      (req.headers["x-api-key"] as string) ||
      undefined;

    const selectedProvider = (provider || "google").toLowerCase();

    // ---- xAI / Grok path ----
    if (selectedProvider === "xai" || selectedProvider === "grok") {
      const xaiKey = customKey || process.env.XAI_API_KEY;
      if (!xaiKey) {
        throw new Error(
          "xAI / Grok API anahtarı bulunamadı. Settings'ten girin veya XAI_API_KEY env değişkeni ayarlayın."
        );
      }
      const xaiModel =
        model && String(model).startsWith("grok") ? model : "grok-3";
      const result = await callXaiChat(xaiKey, messages, xaiModel);
      return res.json(result);
    }

    // ---- Google Gemini path (default) ----
    const ai = getGeminiClient(customKey);

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const selectedModel = model || "gemini-2.5-flash";
    const config: any = {};

    // High thinking only for known pro / thinking models
    if (
      selectedModel.includes("pro") ||
      selectedModel.includes("thinking") ||
      selectedModel === "gemini-3.1-pro-preview"
    ) {
      config.thinkingConfig = {
        thinkingLevel: "HIGH",
      };
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    const text = response.text || "";
    let thoughts = "";
    try {
      const candidate = response.candidates?.[0];
      if (candidate && (candidate as any).thinkingProcess) {
        thoughts =
          (candidate as any).thinkingProcess.parts?.[0]?.text || "";
      }
      if (!thoughts && (response as any).reasoning) {
        thoughts = (response as any).reasoning;
      }
    } catch {
      // ignore
    }

    res.json({
      content: text,
      thoughts: thoughts || undefined,
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      error: error.message || "Metin üretimi sırasında hata oluştu.",
      details: error.toString(),
    });
  }
});

// ---------- Dynamic Workspace ZIP / TAR Download ----------
async function createArchive(
  format: "zip" | "tar"
): Promise<{ filePath: string; cleanup: () => void }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-ws-"));
  const outName =
    format === "zip" ? "workspace.zip" : "workspace.tar.gz";
  const outPath = path.join(tmpDir, outName);

  const excludeArgs =
    format === "zip"
      ? `-x "node_modules/*" -x "dist/*" -x "public/*" -x "*.log" -x ".env" -x ".env.*" -x "bun.lock" -x ".git/*" -x "assets/.aistudio/*" -x "*.zip" -x "*.tar.gz"`
      : `--exclude=node_modules --exclude=dist --exclude=public --exclude=*.log --exclude=.env --exclude=.env.* --exclude=bun.lock --exclude=.git --exclude=assets/.aistudio --exclude=*.zip --exclude=*.tar.gz`;

  const cmd =
    format === "zip"
      ? `cd "${process.cwd()}" && zip -r "${outPath}" . ${excludeArgs}`
      : `cd "${process.cwd()}" && tar -czf "${outPath}" ${excludeArgs} .`;

  await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

  return {
    filePath: outPath,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    },
  };
}

app.get("/api/download-zip", async (req, res) => {
  let cleanup: (() => void) | null = null;
  try {
    const { filePath, cleanup: c } = await createArchive("zip");
    cleanup = c;
    res.download(filePath, "cloudnexus-workspace.zip", (err) => {
      cleanup?.();
      if (err) {
        console.error("Zip download error:", err);
        if (!res.headersSent) res.status(500).send("Zip oluşturulamadı.");
      }
    });
  } catch (err: any) {
    cleanup?.();
    console.error(err);
    res.status(500).send("Zip arşivi oluşturulurken hata: " + err.message);
  }
});

app.get("/api/download-tar", async (req, res) => {
  let cleanup: (() => void) | null = null;
  try {
    const { filePath, cleanup: c } = await createArchive("tar");
    cleanup = c;
    res.download(filePath, "cloudnexus-workspace.tar.gz", (err) => {
      cleanup?.();
      if (err) {
        console.error("Tar download error:", err);
        if (!res.headersSent) res.status(500).send("Tar oluşturulamadı.");
      }
    });
  } catch (err: any) {
    cleanup?.();
    console.error(err);
    res.status(500).send("Tar arşivi oluşturulurken hata: " + err.message);
  }
});

// ---------- Real GitHub Deploy Trigger (updates a file to force Vercel rebuild) ----------
app.post("/api/github-deploy", async (req, res) => {
  try {
    const {
      token,
      owner,
      repo,
      message,
      path: filePath = "deploy-trigger.txt",
    } = req.body;

    if (!token || !owner || !repo) {
      res.status(400).json({
        error:
          "token, owner ve repo alanları zorunludur. Settings'ten GitHub PAT ve hedef repoyu girin.",
      });
      return;
    }

    const content = `Last deploy trigger: ${new Date().toISOString()}\nTriggered from CloudNexus Dashboard\nMessage: ${
      message || "Auto deploy"
    }\n`;
    const contentBase64 = Buffer.from(content).toString("base64");

    // 1. Get current file SHA if exists (required for update)
    let sha: string | undefined;
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    // 2. Create or update the file
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const putBody: any = {
      message:
        message ||
        `chore: trigger Vercel deploy via CloudNexus [${new Date().toISOString()}]`,
      content: contentBase64,
      branch: "main",
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(putBody),
    });

    const putData = await putRes.json();

    if (!putRes.ok) {
      throw new Error(
        putData.message ||
          `GitHub API hatası: ${putRes.status} - ${JSON.stringify(putData)}`
      );
    }

    res.json({
      success: true,
      commit: putData.commit?.sha,
      html_url: putData.commit?.html_url || putData.content?.html_url,
      message:
        "Deploy trigger dosyası başarıyla güncellendi. Vercel otomatik build başlatacak.",
    });
  } catch (error: any) {
    console.error("GitHub deploy error:", error);
    res.status(500).json({
      error: error.message || "GitHub push başarısız.",
    });
  }
});

// ---------- Health ----------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    providers: ["google", "xai"],
  });
});

// ---------- Vite + Static ----------
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

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`CloudNexus server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
