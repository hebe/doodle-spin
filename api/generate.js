
import { GoogleGenAI } from "@google/genai";

// Change this when you want to try a newer model.
const MODEL = "gemini-3.1-flash-image";

const MAX_PROMPT_LENGTH = 4000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return Response.json(
      { error: "Image generation is not configured." },
      { status: 500 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Expected a JSON request body." },
      { status: 400 }
    );
  }

  const prompt = body?.prompt;

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    prompt.length > MAX_PROMPT_LENGTH
  ) {
    return Response.json(
      { error: "Invalid prompt." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt.trim(),
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    const parts =
      result.candidates?.[0]?.content?.parts ?? [];

    const image = parts.find(
      (part) => part.inlineData?.data
    )?.inlineData;

    if (!image) {
      return Response.json(
        { error: "Gemini returned no image." },
        { status: 502 }
      );
    }

    const mimeType = image.mimeType ?? "image/png";

    if (
      !["image/png", "image/jpeg", "image/webp"]
        .includes(mimeType)
    ) {
      return Response.json(
        { error: "Unsupported image format." },
        { status: 502 }
      );
    }

    const bytes = Buffer.from(
      image.data,
      "base64"
    );

    if (
      !bytes.length ||
      bytes.length > MAX_IMAGE_BYTES
    ) {
      return Response.json(
        { error: "Invalid image size." },
        { status: 502 }
      );
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error) {
    console.error("Gemini error:", error);

    if (error?.status === 429) {
      return Response.json(
        { error: "Gemini rate limit reached." },
        { status: 429 }
      );
    }

    return Response.json(
      { error: "Image generation failed." },
      { status: 502 }
    );
  }
}
