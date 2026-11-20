import React, { useState } from "react";
import { X, Send, Upload, Image as ImageIcon, Brain, Sparkles } from "lucide-react";

interface TeachingAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  initialContext?: string;
}

type TutorMode = "general" | "fast" | "interactive" | "deep";
type AspectRatioOption = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
type ImageSizeOption = "1K" | "2K" | "4K";

export const TeachingAssistantDrawer: React.FC<TeachingAssistantDrawerProps> = ({
  open,
  onClose,
  initialContext = "",
}) => {
  const [tab, setTab] = useState<"tutor" | "analyze" | "generate">("tutor");

  // Tutor state
  const [mode, setMode] = useState<TutorMode>("general");
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; model?: string }[]>([]);
  const [loadingTutor, setLoadingTutor] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  // Image Analysis state (gemini-4-neon)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState<string>("image/jpeg");
  const [analysisPrompt, setAnalysisPrompt] = useState<string>(
    "Inspect this site photo or floor plan sketch and explain architectural layout, daylighting, drainage, or structural observations."
  );
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Image Generation state (gemini-3-pro-image-preview / gemini-nano-banana-2.1)
  const [genPrompt, setGenPrompt] = useState<string>(
    "Architectural rendering of a warm-humid Tamil Nadu courtyard residence with terracotta eaves, limestone plinth, and native neem shade trees in soft morning sun."
  );
  const [genModel, setGenModel] = useState<"gemini-3-pro-image-preview" | "gemini-nano-banana-2.1">(
    "gemini-3-pro-image-preview"
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("16:9");
  const [imageSize, setImageSize] = useState<ImageSizeOption>("1K");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loadingGen, setLoadingGen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  if (!open) return null;

  async function sendTutorMessage(e: React.FormEvent) {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean) return;
    setTutorError(null);
    setMessages((m) => [...m, { role: "user", text: clean }]);
    setPrompt("");
    setLoadingTutor(true);
    try {
      const res = await fetch("/api/gemini/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clean, mode, context: initialContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTutorError(data.error || "Failed to reach Teaching Assistant.");
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.text, model: data.model }]);
      }
    } catch {
      setTutorError("Network error communicating with server.");
    } finally {
      setLoadingTutor(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  async function runImageAnalysis() {
    if (!uploadPreview) return;
    setAnalysisError(null);
    setLoadingAnalysis(true);
    try {
      const res = await fetch("/api/gemini/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: uploadPreview,
          mimeType: uploadMime,
          prompt: analysisPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error || "Image analysis request failed.");
      } else {
        setAnalysisResult(data.analysis);
      }
    } catch {
      setAnalysisError("Network error while analyzing image.");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function runImageGeneration() {
    if (!genPrompt.trim()) return;
    setGenError(null);
    setLoadingGen(true);
    try {
      const res = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: genPrompt,
          aspectRatio,
          imageSize,
          model: genModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Image generation failed.");
      } else {
        setGeneratedUrl(data.imageDataUrl);
      }
    } catch {
      setGenError("Network error while generating architectural image.");
    } finally {
      setLoadingGen(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-xl flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Academy Teaching Assistant & Visual Studio</h2>
          <p className="text-xs text-slate-500">Step-by-step explanations, photo inspection, and concept rendering</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Teaching Assistant"
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-1">
        <button
          type="button"
          onClick={() => setTab("tutor")}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 ${
            tab === "tutor" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          Step-by-Step Tutor
        </button>
        <button
          type="button"
          onClick={() => setTab("analyze")}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 ${
            tab === "analyze" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Analyze Photo
        </button>
        <button
          type="button"
          onClick={() => setTab("generate")}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 ${
            tab === "generate" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Concept Render
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {tab === "tutor" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-medium text-slate-700">Reasoning Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as TutorMode)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-800"
              >
                <option value="general">General Tutor (gemini-4-hydrogen)</option>
                <option value="fast">Quick Term Lookup (gemini-3.1-flash-lite)</option>
                <option value="interactive">Complex Design Coaching (gemini-4-neon)</option>
                <option value="deep">Deep Engineering Thinking (gemini-4-carbon · HIGH)</option>
              </select>
            </div>

            {initialContext && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                <strong>Active Context:</strong> {initialContext}
              </div>
            )}

            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="p-4 border border-dashed border-slate-300 rounded-lg text-slate-500 space-y-2">
                  <p className="font-medium text-slate-800">Try asking:</p>
                  <button
                    type="button"
                    onClick={() => setPrompt("Explain simply why external walls are 230mm and internal partitions 115mm, and when AAC blocks are preferred.")}
                    className="block text-left text-blue-700 hover:underline"
                  >
                    Explain 230mm vs 115mm walls and AAC blocks
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt("Walk me through checking door swing collisions and kitchen work triangle on HOUSE-001.")}
                    className="block text-left text-blue-700 hover:underline"
                  >
                    How to check door swings & kitchen triangle
                  </button>
                </div>
              )}

              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    m.role === "user"
                      ? "bg-blue-50 border-blue-200 text-slate-900 ml-6"
                      : "bg-slate-50 border-slate-200 text-slate-800 mr-4"
                  }`}
                >
                  <div className="text-[11px] font-mono text-slate-500 mb-1">
                    {m.role === "user" ? "You" : `Teaching Assistant (${m.model})`}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                </div>
              ))}
              {loadingTutor && <p className="text-slate-500">Thinking through your question...</p>}
              {tutorError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800">{tutorError}</div>
              )}
            </div>
          </div>
        )}

        {tab === "analyze" && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Upload a site photograph, hand sketch, or 2D floor plan image for structural, spatial, and environmental inspection via <span className="font-mono">gemini-4-neon</span>.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:text-slate-700"
            />
            {uploadPreview && (
              <img
                src={uploadPreview}
                alt="Uploaded design preview"
                className="w-full max-h-56 object-contain rounded border border-slate-200 bg-slate-50"
              />
            )}
            <textarea
              rows={3}
              value={analysisPrompt}
              onChange={(e) => setAnalysisPrompt(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-md text-xs"
            />
            <button
              type="button"
              disabled={!uploadPreview || loadingAnalysis}
              onClick={runImageAnalysis}
              className="w-full py-2 px-4 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {loadingAnalysis ? "Analyzing Image..." : "Analyze Uploaded Image"}
            </button>
            {analysisError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800">{analysisError}</div>
            )}
            {analysisResult && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded whitespace-pre-wrap leading-relaxed text-slate-800">
                {analysisResult}
              </div>
            )}
          </div>
        )}

        {tab === "generate" && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Generate high-resolution architectural, landscape, or industrial concept visualizations with configurable resolution and aspect ratio.
            </p>
            <textarea
              rows={3}
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-md text-xs"
            />
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-slate-600">Model</span>
                <select
                  value={genModel}
                  onChange={(e) =>
                    setGenModel(e.target.value as "gemini-3-pro-image-preview" | "gemini-nano-banana-2.1")
                  }
                  className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="gemini-3-pro-image-preview">Studio Pro Image</option>
                  <option value="gemini-nano-banana-2.1">Nano Banana 2.1</option>
                </select>
              </label>
              <label className="block">
                <span className="text-slate-600">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatioOption)}
                  className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                >
                  {["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"].map((ar) => (
                    <option key={ar} value={ar}>
                      {ar}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-slate-600">Resolution</span>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as ImageSizeOption)}
                  className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                >
                  {["1K", "2K", "4K"].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              disabled={loadingGen}
              onClick={runImageGeneration}
              className="w-full py-2 px-4 rounded-md bg-blue-700 text-white font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingGen ? "Rendering..." : "Generate Studio Concept Render"}
            </button>
            {genError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800">{genError}</div>}
            {generatedUrl && (
              <img
                src={generatedUrl}
                alt="Generated architectural concept render"
                className="w-full rounded border border-slate-200"
              />
            )}
          </div>
        )}
      </div>

      {tab === "tutor" && (
        <form onSubmit={sendTutorMessage} className="p-4 border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about setbacks, SFD/BMD, Vastu, plant spacing..."
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md"
          />
          <button
            type="submit"
            disabled={loadingTutor}
            aria-label="Send message to Teaching Assistant"
            className="px-3.5 py-2 rounded-md bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
