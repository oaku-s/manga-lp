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

function collectFormData() {
  return {
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
    `【1コマ目】${common}。ターゲットは${data.target}。悩みで困っている日常シーン。`,
    `【2コマ目】${common}。${data.businessName}との出会いの場面。${data.strengths}が自然に伝わる演出。`,
    `【3コマ目】${common}。サービス体験シーン。${data.problemsSolved}が改善へ向かう手応えを描写。${data.results}を反映。`,
    `【4コマ目】${common}。悩み解消後の明るい未来。${data.businessName}に相談したくなる締め。`,
  ];
}

function buildCatchCopies(data) {
  return [
    `1. 「${data.problemsSolved}に悩む${data.target}へ。${data.businessName}が毎日を変える。」`,
    `2. 「${data.strengths}で選ばれる${data.businessName}。${data.results}が安心の理由。」`,
    `3. 「もう我慢しない。${data.problemsSolved}に、${data.businessName}という答えを。」`,
  ].join("\n");
}

function buildClaudePrompt(data) {
  return `あなたは漫画LP制作のプロのコピーライターです。
以下のヒアリング情報をもとに、飲食店・地元ビジネス向けの縦読み4コマ漫画LPの改善提案とセリフ案を作成してください。

【店名・業種】${data.businessName}
【ターゲット】${data.target}
【強み・特徴】${data.strengths}
【解決できる悩み】${data.problemsSolved}
【実績・数字】${data.results}
【キャラクター】${data.characterImage}
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

async function callClaudeAPI(prompt) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "APIエラーが発生しました");
  }

  return data.result;
}

async function renderOutputs() {
  const data = collectFormData();
  const panelPrompts = buildPanelPrompts(data);

  storyOutput.textContent = buildStory(data);
  promptOutput.textContent = panelPrompts.join("\n\n");
  copyOutput.textContent = buildCatchCopies(data);
  outputSection.hidden = false;

  claudeOutput.textContent = "Claude AIが分析中...";

  try {
    const claudePrompt = buildClaudePrompt(data);
    const result = await callClaudeAPI(claudePrompt);
    claudeOutput.textContent = result;
  } catch (error) {
    claudeOutput.textContent = `エラー: ${error.message}`;
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
