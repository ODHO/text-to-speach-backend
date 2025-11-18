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
      Brian: "en-GB-Neural2-B",
      Amy: "en-GB-Neural2-A",
      Emma: "en-GB-Neural2-C",
      Joey: "en-US-Neural2-D",
      Justin: "en-US-Neural2-B",
      Matthew: "en-US-Neural2-A",
      Ivy: "en-US-Neural2-F",
      Joanna: "en-US-Neural2-C",
      Salli: "en-US-Neural2-G",
      Nicole: "en-AU-Neural2-A",
      Russell: "en-AU-Neural2-B",
      Raveena: "en-IN-Neural2-A",

      // European
      Vitoria: "pt-PT-Neural2-A",
      Celine: "fr-FR-Neural2-A",
      Karl: "de-DE-Neural2-B",
      Marlene: "de-DE-Neural2-A",
      Giorgio: "it-IT-Neural2-B",
      Bianca: "it-IT-Neural2-A",
      Astrid: "sv-SE-Neural2-A",
      Filiz: "tr-TR-Neural2-A",

      // 🇷🇺 Russian (Neural2)
  Tatyana: "ru-RU-Neural2-A",
  Maxim: "ru-RU-Neural2-B",
  RussianC: "ru-RU-Neural2-C",
  RussianD: "ru-RU-Neural2-D",

      // Spanish
      Lucia: "es-ES-Neural2-A",
      Enrique: "es-ES-Neural2-B",
      Penelope: "es-US-Neural2-A",
      Miguel: "es-US-Neural2-B",

      // ✅ Arabic
      ArabicA: "ar-XA-Neural2-A",
      ArabicB: "ar-XA-Neural2-B",
      ArabicC: "ar-XA-Neural2-C",
      ArabicD: "ar-XA-Neural2-D",

      // Asian
      Mizuki: "ja-JP-Neural2-A",
      Takumi: "ja-JP-Neural2-B",
      Seoyeon: "ko-KR-Neural2-A",
      Aditi: "hi-IN-Neural2-A",
    };

    const mappedVoice = voiceNameMap[voice] || "en-US-Neural2-B";

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
