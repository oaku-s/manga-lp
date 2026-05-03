const form = document.getElementById("hearing-form");
const outputSection = document.getElementById("output-section");
const storyOutput = document.getElementById("storyOutput");
const promptOutput = document.getElementById("promptOutput");
const copyOutput = document.getElementById("copyOutput");
const claudeOutput = document.getElementById("claudeOutput");
const generateButton = document.getElementById("generateButton");

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

async function getImageData() {
  const input = document.getElementById("referenceImage");
  if (!input || !input.files || !input.files[0]) return null;

  const file = input.files[0];
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      const mediaType = file.type;
      resolve({ base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function collectFormData() {
  return {
    lpType: getValue("lpType"),
    businessName: getValue("businessName"),
    target: getValue("target"),
    strengths: getValue("strengths"),
    problemsSolved: getValue("problemsSolved"),
    results: getValue("results"),
    characterGender: getValue("characterGender"),
    characterRole: getValue("characterRole"),
    characterPersonality: getValue("characterPersonality"),
    characterAppearance: getValue("characterAppearance"),
    tone: getValue("tone"),
    colorImage: getValue("colorImage"),
  };
}

function buildCharacterDesc(data) {
  return `${data.characterGender}・${data.characterRole}・${data.characterPersonality}・${data.characterAppearance}`;
}

// MarkdownをHTMLに変換
function markdownToHtml(text) {
  return text
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\*\*(.+)\*\*$/gm, "<strong>$1</strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[h|b|p|hr])(.+)$/gm, (match) => {
      if (match.trim() === "") return "";
      if (match.startsWith("<")) return match;
      return match;
    })
    .split("\n")
    .map((line) => {
      if (
        line.startsWith("<h2>") ||
        line.startsWith("<h3>") ||
        line.startsWith("<blockquote>") ||
        line.startsWith("<hr>") ||
        line.trim() === ""
      ) {
        return line;
      }
      return line;
    })
    .join("\n")
    .replace(/\n/g, "<br>");
}

function buildStory(data) {
  const char = buildCharacterDesc(data);

  if (data.lpType === "採用") {
    return [
      "【1コマ目：共感（求職者の悩み）】",
      `${data.target}が、${data.problemsSolved}に関する悩みを抱えている場面。`,
      "転職・就職への不安やストレスを感じている様子を描写する。",
      "",
      "【2コマ目：出会い（職場との出会い）】",
      `${data.businessName}を知るきっかけが生まれ、${data.strengths}に惹かれる。`,
      "まだ少し不安はあるが、ここで働いてみたくなる流れにする。",
      "",
      "【3コマ目：体験（職場の雰囲気）】",
      `${char}の案内で職場を体験し、不安が解消されていく。`,
      `${data.results}などの実績が安心材料として伝わる。`,
      "",
      "【4コマ目：未来（理想の働き方）】",
      `${data.problemsSolved}が解決され、生き生きと働く姿を描く。`,
      `${data.businessName}へ応募・問い合わせしたくなる締めにする。`,
    ].join("\n");
  }

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
    `${char}の案内でサービスを体験し、悩みが軽くなる。`,
    `${data.results}などの実績が安心材料として伝わる。`,
    "",
    "【4コマ目：未来（理想の状態）】",
    `${data.problemsSolved}が改善され、前向きな日常を取り戻した姿を描く。`,
    `${data.businessName}へ問い合わせ・予約したくなる締めにする。`,
  ].join("\n");
}

function buildPanelPrompts(data) {
  const char = buildCharacterDesc(data);
  const common = `カラー漫画、縦読み4コマLP、${data.tone}なトーン、${data.colorImage}、キャラクター設定: ${char}`;

  if (data.lpType === "採用") {
    return [
      `【1コマ目】${common}。ターゲットは${data.target}。転職・就職に悩む日常シーン。`,
      `【2コマ目】${common}。${data.businessName}との出会いの場面。${data.strengths}が自然に伝わる演出。`,
      `【3コマ目】${common}。職場体験シーン。${data.problemsSolved}が解消へ向かう様子。${data.results}を反映。`,
      `【4コマ目】${common}。生き生きと働く未来。${data.businessName}に応募したくなる前向きな締め。`,
    ];
  }

  return [
    `【1コマ目】${common}。ターゲットは${data.target}。悩みで困っている日常シーン。`,
    `【2コマ目】${common}。${data.businessName}との出会いの場面。${data.strengths}が自然に伝わる演出。`,
    `【3コマ目】${common}。サービス体験シーン。${data.problemsSolved}が改善へ向かう手応えを描写。${data.results}を反映。`,
    `【4コマ目】${common}。悩み解消後の明るい未来。${data.businessName}に相談したくなる締め。`,
  ];
}

