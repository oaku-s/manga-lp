// ── Gemini API で LP を生成（参考URL付き） ────────────────────────────────────
async function generateLpWithGemini(lpPrompt, refLpUrl, geminiKey) {
  const fullPrompt =
    `あなたはプロのWebデザイナーです。以下の2ステップでLP HTMLを生成してください。\n\n` +
    `【ステップ1：参考LP分析】\n` +
    `以下のURLのランディングページを取得・分析し、次の観点を把握してください：\n` +
    `参考LP URL: ${refLpUrl}\n\n` +
    `分析観点：\n` +
    `- セクションの構成と順序（ユーザーの誘導導線）\n` +
    `- 配色・余白・フォントの雰囲気・全体トーン\n` +
    `- CTAの位置・文言・デザインの傾向\n` +
    `- ヒーローセクションのレイアウトとビジュアルの扱い方\n` +
    `- キャラクター・人物の見せ方\n\n` +
    `重要な制約：\n` +
    `- 参考LPの文章・画像・コードを一切コピーしないこと\n` +
    `- 構成・雰囲気・導線設計だけを参考にすること\n` +
    `- ターゲット・業種・コンセプトは以下のヒアリング情報を優先すること\n\n` +
    `【ステップ2：LP HTML生成】\n` +
    `参考LPの構成・雰囲気を取り入れながら、以下のヒアリング情報に合わせたLP HTMLを生成してください。\n\n` +
    lpPrompt;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tools: [{ url_context: {} }],
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 16000 },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini APIエラー");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini APIの応答が空です");
  return text;
}

// ── Claude API で生成（既存処理） ─────────────────────────────────────────────
async function generateWithClaude(prompt, imageBase64, imageMediaType, mode, claudeKey) {
  const userContent = [];

  if (imageBase64 && imageMediaType) {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
    });
  }
  userContent.push({ type: "text", text: prompt });

  const maxTokens = mode === "lp" ? 12000 : mode === "manga-json" ? 4000 : 2000;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Claude APIエラー");
  }

  const text = data.content?.[0]?.text || "";
  return text;
}

// ── メインハンドラ ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeKey) {
    return res.status(500).json({ error: "APIキーが設定されていません" });
  }

  const { prompt, imageBase64, imageMediaType, mode, refLpUrl } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "promptが必要です" });
  }

  try {
    // LP生成 + 参考URL + Geminiキーが揃っている場合は Gemini で試みる
    const geminiKey = process.env.GEMINI_API_KEY;
    if (mode === "lp" && refLpUrl && geminiKey) {
      try {
        const text = await generateLpWithGemini(prompt, refLpUrl, geminiKey);
        return res.status(200).json({ result: text, engine: "gemini" });
      } catch (geminiErr) {
        // Gemini 失敗 → Claude にフォールバック
        console.error("Gemini LP生成失敗、Claudeにフォールバック:", geminiErr.message);
      }
    }

    // 通常の Claude 生成
    const text = await generateWithClaude(prompt, imageBase64, imageMediaType, mode, claudeKey);
    return res.status(200).json({ result: text, engine: "claude" });

  } catch (error) {
    return res.status(500).json({ error: error.message || "サーバーエラー" });
  }
}
