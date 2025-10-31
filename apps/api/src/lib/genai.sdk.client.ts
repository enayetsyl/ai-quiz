import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GOOGLE_GENAI_MODEL || "gemini-2.5-flash";

const MODEL_MAP: Record<string, string> = {
  "g2.5-flash": process.env.GENAI_MODEL_FLASH || "gemini-2.5-flash",
  "g2.5-flash-lite":
    process.env.GENAI_MODEL_FLASH_LITE || "gemini-2.5-flash-lite",
  "g2.0-flash": process.env.GENAI_MODEL_2_0 || "gemini-2.0-flash",
  "g2.5-pro": process.env.GENAI_MODEL_PRO || "gemini-2.5-pro",
};

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI(API_KEY ? { apiKey: API_KEY } : {});

export async function callGenAISDK(
  model: string,
  prompt: string,
  imageBuffer?: Buffer
) {
  const actualModel = MODEL_MAP[model] || model || MODEL;

  // Build structured multimodal contents when imageBuffer is provided
  // Convert buffer to base64 and send as inlineData for reliable vision processing
  let contents: any;
  if (imageBuffer) {
    const base64 = imageBuffer.toString("base64");
    contents = {
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64,
          },
        },
        { text: prompt },
      ],
    };
  } else {
    // simple text input
    contents = prompt;
  }

  const response: any = await ai.models.generateContent({
    model: actualModel,
    contents,
  } as any);

  // SDK commonly returns generated text in either `response.output[0].content[0].text` or `response.text`.
  const generatedText =
    response?.text ?? response?.output?.[0]?.content?.[0]?.text;
  let parsed: any = { text: generatedText };
  try {
    parsed = JSON.parse(generatedText);
  } catch (_) {
    // leave as-is; caller's validator should handle unexpected shape
  }

  return { raw: parsed, sdkRaw: response };
}

export default { callGenAISDK };
