const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

const form = document.getElementById("hearing-form");
const outputSection = document.getElementById("output-section");
const storyOutput = document.getElementById("storyOutput");
const promptOutput = document.getElementById("promptOutput");
const copyOutput = document.getElementById("copyOutput");
const imageStatus = document.getElementById("imageStatus");
const generatedImage = document.getElementById("generatedImage");
const downloadImageButton = document.getElementById("downloadImageButton");
const generateButton = document.getElementById("generateButton");

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function collectFormData() {
  return {
    apiKey: getValue("apiKey"),
    businessName: getValue("businessName"),
    target: getValue("target"),
    strengths: getValue("strengths"),
    problemsSolved: getValue("problemsSolved"),
    results: getValue("results"),
    characterImage: getValue("characterImage"),
    tone: getValue("tone"),
    colorImage: getValue("colorImage"),
  };
}

function buildStory(data) {
  return [
    "【1コマ目：共感（悩みの提示）】",
    `${data.target}が、${data.problemsSolved}に関する悩みを抱えている場面。`,
    "日常の中で不便やストレスを感じている様子を描写する。",
    "",
    "【2コマ目：出会い（解決のきっかけ）】",
    `${data.businessName}を知るきっかけが生まれ、${data.strengths}に惹かれる。`,
    "まだ少し不安はあるが、試してみたくなる流れにする。",
    "",
    "【3コマ目：体験（変化の実感）】",
    `${data.characterImage}の案内でサービスを体験し、悩みが軽くなる。`,
    `${data.results}などの実績が安心材料として伝わる。`,
    "",
    "【4コマ目：未来（理想の状態）】",
    `${data.problemsSolved}が改善され、前向きな日常を取り戻した姿を描く。`,
    `${data.businessName}へ問い合わせ・予約したくなる締めにする。`,
  ].join("\n");
}

function buildPanelPrompts(data) {
  const common = `カラー漫画、縦読み4コマLP、${data.tone}なトーン、${data.colorImage}、キャラクター設定: ${data.characterImage}`;

  return [
    `【1コマ目】${common}。ターゲットは${data.target}。悩みで困っている日常シーン。表情は少し暗め、感情が伝わる構図。吹き出しのセリフは自然な日本語のみ。`,
    `【2コマ目】${common}。${data.businessName}との出会いの場面。${data.strengths}が自然に伝わる店頭・会話・スマホ閲覧演出。画面内テキストは日本語のみ。`,
    `【3コマ目】${common}。サービス体験シーン。${data.problemsSolved}が改善へ向かう手応えを描写。${data.results}を日本語の説明として自然に反映。`,
    `【4コマ目】${common}。悩み解消後の明るい未来。笑顔で行動する主人公。${data.businessName}に相談したくなる前向きな締め。表示テキストはすべて日本語。`,
  ];
}

function buildImagePromptText(panelPrompts) {
  return panelPrompts.join("\n\n");
}

function buildCatchCopies(data) {
  return [
    `1. 「${data.problemsSolved}に悩む${data.target}へ。${data.businessName}が毎日を変える。」`,
    `2. 「${data.strengths}で選ばれる${data.businessName}。${data.results}が安心の理由。」`,
    `3. 「もう我慢しない。${data.problemsSolved}に、${data.businessName}という答えを。」`,
  ].join("\n");
}

function buildGeminiPrompt(data, panelPrompts) {
  return [
    `日本の漫画LP向けに、1枚の縦長キャンバスへ縦読み4コマ漫画を生成してください。`,
    `レイアウトは必ず縦1列で、4コマを上から下へ一直線に並べること。2列や格子状の配置は禁止。`,
    `各コマの境界線をはっきり描き、1コマ目から4コマ目へ自然に読み進められる構図にすること。`,
    `フルカラーのキャラクターイラスト、日本の商用LP向け、スマホで読みやすい視認性を重視すること。`,
    `主人公と主要キャラクターの見た目は4コマを通して一貫させること。`,
    `吹き出しを必ず入れ、吹き出し内の文字は自然で読みやすい日本語のみを使うこと。`,
    `英語、ローマ字、不自然な文字化け風テキスト、意味のない記号列は禁止。`,
    `日本の広告漫画らしい短い日本語のセリフで、各コマ1つから2つ程度の吹き出しに収めること。`,
    `店名・ブランド文脈: ${data.businessName}`,
    `ターゲット: ${data.target}`,
    `強み: ${data.strengths}`,
    `解決できる悩み: ${data.problemsSolved}`,
    `実績・数字: ${data.results}`,
    `キャラクターのイメージ: ${data.characterImage}`,
    `トーン: ${data.tone}`,
    `カラーイメージ: ${data.colorImage}`,
    `コマごとの内容:`,
    ...panelPrompts,
  ].join("\n");
}

function setImageState(message, imageUrl = "") {
  imageStatus.textContent = message;

  if (imageUrl) {
    generatedImage.src = imageUrl;
    generatedImage.hidden = false;
    downloadImageButton.hidden = false;
    downloadImageButton.onclick = () => {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    };
    return;
  }

  generatedImage.hidden = true;
  generatedImage.removeAttribute("src");
  downloadImageButton.hidden = true;
  downloadImageButton.onclick = null;
}

function extractImageData(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inlineData = part.inlineData || part.inline_data;

    if (inlineData?.data) {
      return {
        mimeType: inlineData.mimeType || inlineData.mime_type || "image/png",
        data: inlineData.data,
      };
    }
  }

  return null;
}

async function generateImage(apiKey, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "9:16",
          imageSize: "1K",
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error?.message || "画像生成に失敗しました。";
    throw new Error(message);
  }

  const imageData = extractImageData(payload);

  if (!imageData) {
    throw new Error("Geminiのレスポンスから画像データを取得できませんでした。");
  }

  return `data:${imageData.mimeType};base64,${imageData.data}`;
}

async function renderOutputs() {
  const data = collectFormData();
  const panelPrompts = buildPanelPrompts(data);

  storyOutput.textContent = buildStory(data);
  promptOutput.textContent = buildImagePromptText(panelPrompts);
  copyOutput.textContent = buildCatchCopies(data);
  outputSection.hidden = false;

  if (!data.apiKey) {
    setImageState("APIキー未入力のため、文案のみ生成しました。画像も生成する場合はGemini APIキーを入力してください。");
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  setImageState("Geminiで縦読み4コマ画像を生成しています。少し待ってください...");

  try {
    const imagePrompt = buildGeminiPrompt(data, panelPrompts);
    const imageUrl = await generateImage(data.apiKey, imagePrompt);
    setImageState("Geminiで縦読み4コマ画像を生成しました。", imageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "画像生成に失敗しました。";
    setImageState(`画像生成に失敗しました: ${message}`);
  }

  outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (form && outputSection && storyOutput && promptOutput && copyOutput && generateButton) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    generateButton.disabled = true;
    generateButton.textContent = "生成中...";

    try {
      await renderOutputs();
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = "生成する";
    }
  });
}

async function copyText(button) {
  const targetId = button.dataset.copyTarget;
  const target = targetId ? document.getElementById(targetId) : null;

  if (!target) {
    return;
  }

  const originalText = button.textContent;

  try {
    await navigator.clipboard.writeText(target.textContent || "");
    button.textContent = "コピー済み";
  } catch (error) {
    button.textContent = "コピー失敗";
  }

  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1200);
}

document.querySelectorAll(".copy-btn[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => {
    copyText(button);
  });
});
