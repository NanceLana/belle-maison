import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function formatVisualPrompt(planText) {
  return `
Furnish this room with:

${planText
    .replace(/\*\*/g, "")
    .replace(/Layout:/i, "🛋️ Layout:")
    .replace(/Key Furniture:/i, "🪑 Furniture:")
    .replace(/Style:/i, "🎨 Style:")
    .replace(/Colors:/i, "🌈 Colors:")
    .replace(/Lighting:/i, "💡 Lighting:")
    .replace(/Additional Decor:/i, "🖼️ Decor:")
    .replace(/\n{2,}/g, "\n")}

Keep the camera angle and layout consistent. Use a modern, photorealistic interior style.
`.trim();
}

// 🧠 Step 1: Generate the design plan (Gemini for captioning, GPT for structure)
app.post("/generate-plan", async (req, res) => {
  const { vibePrompt, referenceImage } = req.body;

  try {
    if (!referenceImage) {
      return res.status(400).json({ error: "Reference image is required." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: referenceImage.split(",")[1],
              },
            },
            {
              text: "Describe this interior image in detail: layout, furniture, materials, color palette, and mood.",
            },
          ],
        },
      ],
    });

    const geminiCaption = (await result.response).text().trim();
    console.log("📸 Gemini caption:", geminiCaption);

    const messages = [
      {
        role: "system",
        content:
          "You're an expert interior designer helping visualize a design in the user's own room. Generate a clean, structured plan that can be used for image generation.",
      },
      {
        role: "user",
        content: `Reference room: "${geminiCaption}"\nUser wants: "${vibePrompt}"\nReturn layout, furniture, materials, lighting, color palette.`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    const rawPlan = completion.choices?.[0]?.message?.content;
    const visualPrompt = formatVisualPrompt(rawPlan);

    res.json({ reply: rawPlan, formattedPrompt: visualPrompt });
  } catch (err) {
    console.error("💥 Error generating plan:", err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate plan." });
  }
});

// 🎨 Step 2: Generate styled room image using Imagen 3.0 (Vertex AI)
app.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;

  try {
    console.log("🎨 Generating image with Imagen 3.0...");

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_CLOUD_API_KEY, // Vertex AI key
        },
      }
    );

    const base64Image = response.data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Image) throw new Error("No image returned from Imagen");

    res.json({ image: `data:image/png;base64,${base64Image}` });
  } catch (err) {
    console.error("💥 Imagen failed:", err?.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed." });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000 (Gemini + Imagen ready 🧠🎨)");
});
