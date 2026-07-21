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
    outputMode: "delivery",
    lpType: "recruiting",
    business: "ラーメン まる福",
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
    outputMode: "delivery",
    lpType: "leadgen",
    business: "ラーメン まる福",
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
  outputMode: getValue(formData, "outputMode") || "delivery",
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

const cleanItem = (value, fallback = "") =>
  cleanSentence(value, fallback)
    .replace(/を分かりやすく案内できます$/, "")
    .replace(/を案内できます$/, "")
    .replace(/できます$/, "")
    .replace(/できる$/, "")
    .replace(/です$/, "")
    .replace(/ます$/, "")
    .trim();

const listItems = (value, fallbackItems) => {
  const items = splitList(value).map((item) => cleanItem(item)).filter(Boolean);
  return items.length ? items : fallbackItems;
};

const firstCleanItem = (value, fallback) => listItems(value, [fallback])[0] || fallback;

const uniqueItems = (items) => [...new Set(items.filter(Boolean))];

const normalizeStrengthItem = (value) =>
  cleanItem(value)
    .replace(/(あり|有り|可)$/g, "")
    .replace(/向けの?$/g, "")
    .trim();

const listStrengthItems = (value, fallbackItems) => {
  const items = splitList(value).map((item) => normalizeStrengthItem(item)).filter(Boolean);
  return items.length ? items : fallbackItems;
};

const normalizeProblemDisplay = (value, lpType) => {
  const item = cleanItem(value);
  if (!item) return "";
  if (/味|雰囲気/.test(item) && /分から|わから/.test(item)) return "味や雰囲気が分からない";
  if (/外したくない|失敗したくない/.test(item)) return "店選びで失敗したくない";
  if (/人間関係/.test(item)) return "人間関係の不安";
  if (/未経験/.test(item)) return "未経験の不安";
  if (/シフト/.test(item)) return "シフトの両立が不安";
  if (/通院/.test(item)) return "通院への不安";
  if (/肩こり/.test(item)) return "肩こり";
  if (/繰り返す不調/.test(item)) return "繰り返す不調";
  return lpType === "recruiting"
    ? item
        .replace(/がこわい$/, "の不安")
        .replace(/が怖い$/, "の不安")
        .replace(/で迷惑をかけそう$/, "の不安")
    : item
        .replace(/と思っている$/, "")
        .replace(/が分からず$/, "が分からない")
        .replace(/がわからず$/, "が分からない");
};

const normalizeProblemTheme = (value, lpType) => {
  const item = cleanItem(value);
  if (!item) return "";
  if (/味|雰囲気/.test(item)) return "味や雰囲気";
  if (/外したくない|失敗したくない/.test(item)) return lpType === "leadgen" ? "店選び" : "失敗への不安";
  if (/人間関係/.test(item)) return "人間関係";
  if (/未経験/.test(item)) return "未経験";
  if (/シフト/.test(item)) return "シフト";
  if (/教育環境/.test(item)) return "教育環境";
  if (/残業/.test(item)) return "残業";
  if (/キャリア|将来/.test(item)) return "将来のキャリア";
  if (/肩こり/.test(item)) return "肩こり";
  if (/繰り返す不調/.test(item)) return "繰り返す不調";
  if (/通院/.test(item)) return "通院への不安";
  return normalizeProblemDisplay(item, lpType)
    .replace(/への不安$/, "")
    .replace(/の不安$/, "")
    .replace(/が不安$/, "")
    .replace(/に不安$/, "")
    .replace(/を抱える$/, "")
    .replace(/と思っている$/, "")
    .trim();
};

const joinItems = (items) => {
  const filtered = items.filter(Boolean);
  if (filtered.length <= 1) return filtered[0] || "";
  if (filtered.length === 2) return `${filtered[0]}と${filtered[1]}`;
  return `${filtered.slice(0, -1).join("、")}、${filtered[filtered.length - 1]}`;
};

const shortAudience = (value, fallback) =>
  cleanItem(splitList(value)[0] || value, fallback)
    .replace(/。.*$/, "")
    .trim() || fallback;

