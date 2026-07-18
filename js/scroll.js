const form = document.querySelector("#hearing-form");
const resultSection = document.querySelector("#result");
const storyOutput = document.querySelector("#story");
const promptsOutput = document.querySelector("#prompts");
const copiesOutput = document.querySelector("#copies");
const copyButtons = document.querySelectorAll(".copy-btn[data-copy-target]");
const presetButtons = document.querySelectorAll(".preset-btn");
const formError = document.querySelector("#form-error");
const previewRoot = document.querySelector("#lp-preview");
const downloadButton = document.querySelector("#download-html");
const htmlCheckOutput = document.querySelector("#html-check");
const htmlSource = document.querySelector("#generated-html-source");

let generatedHtml = "";
let generatedFileName = "manga-lp.html";
let generatedWarnings = [];

const fallbackPanelImagePaths = [
  "images/panels/p1.png",
  "images/panels/p2.png",
  "images/panels/p3.png",
  "images/panels/p4.png",
];

const panelImagePathSets = {
  recruiting: [
    "images/recruiting/p1.png",
    "images/recruiting/p2.png",
    "images/recruiting/p3.png",
    "images/recruiting/p4.png",
  ],
  leadgen: [
    "images/leadgen/p1.png",
    "images/leadgen/p2.png",
    "images/leadgen/p3.png",
    "images/leadgen/p4.png",
  ],
};

const panelImageCache = new Map();

const sampleData = {
  recruiting: {
    isSample: true,
    lpType: "recruiting",
    business: "サンプルラーメン まる福",
    service: "ホール・調理補助スタッフ",
    target: "未経験の学生、フリーター。初めての飲食バイトで、人間関係やシフトに不安がある方",
    problem: "人間関係がこわい、未経験で迷惑をかけそう、学校や予定とシフトを両立できるか不安",
    strength: "研修あり、シフト相談可、まかないあり。最初は簡単な案内や片付けから始められます",
    achievement: "このLPはサンプルです。実在店舗の実績や条件を示すものではありません",
    character: "明るい店長と、初めて応募する新人スタッフ",
    tone: "明るく親しみやすい",
    color: "赤と黄色を基調に、ラーメン店らしい活気ある印象",
    ctaLabel: "応募フォームへ進む",
    ctaUrl: "https://example.com/",
  },
  leadgen: {
    isSample: true,
    lpType: "leadgen",
    business: "サンプルラーメン まる福",
    service: "こだわりスープと自家製麺のラーメン",
    target: "近隣のラーメン好き、初回来店者。店選びで失敗したくない方",
    problem: "初めてのお店で味や雰囲気が分からず、外したくないと思っている",
    strength: "こだわりスープ、自家製麺、初回来店向けの限定特典を分かりやすく案内できます",
    achievement: "このLPはサンプルです。口コミや来店実績はイメージ表現であり、実在店舗の実績ではありません",
    character: "ラーメン好きのお客様と、元気なスタッフ",
    tone: "食欲をそそる、親しみやすい",
    color: "赤、白、黒を基調に、湯気と活気が伝わる印象",
    ctaLabel: "来店・予約情報を見る",
    ctaUrl: "https://example.com/",
  },
};

const getValue = (formData, name) => (formData.get(name) || "").toString().trim();

const normalizeInput = (formData) => ({
  isSample: true,
  lpType: getValue(formData, "lpType") || "recruiting",
  business: getValue(formData, "business"),
  service: getValue(formData, "service"),
  target: getValue(formData, "target"),
  problem: getValue(formData, "problem"),
  strength: getValue(formData, "strength"),
  achievement: getValue(formData, "achievement"),
  character: getValue(formData, "character"),
  tone: getValue(formData, "tone"),
  color: getValue(formData, "color"),
  cta: {
    label: getValue(formData, "ctaLabel"),
    url: getValue(formData, "ctaUrl"),
  },
});

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const nl2br = (value) => escapeHtml(value).replaceAll("\n", "<br>");

const setError = (message) => {
  if (formError) {
    formError.textContent = message;
  }
};

