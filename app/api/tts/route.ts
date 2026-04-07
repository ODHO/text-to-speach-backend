import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Buffer } from "buffer";

// Initialize OpenAI using the environment variable as requested
const openai = new OpenAI({
  apiKey: process.env.VITE_CHAT_GPT || process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { ssml, voice } = await req.json();

    if (!ssml || typeof ssml !== "string")
      return NextResponse.json({ error: "Missing text/SSML" }, { status: 400 });

    // OpenAI TTS does not natively interpret SSML, so we strip out the tags to get clean text.
    const text = ssml.replace(/<[^>]*>?/gm, '').trim();
    if (!text) {
      return NextResponse.json({ error: "Text is empty after stripping SSML" }, { status: 400 });
    }

    // Map old frontend voice names to OpenAI voices to maintain backward compatibility
    const openaiVoices: Record<string, "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"> = {
      Brian: "echo",
      Amy: "nova",
      Emma: "shimmer",
      Joey: "onyx",
      Justin: "echo",
      Matthew: "onyx",
      Ivy: "nova",
      Joanna: "shimmer",
      Salli: "nova",
      Nicole: "nova",
      Russell: "echo",
      Raveena: "shimmer",
      Vitoria: "nova",
      Celine: "shimmer",
      Karl: "onyx",
      Marlene: "nova",
      Giorgio: "echo",
      Bianca: "shimmer",
      Astrid: "nova",
      Filiz: "shimmer",
      Tatyana: "nova",
      Maxim: "onyx",
      RussianC: "shimmer",
      RussianD: "echo",
      Lucia: "nova",
      Enrique: "echo",
      Penelope: "shimmer",
      Miguel: "onyx",
      ArabicA: "nova",
      ArabicB: "echo",
      ArabicC: "shimmer",
      ArabicD: "onyx",
      Mizuki: "shimmer",
      Takumi: "echo",
      Seoyeon: "nova",
      Aditi: "shimmer",
    };

    let selectedVoice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy";
    if (["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(voice)) {
      selectedVoice = voice as typeof selectedVoice;
    } else if (openaiVoices[voice]) {
      selectedVoice = openaiVoices[voice];
    }

    // OpenAI max characters limit is 4096 per request. We'll chunk safely at 4000.
    const maxChars = 4000;
    const chunks: string[] = [];
    let currentChunk = "";

    if (text.length > maxChars) {
      const words = text.split(" ");
      for (const word of words) {
        if (currentChunk.length + word.length + 1 > maxChars) {
          chunks.push(currentChunk);
          currentChunk = word + " ";
        } else {
          currentChunk += word + " ";
        }
      }
      if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
    } else {
      chunks.push(text);
    }

    const audioParts: Buffer[] = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice,
        input: chunk,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      audioParts.push(buffer);
    }

    const merged = Buffer.concat(audioParts);
    const audioContent = merged.toString("base64");

    return NextResponse.json(
      { audioContent },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err: any) {
    console.error("TTS Error:", err);
    return NextResponse.json(
      { error: err.message || "TTS failed" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}