const tonePhrase = (value) => {
  const tone = cleanItem(value, "親しみやすい");
  if (/雰囲気$/.test(tone)) return tone;
  if (/的$/.test(tone)) return `${tone}な雰囲気`;
  if (/い$/.test(tone)) return `${tone}雰囲気`;
  return `${tone}な雰囲気`;
};

const colorPhrase = (value) => {
  const color = cleanItem(value, "ブランドに合う色合い");
  return /印象$/.test(color) ? color.replace(/印象$/, "見た目") : `${color}の見た目`;
};

const concernLead = (problemSummary) =>
  /(したい|したくない|たい)$/.test(problemSummary)
    ? `${problemSummary}方へ`
    : /(不安|心配|悩み|迷い)$/.test(problemSummary)
      ? `${problemSummary}に悩む方へ`
      : `${problemSummary}が気になる方へ`;

const buildProblemLead = (lpType, themes) => {
  const themeText = joinItems(themes.slice(0, 3));
  if (lpType === "recruiting") {
    return themeText ? `${themeText}に不安がある方へ` : "応募前に不安がある方へ";
  }
  if (themes.includes("味や雰囲気") && themes.includes("店選び")) {
    return "味や雰囲気を事前に知り、店選びで失敗したくない方へ";
  }
  if (themes.includes("店選び")) return "店選びで失敗したくない方へ";
  return themeText ? `${themeText}で迷っている方へ` : "選ぶ前に迷っている方へ";
};

const buildStrengthLead = (lpType, strengths) => {
  const strengthText = joinItems(strengths.slice(0, 3));
  if (lpType === "recruiting") {
    if (/研修/.test(strengthText) && /シフト/.test(strengthText)) {
      return "最初は簡単な仕事から。店長や先輩が一つずつ教えるので、初めての飲食バイトでも安心です。学校や予定に合わせてシフトも相談できます。";
    }
    return `${strengthText}を確認できるため、初めてでも働き方をイメージしやすくなります。`;
  }
  if (/スープ/.test(strengthText) && /麺/.test(strengthText)) {
    return "スープと麺へのこだわりやおすすめを知れば、初めてでも安心して足を運べます。";
  }
  return `${strengthText}を知ることで、初めてでも足を運びやすくなります。`;
};

const buildProblemResolve = (lpType, themes) => {
  const themeText = joinItems(themes.slice(0, 3));
  if (lpType === "recruiting") {
    return "研修や働き方を確認して";
  }
  if (themes.includes("味や雰囲気") && themes.includes("店選び")) {
    return "メニューや来店情報を確認して";
  }
  return themeText ? `${themeText}について確認して` : "来店前の気になる点を確認して";
};

const buildLeadgenProblemScene = (model, visitLabel, placeLabel) => {
  if (model.problemThemes.includes("味や雰囲気") && model.problemThemes.includes("店選び")) {
    return `近くでラーメン店を探しているが、初めての${placeLabel}なので味や雰囲気が分からず迷っている。`;
  }
  return `${model.target}が${model.problemSummary || "選ぶ前の不安"}を抱え、初めて${visitLabel}する${placeLabel}を決めきれずにいる。`;
};

const buildRecruitingFirstScene = (data, model) => {
  if (isFoodBusiness(data) && /未経験|学生|フリーター|初めて/.test(`${data.target} ${data.problem}`)) {
    return "初めての飲食バイトを探しているが、職場になじめるか、仕事を覚えられるか不安で応募を迷っている。";
  }
  return `${model.target}が${model.problemAnxiety}を抱え、応募するか迷っている。`;
};

const buildRecruitingSecondScene = (model) =>
  /研修/.test(model.strengthSummary) && /シフト/.test(model.strengthSummary)
    ? "研修があり、シフトも相談できることを知って、少し安心する。"
    : `${model.strengthSummary}を知って、応募前の不安が少し軽くなる。`;

