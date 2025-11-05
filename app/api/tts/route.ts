// pages/api/tts.ts (or app/api/tts/route.ts for app router)
import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { Buffer } from "buffer";

const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON || "{}");

const client = new textToSpeech.TextToSpeechClient({
  credentials,
});

export async function POST(req: Request) {
  try {
    const { ssml, voice } = await req.json();

    if (!ssml || typeof ssml !== "string") {
      return NextResponse.json({ error: "Missing SSML text" }, { status: 400 });
    }

    // Map old voice names to Google equivalents
  const voiceNameMap: Record<string, string> = {
  // English
  Brian: "en-GB-Neural2-B",   // ✅ Male
  Amy: "en-GB-Neural2-A",     // ✅ Female
  Emma: "en-GB-Neural2-C",    // ✅ Female
  Joey: "en-US-Neural2-D",    // Male
  Justin: "en-US-Neural2-B",  // Male (child-like)
  Matthew: "en-US-Neural2-A", // Male
  Ivy: "en-US-Neural2-F",     // Female (child)
  Joanna: "en-US-Neural2-C",  // Female
  Salli: "en-US-Neural2-G",   // Female
  Nicole: "en-AU-Neural2-A",  // Female
  Russell: "en-AU-Neural2-B", // Male
  Raveena: "en-IN-Neural2-A", // Female

  // European
  Vitoria: "pt-PT-Neural2-A",
  Celine: "fr-FR-Neural2-A",
  Karl: "de-DE-Neural2-B",
  Marlene: "de-DE-Neural2-A",
  Giorgio: "it-IT-Neural2-B",
  Bianca: "it-IT-Neural2-A",
  Astrid: "sv-SE-Neural2-A",
  Filiz: "tr-TR-Neural2-A",
  Tatyana: "ru-RU-Neural2-A",
  Maxim: "ru-RU-Neural2-B",
// Spanish
  Lucia: "es-ES-Neural2-A",
  Enrique: "es-ES-Neural2-B",
  Penelope: "es-US-Neural2-A",
  Miguel: "es-US-Neural2-B",
  // Asian
  Mizuki: "ja-JP-Neural2-A",
  Takumi: "ja-JP-Neural2-B",
  Seoyeon: "ko-KR-Neural2-A",
  Aditi: "hi-IN-Neural2-A",
};


    const mappedVoice = voiceNameMap[voice] || "en-US-Neural2-B";

   const [response] = await client.synthesizeSpeech({
  input: { ssml },
  voice: {
    languageCode: mappedVoice.split("-").slice(0, 2).join("-"),
    name: mappedVoice,
  },
  audioConfig: {
    audioEncoding: "MP3",
    speakingRate: 1.0,
    pitch: 0,
  },
});


    const audioContent = response.audioContent?.toString("base64");
    if (!audioContent) {
      return NextResponse.json({ error: "No audio content returned" }, { status: 500 });
    }

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
  } catch (err: unknown) {
    console.error("TTS Error:", err);
    const message = err instanceof Error ? err.message : typeof err === "string" ? err : String(err ?? "TTS failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
