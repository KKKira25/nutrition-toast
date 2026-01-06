
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
    maxDuration: 60, // Set timeout to 60 seconds for long AI processing
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { images, model = "gemini-2.5-flash" } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: "No images provided" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Server misconfiguration: Missing GEMINI_API_KEY" });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const genModel = genAI.getGenerativeModel({ model: model });

        // Prepare prompt
        const systemPrompt = `
你是一位講話幽默但專業的營養師。你的任務是分析食品營養標示。
請嚴格依照 JSON 格式回傳 (不要 Markdown)。

JSON 結構要求與之前相同，但請注意內容風格：
1. "productName": 產品名稱。
2. "verdict.title": 請用一句話狠狠點評（例如："這根本是液體麵包！" 或 "放心吃吧，這很乾淨"）。
3. "highlights": 在 "desc" 欄位中，必須包含「生活化比喻」（例如："熱量約等於一碗白飯"、"糖分相當於 5 顆方糖"）。
4. "translations": 將看不懂的化學成分翻譯成白話文。
5. "advice": 給出適合對象、警語、和行動建議。

JSON Structure:
{
  "productName": "String",
  "verdict": { "title": "String", "color": "red|green|yellow" },
  "highlights": [
    { "type": "good|bad", "label": "String", "value": "String", "desc": "String (含比喻)" }
  ],
  "translations": [{ "origin": "String", "simplified": "String", "explain": "String" }],
  "advice": { "target": "String", "warning": "String", "action": "String" }
}
`;

        // Prepare parts
        const parts = [{ text: systemPrompt }];

        // Add images
        for (const img of images) {
            // img.source.data is the base64 string
            // img.source.media_type is the mime type
            if (img.source && img.source.data) {
                parts.push({
                    inlineData: {
                        data: img.source.data,
                        mimeType: img.source.media_type || "image/jpeg"
                    }
                });
            }
        }

        const result = await genModel.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks if any
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(cleanedText);

        return res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("Analysis failed:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
