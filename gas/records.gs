/**
 * 生成結果の記録と Drive へのアップロード。
 *
 * 生成のたびに 案件フォルダ配下へ新しい版フォルダ（v1, v2, ...）を作り、
 * `生成結果` シートに1行足す。ツール側は生成完了直後に startGeneration を1回、
 * そのあとファイルの数だけ uploadFile を呼ぶ。
 *
 * ここでの失敗はツール側で握りつぶされる前提。記録できなくても生成物は
 * 手元に残り、ダウンロードもできる。記録を通行止めにしない。
 *
 * 共通処理（シート取得・ID採番）は revisions.gs からも使うため、
 * projects.gs の同名関数とぶつからないよう末尾に _ を付けている。
 */

const ROOT_FOLDER_NAME = "漫画LP案件";
const ROOT_FOLDER_PROPERTY = "ROOT_FOLDER_ID";

const GEN_SHEET = "生成結果";
const GEN_HEADERS = [
  "生成ID",
  "案件ID",
  "生成日時",
  "LP種別",
  "表現形式",
  "版番号",
  "DriveフォルダURL",
  "採用フラグ",
  "備考",
];

// ── 共通ヘルパー ──────────────────────────────────────────────────

/**
 * 無ければ作り、ヘッダー行も用意する。既存シートのヘッダーには触らない。
 *
 * 新規作成時は全列を書式「書式なしテキスト」にする。ISO文字列の日時を
 * スプレッドシートが日付型に変換してしまうと、読み戻した値が書いた値と
 * 一致しなくなり、重複記録を防ぐキーが機能しなくなるため。
 */
function sheetByName_(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  const created = !sheet;
  if (!sheet) sheet = spreadsheet.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    if (created) {
      sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).setNumberFormat("@");
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function headersOf_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function colIndex_(headers, name) {
  const index = headers.indexOf(name);
  if (index === -1) throw new Error("列が見つかりません: " + name);
  return index;
}

/** 既存の最大番号 + 1。番号が飛んでいても衝突しない。 */
function nextSerialId_(sheet, headers, columnName, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + "0001";

  const column = colIndex_(headers, columnName) + 1;
  const ids = sheet.getRange(2, column, lastRow - 1, 1).getValues();

  let max = 0;
  ids.forEach(function (cell) {
    const matched = String(cell[0]).match(/(\d+)\s*$/);
    if (matched) max = Math.max(max, parseInt(matched[1], 10));
  });

  let digits = String(max + 1);
  while (digits.length < 4) digits = "0" + digits;
  return prefix + digits;
}

/** 案件シートの1行を配列で返す。無ければ null。 */
function projectRow_(projectId) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const rowNumber = findRowNumber(sheet, headers, projectId);
  if (rowNumber === -1) return null;
  return {
    sheet: sheet,
    headers: headers,
    rowNumber: rowNumber,
    values: sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0],
  };
}

// ── Drive ────────────────────────────────────────────────────────

/**
 * すべての案件フォルダを収めるルート。IDをスクリプトプロパティに覚えておき、
 * 毎回の名前検索を避ける。手でフォルダを消された場合は作り直す。
 */
function driveRoot_() {
  const properties = PropertiesService.getScriptProperties();
  const savedId = properties.getProperty(ROOT_FOLDER_PROPERTY);

  if (savedId) {
    try {
      return DriveApp.getFolderById(savedId);
    } catch (err) {
      // 削除済み。作り直す
    }
  }

  const existing = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  const folder = existing.hasNext() ? existing.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
  properties.setProperty(ROOT_FOLDER_PROPERTY, folder.getId());
  return folder;
}

