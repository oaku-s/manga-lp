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
  const lines = text.split("\n");
  const result = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // テーブル行をスキップ（|---|形式）
    if (/^\|[-|\s]+\|$/.test(line)) {
      inTable = true;
      continue;
    }

    // テーブル行を変換
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.split("|").filter((c) => c.trim() !== "");
      if (!inTable) {
        result.push("<table class='md-table'><thead><tr>" +
          cells.map((c) => `<th>${c.trim()}</th>`).join("") +
          "</tr></thead><tbody>");
        inTable = true;
      } else {
        result.push("<tr>" +
          cells.map((c) => `<td>${c.trim()}</td>`).join("") +
          "</tr>");
      }
      continue;
    } else if (inTable) {
      result.push("</tbody></table>");
      inTable = false;
    }

    // 見出し
    if (/^### (.+)$/.test(line)) {
      result.push(line.replace(/^### (.+)$/, "<h3>$1</h3>"));
    } else if (/^## (.+)$/.test(line)) {
      result.push(line.replace(/^## (.+)$/, "<h2>$1</h2>"));
    } else if (/^# (.+)$/.test(line)) {
      result.push(line.replace(/^# (.+)$/, "<h2>$1</h2>"));
    }
    // 引用
    else if (/^> (.+)$/.test(line)) {
      result.push(line.replace(/^> (.+)$/, "<blockquote>$1</blockquote>"));
    } else if (line === ">") {
      result.push("<blockquote>&nbsp;</blockquote>");
    }
    // 区切り線
    else if (/^---$/.test(line)) {
      result.push("<hr>");
    }
    // 空行
    else if (line.trim() === "") {
      result.push("<br>");
    }
    // 通常行
    else {
      // インライン装飾
      line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      result.push(line);
    }
  }

  if (inTable) result.push("</tbody></table>");

  return result.join("\n").replace(/\n/g, "<br>");
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
// LP HTML生成
const generateLpButton = document.getElementById("generateLpButton");
const downloadLpButton = document.getElementById("downloadLpButton");
const lpStatus = document.getElementById("lpStatus");

let generatedLpHtml = "";
let lastMangaJson = null;
let lastGeneratedMangaImages = {}; // { [panelNum]: { base64, mediaType } }

function buildLpPrompt(data) {
  const char = buildCharacterDesc(data);
  const isRecruit = data.lpType === "採用";

  const ctaLabel   = isRecruit ? "今すぐ応募する" : "今すぐ予約・相談する";
  const voiceLabel = isRecruit ? "働いてみた感想" : "お客様の声";
  const reasonHead = isRecruit ? "この職場が選ばれる3つの理由" : "選ばれる3つの理由";

  return `あなたはプロのWebデザイナーです。以下の情報をもとにスマホ対応の漫画LP（HTMLファイル1つ）を生成してください。

【LP種別】${data.lpType}LP
【店名・業種】${data.businessName}
【ターゲット】${data.target}
【強み】${data.strengths}
【解決できる悩み】${data.problemsSolved}
【実績・数字】${data.results}
【キャラクター】${char}
【トーン】${data.tone}
【カラーイメージ】${data.colorImage}

## 出力ルール（必ず守ること）
- DOCTYPE〜</body></html>まで完全に出力する（末尾まで省略しない）
- CSSはstyleタグに最低限だけ記述（装飾は最小限）
- JavaScriptは不要
- max-width:480px、背景ダーク系

## セクション構成（この順番・この数だけ）
1. HERO：キャッチコピー＋サブコピー
2. キャラクター紹介：${char}の一言紹介
3. 縦4コマ漫画（1セットのみ）
4. ${reasonHead}：アイコン絵文字＋理由テキスト×3
5. ${voiceLabel}：1〜2件のダミー体験談
6. CTA：「${ctaLabel}」ボタン
7. フッター：店名・コピーライト

## 4コマ漫画セクションの実装ルール（厳守）
- 4コマは必ず縦1列に積み重ねること。横並び・2列・グリッド2列・カード型は禁止
- grid-template-columns に複数列を指定することは絶対に禁止
- 各コマの構造：画像エリア（上）→ セリフエリア（下）の順
- 以下のCSSクラスをそのままstyleタグに含め、HTMLに適用すること

.koma-strip {
  display: flex;
  flex-direction: column;
  border: 3px solid #2e1f0e;
  border-radius: 8px;
  overflow: hidden;
}
.koma-box {
  min-height: 320px;
  border-bottom: 3px solid #2e1f0e;
  display: flex;
  flex-direction: column;
}
.koma-box:last-child {
  border-bottom: none;
}
.koma-illust {
  min-height: 220px;
  background: #ccc;
}
.koma-serif {
  width: 100%;
  padding: 8px;
  background: #fff;
  font-size: 0.9rem;
}

- HTMLは以下の構造で出力すること（コマ数=4、セリフはヒアリング内容に沿って作成）

<div class="koma-strip">
  <div class="koma-box">
    <div class="koma-illust"></div>
    <div class="koma-serif">（コマ1のセリフ）</div>
  </div>
  <div class="koma-box">
    <div class="koma-illust"></div>
    <div class="koma-serif">（コマ2のセリフ）</div>
  </div>
  <div class="koma-box">
    <div class="koma-illust"></div>
    <div class="koma-serif">（コマ3のセリフ）</div>
  </div>
  <div class="koma-box">
    <div class="koma-illust"></div>
    <div class="koma-serif">（コマ4のセリフ）</div>
  </div>
</div>

HTMLのみ出力してください。説明文・コードブロック記号(\`\`\`)は不要です。`;
}

function injectMangaImages(html) {
  const keys = Object.keys(lastGeneratedMangaImages);
  if (keys.length < 4) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const illust = doc.querySelectorAll(".koma-illust");
  illust.forEach((el, idx) => {
    const panelNum = idx + 1;
    const imgData = lastGeneratedMangaImages[panelNum];
    if (!imgData) return;

    // .koma-num を保持し、残りの子要素を差し替える
    const numEl = el.querySelector(".koma-num");
    el.innerHTML = "";
    if (numEl) el.appendChild(numEl);

    // 画像を追加
    const img = doc.createElement("img");
    img.src = `data:${imgData.mediaType};base64,${imgData.base64}`;
    img.alt = `${panelNum}コマ目`;
    img.className = "koma-generated-image";
    el.appendChild(img);

    // セリフ吹き出しを追加（lastMangaJson の dialogue 配列から取得）
    const panelData = lastMangaJson && lastMangaJson.panels && lastMangaJson.panels[idx];
    const dialogues = (panelData && Array.isArray(panelData.dialogue)) ? panelData.dialogue : [];
    if (dialogues.length > 0) {
      const bubblesDiv = doc.createElement("div");
      bubblesDiv.className = "koma-bubbles";
      dialogues.forEach((line) => {
        const bubble = doc.createElement("div");
        bubble.className = "speech-bubble";
        bubble.textContent = line;
        bubblesDiv.appendChild(bubble);
      });
      el.appendChild(bubblesDiv);
    }

    // 画像差し込み済みを示すクラスを付与
    el.classList.add("koma-illust-with-image");

    // 画像がある場合は .koma-serif（テキストセリフ行）を非表示にする
    const komaBox = el.closest(".koma-box");
    if (komaBox) {
      const serifEl = komaBox.querySelector(".koma-serif");
      if (serifEl) serifEl.style.display = "none";
    }
  });

  // LP HTML内の <style> に必要なCSSを追記
  const styleEl = doc.querySelector("style");
  const imageCSS = `
.koma-illust {
  position: relative;
  overflow: hidden;
}
.koma-generated-image {
  display: block;
  width: 100%;
  height: auto;
}
.koma-bubbles {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 3;
}
.speech-bubble {
  background: rgba(255,255,255,0.94);
  color: #111;
  border: 2px solid #111;
  border-radius: 14px;
  padding: 8px 10px;
  font-size: 0.78rem;
  line-height: 1.5;
  font-weight: 600;
}
`;
  if (styleEl) {
    styleEl.textContent += imageCSS;
  } else {
    const newStyle = doc.createElement("style");
    newStyle.textContent = imageCSS;
    doc.head.appendChild(newStyle);
  }

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

if (generateLpButton) {
  generateLpButton.addEventListener("click", async () => {
    const data = collectFormData();

    if (!data.lpType || !data.businessName) {
      lpStatus.textContent = "先にフォームを入力して「生成する」を実行してください。";
      return;
    }

    generateLpButton.disabled = true;
    generateLpButton.textContent = "生成中...";
    lpStatus.textContent = "Claude AIがLP HTMLを生成中です。少し待ってください...";
    downloadLpButton.hidden = true;

    try {
      const imageData = await getImageData();
      const prompt = buildLpPrompt(data);
      const body = { prompt, mode: "lp" };

      if (imageData) {
        body.imageBase64 = imageData.base64;
        body.imageMediaType = imageData.mediaType;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "APIエラー");

      generatedLpHtml = injectMangaImages(result.result);
      const injected = Object.keys(lastGeneratedMangaImages).length >= 4;
      lpStatus.textContent = injected
        ? "LP HTMLの生成が完了しました！生成済み漫画画像を埋め込みました。ダウンロードして確認してください。"
        : "LP HTMLの生成が完了しました！ダウンロードして確認してください。";
      downloadLpButton.hidden = false;

    } catch (error) {
      lpStatus.textContent = `エラー: ${error.message}`;
    } finally {
      generateLpButton.disabled = false;
      generateLpButton.textContent = "LP HTMLを生成";
    }
  });
}

if (downloadLpButton) {
  downloadLpButton.addEventListener("click", () => {
    if (!generatedLpHtml) return;
    const blob = new Blob(["\uFEFF" + generatedLpHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lp.html";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// \u2500\u2500 4\u30B3\u30DE\u6F2B\u753B\u30C7\u30FC\u30BF\u81EA\u52D5\u751F\u6210 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const generateMangaDataButton = document.getElementById("generateMangaDataButton");
const mangaDataStatus         = document.getElementById("mangaDataStatus");
const mangaCardsContainer     = document.getElementById("mangaCardsContainer");
const generateImagesButton    = document.getElementById("generateImagesButton");
const imageGenStatus          = document.getElementById("imageGenStatus");
const mangaImagesContainer    = document.getElementById("mangaImagesContainer");

function buildMangaJsonPrompt(data) {
  const char = buildCharacterDesc(data);
  const isRecruit = data.lpType === "\u63A1\u7528";

  const purposes = isRecruit
    ? [
        "\u6C42\u8077\u8005\u306E\u60A9\u307F\u30FB\u8EE2\u8077\u3078\u306E\u8FF7\u3044\u3092\u63CF\u304F",
        "\u8077\u5834\u3068\u306E\u51FA\u4F1A\u3044\u30FB\u8208\u5473\u3092\u6301\u3064\u77AC\u9593\u3092\u63CF\u304F",
        "\u8077\u5834\u4F53\u9A13\u30FB\u8077\u5834\u306E\u9B45\u529B\u3092\u7406\u89E3\u3059\u308B\u5834\u9762\u3092\u63CF\u304F",
        "\u5165\u793E\u306E\u6C7A\u610F\u30FB\u7406\u60F3\u306E\u50CD\u304D\u65B9\u3078\u306E\u6E80\u8DB3\u3092\u63CF\u304F",
      ]
    : [
        "\u30BF\u30FC\u30B2\u30C3\u30C8\u306E\u65E5\u5E38\u306E\u60A9\u307F\u30FB\u8FF7\u3044\u3092\u63CF\u304F",
        "\u30B5\u30FC\u30D3\u30B9\u3068\u306E\u51FA\u4F1A\u3044\u30FB\u767A\u898B\u306E\u77AC\u9593\u3092\u63CF\u304F",
        "\u30B5\u30FC\u30D3\u30B9\u4F53\u9A13\u30FB\u9B45\u529B\u3092\u7406\u89E3\u3059\u308B\u5834\u9762\u3092\u63CF\u304F",
        "\u60A9\u307F\u89E3\u6D88\u30FB\u6E80\u8DB3\u30FB\u6B21\u306E\u884C\u52D5\u3092\u63CF\u304F",
      ];

  return `\u3042\u306A\u305F\u306F\u6F2B\u753BLP\u5236\u4F5C\u3068\u753B\u50CF\u751F\u6210\u30D7\u30ED\u30F3\u30D7\u30C8\u8A2D\u8A08\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002\u4EE5\u4E0B\u306E\u30D2\u30A2\u30EA\u30F3\u30B0\u60C5\u5831\u3092\u3082\u3068\u306B\u30014\u30B3\u30DE\u6F2B\u753B\u306E\u53F0\u672C\u30C7\u30FC\u30BF\u3092JSON\u5F62\u5F0F\u3067\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010LP\u7A2E\u5225\u3011${data.lpType}LP
\u3010\u5E97\u540D\u30FB\u696D\u7A2E\u3011${data.businessName}
\u3010\u30BF\u30FC\u30B2\u30C3\u30C8\u3011${data.target}
\u3010\u5F37\u307F\u30FB\u7279\u5FB4\u3011${data.strengths}
\u3010\u89E3\u6C7A\u3067\u304D\u308B\u60A9\u307F\u3011${data.problemsSolved}
\u3010\u5B9F\u7E3E\u30FB\u6570\u5B57\u3011${data.results}
\u3010\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u3011${char}
\u3010\u30C8\u30FC\u30F3\u3011${data.tone}
\u3010\u30AB\u30E9\u30FC\u30A4\u30E1\u30FC\u30B8\u3011${data.colorImage}

## 4\u30B3\u30DE\u306E\u578B\uFF08\u56FA\u5B9A\uFF09
- \u30B3\u30DE1\uFF1A\u60A9\u307F\u30FB\u8FF7\u3044\uFF08${purposes[0]}\uFF09
- \u30B3\u30DE2\uFF1A\u51FA\u4F1A\u3044\u30FB\u767A\u898B\uFF08${purposes[1]}\uFF09
- \u30B3\u30DE3\uFF1A\u4F53\u9A13\u30FB\u9B45\u529B\u7406\u89E3\uFF08${purposes[2]}\uFF09
- \u30B3\u30DE4\uFF1A\u6E80\u8DB3\u30FB\u884C\u52D5\uFF08${purposes[3]}\uFF09

## image_prompt \u306E\u4F5C\u6210\u30EB\u30FC\u30EB
- GPT Image 2\u306B\u305D\u306E\u307E\u307E\u6E21\u305B\u308B\u82F1\u8A9E\u30D7\u30ED\u30F3\u30D7\u30C8\u306B\u3059\u308B
- \u5FC5\u305A\u542B\u3081\u308B\u8981\u7D20\uFF1A\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u5916\u898B / \u80CC\u666F\u30FB\u5834\u6240 / \u8868\u60C5\u30FB\u611F\u60C5 / \u69CB\u56F3 / \u30B9\u30BF\u30A4\u30EB / \u30AB\u30E9\u30FC\u30D1\u30EC\u30C3\u30C8
- \u30B9\u30BF\u30A4\u30EB\u6307\u5B9A\u306F\u5FC5\u305A\u542B\u3081\u308B\uFF1Amanga-style illustration, single vertical panel, no text, no speech bubbles, no watermark
- \u7E26\u95771\u30B3\u30DE\u7528\uFF1Avertical comic panel format, portrait orientation
- \u30BB\u30EA\u30D5\u30FB\u30C6\u30AD\u30B9\u30C8\u3092\u753B\u50CF\u306B\u542B\u3081\u306A\u3044\uFF1Ano dialogue, no text overlay, no captions

## negative_prompt \u306E\u4F5C\u6210\u30EB\u30FC\u30EB
- \u82F1\u8A9E\u3067\u8A18\u8FF0\u3059\u308B
- \u5FC5\u305A\u542B\u3081\u308B\uFF1Atext, speech bubbles, captions, watermark, blurry, low quality, realistic photo, 3D render, multiple panels, horizontal layout, grid layout, collage

## \u51FA\u529B\u5F62\u5F0F

\u4EE5\u4E0B\u306EJSON\u5F62\u5F0F\u306E\u307F\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8AAC\u660E\u6587\u3084\`\`\`\u306F\u4E0D\u8981\u3067\u3059\u3002

{
  "common_character_prompt": "\uFF08\u5168\u30B3\u30DE\u5171\u901A\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u5916\u898B\u63CF\u5199\u3092\u82F1\u8A9E\u3067\u8A18\u8FF0\u3002\u4F8B\uFF1AA friendly Japanese woman in her 30s, short black hair, wearing a white apron, warm smile, anime-style illustration\uFF09",
  "panels": [
    {
      "panel": 1,
      "purpose": "${purposes[0]}",
      "scene": "\u30B7\u30FC\u30F3\u306E\u8AAC\u660E\uFF08\u5834\u6240\u30FB\u72B6\u6CC1\u30FB\u96F0\u56F2\u6C17\u309250\u6587\u5B57\u7A0B\u5EA6\u3067\uFF09",
      "emotion": "\u3053\u306E\u30B3\u30DE\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u611F\u60C5\u30FB\u8868\u60C5\uFF08\u4F8B\uFF1A\u56F0\u60D1\u3057\u305F\u8868\u60C5\u3067\u80A9\u3092\u843D\u3068\u3057\u3066\u3044\u308B\uFF09",
      "dialogue": ["\u30BB\u30EA\u30D51", "\u30BB\u30EA\u30D52"],
      "narration": "\u30CA\u30EC\u30FC\u30B7\u30E7\u30F3\u30FB\u5FC3\u7406\u63CF\u5199\uFF0830\u6587\u5B57\u7A0B\u5EA6\uFF09",
      "image_prompt": "manga-style illustration, single vertical panel, no text, no speech bubbles, [common_character_prompt \u306E\u5185\u5BB9], [\u80CC\u666F\u30FB\u5834\u6240\u306E\u63CF\u5199], [\u8868\u60C5\u30FB\u30DD\u30FC\u30BA], [\u69CB\u56F3], [\u30AB\u30E9\u30FC\u30D1\u30EC\u30C3\u30C8]. Vertical comic panel format, portrait orientation.",
      "negative_prompt": "text, speech bubbles, captions, watermark, blurry, low quality, realistic photo, 3D render, multiple panels, horizontal layout, grid layout, collage"
    },
    {
      "panel": 2,
      "purpose": "${purposes[1]}",
      "scene": "\u30B7\u30FC\u30F3\u306E\u8AAC\u660E",
      "emotion": "\u3053\u306E\u30B3\u30DE\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u611F\u60C5\u30FB\u8868\u60C5",
      "dialogue": ["\u30BB\u30EA\u30D51", "\u30BB\u30EA\u30D52"],
      "narration": "\u30CA\u30EC\u30FC\u30B7\u30E7\u30F3\u30FB\u5FC3\u7406\u63CF\u5199",
      "image_prompt": "manga-style illustration, single vertical panel, no text, no speech bubbles, [character], [background], [emotion], [composition], [color]. Vertical comic panel format, portrait orientation.",
      "negative_prompt": "text, speech bubbles, captions, watermark, blurry, low quality, realistic photo, 3D render, multiple panels, horizontal layout, grid layout, collage"
    },
    {
      "panel": 3,
      "purpose": "${purposes[2]}",
      "scene": "\u30B7\u30FC\u30F3\u306E\u8AAC\u660E",
      "emotion": "\u3053\u306E\u30B3\u30DE\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u611F\u60C5\u30FB\u8868\u60C5",
      "dialogue": ["\u30BB\u30EA\u30D51", "\u30BB\u30EA\u30D52", "\u30BB\u30EA\u30D53"],
      "narration": "\u30CA\u30EC\u30FC\u30B7\u30E7\u30F3\u30FB\u5FC3\u7406\u63CF\u5199",
      "image_prompt": "manga-style illustration, single vertical panel, no text, no speech bubbles, [character], [background], [emotion], [composition], [color]. Vertical comic panel format, portrait orientation.",
      "negative_prompt": "text, speech bubbles, captions, watermark, blurry, low quality, realistic photo, 3D render, multiple panels, horizontal layout, grid layout, collage"
    },
    {
      "panel": 4,
      "purpose": "${purposes[3]}",
      "scene": "\u30B7\u30FC\u30F3\u306E\u8AAC\u660E",
      "emotion": "\u3053\u306E\u30B3\u30DE\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u611F\u60C5\u30FB\u8868\u60C5",
      "dialogue": ["\u30BB\u30EA\u30D51", "\u30BB\u30EA\u30D52"],
      "narration": "\u30CA\u30EC\u30FC\u30B7\u30E7\u30F3\u30FB\u5FC3\u7406\u63CF\u5199",
      "image_prompt": "manga-style illustration, single vertical panel, no text, no speech bubbles, [character], [background], [emotion], [composition], [color]. Vertical comic panel format, portrait orientation.",
      "negative_prompt": "text, speech bubbles, captions, watermark, blurry, low quality, realistic photo, 3D render, multiple panels, horizontal layout, grid layout, collage"
    }
  ]
}`;
}

function renderMangaCards(text) {
  let jsonText = text.trim();
  const match = jsonText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (match) jsonText = match[1];

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    mangaCardsContainer.innerHTML =
      `<p style="color:red;font-size:0.88rem">JSON\u306E\u30D1\u30FC\u30B9\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002Claude API\u306E\u5FDC\u7B54\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002</p>` +
      `<pre class="output-text" style="font-size:0.78rem">${text}</pre>`;
    mangaCardsContainer.hidden = false;
    return;
  }

  // \u5171\u901A\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u30D7\u30ED\u30F3\u30D7\u30C8
  lastMangaJson = parsed;

  const commonCharHtml = parsed.common_character_prompt
    ? `<div class="manga-common-char">
        <div class="manga-common-char-head">
          <span class="manga-common-char-label">\u5171\u901A\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u30D7\u30ED\u30F3\u30D7\u30C8\uFF08\u5168\u30B3\u30DE\u5171\u901A\uFF09</span>
          <button type="button" class="copy-btn manga-copy-btn" data-copy-inline="mangaCommonChar">\u30B3\u30D4\u30FC</button>
        </div>
        <span id="mangaCommonChar" class="manga-common-char-text">${parsed.common_character_prompt}</span>
      </div>`
    : "";

  const panels = parsed.panels || [];
  const cardsHtml = panels.map((panel) => {
    const panelNum = panel.panel ?? panel.panelNumber ?? "?";
    const imagePrompt = panel.image_prompt || panel.imagePrompt || "";
    const negativePrompt = panel.negative_prompt || "";
    const title = panel.purpose || panel.title || "";

    const dialogueHtml = (panel.dialogue || [])
      .map((s) => `<span class="manga-dialogue-item">\u300C${s}\u300D</span>`)
      .join("");

    return `<div class="manga-card">
      <div class="manga-card-header">
        <span class="manga-panel-num">${panelNum}\u30B3\u30DE\u76EE</span>
        <span class="manga-panel-title">${title}</span>
      </div>
      <dl class="manga-card-body">
        <dt>\u76EE\u7684</dt>
        <dd>${panel.purpose || ""}</dd>
        <dt>\u30B7\u30FC\u30F3</dt>
        <dd>${panel.scene || ""}</dd>
        <dt>\u611F\u60C5\u30FB\u8868\u60C5</dt>
        <dd>${panel.emotion || ""}</dd>
        <dt>\u30BB\u30EA\u30D5</dt>
        <dd class="manga-dialogue">${dialogueHtml}</dd>
        <dt>\u30CA\u30EC\u30FC\u30B7\u30E7\u30F3</dt>
        <dd>${panel.narration || ""}</dd>
        <dt>\u753B\u50CF\u30D7\u30ED\u30F3\u30D7\u30C8\uFF08\u82F1\u8A9E\uFF09</dt>
        <dd class="manga-prompt-row">
          <span id="mangaPrompt${panelNum}">${imagePrompt}</span>
          <button type="button" class="copy-btn manga-copy-btn" data-copy-inline="mangaPrompt${panelNum}">\u30B3\u30D4\u30FC</button>
        </dd>
        <dt>\u30CD\u30AC\u30C6\u30A3\u30D6\u30D7\u30ED\u30F3\u30D7\u30C8\uFF08\u82F1\u8A9E\uFF09</dt>
        <dd class="manga-prompt-row">
          <span id="mangaNegPrompt${panelNum}">${negativePrompt}</span>
          <button type="button" class="copy-btn manga-copy-btn" data-copy-inline="mangaNegPrompt${panelNum}">\u30B3\u30D4\u30FC</button>
        </dd>
      </dl>
    </div>`;
  }).join("");

  mangaCardsContainer.innerHTML = `${commonCharHtml}<div class="manga-cards-grid">${cardsHtml}</div>`;
  mangaCardsContainer.hidden = false;

  mangaCardsContainer.querySelectorAll(".manga-copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.copyInline);
      if (!target) return;
      const original = btn.textContent;
      try {
        await navigator.clipboard.writeText(target.textContent || "");
        btn.textContent = "\u30B3\u30D4\u30FC\u6E08\u307F";
      } catch {
        btn.textContent = "\u30B3\u30D4\u30FC\u5931\u6557";
      }
      window.setTimeout(() => { btn.textContent = original; }, 1200);
    });
  });
}

if (generateMangaDataButton) {
  generateMangaDataButton.addEventListener("click", async () => {
    const data = collectFormData();

    if (!data.lpType || !data.businessName) {
      mangaDataStatus.textContent = "\u5148\u306B\u30D5\u30A9\u30FC\u30E0\u3092\u5165\u529B\u3057\u3066\u300C\u751F\u6210\u3059\u308B\u300D\u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      return;
    }

    generateMangaDataButton.disabled = true;
    generateMangaDataButton.textContent = "\u751F\u6210\u4E2D...";
    mangaDataStatus.textContent = "Claude AI\u304C4\u30B3\u30DE\u6F2B\u753B\u30C7\u30FC\u30BF\u3092\u751F\u6210\u4E2D\u3067\u3059...";
    lastMangaJson = null;
    lastGeneratedMangaImages = {};
    generateImagesButton.hidden = true;
    mangaImagesContainer.innerHTML = "";
    mangaImagesContainer.hidden = true;
    imageGenStatus.textContent = "";
    mangaCardsContainer.hidden = true;

    try {
      const imageData = await getImageData();
      const prompt = buildMangaJsonPrompt(data);
      const body = { prompt, mode: "manga-json" };

      if (imageData) {
        body.imageBase64 = imageData.base64;
        body.imageMediaType = imageData.mediaType;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "API\u30A8\u30E9\u30FC");

      mangaDataStatus.textContent = "4\u30B3\u30DE\u6F2B\u753B\u30C7\u30FC\u30BF\u306E\u751F\u6210\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\uFF01";
      renderMangaCards(result.result);
      generateImagesButton.hidden = false;

    } catch (error) {
      mangaDataStatus.textContent = `\u30A8\u30E9\u30FC: ${error.message}`;
    } finally {
      generateMangaDataButton.disabled = false;
      generateMangaDataButton.textContent = "4\u30B3\u30DE\u30C7\u30FC\u30BF\u3092\u751F\u6210";
    }
  });
}

// \u2500\u2500 4\u30B3\u30DE\u753B\u50CF\u751F\u6210\uFF08GPT Image 2\uFF09 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function buildImagePrompt(panel, commonChar) {
  const charPart  = commonChar ? commonChar + ". " : "";
  const avoidPart = panel.negative_prompt ? " Avoid: " + panel.negative_prompt + "." : "";
  return charPart + (panel.image_prompt || "") + avoidPart;
}

async function generateSingleImage(prompt, panelIndex) {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, panelIndex }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "\u753B\u50CFAPI\u30A8\u30E9\u30FC");
  return data;
}

function renderImageCard(panelIndex, imageBase64, mediaType) {
  const card = document.createElement("div");
  card.className = "manga-image-item";
  card.innerHTML = `
    <div class="manga-image-label">${panelIndex}\u30B3\u30DE\u76EE</div>
    <img src="data:${mediaType};base64,${imageBase64}" alt="${panelIndex}\u30B3\u30DE\u76EE\u306E\u6F2B\u753B\u30A4\u30E9\u30B9\u30C8" />
  `;
  mangaImagesContainer.appendChild(card);
  mangaImagesContainer.hidden = false;
}

if (generateImagesButton) {
  generateImagesButton.addEventListener("click", async () => {
    if (!lastMangaJson || !lastMangaJson.panels) {
      imageGenStatus.textContent = "\u5148\u306B\u300C4\u30B3\u30DE\u30C7\u30FC\u30BF\u3092\u751F\u6210\u300D\u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      return;
    }

    generateImagesButton.disabled = true;
    generateImagesButton.textContent = "\u751F\u6210\u4E2D...";
    mangaImagesContainer.innerHTML = "";
    mangaImagesContainer.hidden = true;
    imageGenStatus.textContent = "";
    lastGeneratedMangaImages = {};

    const commonChar = lastMangaJson.common_character_prompt || "";
    const panels = lastMangaJson.panels;
    let successCount = 0;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const panelNum = panel.panel ?? panel.panelNumber ?? (i + 1);
      imageGenStatus.textContent = `${panelNum}\u30B3\u30DE\u76EE\u3092\u751F\u6210\u4E2D... (${i + 1}/${panels.length})`;

      try {
        const prompt = buildImagePrompt(panel, commonChar);
        const result = await generateSingleImage(prompt, panelNum);
        renderImageCard(panelNum, result.imageBase64, result.mediaType || "image/png");
        lastGeneratedMangaImages[panelNum] = { base64: result.imageBase64, mediaType: result.mediaType || "image/png" };
        successCount++;
      } catch (error) {
        const errCard = document.createElement("div");
        errCard.className = "manga-image-item manga-image-error";
        errCard.innerHTML = `
          <div class="manga-image-label">${panelNum}\u30B3\u30DE\u76EE</div>
          <p>${panelNum}\u30B3\u30DE\u76EE\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error.message}</p>
        `;
        mangaImagesContainer.appendChild(errCard);
        mangaImagesContainer.hidden = false;
      }
    }

    imageGenStatus.textContent = `${successCount}/${panels.length}\u679A\u306E\u753B\u50CF\u751F\u6210\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002`;
    generateImagesButton.disabled = false;
    generateImagesButton.textContent = "4\u30B3\u30DE\u753B\u50CF\u3092\u518D\u751F\u6210\uFF08GPT Image 2\uFF09";
  });
}