const setCheckResult = (warnings) => {
  generatedWarnings = warnings;
  if (!htmlCheckOutput) {
    return;
  }

  if (warnings.length === 0) {
    htmlCheckOutput.textContent = "OK: 生成HTMLに既知の問題は見つかりませんでした。";
    htmlCheckOutput.classList.remove("has-warning");
    return;
  }

  htmlCheckOutput.textContent = warnings.map((warning) => `警告: ${warning}`).join("\n");
  htmlCheckOutput.classList.add("has-warning");
};

const validateData = (data) => {
  const required = [
    data.lpType,
    data.business,
    data.service,
    data.target,
    data.problem,
    data.strength,
    data.achievement,
    data.character,
    data.tone,
    data.color,
    data.cta.label,
  ];

  if (required.some((value) => !value)) {
    return "すべての項目を入力してください。";
  }

  if (!data.cta.url) {
    return "CTAリンクを入力してください。";
  }

  if (data.cta.url === "#") {
    return "CTAリンクに # は使えません。";
  }

  if (!/^(https?:\/\/|mailto:|tel:|\/)/.test(data.cta.url)) {
    return "CTAリンクは https://、http://、mailto:、tel:、/ から始まる形式で入力してください。";
  }

  return "";
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const blobToOptimizedImageDataUrl = (blob) =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const maxWidth = 720;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.onerror = async () => {
      URL.revokeObjectURL(objectUrl);
      resolve(await blobToDataUrl(blob));
    };
    image.src = objectUrl;
  });

