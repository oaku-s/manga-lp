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

const buildStory = (data) => {
  const { lpType, business, service, target, strength, problem, achievement, tone } = data;

  if (lpType === "recruiting") {
    return [
      "【1コマ目：応募前の不安】",
      `${target}が「${problem}」に不安を感じ、応募を迷っているシーン。`,
      "",
      "【2コマ目：職場との出会い】",
      `${business}の${service}募集を見つける。${strength}に安心感を持ち、「ここなら働けそう」と感じる。`,
      "",
      "【3コマ目：働くイメージ】",
      `店長や先輩に教わりながら働く。安心材料として「${achievement}」を明記し、誤認されないサンプル表現にする。`,
      "",
      "【4コマ目：応募後の未来】",
      `不安が消え、前向きに働く未来を描写。${tone}な雰囲気で「応募フォームへ進む」を促す。`,
    ].join("\n");
  }

  return [
    "【1コマ目：店選びの不安】",
    `${target}が「${problem}」と迷っているシーン。`,
    "",
    "【2コマ目：お店との出会い】",
    `${business}の${service}を知る。${strength}が伝わり、「ここなら良さそう」と感じる。`,
    "",
    "【3コマ目：商品体験】",
    `スープや麺の魅力を体験する。補足として「${achievement}」を小さく明記し、サンプルであることを伝える。`,
    "",
    "【4コマ目：来店行動】",
    `満足した表情で、${tone}な雰囲気のまま「来店・予約情報を見る」を促す。`,
  ].join("\n");
};

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

const mangaPanels = (panels, imageSources) => `
  <div class="generated-panels" aria-label="4コマ漫画">
    ${panels.map((panel, index) => `
      <article class="generated-panel">
        <div class="panel-order">${index + 1}</div>
        <img src="${imageSources[index]}" alt="${index + 1}コマ目: ${escapeHtml(panel.title)}" />
        <div class="panel-copy">
          <h3>${escapeHtml(panel.title)}</h3>
          <p>${escapeHtml(panel.text)}</p>
        </div>
      </article>
    `).join("")}
  </div>
`;

const buildRecruitingLp = (data, imageSources) => {
  const panels = [
    { title: "応募前の不安", text: "人間関係や未経験が不安で、応募ボタンの前で迷っている。" },
    { title: "お店を知る", text: "研修あり、シフト相談可、まかないありの募集を見つける。" },
    { title: "働く姿を想像", text: "最初は簡単な仕事から。先輩が横について教えてくれる。" },
    { title: "一歩踏み出す", text: "自分の予定も大切にしながら働けそう、と応募へ進む。" },
  ];

  return `
    <main class="generated-lp recruiting">
      <div class="sample-ribbon">架空店舗を使用した制作サンプルです / 実在店舗の募集情報ではありません</div>
      <header class="generated-hero">
        <div class="generated-hero-inner">
          <span class="generated-badge">飲食店スタッフ採用</span>
          <p class="generated-kicker">RECRUIT SAMPLE / ${escapeHtml(data.business)}</p>
          <h1>未経験でも、最初の一歩を<br>安心して踏み出せるラーメン店バイト</h1>
          <p class="generated-sub">${escapeHtml(data.service)}｜人間関係・未経験・シフトの不安に寄り添う採用向け漫画LPです。</p>
          <div class="hero-cta-row">${ctaLink(data)}<small>サンプル用リンクです</small></div>
        </div>
      </header>

      <section class="generated-section generated-problem">
        ${sectionTitle("WORRY", "求職者の不安", "応募前の迷いを、漫画で分かりやすく受け止めます。")}
        <div class="worry-list">
          <p>人間関係が合わなかったらどうしよう</p>
          <p>飲食未経験でも迷惑をかけないかな</p>
          <p>学校や予定とシフトを両立できるかな</p>
        </div>
      </section>

      <section class="generated-manga">
        ${sectionTitle("MANGA", "4コマで分かる応募ストーリー")}
        ${mangaPanels(panels, imageSources)}
      </section>

      <section class="generated-section generated-dark">
        ${sectionTitle("BENEFIT", "働くメリット")}
        <div class="generated-cards three">
          <article><strong>01</strong><h3>研修あり</h3><p>最初は挨拶、片付け、簡単な案内から。段階的に慣れていけます。</p></article>
          <article><strong>02</strong><h3>シフト相談可</h3><p>学業、予定、副業との両立を前提に相談できる見せ方です。</p></article>
          <article><strong>03</strong><h3>まかないあり</h3><p>働く楽しみが伝わる、飲食店らしい魅力として表現します。</p></article>
        </div>
      </section>

      <section class="generated-section generated-reasons">
        ${sectionTitle("REASON", "選ばれる理由")}
        <div class="reason-stack">
          <article><h3>新人が質問しやすい雰囲気</h3><p>${nl2br(data.strength)}</p></article>
          <article><h3>応募前の不安を先回りして解消</h3><p>${nl2br(data.problem)}</p></article>
          <article><h3>サンプルとして誤認を防ぐ表記</h3><p>${nl2br(data.achievement)}</p></article>
        </div>
        ${ctaLink(data, "secondary")}
      </section>

      <section class="generated-section generated-conditions">
        ${sectionTitle("CONDITION", "勤務条件")}
        <dl class="info-list">
          <div><dt>募集職種</dt><dd>${escapeHtml(data.service)}</dd></div>
          <div><dt>対象</dt><dd>未経験の学生、フリーターを想定したサンプル</dd></div>
          <div><dt>シフト</dt><dd>相談しやすいことを訴求するサンプル表現</dd></div>
          <div><dt>待遇</dt><dd>研修、まかない、相談しやすさを中心に表現</dd></div>
        </dl>
      </section>

      <section class="generated-section generated-faq">
        ${sectionTitle("FAQ", "よくある質問")}
        <details open><summary>未経験でも応募できますか？</summary><p>はい。未経験者にも分かる研修がある、という想定のサンプルLPです。</p></details>
        <details><summary>シフトは相談できますか？</summary><p>学校や予定との両立を相談できる見せ方にしています。実際の条件は公開前に差し替えてください。</p></details>
        <details><summary>この内容は実在の募集ですか？</summary><p>いいえ。これは制作確認用のサンプルで、実在店舗の募集情報ではありません。</p></details>
      </section>

      <section class="generated-cta-section">
        <p>人間関係、未経験、シフトの不安を減らして、応募の一歩を後押しします。</p>
        ${ctaLink(data)}
        <small>${escapeHtml(data.business)}｜${escapeHtml(data.service)}｜サンプルLP</small>
      </section>
    </main>
  `;
};

