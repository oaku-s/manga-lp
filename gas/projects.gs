/**
 * 案件の保存・読み込み用 Web アプリ。
 *
 * ブラウザから直接は呼ばれない。manga-lp の /api/projects（Vercel Function）が
 * 共有トークンを添えて POST してくる。トークンはスクリプトプロパティ SHARED_TOKEN。
 *
 * 生成結果と修正履歴は次段階で別シートに追加する。案件IDで紐付ける前提のため、
 * このファイルには案件シートの読み書きだけを置く。
 */

const SHEET_NAME = "案件";
const ID_PREFIX = "P-";
const ID_DIGITS = 4;
const DEFAULT_STATUS = "下書き";

/**
 * 列ヘッダー。この並びがそのままシートの列順になる。
 * 読み書きは列番号ではなくヘッダー名で解決しているので、
 * 列を足すときは末尾に追記すれば既存行も既存コードも壊れない。
 */
const HEADERS = [
  "案件ID",
  "店名",
  "業種",
  "ステータス",
  "作成日時",
  "更新日時",
  "LP種別",
  "表現形式",
  "ターゲット",
  "解決できる悩み",
  "一番手間や時間をかけていること",
  "お客さんによく言われること",
  "常連さんが必ず頼むもの・必ず言うこと",
  "印象に残っているやりとり",
  "始めたきっかけ・続けている理由",
  "キャラクター性別・年齢",
  "キャラクター役割",
  "キャラクター性格・口調",
  "キャラクター見た目",
  "トーン",
  "カラーイメージ",
  "参考LP URL",
  "DriveフォルダID",
];

/** フォームの項目名 → 列ヘッダー。ツール側の collectFormData のキーと対応する。 */
const FIELD_TO_HEADER = {
  businessName: "店名",
  lpType: "LP種別",
  format: "表現形式",
  target: "ターゲット",
  problemsSolved: "解決できる悩み",
  strengths: "一番手間や時間をかけていること",
  results: "お客さんによく言われること",
  regulars: "常連さんが必ず頼むもの・必ず言うこと",
  episode: "印象に残っているやりとり",
  origin: "始めたきっかけ・続けている理由",
  characterGender: "キャラクター性別・年齢",
  characterRole: "キャラクター役割",
  characterPersonality: "キャラクター性格・口調",
  characterAppearance: "キャラクター見た目",
  tone: "トーン",
  colorImage: "カラーイメージ",
  refLpUrl: "参考LP URL",
};

// ── エントリポイント ──────────────────────────────────────────────

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (!isAuthorized(body.token)) {
      return jsonOutput({ error: "unauthorized" });
    }

    switch (body.action) {
      case "list":
        return jsonOutput({ projects: listProjects() });
      case "get":
        return jsonOutput({ project: getProject(body.projectId) });
      case "create":
        return jsonOutput(createProject(body.values || {}, body.status));
      case "update":
        return jsonOutput(updateProject(body.projectId, body.values || {}, body.status));
      case "startGeneration":
        return jsonOutput(startGeneration(body));
      case "uploadFile":
        return jsonOutput(uploadGenerationFile(body));
      default:
        return jsonOutput({ error: "不明な action: " + body.action });
    }
  } catch (err) {
    return jsonOutput({ error: err.message });
  }
}

/** デプロイ確認用。データは返さない。 */
function doGet() {
  return jsonOutput({ ok: true, sheet: SHEET_NAME });
}

// ── 認証 ──────────────────────────────────────────────────────────

/**
 * 期待するトークン。スクリプトプロパティを優先し、無ければ token.gs の定数を使う。
 * token.gs は setup スクリプトが生成して clasp push で送るファイルで、Git 管理外。
 * これによりGASエディタを開かずにトークンを設定できる。
 */
function expectedToken() {
  const fromProperty = PropertiesService.getScriptProperties().getProperty("SHARED_TOKEN");
  if (fromProperty) return fromProperty;
  if (typeof SHARED_TOKEN_FALLBACK === "string" && SHARED_TOKEN_FALLBACK) return SHARED_TOKEN_FALLBACK;
  return "";
}