const loadImageAsDataUrl = async (path) => {
  if (panelImageCache.has(path)) {
    return panelImageCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} を読み込めませんでした。`);
  }

  const dataUrl = await blobToOptimizedImageDataUrl(await response.blob());
  panelImageCache.set(path, dataUrl);
  return dataUrl;
};

const loadImageWithFallback = async (primaryPath, fallbackPath) => {
  try {
    return await loadImageAsDataUrl(primaryPath);
  } catch (error) {
    return loadImageAsDataUrl(fallbackPath);
  }
};

const getPanelImagePaths = (lpType) => panelImagePathSets[lpType] || panelImagePathSets.recruiting;

const loadPanelImageSources = async (lpType) =>
  Promise.all(
    getPanelImagePaths(lpType).map((primaryPath, index) =>
      loadImageWithFallback(primaryPath, fallbackPanelImagePaths[index])
    )
  );

const getInlineStyles = () => {
  const rules = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        rules.push(rule.cssText);
      }
    } catch (error) {
      // Same-origin CSS should be readable; ignore anything the browser blocks.
    }
  }
  return rules.join("\n");
};

const splitList = (value) =>
  String(value || "")
    .split(/[、,。\n・\/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const firstItem = (value, fallback) => splitList(value)[0] || fallback;

const cleanSentence = (value, fallback) =>
  (String(value || "").trim().replace(/[。．.]+$/g, "") || fallback);

const buildMangaPanelData = (data, imageSources = []) => {
  const target = data.target || "読者";
  const problem = data.problem || "迷いや不安";
  const strength = data.strength || "魅力";
  const achievement = data.achievement || "安心材料";
  const service = data.service || "サービス";
  const business = data.business || "お店";
  const character = data.character || "案内役";
  const ctaLabel = data.cta?.label || "詳しく見る";
  const ctaSubject = ctaLabel.replace(/へ進む$/, "").replace(/を見る$/, "").replace(/を申し込む$/, "").replace(/を予約する$/, "").trim() || ctaLabel;
  const placeLabel = /店|ラーメン|飲食|カフェ|レストラン|居酒屋|美容室|サロン/.test(business) ? "店" : "サービス";
  const visitLabel = placeLabel === "店" ? "来店" : "利用";
  const firstProblem = firstItem(problem, data.lpType === "recruiting" ? "未経験の不安" : `${placeLabel}選びの不安`);
  const firstStrength = firstItem(strength, data.lpType === "recruiting" ? "研修あり" : "こだわり");
  const proofSentence = cleanSentence(achievement, "安心材料を確認");
  const ctaDialogue = ctaLabel
    .replace(/を申し込む$/, "を申し込んでみよう")
    .replace(/を予約する$/, "を予約してみよう")
    .replace(/へ進む$/, "へ進んでみよう")
    .replace(/を見る$/, "を確認してみよう");
  const finalDialogue = ctaDialogue === ctaLabel ? `まずは${ctaSubject}を確認してみよう` : ctaDialogue;

  const panels = data.lpType === "recruiting"
    ? [
        {
          title: "応募前の不安",
          narration: `${target}が「${problem}」を抱え、${business}の前で応募を迷っている。`,
          dialogue: `「${firstProblem}、本当に大丈夫かな...」`,
          emotion: "worry",
        },
        {
          title: "募集内容を知って安心",
          narration: `${service}の募集を知り、${strength}という働きやすさに気づく。`,
          dialogue: `「${firstStrength}なら、最初の一歩を踏み出せそう」`,
          emotion: "notice",
        },
        {
          title: `${firstStrength}を体験`,
          narration: `${character}や先輩に教わりながら、${firstStrength}を通じて${service}の仕事を具体的に覚えていく。`,
          dialogue: "「教わりながらなら、少しずつ成長できそう」",
          emotion: "hope",
        },
        {
          title: "応募を決意",
          narration: `${proofSentence}。不安が前向きな気持ちへ変わる。`,
          dialogue: `「${finalDialogue}」`,
          emotion: "decide",
        },
      ]
    : [
        {
          title: `${placeLabel}選びで迷う`,
          narration: `${target}が「${problem}」と感じ、初めて${visitLabel}する${placeLabel}を決めきれずにいる。`,
          dialogue: `「${firstProblem}。失敗したくないな」`,
          emotion: "worry",
        },
        {
          title: "魅力を知る",
          narration: `${business}の${service}を知り、${strength}が来店前の判断材料になる。`,
          dialogue: `「${firstStrength}なら、期待できそう」`,
          emotion: "notice",
        },
        {
          title: `${firstStrength}を体感`,
          narration: `${firstStrength}を通じて${service}の魅力を体験し、来店前の不安が満足感へ変わる。`,
          dialogue: "「自分に合いそう。相談してみたい」",
          emotion: "delight",
        },
        {
          title: "来店・予約を決意",
          narration: `${proofSentence}。次の行動として${ctaLabel}。`,
          dialogue: `「${finalDialogue}」`,
          emotion: "decide",
        },
      ];

  return panels.map((panel, index) => ({
    ...panel,
    imagePath: imageSources[index] || "",
  }));
};

const buildStory = (data) =>
  buildMangaPanelData(data)
    .map((panel, index) => [
      `【${index + 1}コマ目：${panel.title}】`,
      `ナレーション：${panel.narration}`,
      `セリフ：${panel.dialogue}`,
      `感情：${panel.emotion}`,
    ].join("\n"))
    .join("\n\n");



const buildImagePrompts = (data) => {
  const { lpType, business, service, target, strength, problem, achievement, character, tone, color } = data;
  const baseStyle = `漫画LP向けの縦長1コマ構図、スマホ表示最適化、読みやすい吹き出し、${tone}な演出、カラーは${color}。`;

  if (lpType === "recruiting") {
    return [
      "【コマ1】",
      `「${problem}」に不安を感じる${target}。主人公は${character}。${baseStyle} 応募前の迷いが伝わる。`,
      "",
      "【コマ2】",
      `${target}が${business}の${service}募集を知る。${strength}がひと目でわかる。${baseStyle}`,
      "",
      "【コマ3】",
      `${business}で働く体験シーン。先輩が優しく教え、補足「${achievement}」を小さく配置。${baseStyle}`,
      "",
      "【コマ4】",
      `${target}が笑顔で働く未来。応募を後押しする締めのシーン。${baseStyle}`,
    ].join("\n");
  }

  return [
    "【コマ1】",
    `「${problem}」で店選びに迷う${target}。主人公は${character}。${baseStyle}`,
    "",
    "【コマ2】",
    `${target}が${business}の${service}を知る。${strength}が魅力的に見える。${baseStyle}`,
    "",
    "【コマ3】",
    `ラーメンを味わい、表情が明るくなる。補足「${achievement}」をサンプル表記として配置。${baseStyle}`,
    "",
    "【コマ4】",
    `${target}が来店・予約情報を確認する締めのシーン。${baseStyle}`,
  ].join("\n");
};

const buildCopies = (data) => {
  const { lpType, business, service, target, problem, strength } = data;

  if (lpType === "recruiting") {
    return [
      `1) 「${problem}」が不安な${target}へ。${business}の${service}なら、最初の一歩を安心して始められます。`,
      `2) ${strength}。初めての飲食バイトでも、無理なく慣れていける職場をイメージできます。`,
      `3) ${business}で、自分の予定も大切にしながら働く。まずは応募フォームへ。`,
    ].join("\n");
  }

  return [
    `1) 「${problem}」と思っている${target}へ。${business}の${service}で、初回来店の不安を減らします。`,
    `2) ${strength}。味・雰囲気・来店前の判断材料を、漫画LPで分かりやすく伝えます。`,
    `3) 今日はどこで食べる？迷ったら、${business}の来店・予約情報をチェック。`,
  ].join("\n");
};

const buildLpContent = (data, imageSources) => {
  if (data.lpType === "recruiting") {
    return buildRecruitingLp(data, imageSources);
  }
  return buildLeadgenLp(data, imageSources);
};

const ctaLink = (data, extraClass = "") =>
  `<a class="generated-cta ${extraClass}" href="${escapeHtml(data.cta.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.cta.label)}</a>`;

