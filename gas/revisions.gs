/**
 * Drive上の版フォルダを見張り、前回との差分を `修正履歴` に記録する。
 *
 * 時間主導トリガーで scanRevisions() を回す。トリガーは最初の生成時に
 * ensureRevisionTrigger_() が仕掛けるので、手で設定する必要はない。
 *
 * 前回の状態は Drive の _snapshots/案件ID/vN.json に置く。
 * PropertiesService は1値9KBの上限があり index.html が入らない。
 * 納品フォルダの中に置くと納品物にゴミが混ざるので、外に出している。
 *
 * スナップショットが無い版フォルダは「初回」とみなし、記録せずに
 * スナップショットだけ作る。生成直後に全セクションが変更扱いされるのを防ぐため。
 */

const REV_SHEET = "修正履歴";
const REV_HEADERS = [
  "修正ID",
  "生成ID",
  "修正日時",
  "対象セクション",
  "変更前",
  "変更後",
  "修正の種類",
  "編集者",
  "依頼元",
];

const SYNC_SHEET = "_同期状態";
const SYNC_HEADERS = ["キー", "値", "更新日時"];

const SNAPSHOT_FOLDER_NAME = "_snapshots";
const TRIGGER_MINUTES = 15;

/** 1回の実行で使う上限。GASは6分で強制終了するため、手前で切り上げて次回に回す。 */
const SCAN_BUDGET_MS = 4 * 60 * 1000;

/**
 * 案件ステータス → 依頼元。差分そのものからは依頼元が分からないので、
 * 検知時点のステータスから推定する。当てはまらなければ「未判定」を入れる。
 * 推定であることを残すため、事実である「編集者」とは列を分けている。
 */
const STATUS_TO_SOURCE = {
  "初稿確認中": "顧客",
  "修正対応中": "顧客",
  "社内チェック": "社内",
  "納品済み": "顧客",
};

// ── トリガー ──────────────────────────────────────────────────────

function ensureRevisionTrigger_() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "scanRevisions") return;
    }
    ScriptApp.newTrigger("scanRevisions").timeBased().everyMinutes(TRIGGER_MINUTES).create();
  } catch (err) {
    // トリガーを作れなくても生成の記録自体は成立させる
    logSync_("trigger_error", err.message);
  }
}

// ── 同期状態 ──────────────────────────────────────────────────────

function logSync_(key, value) {
  try {
    const sheet = sheetByName_(SYNC_SHEET, SYNC_HEADERS);
    const headers = headersOf_(sheet);
    const lastRow = sheet.getLastRow();
    const now = new Date().toISOString();

    if (lastRow >= 2) {
      const keys = sheet.getRange(2, colIndex_(headers, "キー") + 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < keys.length; i++) {
        if (String(keys[i][0]) === key) {
          sheet.getRange(i + 2, colIndex_(headers, "値") + 1).setValue(String(value));
          sheet.getRange(i + 2, colIndex_(headers, "更新日時") + 1).setValue(now);
          return;
        }
      }
    }
    sheet.appendRow([key, String(value), now]);
  } catch (err) {
    // 記録の記録が失敗しても本処理は続ける
  }
}

// ── HTMLの読み取り ────────────────────────────────────────────────

/**
 * data-section 単位でテキストを取り出す。GASにHTMLパーサが無いため正規表現で切る。
 * 生成物の構造（section/footer が入れ子にならない）を前提にしている。
 */
function extractSections_(html) {
  const sections = {};
  const pattern = /<(section|footer|div)\b[^>]*data-section="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let matched;
  while ((matched = pattern.exec(html)) !== null) {
    sections[matched[2]] = toPlainText_(matched[3]);
  }
  return sections;
}

/** :root の変数名 → 値。 */
function extractRootVariables_(html) {
  const variables = {};
  const block = html.match(/:root\s*\{([\s\S]*?)\}/);
  if (!block) return variables;

  const pattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let matched;
  while ((matched = pattern.exec(block[1])) !== null) {
    variables[matched[1]] = matched[2].trim();
  }
  return variables;
}

