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
  Brian: "en-GB-Standard-B",   // ✅ Male
  Amy: "en-GB-Standard-A",     // ✅ Female
  Emma: "en-GB-Standard-C",    // ✅ Female
  Joey: "en-US-Standard-D",    // Male
  Justin: "en-US-Standard-B",  // Male (child-like)
  Matthew: "en-US-Standard-A", // Male
  Ivy: "en-US-Standard-F",     // Female (child)
  Joanna: "en-US-Standard-C",  // Female
  Salli: "en-US-Standard-G",   // Female
  Nicole: "en-AU-Standard-A",  // Female
  Russell: "en-AU-Standard-B", // Male
  Raveena: "en-IN-Standard-A", // Female

  // European
  Vitoria: "pt-PT-Standard-A",
  Celine: "fr-FR-Standard-A",
  Karl: "de-DE-Standard-B",
  Marlene: "de-DE-Standard-A",
  Giorgio: "it-IT-Standard-B",
  Bianca: "it-IT-Standard-A",
  Astrid: "sv-SE-Standard-A",
  Filiz: "tr-TR-Standard-A",
  Tatyana: "ru-RU-Standard-A",
  Maxim: "ru-RU-Standard-B",

  // Asian
  Mizuki: "ja-JP-Standard-A",
  Takumi: "ja-JP-Standard-B",
  Seoyeon: "ko-KR-Standard-A",
  Aditi: "hi-IN-Standard-A",
};


    const mappedVoice = voiceNameMap[voice] || "en-US-Standard-B";

    const [response] = await client.synthesizeSpeech({
      input: { ssml },
      voice: {
        languageCode: mappedVoice.split("-").slice(0, 2).join("-"),
        name: mappedVoice,
      },
      audioConfig: { audioEncoding: "MP3" },
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
  } catch (err: any) {
    console.error("TTS Error:", err);
    return NextResponse.json({ error: err.message || "TTS failed" }, { status: 500 });
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