const sectionTitle = (eyebrow, title, lead = "") => `
  <div class="generated-section-title">
    <span>${escapeHtml(eyebrow)}</span>
    <h2>${escapeHtml(title)}</h2>
    ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
  </div>
`;

const themeStyle = (data) => {
  const color = String(data.color || "");
  const isLeadgen = data.lpType === "leadgen";
  let accent = isLeadgen ? "#14b8a6" : "#facc15";
  let heroEnd = isLeadgen ? "#0f766e" : "#7f1d1d";
  if (/ピンク|桃|美容|pink/i.test(color)) {
    accent = "#f9a8d4";
    heroEnd = "#9d174d";
  } else if (/緑|グリーン|整体|green/i.test(color)) {
    accent = "#86efac";
    heroEnd = "#166534";
  } else if (/青|ブルー|blue/i.test(color)) {
    accent = "#93c5fd";
    heroEnd = "#1d4ed8";
  } else if (/黒|白|モノトーン|black|white/i.test(color)) {
    accent = "#e5e7eb";
    heroEnd = "#111827";
  } else if (/赤|黄|ラーメン|red|yellow/i.test(color)) {
    accent = "#facc15";
    heroEnd = "#7f1d1d";
  }
  return `--generated-accent: ${accent}; --generated-hero-end: ${heroEnd};`;
};

const isSampleLp = (data) => data.isSample !== false;

const sampleOnly = (data, html) => (isSampleLp(data) ? html : "");

const sampleLinkNote = (data) => (isSampleLp(data) ? "<small>サンプル用リンクです</small>" : "");

const sampleLpLabel = (data) => (isSampleLp(data) ? "サンプルLP" : "LP");

const assetNotice = (data) => sampleOnly(data, `
  <aside class="asset-notice">
    <strong>漫画画像は仮素材です</strong>
    <p>本番制作時はヒアリング内容に合わせて画像を差し替えます。上部に生成される画像プロンプトを制作指示として使用できます。</p>
  </aside>
`);

const mangaPanels = (panels) => `
  <div class="generated-panels story-timeline" aria-label="ヒアリング内容から生成した4コマ漫画">
    ${panels.map((panel, index) => `
      <article class="generated-panel emotion-${escapeHtml(panel.emotion)}" style="--panel-index: ${index};">
        <div class="panel-order" aria-label="${index + 1}コマ目">${index + 1}</div>
        <div class="panel-media">
          <img src="${panel.imagePath}" alt="${index + 1}コマ目: ${escapeHtml(panel.title)}" />
        </div>
        <div class="panel-copy">
          <h3>${escapeHtml(panel.title)}</h3>
          <p class="panel-narration">${escapeHtml(panel.narration)}</p>
          <p class="speech-bubble">${escapeHtml(panel.dialogue)}</p>
        </div>
        ${index < panels.length - 1 ? `<div class="panel-connector" aria-hidden="true">次へ</div>` : ""}
      </article>
    `).join("")}
  </div>
`;



