export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "APIキーが設定されていません" });
  }

  const { prompt, imageBase64, imageMediaType } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "promptが必要です" });
  }

  try {
    // メッセージの中身を組み立て
    const userContent = [];

    // 画像があれば追加
    if (imageBase64 && imageMediaType) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType,
          data: imageBase64,
        },
      });
    }

    // テキストプロンプトを追加
    userContent.push({
      type: "text",
      text: prompt,
    });

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
            content: userContent,
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
