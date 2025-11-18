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
  // English Neural
  Brian: "en-GB-Neural-B",
  Amy: "en-GB-Neural-A",
  Emma: "en-GB-Neural-C",
  Joey: "en-US-Neural-D",
  Justin: "en-US-Neural-B",
  Matthew: "en-US-Neural-A",
  Ivy: "en-US-Neural-F",
  Joanna: "en-US-Neural-C",
  Salli: "en-US-Neural-G",
  Nicole: "en-AU-Neural-A",
  Russell: "en-AU-Neural-B",
  Raveena: "en-IN-Neural-A",

  // European Neural
  Vitoria: "pt-PT-Neural-A",
  Celine: "fr-FR-Neural-A",
  Karl: "de-DE-Neural-A",
  Marlene: "de-DE-Neural-B",
  Giorgio: "it-IT-Neural-A",
  Bianca: "it-IT-Neural-B",
  Astrid: "sv-SE-Neural-A",
  Filiz: "tr-TR-Neural-A",
  Tatyana: "ru-RU-Neural2-A",
  Maxim: "ru-RU-Neural2-B",

  // Asian Neural
  Mizuki: "ja-JP-Neural-A",
  Takumi: "ja-JP-Neural-B",
  Seoyeon: "ko-KR-Neural-A",
  Aditi: "hi-IN-Neural-A",
};


    const mappedVoice = voiceNameMap[voice] || "en-US-Neural-B";

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