function buildCatchCopies(data) {
  if (data.lpType === "採用") {
    return [
      `1. 「${data.problemsSolved}に悩む${data.target}へ。${data.businessName}で理想の働き方を。」`,
      `2. 「${data.strengths}が整った${data.businessName}。${data.results}が安心の証。」`,
      `3. 「もう妥協しない。${data.problemsSolved}に悩むあなたに、${data.businessName}という選択肢を。」`,
    ].join("\n");
  }

  return [
    `1. 「${data.problemsSolved}に悩む${data.target}へ。${data.businessName}が毎日を変える。」`,
    `2. 「${data.strengths}で選ばれる${data.businessName}。${data.results}が安心の理由。」`,
    `3. 「もう我慢しない。${data.problemsSolved}に、${data.businessName}という答えを。」`,
  ].join("\n");
}

function buildClaudePrompt(data, hasImage) {
  const char = buildCharacterDesc(data);
  const imageNote = hasImage ? "\n※添付画像を参考にキャラクターの見た目・雰囲気を反映してください。" : "";

  if (data.lpType === "採用") {
    return `あなたは採用LP制作のプロのコピーライターです。
以下のヒアリング情報をもとに、求職者向け縦読み4コマ漫画採用LPの提案を作成してください。${imageNote}

【店名・業種】${data.businessName}
【ターゲット求職者】${data.target}
【職場の強み・特徴】${data.strengths}
【解決できる悩み（求職者の）】${data.problemsSolved}
【実績・数字】${data.results}
【キャラクター】${char}
【トーン】${data.tone}
【カラーイメージ】${data.colorImage}

以下を出力してください：

## 4コマ漫画のセリフ案
各コマに2〜3個の吹き出しセリフを、求職者に刺さる自然な日本語で提案してください。

## キャッチコピー（5パターン）
転職・就職を考える求職者の心に刺さる、短くて力強いキャッチコピーを5つ。

## 採用LP構成アドバイス
この職場の魅力を最大限に伝える採用LP構成の提案（3点）。`;
  }

  return `あなたは漫画LP制作のプロのコピーライターです。
以下のヒアリング情報をもとに、飲食店・地元ビジネス向けの縦読み4コマ漫画LPの改善提案とセリフ案を作成してください。${imageNote}

【店名・業種】${data.businessName}
【ターゲット】${data.target}
【強み・特徴】${data.strengths}
【解決できる悩み】${data.problemsSolved}
【実績・数字】${data.results}
【キャラクター】${char}
【トーン】${data.tone}
【カラーイメージ】${data.colorImage}

以下を出力してください：

## 4コマ漫画のセリフ案
各コマに2〜3個の吹き出しセリフを、自然な日本語で提案してください。

## キャッチコピー（5パターン）
ターゲットの心に刺さる、短くて力強いキャッチコピーを5つ。

## LP構成アドバイス
この店舗の強みを最大限に活かすLP構成の提案（3点）。`;
}

async function callClaudeAPI(prompt, imageData) {
  const body = { prompt };
  if (imageData) {
    body.imageBase64 = imageData.base64;
    body.imageMediaType = imageData.mediaType;
  }

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "APIエラーが発生しました");
  return data.result;
}

function setClaudeLoading(hasImage) {
  claudeOutput.className = "output-text";
  claudeOutput.innerHTML = `<span class="spinner"></span>${hasImage ? "画像を読み込んでClaude AIが分析中..." : "Claude AIが分析中..."}`;
}

function setClaudeResult(text) {
  claudeOutput.className = "claude-result";
  claudeOutput.innerHTML = markdownToHtml(text);
}

function setClaudeError(message) {
  claudeOutput.className = "output-text";
  claudeOutput.textContent = `エラー: ${message}`;
}

async function renderOutputs() {
  const data = collectFormData();
  const panelPrompts = buildPanelPrompts(data);
  const imageData = await getImageData();

  storyOutput.textContent = buildStory(data);
  promptOutput.textContent = panelPrompts.join("\n\n");
  copyOutput.textContent = buildCatchCopies(data);
  outputSection.hidden = false;

  setClaudeLoading(!!imageData);

  try {
    const claudePrompt = buildClaudePrompt(data, !!imageData);
    const result = await callClaudeAPI(claudePrompt, imageData);
    setClaudeResult(result);
  } catch (error) {
    setClaudeError(error.message);
  }

  outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (form && generateButton) {
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

document.querySelectorAll(".copy-btn[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.dataset.copyTarget;
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    const originalText = button.textContent;
    try {
      await navigator.clipboard.writeText(target.textContent || "");
      button.textContent = "コピー済み";
    } catch {
      button.textContent = "コピー失敗";
    }
    window.setTimeout(() => { button.textContent = originalText; }, 1200);
  });
});
