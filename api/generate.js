// ── Gemini API で参考LPを分析し、分析メモのみを返す ────────────────────────────
async function analyzeRefLpWithGemini(refLpUrl, geminiKey, isManga) {
  const analysisPrompt =
    `以下のURLのランディングページを取得・分析し、${isManga ? "漫画LP" : "LP"}の設計に応用できる観点で分析メモを作成してください。\n` +
    `参考LP URL: ${refLpUrl}\n\n` +
    `分析する観点：\n` +
    `1. セクション構成と順序（ファーストビュー〜CTAまでの導線）\n` +
    `2. ファーストビューの見せ方（キャッチコピーの位置、ビジュアルの使い方）\n` +
    `3. 配色・余白・フォントの雰囲気・全体トーン\n` +
    `4. CTAの位置・文言・デザインの傾向\n` +
    `5. 信頼感・安心感を出している要素（実績、顔写真、口コミなど）\n` +
    (isManga
      ? `6. 漫画LPに応用できる演出（視覚的なリズム、コマ割りとの相性など）\n\n`
      : `6. 写真・図版の使い方と情報量の配分（写真が少ない場合に何で見せているか）\n\n`) +
    `出力ルール（必ず守ること）：\n` +
    `- HTMLは生成しない\n` +
    `- CSSは生成しない\n` +
    `- コードブロック（\`\`\`）は使わない\n` +
    `- 参考LPの文章・画像・コードをコピーしない\n` +
    `- 構成・雰囲気・導線設計を抽象化した分析メモのみを出力する\n` +
    `- 日本語で出力する\n` +
    `- 箇条書き・見出しを使って読みやすくまとめる`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tools: [{ url_context: {} }],
        contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
        generationConfig: { maxOutputTokens: 4000 },
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

// ── 分析メモをClaude用プロンプトに追記する ────────────────────────────────────
function appendAnalysisToPrompt(lpPrompt, analysisNote, isManga) {
  const formatConstraints = isManga
    ? `- 既存の漫画LP構造（.koma-illust / .koma-box）を必ず維持すること\n` +
      `- 各コマの画像枠には必ず class="koma-illust" を使うこと\n` +
      `- セリフは画像側に入れる前提なので、HTML側で吹き出しを重ねないこと\n` +
      `- injectMangaImages が動く構造（.koma-illust が4つ以上）を壊さないこと`
    : `- 写真枠（.photo-slot）を残すこと。参考LPに写真が多くても、写真がない状態で成立する作りにすること\n` +
      `- 指定したセクション構成を増減させないこと\n` +
      `- 参考LPの配色をそのまま流用せず、この店の題材から配色を決めること`;

  return (
    lpPrompt +
    `\n\n## 参考LP分析メモ（Gemini AIによる分析）\n` +
    `以下の分析メモを構成・雰囲気・導線設計の参考として活用してください。\n\n` +
    analysisNote +
    `\n\n## 参考LPを活用する際の制約\n` +
    `- 参考LPの文章・画像・コードをコピーしないこと\n` +
    `- 構成・雰囲気・導線設計の参考としてのみ使うこと\n` +
    formatConstraints
  );
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

  const { prompt, imageBase64, imageMediaType, mode, refLpUrl, format } = req.body;
  // format 未指定のリクエストは従来どおり漫画LPとして扱う
  const isManga = format !== "通常";
  if (!prompt) {
    return res.status(400).json({ error: "promptが必要です" });
  }

  try {
    // 参考LP URLあり + Geminiキーあり + LPモード → Geminiで分析してClaudeに渡す
    const geminiKey = process.env.GEMINI_API_KEY;
    if (mode === "lp" && refLpUrl && geminiKey) {
      try {
        const analysisNote = await analyzeRefLpWithGemini(refLpUrl, geminiKey, isManga);
        const enrichedPrompt = appendAnalysisToPrompt(prompt, analysisNote, isManga);
        const text = await generateWithClaude(enrichedPrompt, imageBase64, imageMediaType, mode, claudeKey);
        return res.status(200).json({ result: text, engine: "claude-with-gemini-analysis" });
      } catch (geminiErr) {
        // Gemini分析失敗 → 通常のClaude生成にフォールバック
        console.error("Gemini分析失敗、通常Claude生成にフォールバック:", geminiErr.message);
      }
    }

    // 通常のClaude生成（参考URLなし、またはGemini失敗時）
    const text = await generateWithClaude(prompt, imageBase64, imageMediaType, mode, claudeKey);
    return res.status(200).json({ result: text, engine: "claude" });

  } catch (error) {
    return res.status(500).json({ error: error.message || "サーバーエラー" });
  }
}