const buildRecruitingSecondDialogue = (model) =>
  /研修/.test(model.strengthSummary) && /シフト/.test(model.strengthSummary)
    ? "研修もあるし、シフトも相談できるんだ"
    : `${model.firstStrength}なら、始めやすそう`;

const mentorLabel = (character) => {
  if (/先輩スタイリスト/.test(character)) return "先輩スタイリスト";
  if (/先輩/.test(character)) return "先輩スタッフ";
  if (/店長/.test(character)) return "店長や先輩";
  if (/担当|講師|教育/.test(character)) return "担当者";
  return "先輩スタッフ";
};

const stripCtaSubject = (ctaLabel) =>
  cleanItem(ctaLabel, "詳しく見る")
    .replace(/へ進む$/, "")
    .replace(/を見る$/, "")
    .replace(/を申し込む$/, "")
    .replace(/を予約する$/, "")
    .trim() || cleanItem(ctaLabel, "詳しく見る");

const ctaDialogueText = (ctaLabel) => {
  const label = cleanItem(ctaLabel, "詳しく見る");
  const converted = label
    .replace(/を申し込む$/, "を申し込んでみよう")
    .replace(/を予約する$/, "を予約してみよう")
    .replace(/へ進む$/, "へ進んでみよう")
    .replace(/を見る$/, "を確認してみよう");
  return converted === label ? `まずは${stripCtaSubject(label)}を確認してみよう` : converted;
};

const worryDialogueText = (problem, lpType) => {
  const item = cleanItem(problem, lpType === "recruiting" ? "未経験の不安" : "選ぶ前の不安");
  if (lpType === "leadgen") {
    if (/失敗したくない/.test(item)) return "初めてだから、失敗したくないな";
    if (/選び|迷い|迷う/.test(item)) return "どこを選べばいいかな";
    return `${item}。失敗したくないな`;
  }
  return `${item}、本当に大丈夫かな...`;
};

const isFoodBusiness = (data) =>
  /ラーメン|飲食|食|カフェ|レストラン|居酒屋|麺|スープ|料理|来店/.test(
    `${data.business} ${data.service} ${data.strength}`
  );

const proofText = (data) => {
  if (isSampleLp(data) && isDeliveryMode(data)) {
    return data.lpType === "recruiting"
      ? "仕事内容や職場の雰囲気を応募前に確認できるため、初めてでも判断しやすくなります"
      : "来店前に商品や店の様子を知ることで、初めてでも足を運びやすくなります";
  }
  return cleanSentence(data.achievement, "安心して判断できる材料があります");
};

const sampleRibbonText = (data) =>
  data.lpType === "recruiting"
    ? "架空店舗を使用したサンプルです / 実在店舗の募集情報ではありません"
    : "架空店舗を使用したサンプルです / 表示内容は実在店舗の情報ではありません";

const describeStrength = (item, data) => {
  const strength = cleanItem(item, "魅力");
  if (data.lpType === "recruiting") {
    if (/デビュー|キャリア|成長|将来/.test(strength)) {
      return "将来の目標に向けて経験を積めるため、働く先のイメージを持ちやすくなります。";
    }
    if (/研修|教育|教|未経験|デビュー|サポート/.test(strength)) {
      return "段階的に覚えられるため、初めてでも仕事の流れをつかみやすくなります。";
    }
    if (/シフト|時間|週休|休み|残業|相談/.test(strength)) {
      return "予定や生活リズムに合わせやすく、無理なく続けるイメージを持てます。";
    }
    if (/まかない|待遇|給与|特典|福利/.test(strength)) {
      return "働く楽しみや待遇面の魅力が伝わり、応募後の姿を想像しやすくなります。";
    }
    return `${strength}により、応募前の不安を減らして働き始めるきっかけを作ります。`;
  }

  if (/スープ|味|素材|こだわり/.test(strength)) {
    return "ひと口目の満足感を想像しやすく、初めてでも期待して足を運べます。";
  }
  if (/麺|自家製|商品|メニュー/.test(strength)) {
    return "スープとの相性まで楽しめる一杯として、食べる前から期待がふくらみます。";
  }
  if (/特典|限定|初回|クーポン/.test(strength)) {
    return "初回来店のきっかけになり、気になっていたお店へ足を運びやすくなります。";
  }
  if (/予約/.test(strength)) {
    return "予定を立てやすく、待ち時間や混雑への不安を減らせます。";
  }
  if (/個別|施術|オーダー/.test(strength)) {
    return "悩みに合わせた対応が伝わり、自分に合うかを判断しやすくなります。";
  }
  if (/カウンセリング|相談/.test(strength)) {
    return "事前に状態や希望を伝えられる安心感があり、初めてでも利用しやすくなります。";
  }
  return `${strength}が伝わることで、利用前の迷いを減らして行動しやすくします。`;
};

