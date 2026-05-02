export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
  
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "APIキーが設定されていません" });
    }
  
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "promptが必要です" });
    }
  
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.message || "Claude APIエラー" });
      }
  
      const text = data.content?.[0]?.text || "";
      return res.status(200).json({ result: text });
  
    } catch (error) {
      return res.status(500).json({ error: error.message || "サーバーエラー" });
    }
  }