const buildRecruitingLp = (data, imageSources) => {
  const panels = buildMangaPanelData(data, imageSources);
  const problems = splitList(data.problem);
  const strengths = splitList(data.strength);
  const worryItems = (problems.length ? problems : ["人間関係の不安", "未経験の不安", "シフトの不安"]).slice(0, 3);
  const benefitItems = (strengths.length ? strengths : ["研修あり", "シフト相談可", "まかないあり"]).slice(0, 3);

  return `
    <main class="generated-lp recruiting" style="${themeStyle(data)}">
      ${sampleOnly(data, `<div class="sample-ribbon">架空店舗を使用した制作サンプルです / 実在店舗の募集情報ではありません</div>`)}
      <header class="generated-hero">
        <div class="generated-hero-inner">
          <span class="generated-badge">${escapeHtml(data.service)} 採用</span>
          <p class="generated-kicker">${isSampleLp(data) ? "RECRUIT SAMPLE" : "RECRUIT LP"} / ${escapeHtml(data.business)}</p>
          <h1>${escapeHtml(data.target)}へ。<br>${escapeHtml(data.service)}の不安を漫画でほどく採用LP</h1>
          <p class="generated-sub">${escapeHtml(data.problem)}に寄り添い、${escapeHtml(data.strength)}を応募前に分かりやすく伝えます。</p>
          <div class="hero-cta-row">${ctaLink(data)}${sampleLinkNote(data)}</div>
        </div>
      </header>

      <section class="generated-section generated-problem">
        ${sectionTitle("WORRY", "求職者の不安", `${data.target}が応募前に感じる迷いを、最初の共感ポイントにします。`)}
        <div class="worry-list">
          ${worryItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </section>

      <section class="generated-manga">
        ${sectionTitle("MANGA", "ヒアリングから生成した4コマ応募ストーリー", `${data.character}が登場し、悩みから${data.cta.label}までを自然につなげます。`)}
        ${assetNotice(data)}
        ${mangaPanels(panels)}
      </section>

      <section class="generated-section generated-solution">
        ${sectionTitle("SOLUTION", "職場による解決", `${data.service}として伝えるべき強みを、応募前の安心材料に変えます。`)}
        <p>${nl2br(data.strength)}</p>
        ${ctaLink(data, "secondary")}
      </section>

      <section class="generated-section generated-dark">
        ${sectionTitle("REASON", "選ばれる理由")}
        <div class="generated-cards three">
          ${benefitItems.map((item, index) => `<article><strong>${String(index + 1).padStart(2, "0")}</strong><h3>${escapeHtml(item)}</h3><p>${escapeHtml(data.target)}が抱える不安を減らし、応募前に働く姿を想像しやすくします。</p></article>`).join("")}
        </div>
      </section>

      <section class="generated-section generated-reasons">
        ${sectionTitle("PROOF", "実績・安心材料", isSampleLp(data) ? "公開前に実情報へ差し替える前提のサンプル表記です。" : "")}
        <div class="reason-stack">
          <article><h3>入力された安心材料</h3><p>${nl2br(data.achievement)}</p></article>
          <article><h3>伝えたい雰囲気</h3><p>${escapeHtml(data.tone)}な印象で、${escapeHtml(data.character)}が応募前の不安を受け止めます。</p></article>
          <article><h3>カラーイメージ</h3><p>${escapeHtml(data.color)}</p></article>
        </div>
      </section>

      <section class="generated-section generated-faq">
        ${sectionTitle("FAQ", "よくある質問")}
        <details open><summary>未経験でも応募できますか？</summary><p>${escapeHtml(firstItem(data.strength, "研修あり"))}を伝えることで、初めてでも始めやすい印象を作ります。</p></details>
        <details><summary>シフトは相談できますか？</summary><p>${escapeHtml(data.problem)}が不安な方へ、条件や相談しやすさを公開前に具体情報へ差し替えてください。</p></details>
        ${sampleOnly(data, `<details><summary>この内容は実在の募集ですか？</summary><p>いいえ。これは制作確認用のサンプルで、実在店舗の募集情報ではありません。</p></details>`)}
      </section>

      <section class="generated-cta-section">
        <p>${escapeHtml(data.problem)}を減らし、${escapeHtml(data.service)}への応募行動につなげます。</p>
        ${ctaLink(data)}
        <small>${escapeHtml(data.business)}｜${escapeHtml(data.service)}｜${sampleLpLabel(data)}</small>
      </section>
    </main>
  `;
};