const messageModel = (data) => {
  const target = shortAudience(data.target, data.lpType === "recruiting" ? "求職者" : "お客様");
  const rawProblems = listItems(data.problem, data.lpType === "recruiting"
    ? ["未経験への不安", "人間関係の不安", "シフトの不安"]
    : ["選ぶ前の不安", "失敗したくない気持ち", "判断材料の少なさ"]);
  const problems = uniqueItems(rawProblems.map((item) => normalizeProblemDisplay(item, data.lpType))).filter(Boolean);
  const problemThemes = uniqueItems(rawProblems.map((item) => normalizeProblemTheme(item, data.lpType))).filter(Boolean);
  const strengths = listStrengthItems(data.strength, data.lpType === "recruiting"
    ? ["研修", "シフト相談", "まかない"]
    : ["こだわり", "分かりやすい魅力", "利用しやすさ"]);
  const firstProblem = problems[0];
  const firstStrength = strengths[0];
  const strengthSummary = joinItems(strengths.slice(0, 3));
  const problemSummary = joinItems(problemThemes.slice(0, 3)) || joinItems(problems.slice(0, 3));
  const problemAnxiety = problemSummary ? `${problemSummary}への不安` : "応募前の不安";
  const problemLead = buildProblemLead(data.lpType, problemThemes);
  const strengthLead = buildStrengthLead(data.lpType, strengths);
  const problemResolve = buildProblemResolve(data.lpType, problemThemes);
  const proof = proofText(data);
  return {
    target,
    problems,
    problemThemes,
    strengths,
    firstProblem,
    firstStrength,
    strengthSummary,
    problemSummary,
    problemAnxiety,
    problemLead,
    strengthLead,
    problemResolve,
    proof,
  };
};

