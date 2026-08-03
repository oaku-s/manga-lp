#!/usr/bin/env node
// 案件保存のセットアップ。リポジトリのルートで実行する。
//
//   node gas/setup.mjs              GAS側（スプレッドシート作成〜デプロイ）まで
//   node gas/setup.mjs --vercel     続けて Vercel の環境変数も設定する
//
// 事前に必要なのは clasp login と、Apps Script API の有効化の2つだけ。
// 詳細は gas/README.md を参照。

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TITLE = "ComicLP 案件管理";
const TOKEN_FILE = resolve("gas/token.gs");
const CLASP_CONFIG = resolve(".clasp.json");
const withVercel = process.argv.includes("--vercel");

const log = (message) => console.log(message);
const step = (n, message) => console.log(`\n[${n}] ${message}`);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.input === undefined ? ["inherit", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
    ...options,
  });
}

function fail(message, hint) {
  console.error(`\n失敗: ${message}`);
  if (hint) console.error(hint);
  process.exit(1);
}

// ── 0. 前提の確認 ────────────────────────────────────────────────
step(0, "clasp のログイン状態を確認します");
try {
  const who = run("clasp", ["show-authorized-user"]);
  log(who.trim().split("\n")[0]);
} catch {
  fail("clasp にログインしていません", "先に `npx clasp login` を実行してください。");
}

// ── 1. スプレッドシート + バインドされたGASプロジェクト ────────────
step(1, "スプレッドシートとGASプロジェクトを用意します");
if (existsSync(CLASP_CONFIG)) {
  const config = JSON.parse(readFileSync(CLASP_CONFIG, "utf8"));
  log(`既存の .clasp.json を使います（scriptId: ${config.scriptId}）`);
} else {
  try {
    const created = run("clasp", ["create-script", "--type", "sheets", "--title", TITLE, "--rootDir", "gas"]);
    log(created.trim());
  } catch (error) {
    fail(
      "スプレッドシートの作成に失敗しました",
      "Apps Script API が無効の可能性があります。\n" +
        "https://script.google.com/home/usersettings を開き「Google Apps Script API」をオンにしてから再実行してください。\n\n" +
        String(error.stdout || error.message)
    );
  }
}

// ── 2. 共有トークン ──────────────────────────────────────────────
step(2, "共有トークンを用意します");
let token;
if (existsSync(TOKEN_FILE)) {
  token = (readFileSync(TOKEN_FILE, "utf8").match(/"([0-9a-f]{32,})"/) || [])[1];
  if (!token) fail("gas/token.gs からトークンを読み取れません", "ファイルを削除して再実行してください。");
  log("既存の gas/token.gs を使います");
} else {
  token = randomBytes(32).toString("hex");
  writeFileSync(
    TOKEN_FILE,
    "// setup.mjs が生成。Git 管理外（.gitignore 済み）。\n" +
      "// スクリプトプロパティ SHARED_TOKEN を設定した場合はそちらが優先される。\n" +
      `const SHARED_TOKEN_FALLBACK = "${token}";\n`,
    "utf8"
  );
  log("gas/token.gs を生成しました（Git 管理外）");
}

// ── 3. コードを push ─────────────────────────────────────────────
step(3, "コードを push します");
try {
  log(run("clasp", ["push", "-f"]).trim());
} catch (error) {
  fail("push に失敗しました", String(error.stdout || error.message));
}

// ── 4. ウェブアプリとしてデプロイ ────────────────────────────────
step(4, "ウェブアプリとしてデプロイします");
let deploymentId;
try {
  const output = run("clasp", ["create-deployment", "--description", `案件API ${new Date().toISOString()}`]);
  log(output.trim());
  deploymentId = (output.match(/AKfycb[\w-]+/) || [])[0];
} catch (error) {
  fail("デプロイに失敗しました", String(error.stdout || error.message));
}

if (!deploymentId) {
  try {
    const list = run("clasp", ["list-deployments"]);
    const ids = list.match(/AKfycb[\w-]+/g) || [];
    deploymentId = ids[ids.length - 1];
  } catch {
    /* 一覧取得も失敗した場合は下で弾く */
  }
}
if (!deploymentId) fail("デプロイIDを取得できませんでした", "`npx clasp list-deployments` で確認してください。");

const webappUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;
log(`ウェブアプリURL: ${webappUrl}`);

// ── 5. 疎通確認 ──────────────────────────────────────────────────
step(5, "デプロイしたウェブアプリに疎通確認します");
try {
  const response = await fetch(webappUrl, { redirect: "follow" });
  const text = await response.text();
  if (text.trim().startsWith("{")) {
    log(`応答: ${text.trim().slice(0, 120)}`);
  } else {
    log("JSON が返りませんでした。次のどちらかが必要です。");
    log("  a) スクリプトの承認が済んでいない → " + `npx clasp open-script` + " でエディタを開き、関数 doGet を1回実行して承認する");
    log("  b) デプロイのアクセス設定が「全員」になっていない → 同じくエディタから確認する");
    log(`受信した先頭: ${text.trim().slice(0, 120)}`);
  }
} catch (error) {
  log(`疎通確認に失敗しました: ${error.message}`);
}

// ── 6. Vercel の環境変数 ────────────────────────────────────────
step(6, "Vercel の環境変数");
if (!withVercel) {
  log("--vercel を付けて実行すると、この2つを自動設定します。手動の場合は以下を登録してください。");
  log(`  GAS_WEBAPP_URL   = ${webappUrl}`);
  log(`  GAS_SHARED_TOKEN = ${token}`);
} else if (!existsSync(resolve(".vercel/project.json"))) {
  log("このディレクトリが Vercel プロジェクトに紐付いていません。");
  log("`npx vercel link` を実行してから、もう一度 --vercel 付きで実行してください。");
  log(`  GAS_WEBAPP_URL   = ${webappUrl}`);
  log(`  GAS_SHARED_TOKEN = ${token}`);
} else {
  for (const [name, value] of [["GAS_WEBAPP_URL", webappUrl], ["GAS_SHARED_TOKEN", token]]) {
    for (const env of ["production", "preview", "development"]) {
      try {
        run("vercel", ["env", "rm", name, env, "-y"], { input: "" });
      } catch {
        /* 未登録なら削除は失敗してよい */
      }
      try {
        run("vercel", ["env", "add", name, env], { input: value });
        log(`  ${name} (${env}) を設定しました`);
      } catch (error) {
        log(`  ${name} (${env}) の設定に失敗: ${String(error.stdout || error.message).trim()}`);
      }
    }
  }
  log("環境変数は既存のデプロイには反映されません。再デプロイしてください。");
}

// ── 完了 ─────────────────────────────────────────────────────────
log("\n完了しました。残りの手作業は gas/README.md の「手動でしか行えない作業」を参照してください。");