const buildLeadgenLp = (data, imageSources) => {
  const panels = [
    { title: "店選びで迷う", text: "初めての店で失敗したくない。味も雰囲気も分からず決めきれない。" },
    { title: "こだわりを知る", text: "スープ、自家製麺、限定特典がひと目で伝わる。" },
    { title: "食べたい気持ちが高まる", text: "香りや湯気、満足感を漫画でイメージできる。" },
    { title: "来店情報を確認", text: "不安が減り、来店・予約情報を見る流れへ進む。" },
  ];

  return `
    <main class="generated-lp leadgen">
      <div class="sample-ribbon">架空店舗を使用した制作サンプルです / 実在店舗の口コミや実績ではありません</div>
      <header class="generated-hero">
        <div class="generated-hero-inner">
          <span class="generated-badge">新規来店・予約獲得</span>
          <p class="generated-kicker">VISIT SAMPLE / ${escapeHtml(data.business)}</p>
          <h1>初めてでも外したくない人へ。<br>こだわりが伝わるラーメン体験を</h1>
          <p class="generated-sub">${escapeHtml(data.service)}｜店選びの不安を、漫画と情報整理で来店意欲へ変えます。</p>
          <div class="hero-cta-row">${ctaLink(data)}<small>サンプル用リンクです</small></div>
        </div>
      </header>

      <section class="generated-section generated-problem">
        ${sectionTitle("WORRY", "顧客の悩み", "初回来店者が知りたいことを、先回りして見せます。")}
        <div class="worry-list">
          <p>初めての店で失敗したくない</p>
          <p>味や雰囲気が自分に合うか分からない</p>
          <p>来店前におすすめや特典を知りたい</p>
        </div>
      </section>

      <section class="generated-manga">
        ${sectionTitle("MANGA", "4コマで分かる来店ストーリー")}
        ${mangaPanels(panels, imageSources)}
      </section>

      <section class="generated-section generated-solution">
        ${sectionTitle("SOLUTION", "商品・店舗による解決")}
        <p>${nl2br(data.strength)}</p>
        ${ctaLink(data, "secondary")}
      </section>

      <section class="generated-section generated-dark">
        ${sectionTitle("REASON", "選ばれる理由")}
        <div class="generated-cards three">
          <article><strong>01</strong><h3>こだわりスープ</h3><p>味の期待値を高める表現で、初回来店前の不安を減らします。</p></article>
          <article><strong>02</strong><h3>自家製麺</h3><p>商品の特徴を短く具体的に見せ、記憶に残るLPにします。</p></article>
          <article><strong>03</strong><h3>限定特典</h3><p>来店・予約情報を見る理由を自然に作ります。</p></article>
        </div>
      </section>

      <section class="generated-section generated-menu">
        ${sectionTitle("MENU", "おすすめ商品")}
        <div class="menu-list">
          <article><h3>看板ラーメン</h3><p>こだわりスープと自家製麺を伝えるためのサンプル商品です。</p></article>
          <article><h3>初回限定セット</h3><p>限定特典を訴求するためのサンプル構成です。</p></article>
          <article><h3>季節の一杯</h3><p>再訪やSNS共有につなげるためのサンプル枠です。</p></article>
        </div>
      </section>

      <section class="generated-section generated-voices">
        ${sectionTitle("VOICE", "利用者の声", "すべてサンプル・イメージ表現です。")}
        <div class="voice-list">
          <blockquote><b>サンプル</b><p>初めてでも雰囲気が分かって、入りやすそうだと感じました。</p></blockquote>
          <blockquote><b>イメージ</b><p>おすすめや特典が先に分かるので、来店前の迷いが減りました。</p></blockquote>
        </div>
      </section>

      <section class="generated-section generated-faq">
        ${sectionTitle("FAQ", "よくある質問")}
        <details open><summary>この口コミは実在しますか？</summary><p>いいえ。利用者の声はサンプル・イメージ表現です。</p></details>
        <details><summary>予約や来店情報はどこで見ますか？</summary><p>CTAボタンからサンプル用リンクへ遷移します。公開時に実URLへ差し替えてください。</p></details>
        <details><summary>住所や電話番号は掲載していますか？</summary><p>誤認防止のため、このサンプルでは仮住所や仮電話番号を掲載していません。</p></details>
      </section>

      <section class="generated-cta-section">
        <p>店選びで迷う人に、味・雰囲気・来店理由を分かりやすく届けます。</p>
        ${ctaLink(data)}
        <small>${escapeHtml(data.business)}｜${escapeHtml(data.service)}｜サンプルLP</small>
      </section>
    </main>
  `;
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