const buildMangaPanelData = (data, imageSources = []) => {
  const service = data.service || "サービス";
  const business = data.business || "お店";
  const character = data.character || "案内役";
  const ctaLabel = data.cta?.label || "詳しく見る";
  const model = messageModel(data);
  const placeLabel = /店|ラーメン|飲食|カフェ|レストラン|居酒屋|美容室|サロン/.test(business) ? "店" : "サービス";
  const visitLabel = placeLabel === "店" ? "来店" : "利用";
  const finalDialogue = ctaDialogueText(ctaLabel);
  const leadgenExperienceDialogue = isFoodBusiness(data)
    ? "食べてみたい。ここなら期待できそう"
    : "試してみたい。ここなら安心できそう";

  const panels = data.lpType === "recruiting"
    ? [
        {
          title: "応募を迷う",
          narration: buildRecruitingFirstScene(data, model),
          dialogue: "「初めてのバイト、ちゃんと続けられるかな……」",
          emotion: "worry",
        },
        {
          title: "働きやすさを知る",
          narration: buildRecruitingSecondScene(model),
          dialogue: `「${buildRecruitingSecondDialogue(model)}」`,
          emotion: "notice",
        },
        {
          title: "初日の姿が浮かぶ",
          narration: `最初は案内や片付けなど簡単な仕事から。${mentorLabel(character)}がそばで教えてくれる働き方をイメージする。`,
          dialogue: "「これなら少しずつ覚えられそう」",
          emotion: "hope",
        },
        {
          title: "最初の一歩を踏み出す",
          narration: "無理なく働き始める姿が浮かび、応募してみようと決める。",
          dialogue: "「ここなら安心して始められそう。応募してみよう」",
          emotion: "decide",
        },
      ]
    : [
        {
          title: "気になるけれど迷う",
          narration: buildLeadgenProblemScene(model, visitLabel, placeLabel),
          dialogue: "「気になるけど、外したくないな……」",
          emotion: "worry",
        },
        {
          title: "店のこだわりを知る",
          narration: "スープだけでなく、麺も自家製であることを知る。",
          dialogue: "「スープだけじゃなく、麺も自家製なんだ」",
          emotion: "notice",
        },
        {
          title: "一度食べてみたくなる",
          narration: "こだわりスープと自家製麺の組み合わせを知り、実際に味わってみたくなる。",
          dialogue: "「これは一度食べてみたい」",
          emotion: "delight",
        },
        {
          title: "今日の一杯を決める",
          narration: "店の特徴が分かり、次に食べる一杯として選ぶ。",
          dialogue: "「今日の一杯は、ここにしよう」",
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
  const baseStyle = `4コマページ向けの縦長1コマ構図、スマホ表示最適化、読みやすい吹き出し、${tone}な演出、カラーは${color}。`;

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
    `2) ${strength}。味・雰囲気・来店前の判断材料を、ページ内で分かりやすく伝えます。`,
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

const isDeliveryMode = (data) => data.outputMode !== "editor";

const sampleOnly = (data, html) => (isSampleLp(data) ? html : "");

const editorOnly = (data, html) => (isDeliveryMode(data) ? "" : html);

const sampleLinkNote = (data) => editorOnly(data, "<small>確認用リンクです</small>");

const sampleLpLabel = (data) =>
  data.lpType === "recruiting" ? "採用案内" : "来店案内";

const assetNotice = (data) => editorOnly(data, `
  <aside class="asset-notice">
    <strong>漫画画像は仮素材です</strong>
    <p>本番制作時はヒアリング内容に合わせて画像を差し替えます。上部に生成される画像プロンプトを制作指示として使用できます。</p>
  </aside>
`);

const mangaPanels = (panels, data) => `
  <div class="generated-panels story-timeline" aria-label="${isDeliveryMode(data) ? "4コマストーリー" : "ヒアリング内容から生成した4コマ漫画"}">
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
  const model = messageModel(data);
  const worryItems = model.problems.slice(0, 3);
  const benefitItems = model.strengths.slice(0, 3);

  return `
    <main class="generated-lp recruiting" data-output-mode="${escapeHtml(data.outputMode || "delivery")}" style="${themeStyle(data)}">
      ${sampleOnly(data, `<div class="sample-ribbon">${sampleRibbonText(data)}</div>`)}
      <header class="generated-hero">
        <div class="generated-hero-inner">
          <span class="generated-badge">${escapeHtml(data.service)} 採用</span>
          <p class="generated-kicker">RECRUIT / ${escapeHtml(data.business)}</p>
          <h1>${escapeHtml(model.target)}へ。<br>${escapeHtml(data.service)}で安心して働ける理由</h1>
          <p class="generated-sub">${escapeHtml(model.problemLead)}。${escapeHtml(model.strengthLead)}</p>
          <div class="hero-cta-row">${ctaLink(data)}${sampleLinkNote(data)}</div>
        </div>
      </header>

      <section class="generated-section generated-problem">
        ${sectionTitle("WORRY", "求職者の不安", `${model.target}が応募前に感じやすい不安を整理しました。`)}
        <div class="worry-list">
          ${worryItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </section>

      <section class="generated-manga">
        ${sectionTitle("STORY", isDeliveryMode(data) ? "4コマ応募ストーリー" : "ヒアリングから生成した4コマ応募ストーリー", "応募を迷うところから、最初の一歩を決めるまでの流れです。")}
        ${assetNotice(data)}
        ${mangaPanels(panels, data)}
      </section>

      <section class="generated-section generated-solution">
        ${sectionTitle("SOLUTION", "働きやすさの理由", `${data.service}として安心して働けるポイントです。`)}
        <p>研修やシフト相談を確認できるため、初めてでも働き始める姿をイメージしやすくなります。</p>
        ${ctaLink(data, "secondary")}
      </section>

      <section class="generated-section generated-dark">
        ${sectionTitle("REASON", "初めてでも始めやすい理由")}
        <div class="generated-cards three">
          ${benefitItems.map((item, index) => `<article><strong>${String(index + 1).padStart(2, "0")}</strong><h3>${escapeHtml(item)}</h3><p>${escapeHtml(describeStrength(item, data))}</p></article>`).join("")}
        </div>
      </section>

      <section class="generated-section generated-reasons">
        ${sectionTitle("PROOF", "働き方について", "応募前に確認しておきたいポイントです。")}
        <div class="reason-stack">
          <article><h3>応募前に分かること</h3><p>${escapeHtml(model.proof)}</p></article>
          <article><h3>相談しやすい職場</h3><p>${escapeHtml(tonePhrase(data.tone))}の中で、応募前の不安を相談しやすくします。</p></article>
          <article><h3>お店らしい活気</h3><p>${escapeHtml(colorPhrase(data.color))}</p></article>
        </div>
      </section>

      <section class="generated-section generated-faq">
        ${sectionTitle("FAQ", "応募前によくある質問")}
        <details open><summary>未経験でも応募できますか？</summary><p>${escapeHtml(model.firstStrength)}を確認できるため、初めてでも仕事を覚える流れをイメージしやすくなります。</p></details>
        <details><summary>働き方は相談できますか？</summary><p>応募前に不安がある方も、${escapeHtml(model.strengthSummary)}を確認できます。</p></details>
      </section>

      <section class="generated-cta-section">
        <p>研修や働き方を確認して、安心して最初の一歩を踏み出してください。</p>
        ${ctaLink(data)}
        <small>${escapeHtml(data.business)}｜${escapeHtml(data.service)}｜${sampleLpLabel(data)}</small>
      </section>
    </main>
  `;
};

const buildLeadgenLp = (data, imageSources) => {
  const panels = buildMangaPanelData(data, imageSources);
  const model = messageModel(data);
  const worryItems = model.problems.slice(0, 3);
  const reasonItems = model.strengths.slice(0, 3);

  return `
    <main class="generated-lp leadgen" data-output-mode="${escapeHtml(data.outputMode || "delivery")}" style="${themeStyle(data)}">
      ${sampleOnly(data, `<div class="sample-ribbon">${sampleRibbonText(data)}</div>`)}
      <header class="generated-hero">
        <div class="generated-hero-inner">
          <span class="generated-badge">${escapeHtml(data.service)} 集客</span>
          <p class="generated-kicker">VISIT / ${escapeHtml(data.business)}</p>
          <h1>初めての方にも知ってほしい。<br>スープと自家製麺にこだわった一杯</h1>
          <p class="generated-sub">味や雰囲気を確かめてから選びたい方へ。${escapeHtml(model.strengthLead)}</p>
          <div class="hero-cta-row">${ctaLink(data)}${sampleLinkNote(data)}</div>
        </div>
      </header>

      <section class="generated-section generated-problem">
        ${sectionTitle("WORRY", "顧客の悩み", `${model.target}が選ぶ前に感じやすい迷いを整理しました。`)}
        <div class="worry-list">
          ${worryItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </section>

      <section class="generated-manga">
        ${sectionTitle("STORY", isDeliveryMode(data) ? "4コマ来店ストーリー" : "ヒアリングから生成した4コマ来店ストーリー", `${data.character}を通じて、迷いが期待へ変わっていく流れを描きます。`)}
        ${assetNotice(data)}
        ${mangaPanels(panels, data)}
      </section>

      <section class="generated-section generated-solution">
        ${sectionTitle("SOLUTION", "気になる一杯", `${data.service}の特徴を来店前に知ることができます。`)}
        <p>スープや自家製麺のこだわりを知ると、今日食べたい一杯をイメージしやすくなります。</p>
        ${ctaLink(data, "secondary")}
      </section>

      <section class="generated-section generated-dark">
        ${sectionTitle("REASON", "お店のこだわり")}
        <div class="generated-cards three">
          ${reasonItems.map((item, index) => `<article><strong>${String(index + 1).padStart(2, "0")}</strong><h3>${escapeHtml(item)}</h3><p>${escapeHtml(describeStrength(item, data))}</p></article>`).join("")}
        </div>
      </section>

      <section class="generated-section generated-voices">
        ${sectionTitle("PROOF", "初めて来店する方へ", "来店前に知っておきたいポイントです。")}
        <div class="voice-list">
          <blockquote><b>来店前に分かること</b><p>${escapeHtml(model.proof)}</p></blockquote>
          <blockquote><b>店内の空気感</b><p>${escapeHtml(tonePhrase(data.tone))}と${escapeHtml(colorPhrase(data.color))}で、食べに行く前の期待がふくらみます。</p></blockquote>
        </div>
      </section>

      <section class="generated-section generated-faq">
        ${sectionTitle("FAQ", "来店前によくある質問")}
        <details open><summary>来店前に何が分かりますか？</summary><p>スープ、麺、初回来店向けの限定特典など、気になるポイントを確認できます。</p></details>
        <details><summary>予約や来店情報はどこで見ますか？</summary><p>ページ内の「${escapeHtml(data.cta.label)}」から詳しい情報を確認できます。</p></details>
      </section>

      <section class="generated-cta-section">
        <p>メニューや来店情報を確認して、気になる一杯を見つけてください。</p>
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
    [/できますを|ありますを|ですへの|方が方へ|という悩みをという|できるためできます|安心して安心|分かりやすく分かる|分からずと|わからずと|と思っているが|と思っているを|ありがある|有りがある|可がある|ありがあるため|有りがあるため|が気になる方へ、|方へ、/, "不自然な接続表現らしき文字列が含まれています。"],
  ];

  checks.forEach(([pattern, message]) => {
    if (pattern.test(htmlForAudit)) warnings.push(message);
  });

  const doc = new DOMParser().parseFromString(htmlForAudit, "text/html");
  const lpRoot = doc.querySelector(".generated-lp");
  const visibleText = lpRoot?.textContent || doc.body.textContent || "";
  const isDeliveryHtml = lpRoot?.getAttribute("data-output-mode") !== "editor";
  if (isDeliveryHtml && /ヒアリング|生成|漫画LP|画像プロンプト|仮素材|本番制作時|制作担当者向けメモ/.test(visibleText)) {
    warnings.push("納品HTMLに制作側の文言が含まれています。");
  }

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

  const cardDescriptions = Array.from(doc.querySelectorAll(".generated-cards article p"))
    .map((node) => node.textContent.trim())
    .filter(Boolean);
  const duplicateDescriptions = cardDescriptions.filter((text, index) => cardDescriptions.indexOf(text) !== index);
  if (duplicateDescriptions.length > 0) {
    warnings.push("同一の説明文が複数カードに使われています。");
  }

  if (doc.querySelector(".generated-lp.recruiting") && /来店|予約|食べたい/.test(visibleText)) {
    warnings.push("採用LP内に集客向けの行動語が含まれています。");
  }

  if (doc.querySelector(".generated-lp.leadgen") && /応募|職場見学|働きたい/.test(visibleText)) {
    warnings.push("集客LP内に採用向けの行動語が含まれています。");
  }

  doc.querySelectorAll(".generated-panel").forEach((panel) => {
    if (/掲載内容は架空の(?:募集|来店)例です|実在する口コミや実績ではありません|実在する募集条件や実績ではありません/.test(panel.textContent)) {
      warnings.push("漫画内にサンプル注記や免責説明が含まれています。");
    }
  });

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








