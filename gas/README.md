# 案件保存（GAS + スプレッドシート）セットアップ

構成は次のとおりです。共有トークンはブラウザに渡らず、Vercel の環境変数と Apps Script プロジェクトの中だけに存在します。

```
ブラウザ  ──同一オリジン──▶  /api/projects（Vercel）  ──トークン付与──▶  GAS Web アプリ  ──▶  スプレッドシート
```

---

## 手動でしか行えない作業（これだけ）

| # | 作業 | 理由 |
| --- | --- | --- |
| 1 | `npx clasp login` | ブラウザでのGoogle OAuth同意。CLIからは代替できない |
| 2 | [Apps Script API を有効化](https://script.google.com/home/usersettings) | アカウント単位の設定。API・CLIから変更する手段がない。一度きり |
| 3 | スクリプトの初回承認 | 下記「承認について」を参照。**不要な場合もある** |
| 4 | Vercel の再デプロイ | 環境変数は既存デプロイに反映されないため。ダッシュボードの Redeploy か空コミットのpush |

**それ以外は下のコマンド1本で通ります。** スプレッドシートの作成、GASプロジェクトの紐付け、トークンの生成と設定、コードのpush、ウェブアプリのデプロイ、URLの取得、Vercelの環境変数登録まで自動です。

## セットアップ

```bash
npx clasp login
```

[Apps Script API を有効化](https://script.google.com/home/usersettings)（「Google Apps Script API」をオン）してから、リポジトリのルートで:

```bash
node gas/setup.mjs --vercel
```

`--vercel` を外すと GAS 側だけ実行し、設定すべき環境変数の値を表示して終わります。

スクリプトが行うこと:

1. `clasp show-authorized-user` でログイン確認
2. `clasp create-script --type sheets` で**スプレッドシートとバインド済みGASプロジェクトを新規作成**（`.clasp.json` が既にあれば流用）
3. 32バイトのランダムトークンを生成し `gas/token.gs` に書き出す（**Git管理外**）
4. `clasp push -f` でコードとトークンを反映
5. `clasp create-deployment` でウェブアプリとしてデプロイし、デプロイIDからURLを組み立てる
6. そのURLにGETして疎通確認
7. `vercel env add` で `GAS_WEBAPP_URL` と `GAS_SHARED_TOKEN` を production / preview / development に登録

`--vercel` を使う場合、事前に `npx vercel link` でこのディレクトリを Vercel プロジェクトに紐付けておく必要があります（未紐付けなら値を表示して終わります）。

最後に Vercel を再デプロイすれば完了です。

## トークンの置き場所

`gas/token.gs` に定数として書き出し、`clasp push` でスクリプト本体と一緒に送ります。スクリプトの中身はプロジェクトの所有者しか読めないため、実質的にスクリプトプロパティと同じ扱いです。**GASエディタを開かずに設定できる**のが利点です。

スクリプトプロパティ `SHARED_TOKEN` を設定した場合はそちらが優先されます。エディタで手動設定したい場合はそちらでも構いません。

`gas/token.gs` は `.gitignore` 済みです。リポジトリには入りません。

## 承認について

`clasp create-deployment` はウェブアプリを公開しますが、スクリプトのOAuth承認（スプレッドシートへのアクセス許可）までは行いません。承認が済んでいない状態で叩くと、JSONではなくHTMLが返ります。

setup スクリプトの手順5で疎通確認し、`{"ok":true,"sheet":"案件"}` が返れば承認済みです。JSONが返らなかった場合のみ:

```bash
npx clasp open-script
```

エディタで関数 `doGet` を1回実行し、承認ダイアログを許可してください。以降は不要です。

## 動作確認

1. ツールを開く（https://manga-lp-gyvq.vercel.app/ ）
2. 最上部の「案件」カードでフォームに入力し、「新規案件として保存」→「この案件を保存」
3. 「新しい案件 P-0001 として保存しました」と表示される
4. スプレッドシートに `案件` シートができ、1行追加されている
5. 再読み込み後、案件を選んで「読み込む」でフォームが復元される

### うまくいかないとき

| 症状 | 原因 |
| --- | --- |
| `案件保存の設定が未完了です` | Vercel の環境変数が未設定、または再デプロイしていない |
| `403 unauthorized` | `gas/token.gs`（またはスクリプトプロパティ）と `GAS_SHARED_TOKEN` が不一致。setup を再実行すると揃う |
| `GASの応答がJSONではありません` | スクリプトの承認が未完了、またはデプロイのアクセス設定が「全員」でない |
| 案件一覧が空のまま | まだ1件も保存していない。エラーが出ていなければ正常 |

## コードを変更したとき

```bash
node gas/setup.mjs
```

既存の `.clasp.json` と `gas/token.gs` を再利用し、push と新しいデプロイの作成まで行います。デプロイIDが変わるため `--vercel` を付けて環境変数も更新するか、既存デプロイを更新する場合は次を使ってください。

```bash
npx clasp push -f
npx clasp update-deployment <デプロイID>
```

`update-deployment` ならURLが変わらないので、Vercel 側の再設定は不要です。

## 次段階の予定（今回は未実装）

- `生成結果` シート：生成した LP HTML や4コマデータを案件IDで紐付けて保存
- `修正履歴` シート：**対象セクション**を列に持ち、どのセクションが何回書き直されたかを集計できるようにする
- Drive：案件ごとのフォルダを作り、フォルダIDを `案件` シートの列として追加

`案件` シートの読み書きはヘッダー名で解決しているため、列を末尾に足しても既存のコードと既存の行は壊れません。
