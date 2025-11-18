// pages/api/tts.ts
import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { Buffer } from "buffer";

const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON || "{}");
const client = new textToSpeech.TextToSpeechClient({ credentials });

export async function POST(req: Request) {
  try {
    const { ssml, voice } = await req.json();

    if (!ssml || typeof ssml !== "string")
      return NextResponse.json({ error: "Missing SSML text" }, { status: 400 });

    // ✅ Map voices including Arabic
    const voiceNameMap: Record<string, string> = {
      // English
      Brian: "en-GB-Standard-B",
      Amy: "en-GB-Standard-A",
      Emma: "en-GB-Standard-C",
      Joey: "en-US-Standard-D",
      Justin: "en-US-Standard-B",
      Matthew: "en-US-Standard-A",
      Ivy: "en-US-Standard-F",
      Joanna: "en-US-Standard-C",
      Salli: "en-US-Standard-G",
      Nicole: "en-AU-Standard-A",
      Russell: "en-AU-Standard-B",
      Raveena: "en-IN-Standard-A",

      // European
      Vitoria: "pt-PT-Standard-A",
      Celine: "fr-FR-Standard-A",
      Karl: "de-DE-Standard-B",
      Marlene: "de-DE-Standard-A",
      Giorgio: "it-IT-Standard-B",
      Bianca: "it-IT-Standard-A",
      Astrid: "sv-SE-Standard-A",
      Filiz: "tr-TR-Standard-A",
      // Tatyana: "ru-RU-Standard-A",
      // Maxim: "ru-RU-Standard-B",

      // 🇷🇺 Russian (Standard)
  Tatyana: "ru-RU-Standard-A",
  Maxim: "ru-RU-Standard-B",
  RussianC: "ru-RU-Standard-C",
  RussianD: "ru-RU-Standard-D",

  // 🇷🇺 Russian (Neural)
  // RussianNeuralA: "ru-RU-Neural2-A",
  // RussianNeuralB: "ru-RU-Neural2-B",
  // RussianNeuralC: "ru-RU-Neural2-C",
  // RussianNeuralD: "ru-RU-Neural2-D",

      // Spanish
      Lucia: "es-ES-Standard-A",
      Enrique: "es-ES-Standard-B",
      Penelope: "es-US-Standard-A",
      Miguel: "es-US-Standard-B",

      // ✅ Arabic
      ArabicA: "ar-XA-Standard-A",
      ArabicB: "ar-XA-Standard-B",
      ArabicC: "ar-XA-Standard-C",
      ArabicD: "ar-XA-Standard-D",

      // Asian
      Mizuki: "ja-JP-Standard-A",
      Takumi: "ja-JP-Standard-B",
      Seoyeon: "ko-KR-Standard-A",
      Aditi: "hi-IN-Standard-A",
    };

    const mappedVoice = voiceNameMap[voice] || "en-US-Standard-B";

    // ✅ Ensure safe SSML chunking (split if over 5000 bytes)
    const maxBytes = 4800;
    const encoder = new TextEncoder();
    const ssmlBytes = encoder.encode(ssml);

    if (ssmlBytes.length > maxBytes) {
      console.warn(`SSML too long (${ssmlBytes.length} bytes) → splitting.`);
    }

    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const char of ssml) {
      const bytes = encoder.encode(char);
      if (currentLength + bytes.length > maxBytes) {
        chunks.push(currentChunk.join(""));
        currentChunk = [];
        currentLength = 0;
      }
      currentChunk.push(char);
      currentLength += bytes.length;
    }
    if (currentChunk.length) chunks.push(currentChunk.join(""));

    const audioParts: Buffer[] = [];

    for (const chunk of chunks) {
      const [response] = await client.synthesizeSpeech({
        input: { ssml: chunk },
        voice: {
          languageCode: mappedVoice.split("-").slice(0, 2).join("-"),
          name: mappedVoice,
        },
        audioConfig: { audioEncoding: "MP3" },
      });

      if (response.audioContent) {
        if (typeof response.audioContent === "string") {
          // audioContent as base64-encoded string
          audioParts.push(Buffer.from(response.audioContent, "base64"));
        } else {
          // audioContent as binary (Uint8Array or Buffer)
          audioParts.push(Buffer.from(response.audioContent));
        }
      }
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