const buildLeadgenLp = (data, imageSources) => {
  const panels = buildMangaPanelData(data, imageSources);
  const problems = splitList(data.problem);
  const strengths = splitList(data.strength);
  const worryItems = (problems.length ? problems : ["店選びで失敗したくない", "味や雰囲気が分からない", "来店前に判断材料がほしい"]).slice(0, 3);
  const reasonItems = (strengths.length ? strengths : ["こだわりスープ", "自家製麺", "限定特典"]).slice(0, 3);

  return `
    <main class="generated-lp leadgen" style="${themeStyle(data)}">
      ${sampleOnly(data, `<div class="sample-ribbon">架空店舗を使用した制作サンプルです / 実在店舗の口コミや実績ではありません</div>`)}
      <header class="generated-hero">
        <div class="generated-hero-inner">
          <span class="generated-badge">${escapeHtml(data.service)} 集客</span>
          <p class="generated-kicker">${isSampleLp(data) ? "VISIT SAMPLE" : "VISIT LP"} / ${escapeHtml(data.business)}</p>
          <h1>${escapeHtml(data.target)}へ。<br>${escapeHtml(data.service)}の魅力を漫画で届ける集客LP</h1>
          <p class="generated-sub">${escapeHtml(data.problem)}という迷いを、${escapeHtml(data.strength)}への期待に変えます。</p>
          <div class="hero-cta-row">${ctaLink(data)}${sampleLinkNote(data)}</div>
        </div>
      </header>

      <section class="generated-section generated-problem">
        ${sectionTitle("WORRY", "顧客の悩み", `${data.target}が来店前に感じる迷いを先回りして言語化します。`)}
        <div class="worry-list">
          ${worryItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </section>

      <section class="generated-manga">
        ${sectionTitle("MANGA", "ヒアリングから生成した4コマ来店ストーリー", `${data.character}を通じて、迷いから${data.cta.label}までを描きます。`)}
        ${assetNotice(data)}
        ${mangaPanels(panels)}
      </section>

      <section class="generated-section generated-solution">
        ${sectionTitle("SOLUTION", "商品・店舗による解決", `${data.service}の魅力を、来店前に判断しやすい情報へ整理します。`)}
        <p>${nl2br(data.strength)}</p>
        ${ctaLink(data, "secondary")}
      </section>

      <section class="generated-section generated-dark">
        ${sectionTitle("REASON", "選ばれる理由")}
        <div class="generated-cards three">
          ${reasonItems.map((item, index) => `<article><strong>${String(index + 1).padStart(2, "0")}</strong><h3>${escapeHtml(item)}</h3><p>${escapeHtml(data.problem)}という迷いを減らし、来店前の期待値を高めます。</p></article>`).join("")}
        </div>
      </section>

      <section class="generated-section generated-voices">
        ${sectionTitle("PROOF", "実績・安心材料", isSampleLp(data) ? "すべてサンプル・イメージ表現です。" : "")}
        <div class="voice-list">
          <blockquote><b>${isSampleLp(data) ? "サンプル" : "安心材料"}</b><p>${nl2br(data.achievement)}</p></blockquote>
          <blockquote><b>${isSampleLp(data) ? "イメージ" : "表現トーン"}</b><p>${escapeHtml(data.tone)}な見せ方で、${escapeHtml(data.color)}の印象を活かします。</p></blockquote>
        </div>
      </section>

      <section class="generated-section generated-faq">
        ${sectionTitle("FAQ", "よくある質問")}
        ${sampleOnly(data, `<details open><summary>この口コミは実在しますか？</summary><p>いいえ。利用者の声はサンプル・イメージ表現です。</p></details>`)}
        <details><summary>来店前に何が分かりますか？</summary><p>${escapeHtml(data.service)}の特徴や、${escapeHtml(data.strength)}を分かりやすく確認できます。</p></details>
        <details><summary>予約や来店情報はどこで見ますか？</summary><p>${escapeHtml(data.cta.label)}からリンク先へ遷移します。公開時に実URLへ差し替えてください。</p></details>
      </section>

      <section class="generated-cta-section">
        <p>${escapeHtml(data.problem)}を減らし、${escapeHtml(data.business)}への来店行動につなげます。</p>
        ${ctaLink(data)}
        <small>${escapeHtml(data.business)}｜${escapeHtml(data.service)}｜${sampleLpLabel(data)}</small>
      </section>
    </main>
  `;
};



