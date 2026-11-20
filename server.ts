import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (/403|PERMISSION_DENIED|API_KEY_INVALID/i.test(raw)) {
    return {
      status: 403,
      message:
        "Gemini API key is missing, invalid, or lacks permission for this model. Please configure or select a billing-enabled API key in Settings > Secrets.",
    };
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(raw)) {
    return {
      status: 429,
      message:
        "API quota exceeded or this model requires a billing-enabled paid API key. Check Settings > Secrets or switch to the standard general model.",
    };
  }
  if (/404|NOT_FOUND/i.test(raw)) {
    return {
      status: 404,
      message: `Requested Gemini model was not found or is unavailable: ${raw}`,
    };
  }
  return { status: 500, message: raw || "Unexpected Gemini API error." };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  const dataDir = path.resolve(__dirname, ".academy-data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const stateFile = path.join(dataDir, "learner-state.json");

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, hasApiKey: Boolean(getGeminiClient()) });
  });

  app.get("/api/workspace/state", (_req, res) => {
    try {
      if (fs.existsSync(stateFile)) {
        const content = fs.readFileSync(stateFile, "utf-8");
        res.json(JSON.parse(content));
      } else {
        res.json({ empty: true });
      }
    } catch {
      res.status(500).json({ error: "Failed to read saved workspace state." });
    }
  });

  app.post("/api/workspace/state", (req, res) => {
    try {
      fs.writeFileSync(stateFile, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ saved: true });
    } catch {
      res.status(500).json({ error: "Failed to persist workspace state." });
    }
  });

  app.post("/api/gemini/assistant", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(400).json({
        error:
          "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets to use the Teaching Assistant.",
      });
      return;
    }

    const { prompt, mode = "general", context } = req.body as {
      prompt?: string;
      mode?: "fast" | "general" | "interactive" | "deep";
      context?: string;
    };

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    const modelMap = {
      fast: "gemini-3.1-flash-lite",
      general: "gemini-4-hydrogen",
      interactive: "gemini-4-neon",
      deep: "gemini-4-carbon",
    } as const;

    const model = modelMap[mode] || "gemini-4-hydrogen";
    const systemInstruction = [
      "You are the Teaching Assistant for Architecture + Landscape + Design Academy.",
      "Explain concepts in simple, clear English while introducing accurate professional terminology (architecture, landscape architecture, civil/QS, structural engineering, MEP, industrial design, BIM).",
      "Always separate mandatory legal/building code rules from general design recommendations.",
      "Never fabricate local municipal regulations, engineering test certifications, or code clause numbers; state assumptions and units clearly and note when licensed professional sign-off is required.",
      context ? `Current workspace context:\n${context}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const config: {
        systemInstruction: string;
        thinkingConfig?: { thinkingLevel: ThinkingLevel };
      } = {
        systemInstruction,
      };

      if (mode === "deep") {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      res.json({
        model,
        text: response.text ?? "",
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/gemini/analyze-image", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(400).json({
        error:
          "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.",
      });
      return;
    }

    const { imageBase64, mimeType, prompt, discipline } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      prompt?: string;
      discipline?: string;
    };

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: "Image data and mimeType are required." });
      return;
    }

    try {
      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const response = await ai.models.generateContent({
        model: "gemini-4-neon",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text:
                prompt?.trim() ||
                `Analyze this ${discipline || "architectural/design"} image systematically: (1) Spatial or mechanical layout observations, (2) Technical strengths, (3) Potential coordination, ergonomic, daylight/ventilation, or construction issues, and (4) Concrete next-step improvements.`,
            },
          ],
        },
        config: {
          systemInstruction:
            "You are a senior architectural, landscape, and industrial design reviewer. Be factual, structured, and educational. Do not invent measurements that cannot be seen in the image; state visual observations clearly.",
        },
      });

      res.json({
        model: "gemini-4-neon",
        analysis: response.text ?? "",
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/gemini/generate-image", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(400).json({
        error:
          "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.",
      });
      return;
    }

    const {
      prompt,
      aspectRatio = "16:9",
      imageSize = "1K",
      model = "gemini-3-pro-image-preview",
    } = req.body as {
      prompt?: string;
      aspectRatio?: string;
      imageSize?: string;
      model?: "gemini-3-pro-image-preview" | "gemini-nano-banana-2.1";
    };

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: "Image prompt is required." });
      return;
    }

    const allowedRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
    const safeRatio = allowedRatios.includes(aspectRatio) ? aspectRatio : "16:9";
    const allowedSizes = ["1K", "2K", "4K"];
    const safeSize = allowedSizes.includes(imageSize) ? imageSize : "1K";

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ text: prompt.trim() }],
        },
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageDataUrl: string | null = null;
      let captionText = "";
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? "image/png";
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          captionText += part.text;
        }
      }

      if (!imageDataUrl) {
        res.status(502).json({
          error: "Model returned no image data. Try refining the architectural or design prompt.",
        });
        return;
      }

      res.json({
        model,
        aspectRatio: safeRatio,
        imageSize: safeSize,
        imageDataUrl,
        caption: captionText,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Architecture + Landscape + Design Academy server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
