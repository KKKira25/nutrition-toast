const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const Anthropic = require('@anthropic-ai/sdk'); // 引入 Anthropic SDK
const cors = require('cors')({ origin: true }); // 允許跨域

// 從環境變數讀取 Claude API Key
// 請確保您已經在 Firebase 環境變數中設定了 CLAUDE_API_KEY
// 設定指令: firebase functions:config:set claude.key="YOUR_CLAUDE_API_KEY"
// 並在部署前透過 firebase functions:config:get > .runtimeconfig.json (如果是本地模擬)
// 新版 V2 建議使用 defineSecret 或 process.env，這裡使用 process.env
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

exports.analyzeImage = onRequest({ cors: true }, async (req, res) => {
  cors(req, res, async () => {
    try {
      // 1. 檢查請求方法
      if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
      }

      const { images } = req.body; // 接收前端傳來的圖片陣列

      if (!images || images.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      if (!CLAUDE_API_KEY) {
        logger.error("Missing Claude API Key");
        return res.status(500).json({ error: "Server configuration error" });
      }

      // 2. 初始化 Claude 客戶端
      const anthropic = new Anthropic({
        apiKey: CLAUDE_API_KEY,
      });

      // 3. 準備提示詞 (Prompt)
      const promptText = `
        你是一位風格有點幽默但專業的營養師。你的任務是讀取食品營養標示圖片（可能有多張，包含正面包裝或背面成分表），並將其綜合分析，轉譯為一般大眾能秒懂的資訊就好，不會對一般大眾說:"若不懂可以找你"這種話。
        請分析圖片中的數值（熱量、脂肪、碳水、成分），並嚴格依照 JSON 格式回傳，不要有 Markdown 標記 (不要寫 \`\`\`json)。
        
        JSON 結構如下：
        {
          "productName": "產品名稱",
          "verdict": { 
            "title": "一句話短評 (請生動一點)", 
            "color": "red" (不健康) 或 "green" (健康) 或 "yellow" (普通)
          },
          "highlights": [
            { "type": "good", "label": "優點標籤", "value": "數值", "desc": "短評" },
            { "type": "bad", "label": "缺點標籤", "value": "數值", "desc": "短評" }
          ],
          "translations": [
            { "origin": "化學成分原文", "simplified": "白話譯名", "explain": "簡單解釋作用" }
          ],
          "advice": { "target": "適合誰", "warning": "不適合誰", "action": "怎麼吃" }
        }
      `;

      // 4. 呼叫 Claude API
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514", // 指定模型
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              ...images, // 展開圖片陣列
              {
                type: "text",
                text: promptText
              }
            ]
          }
        ]
      });

      const responseText = msg.content[0].text;
      
      // 5. 清理並解析 JSON
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonStr);

      // 6. 回傳結果給前端
      res.json(data);

    } catch (error) {
      logger.error("Analysis Error", error);
      res.status(500).json({ 
        error: error.message || "Internal Server Error",
        details: error.toString()
      });
    }
  });
});