const buildMotionScript = () => `
<script>
(() => {
  const init = () => {
    const panels = Array.from(document.querySelectorAll(".generated-panel"));
    const ctas = Array.from(document.querySelectorAll(".generated-cta"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.toggle("motion-ready", !reduceMotion && ("IntersectionObserver" in window));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      panels.forEach((panel) => panel.classList.add("is-visible"));
      ctas.forEach((cta) => cta.classList.add("cta-pulse-visible"));
      return;
    }
    let nextPanelIndex = 0;
    const revealNext = () => {
      const panel = panels[nextPanelIndex];
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const ready = panel.dataset.revealPending === "true" || rect.top < window.innerHeight * 0.88;
      if (!ready) return;
      panel.classList.add("is-visible");
      observer.unobserve(panel);
      nextPanelIndex += 1;
      window.setTimeout(revealNext, 180);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.revealPending = "true";
          revealNext();
        }
      });
    }, { threshold: 0.28, rootMargin: "0px 0px -8% 0px" });
    panels.forEach((panel) => observer.observe(panel));
    ctas.forEach((cta) => cta.classList.add("cta-pulse-visible"));
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
</script>`;

const initGeneratedLpMotion = (root = document) => {
  const scope = root.querySelectorAll ? root : document;
  const panels = Array.from(scope.querySelectorAll(".generated-panel"));
  const ctas = Array.from(scope.querySelectorAll(".generated-cta"));
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.toggle("motion-ready", !reduceMotion && ("IntersectionObserver" in window));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    panels.forEach((panel) => panel.classList.add("is-visible"));
    ctas.forEach((cta) => cta.classList.add("cta-pulse-visible"));
    return;
  }
  let nextPanelIndex = 0;
  const revealNext = () => {
    const panel = panels[nextPanelIndex];
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const ready = panel.dataset.revealPending === "true" || rect.top < window.innerHeight * 0.88;
    if (!ready) return;
    panel.classList.add("is-visible");
    observer.unobserve(panel);
    nextPanelIndex += 1;
    window.setTimeout(revealNext, 180);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.dataset.revealPending = "true";
        revealNext();
      }
    });
  }, { threshold: 0.28, rootMargin: "0px 0px -8% 0px" });
  panels.forEach((panel) => observer.observe(panel));
  ctas.forEach((cta) => cta.classList.add("cta-pulse-visible"));
};

const buildFullHtml = (data, body) => `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(data.business)}｜${escapeHtml(data.service)}</title>
<style>
${getInlineStyles()}
</style>
</head>
<body class="generated-page">
${body}
${buildMotionScript()}
</body>
</html>
`;