/** 案件フォルダ。シートにIDがあればそれを使い、無ければ作ってIDを書き戻す。 */
function projectFolder_(projectId, shopName) {
  const row = projectRow_(projectId);
  if (!row) throw new Error("案件が見つかりません: " + projectId);

  const folderColumn = row.headers.indexOf("DriveフォルダID");
  const savedId = folderColumn === -1 ? "" : String(row.values[folderColumn] || "");

  if (savedId) {
    try {
      return DriveApp.getFolderById(savedId);
    } catch (err) {
      // 削除済み。作り直してIDを更新する
    }
  }

  const name = projectId + "_" + (shopName || String(row.values[colIndex_(row.headers, "店名")] || "無題"));
  const folder = driveRoot_().createFolder(name);

  if (folderColumn !== -1) {
    row.sheet.getRange(row.rowNumber, folderColumn + 1).setValue(folder.getId());
  }
  return folder;
}

/** 既存の v* フォルダの最大番号 + 1。 */
function nextVersionNumber_(projectFolder) {
  const folders = projectFolder.getFolders();
  let max = 0;
  while (folders.hasNext()) {
    const matched = String(folders.next().getName()).match(/^v(\d+)$/);
    if (matched) max = Math.max(max, parseInt(matched[1], 10));
  }
  return max + 1;
}

/** 親フォルダ直下の子フォルダ。無ければ作る。 */
function childFolder_(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

// ── アクション ────────────────────────────────────────────────────

/**
 * 版フォルダを作り、`生成結果` に1行足す。
 * 返した versionFolderId に対して、ツール側が uploadFile を繰り返す。
 */
function startGeneration(body) {
  const projectId = body.projectId;
  if (!projectId) throw new Error("projectId が指定されていません");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const folder = projectFolder_(projectId, body.shopName);
    const version = nextVersionNumber_(folder);
    const versionFolder = folder.createFolder("v" + version);

    const sheet = sheetByName_(GEN_SHEET, GEN_HEADERS);
    const headers = headersOf_(sheet);
    const generationId = nextSerialId_(sheet, headers, "生成ID", "G-");

    const row = new Array(sheet.getLastColumn()).fill("");
    row[colIndex_(headers, "生成ID")] = generationId;
    row[colIndex_(headers, "案件ID")] = projectId;
    row[colIndex_(headers, "生成日時")] = new Date().toISOString();
    row[colIndex_(headers, "LP種別")] = body.lpType || "";
    row[colIndex_(headers, "表現形式")] = body.format || "";
    row[colIndex_(headers, "版番号")] = version;
    row[colIndex_(headers, "DriveフォルダURL")] = versionFolder.getUrl();
    row[colIndex_(headers, "採用フラグ")] = "";
    row[colIndex_(headers, "備考")] = body.note || "";
    sheet.appendRow(row);

    // 修正検知のトリガーはここで用意する。別途手で仕掛ける手間を無くすため
    ensureRevisionTrigger_();

    return {
      generationId: generationId,
      version: version,
      versionFolderId: versionFolder.getId(),
      folderUrl: versionFolder.getUrl(),
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 1ファイルを版フォルダへ置く。path に "media/koma-01.jpg" のような
 * スラッシュ区切りを渡すと、途中のフォルダを作ってからその中に置く。
 *
 * 1回のリクエストを小さく保つため、ファイルは1つずつ送ってもらう。
 * まとめて送ると中継する Vercel Functions のボディ上限に当たる。
 */
function uploadGenerationFile(body) {
  const folderId = body.versionFolderId;
  const path = String(body.path || "");
  if (!folderId) throw new Error("versionFolderId が指定されていません");
  if (!path) throw new Error("path が指定されていません");

  let folder = DriveApp.getFolderById(folderId);
  const segments = path.split("/");
  const fileName = segments.pop();

  segments.forEach(function (segment) {
    if (segment) folder = childFolder_(folder, segment);
  });

  const bytes = Utilities.base64Decode(body.dataBase64 || "");
  const blob = Utilities.newBlob(bytes, body.mimeType || "application/octet-stream", fileName);

  // 同名があれば消してから置く。版フォルダは1回の生成専用なので上書きで問題ない
  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const file = folder.createFile(blob);
  return { fileId: file.getId(), path: path, size: bytes.length };
}
