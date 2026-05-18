export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OpenAI APIキーが設定されていません" });
  }

  const { prompt, panelIndex } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "promptが必要です" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: "1024x1536",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI APIエラー",
      });
    }

    const imageBase64 = data.data?.[0]?.b64_json || "";
    if (!imageBase64) {
      return res.status(500).json({ error: "画像データが取得できませんでした" });
    }

    return res.status(200).json({
      imageBase64,
      mediaType: "image/png",
      panelIndex,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || "サーバーエラー" });
  }
}
