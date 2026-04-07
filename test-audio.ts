import OpenAI from "openai";
import * as dotenv from 'dotenv';

dotenv.config(); // load .env

const openai = new OpenAI({
  apiKey: process.env.VITE_CHAT_GPT || process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "wav" },
      messages: [
        { 
          role: "system", 
          content: "You are an expert voice actor. Please read the user's input exactly word-for-word, but apply any emotional tone or pacing indicated by their text or SSML tags. Do not read the tags." 
        },
        { role: "user", content: "<speak>I am very angry!</speak>" },
      ],
    });
    
    const audioData = completion.choices[0].message?.audio?.data;
    if (audioData) {
      console.log("Success! Audio data length:", audioData.length);
    } else {
      console.log("No audio data returned. Structure:", JSON.stringify(completion.choices[0].message, null, 2));
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main();