function toPlainText_(fragment) {
  return String(fragment)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── スナップショット ──────────────────────────────────────────────

function snapshotFolder_(projectId) {
  const root = childFolder_(driveRoot_(), SNAPSHOT_FOLDER_NAME);
  return childFolder_(root, projectId);
}

function readSnapshot_(projectId, version) {
  const files = snapshotFolder_(projectId).getFilesByName("v" + version + ".json");
  if (!files.hasNext()) return null;
  try {
    return JSON.parse(files.next().getBlob().getDataAsString("UTF-8"));
  } catch (err) {
    return null;
  }
}

function writeSnapshot_(projectId, version, snapshot) {
  const folder = snapshotFolder_(projectId);
  const name = "v" + version + ".json";
  const existing = folder.getFilesByName(name);
  while (existing.hasNext()) existing.next().setTrashed(true);
  folder.createFile(name, JSON.stringify(snapshot), "application/json");
}

/** 版フォルダの現状を読み取って、スナップショットと同じ形にする。 */
function captureState_(versionFolder) {
  const state = { sections: {}, root: {}, media: {}, lastModifier: "", updatedAt: "" };

  const htmlFiles = versionFolder.getFilesByName("index.html");
  if (htmlFiles.hasNext()) {
    const file = htmlFiles.next();
    const html = file.getBlob().getDataAsString("UTF-8");
    state.sections = extractSections_(html);
    state.root = extractRootVariables_(html);
    state.updatedAt = file.getLastUpdated().toISOString();
    state.lastModifier = lastModifierOf_(file);
  }

  const mediaFolders = versionFolder.getFoldersByName("media");
  if (mediaFolders.hasNext()) {
    const files = mediaFolders.next().getFiles();
    while (files.hasNext()) {
      const file = files.next();
      // 中身のハッシュは取れないので、サイズと更新時刻で変更を見る
      state.media[file.getName()] = {
        size: file.getSize(),
        updated: file.getLastUpdated().toISOString(),
      };
      if (!state.lastModifier) state.lastModifier = lastModifierOf_(file);
    }
  }

  return state;
}

/**
 * 最終更新者。Advanced Drive Service が有効なときだけ取れる。
 * 無効でも記録全体は動かしたいので、取れなければ空文字で通す。
 */
function lastModifierOf_(file) {
  try {
    const meta = Drive.Files.get(file.getId(), { fields: "lastModifyingUser" });
    return (meta && meta.lastModifyingUser && meta.lastModifyingUser.displayName) || "";
  } catch (err) {
    return "";
  }
}

// ── 差分 ──────────────────────────────────────────────────────────

/**
 * 前回と今回を比べ、記録すべき変更の配列を返す。
 * 1つの検知で複数種類が該当することがあるので、種類ごとに分けて返す。
 */
function diffStates_(before, after) {
  const changes = [];

  // 構成：セクションの増減
  Object.keys(after.sections).forEach(function (name) {
    if (!(name in before.sections)) {
      changes.push({ section: name, before: "", after: "(セクション追加)", kind: "構成" });
    }
  });
  Object.keys(before.sections).forEach(function (name) {
    if (!(name in after.sections)) {
      changes.push({ section: name, before: "(セクション削除)", after: "", kind: "構成" });
    }
  });

  // 文言：両方にあるセクションの本文
  Object.keys(after.sections).forEach(function (name) {
    if (!(name in before.sections)) return;
    if (before.sections[name] !== after.sections[name]) {
      changes.push({
        section: name,
        before: before.sections[name],
        after: after.sections[name],
        kind: "文言",
      });
    }
  });

  // 配色：:root の変数
  const variableNames = {};
  Object.keys(before.root).forEach(function (n) { variableNames[n] = true; });
  Object.keys(after.root).forEach(function (n) { variableNames[n] = true; });
  Object.keys(variableNames).forEach(function (name) {
    const previous = before.root[name] === undefined ? "" : before.root[name];
    const current = after.root[name] === undefined ? "" : after.root[name];
    if (previous !== current) {
      changes.push({ section: ":root " + name, before: previous, after: current, kind: "配色" });
    }
  });

  // 画像：media 配下
  const mediaNames = {};
  Object.keys(before.media).forEach(function (n) { mediaNames[n] = true; });
  Object.keys(after.media).forEach(function (n) { mediaNames[n] = true; });
  Object.keys(mediaNames).forEach(function (name) {
    const previous = before.media[name];
    const current = after.media[name];
    if (!previous) {
      changes.push({ section: "media/" + name, before: "", after: "(画像追加)", kind: "画像" });
    } else if (!current) {
      changes.push({ section: "media/" + name, before: "(画像削除)", after: "", kind: "画像" });
    } else if (previous.size !== current.size || previous.updated !== current.updated) {
      changes.push({
        section: "media/" + name,
        before: previous.size + " bytes",
        after: current.size + " bytes",
        kind: "画像",
      });
    }
  });

  return changes;
}

// ── 走査本体 ──────────────────────────────────────────────────────

/**
 * 時間主導トリガーから呼ばれる入口。
 *
 * ここでスクリプトロックを握りっぱなしにすると、走査中に生成された案件の
 * startGeneration が待たされて失敗しうる。記録が生成の足を引っぱらないよう、
 * ロックはシートへ書く一瞬だけにして、走査全体では持たない。
 * 走査どうしが重なった場合は、行の重複をキーで弾く。
 */
function scanRevisions() {
  const startedAt = Date.now();
  const generations = listGenerations_();
  let scanned = 0;
  let recorded = 0;

  for (let i = 0; i < generations.length; i++) {
    if (Date.now() - startedAt > SCAN_BUDGET_MS) {
      logSync_("last_scan_note", "時間切れのため " + scanned + " 件で中断");
      break;
    }
    try {
      recorded += scanOneGeneration_(generations[i]);
      scanned++;
    } catch (err) {
      // 1件の失敗で全体を止めない
      logSync_("error_" + generations[i].generationId, err.message);
    }
  }

  logSync_("last_scan", new Date().toISOString() + " / 対象" + scanned + "件 / 記録" + recorded + "行");
}

function listGenerations_() {
  const sheet = sheetByName_(GEN_SHEET, GEN_HEADERS);
  const headers = headersOf_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const list = [];
  rows.forEach(function (row) {
    const generationId = String(row[colIndex_(headers, "生成ID")] || "");
    const url = String(row[colIndex_(headers, "DriveフォルダURL")] || "");
    if (!generationId || !url) return;
    // https://drive.google.com/drive/folders/<id> からIDを取る。
    // 形が変わった場合に備えて、長い英数字の並びを拾う方法にも落とす
    const matched = url.match(/\/folders\/([-\w]+)/) || url.match(/([-\w]{25,})/);
    if (!matched) return;
    list.push({
      generationId: generationId,
      projectId: String(row[colIndex_(headers, "案件ID")] || ""),
      version: String(row[colIndex_(headers, "版番号")] || ""),
      folderId: matched[1],
    });
  });
  return list;
}

/** 1つの版フォルダを見て、必要なら `修正履歴` に足す。追加した行数を返す。 */
function scanOneGeneration_(generation) {
  let versionFolder;
  try {
    versionFolder = DriveApp.getFolderById(generation.folderId);
  } catch (err) {
    return 0; // フォルダが消えている
  }

  const current = captureState_(versionFolder);
  const previous = readSnapshot_(generation.projectId, generation.version);

  // 初回はスナップショットを作るだけ。生成直後を全変更として記録しないため
  if (!previous) {
    writeSnapshot_(generation.projectId, generation.version, current);
    return 0;
  }

  const changes = diffStates_(previous, current);
  if (changes.length === 0) return 0;

  const source = sourceFromStatus_(generation.projectId);
  const editor = current.lastModifier || "";
  const detectedAt = new Date().toISOString();
  const stamp = current.updatedAt || detectedAt;

  const written = appendRevisions_(generation, changes, stamp, editor, source);

  // 記録が通ってからスナップショットを進める。逆にすると失敗時に変更を取りこぼす
  writeSnapshot_(generation.projectId, generation.version, current);
  return written;
}

/** シートへの追記。ロックはこの一瞬だけ握る。 */
function appendRevisions_(generation, changes, stamp, editor, source) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = sheetByName_(REV_SHEET, REV_HEADERS);
    const headers = headersOf_(sheet);
    const known = existingKeys_(sheet, headers);

    const rows = [];
    changes.forEach(function (change) {
      // 冪等キー。シート書き込み後にスナップショット更新が落ちた場合や、
      // 走査が重なった場合の二重記録を防ぐ
      const key = generation.generationId + "|" + change.section + "|" + stamp;
      if (known[key]) return;
      known[key] = true;

      const row = new Array(sheet.getLastColumn()).fill("");
      row[colIndex_(headers, "生成ID")] = generation.generationId;
      row[colIndex_(headers, "修正日時")] = stamp;
      row[colIndex_(headers, "対象セクション")] = change.section;
      row[colIndex_(headers, "変更前")] = truncate_(change.before);
      row[colIndex_(headers, "変更後")] = truncate_(change.after);
      row[colIndex_(headers, "修正の種類")] = change.kind;
      row[colIndex_(headers, "編集者")] = editor;
      row[colIndex_(headers, "依頼元")] = source;
      rows.push(row);
    });

    if (rows.length === 0) return 0;

    let next = nextSerialId_(sheet, headers, "修正ID", "M-");
    const idColumn = colIndex_(headers, "修正ID");
    rows.forEach(function (row) {
      row[idColumn] = next;
      next = bumpSerial_(next);
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, sheet.getLastColumn()).setValues(rows);
    return rows.length;
  } finally {
    lock.releaseLock();
  }
}

function existingKeys_(sheet, headers) {
  const known = {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return known;

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const gen = colIndex_(headers, "生成ID");
  const section = colIndex_(headers, "対象セクション");
  const at = colIndex_(headers, "修正日時");
  values.forEach(function (row) {
    known[String(row[gen]) + "|" + String(row[section]) + "|" + String(row[at])] = true;
  });
  return known;
}

function bumpSerial_(id) {
  const matched = String(id).match(/^([A-Z]-)(\d+)$/);
  if (!matched) return id;
  let digits = String(parseInt(matched[2], 10) + 1);
  while (digits.length < matched[2].length) digits = "0" + digits;
  return matched[1] + digits;
}

/** セルの上限は5万文字。長い本文はそのまま入れず頭だけ残す。 */
function truncate_(text) {
  const value = String(text == null ? "" : text);
  return value.length > 500 ? value.slice(0, 500) + "…" : value;
}

function sourceFromStatus_(projectId) {
  try {
    const row = projectRow_(projectId);
    if (!row) return "未判定";
    const status = String(row.values[colIndex_(row.headers, "ステータス")] || "");
    return STATUS_TO_SOURCE[status] || "未判定";
  } catch (err) {
    return "未判定";
  }
}