const makeFileName = (data) => {
  const type = data.lpType === "recruiting" ? "recruiting" : "leadgen";
  const name = `${data.business}-${data.service}`.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${type}-${name || "manga-lp"}.html`;
};

const auditGeneratedHtml = (html) => {
  const warnings = [];
  const htmlForAudit = html.replace(/data:image\/[^"']+/g, "DATA_IMAGE_URL");
  const checks = [
    [/href\s*=\s*["']#["']/i, 'href="#" が含まれています。'],
    [/href\s*=\s*["']\s*["']/i, "空のhrefが含まれています。"],
    [/src\s*=\s*["']\s*["']/i, "空のsrcが含まれています。"],
    [/TODO/i, "TODOが残っています。"],
    [/仮テキスト/, "仮テキストが残っています。"],
    [/サンプルテキスト/, "サンプルテキストが残っています。"],
    [/C:\\Users\\/i, "ローカル絶対パスが含まれています。"],
    [/file:\/\/\//i, "file:/// への依存が含まれています。"],
    [/{{|}}|\[\[|\]\]/, "未置換のテンプレート記号らしき文字が含まれています。"],
    [/AIza[0-9A-Za-z_-]+/, "APIキーらしき文字列が含まれています。"],
  ];

  checks.forEach(([pattern, message]) => {
    if (pattern.test(htmlForAudit)) warnings.push(message);
  });

  const doc = new DOMParser().parseFromString(htmlForAudit, "text/html");
  doc.querySelectorAll("h1,h2,h3").forEach((heading) => {
    if (!heading.textContent.trim()) warnings.push("空の見出しがあります。");
  });

  doc.querySelectorAll(".generated-cta").forEach((cta) => {
    if (!cta.textContent.trim()) warnings.push("空のCTAがあります。");
    if (!cta.getAttribute("href")) warnings.push("hrefのないCTAがあります。");
  });

  const ctaCount = doc.querySelectorAll(".generated-cta").length;
  if (ctaCount < 3) warnings.push(`CTAボタンが${ctaCount}個です。最低3個必要です。`);

  const imageCount = doc.querySelectorAll(".generated-panel img").length;
  if (imageCount !== 4) warnings.push(`漫画画像が${imageCount}枚です。4枚必要です。`);

  const dataUrlImageCount = (html.match(/src="data:image\//g) || []).length;
  if (dataUrlImageCount !== 4) warnings.push(`漫画画像のData URLが${dataUrlImageCount}個です。4個必要です。`);

  if (!htmlForAudit.includes("<style>")) warnings.push("CSSがHTML内へ埋め込まれていません。");

  return [...new Set(warnings)];
};

const fillPreset = (type) => {
  const preset = sampleData[type];
  if (!preset || !form) return;

  Object.entries(preset).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field) field.value = value;
  });
  setError("");
};

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    fillPreset(button.dataset.preset);
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  setCheckResult([]);

  const data = normalizeInput(new FormData(form));
  const validationMessage = validateData(data);
  if (validationMessage) {
    setError(validationMessage);
    generatedHtml = "";
    return;
  }

  try {
    const imageSources = await loadPanelImageSources(data.lpType);
    const story = buildStory(data);
    const prompts = buildImagePrompts(data);
    const copies = buildCopies(data);
    const lpBody = buildLpContent(data, imageSources);

    storyOutput.textContent = story;
    promptsOutput.textContent = prompts;
    copiesOutput.textContent = copies;
    previewRoot.innerHTML = lpBody;
    initGeneratedLpMotion(previewRoot);
    generatedHtml = buildFullHtml(data, lpBody);
    generatedFileName = makeFileName(data);
    if (htmlSource) {
      htmlSource.value = generatedHtml;
      htmlSource.dataset.fileName = generatedFileName;
    }

    setCheckResult(auditGeneratedHtml(generatedHtml));
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setError(error.message || "LP生成中にエラーが発生しました。");
    generatedHtml = "";
  }
});

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target");
    const target = targetId ? document.querySelector(`#${targetId}`) : null;
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.textContent || "");
      button.classList.add("copied");
      const original = button.textContent;
      button.textContent = "コピー完了";
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("copied");
      }, 1200);
    } catch (error) {
      window.alert("コピーに失敗しました。手動でコピーしてください。");
    }
  });
});

downloadButton?.addEventListener("click", () => {
  if (!generatedHtml) {
    setError("先にLPを生成してください。");
    return;
  }

  const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generatedFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});