function isAuthorized(token) {
  const expected = expectedToken();
  if (!expected || !token) return false;
  if (token.length !== expected.length) return false;

  // 文字数が一致した場合は最後まで比較し、早期 return で時間差が出ないようにする
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ── シート ────────────────────────────────────────────────────────

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  // ヘッダー行が無ければ作る。既にある場合は触らない（列の追加・並べ替えを尊重する）
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function columnOf(headers, name) {
  const index = headers.indexOf(name);
  if (index === -1) throw new Error("列が見つかりません: " + name);
  return index;
}

function findRowNumber(sheet, headers, projectId) {
  const idColumn = columnOf(headers, "案件ID") + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(projectId)) return i + 2;
  }
  return -1;
}

// ── 各アクション ──────────────────────────────────────────────────

function listProjects() {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const idColumn = columnOf(headers, "案件ID");
  const nameColumn = columnOf(headers, "店名");
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return rows
    .filter((row) => row[idColumn])
    .map((row) => ({ projectId: String(row[idColumn]), name: String(row[nameColumn] || "") }));
}

function getProject(projectId) {
  if (!projectId) throw new Error("projectId が指定されていません");

  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const rowNumber = findRowNumber(sheet, headers, projectId);
  if (rowNumber === -1) throw new Error("案件が見つかりません: " + projectId);

  const row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];

  const values = {};
  Object.keys(FIELD_TO_HEADER).forEach((field) => {
    const index = headers.indexOf(FIELD_TO_HEADER[field]);
    values[field] = index === -1 ? "" : String(row[index] || "");
  });

  return {
    projectId: String(row[columnOf(headers, "案件ID")]),
    name: String(row[columnOf(headers, "店名")] || ""),
    status: String(row[columnOf(headers, "ステータス")] || ""),
    createdAt: String(row[columnOf(headers, "作成日時")] || ""),
    updatedAt: String(row[columnOf(headers, "更新日時")] || ""),
    values: values,
  };
}

function createProject(values, status) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet();
    const headers = getHeaders(sheet);
    const now = new Date().toISOString();
    const projectId = nextProjectId(sheet, headers);

    const row = new Array(sheet.getLastColumn()).fill("");
    row[columnOf(headers, "案件ID")] = projectId;
    row[columnOf(headers, "ステータス")] = status || DEFAULT_STATUS;
    row[columnOf(headers, "作成日時")] = now;
    row[columnOf(headers, "更新日時")] = now;
    applyValues(row, headers, values);

    sheet.appendRow(row);
    return { projectId: projectId, createdAt: now, updatedAt: now };
  } finally {
    lock.releaseLock();
  }
}

function updateProject(projectId, values, status) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet();
    const headers = getHeaders(sheet);
    const rowNumber = findRowNumber(sheet, headers, projectId);
    if (rowNumber === -1) throw new Error("案件が見つかりません: " + projectId);

    const range = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());
    const row = range.getValues()[0];
    const now = new Date().toISOString();

    // 作成日時と案件IDはそのまま残す
    if (status) row[columnOf(headers, "ステータス")] = status;
    row[columnOf(headers, "更新日時")] = now;
    applyValues(row, headers, values);

    range.setValues([row]);
    return { projectId: String(projectId), updatedAt: now };
  } finally {
    lock.releaseLock();
  }
}

// ── 補助 ──────────────────────────────────────────────────────────

/** 送られてきたフォーム項目だけを行に書き込む。未知のキーは無視する。 */
function applyValues(row, headers, values) {
  Object.keys(FIELD_TO_HEADER).forEach((field) => {
    if (!(field in values)) return;
    const index = headers.indexOf(FIELD_TO_HEADER[field]);
    if (index === -1) return;
    row[index] = values[field] == null ? "" : String(values[field]);
  });
}

/** 既存の最大番号 + 1。連番が飛んでいても衝突しない。 */
function nextProjectId(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return formatProjectId(1);

  const idColumn = columnOf(headers, "案件ID") + 1;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();

  let max = 0;
  ids.forEach((cell) => {
    const matched = String(cell[0]).match(/(\d+)\s*$/);
    if (matched) max = Math.max(max, parseInt(matched[1], 10));
  });

  return formatProjectId(max + 1);
}

function formatProjectId(number) {
  let digits = String(number);
  while (digits.length < ID_DIGITS) digits = "0" + digits;
  return ID_PREFIX + digits;
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
