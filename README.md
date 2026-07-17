# 漫画LP試作生成ツール

ヒアリング内容から、採用向け漫画LPと集客向け漫画LPのサンプルを固定ロジックで生成する試作です。外部AI APIや画像生成APIには接続していません。

## ローカルでの開き方

`index.html` をブラウザで開きます。ローカルサーバーで確認する場合は、このフォルダをドキュメントルートにしてください。

## 採用LPと集客LPの生成方法

1. 画面上部の「採用LPサンプルを入力」または「集客LPサンプルを入力」を押します。
2. 必要に応じてヒアリング項目を編集します。
3. 「生成する」を押すと、4コマ構成、画像生成プロンプト、コピー案、完成LPプレビュー、生成HTML検査が表示されます。

## 公開サンプル

生成済みの単体HTMLは以下に置きます。

- `samples/recruiting/index.html`
- `samples/leadgen/index.html`

どちらもCSSと漫画画像をHTMLへ埋め込むため、単体で表示できます。

## 漫画画像の差し替え場所

採用向け専用画像は以下へ配置します。

- `images/recruiting/p1.png`
- `images/recruiting/p2.png`
- `images/recruiting/p3.png`
- `images/recruiting/p4.png`

集客向け専用画像は以下へ配置します。

- `images/leadgen/p1.png`
- `images/leadgen/p2.png`
- `images/leadgen/p3.png`
- `images/leadgen/p4.png`

専用画像がない場合は、既存の `images/panels/p1.png` から `p4.png` を使用します。

## HTMLのダウンロード方法

LPを生成したあと、完成LPプレビュー右上の「HTMLダウンロード」を押します。ダウンロードされるHTMLは画像とCSSを埋め込んだ単体HTMLです。

## 公開前の確認項目

- 横スクロールがない
- 漫画画像が4枚表示される
- CTAが3か所以上あり、リンク先が正しい
- `href="#"` や空のリンクがない
- ローカル絶対パスや `file:///` が含まれていない
- 架空店舗を使用した制作サンプルであることが分かる
- 実在する実績、口コミ、住所、電話番号と誤認される表現がない
- 秘密情報やAPIキーが含まれていない

## 秘密情報の注意

APIキーや認証情報をリポジトリへ入れないでください。`漫画LP用.txt` はGit管理対象外にし、公開用HTMLやJavaScriptから参照しません。
## 通常ブラウザでの確認方法

ブラウザ自動検証が利用できない場合は、Windowsのターミナルでプロジェクトフォルダを開き、ローカルサーバー経由で確認してください。

```powershell
cd C:\Users\kyomi\Documents\manga-lp-test
python -m http.server 8000
```

Pythonを使う場合の確認URL:

- http://localhost:8000/samples/recruiting/
- http://localhost:8000/samples/leadgen/

Node.jsが利用できる場合は、次の方法でも確認できます。

```powershell
cd C:\Users\kyomi\Documents\manga-lp-test
npx serve .
```

表示確認では、390px、480px、768px、1280px相当の幅で、横スクロール、文字切れ、漫画画像4枚、CTAリンク、サンプル表記を確認してください。

