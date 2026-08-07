# 修正ガイド｜炭火焼鳥 とりき 採用LP（4コマ漫画版サンプル）

対象ファイル：`samples/recruit-manga/index.html`
画像：`samples/recruit-manga/media/koma-01.jpg` 〜 `koma-04.jpg`

色とフォントはすべて `<style>` 冒頭の `:root` ブロックに集約してあります。
それ以降のCSSは `var(--〇〇)` を参照するだけなので、**見た目を変えるときは `:root` だけを触ります**。
色コードが `:root` の外に書かれている箇所はありません。

このLPは生成時点から `:root` 変数と `data-section` を備えていたため、変換はしていません
（`.lp-profile-hero` に残っていた `rgba()` 2箇所のみ変数化しました）。

---

## 1. 定義したCSS変数の一覧

### フォント

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--font-base` | `'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif` | 本文（ゴシック） |
| `--font-heading` | `'Hiragino Mincho ProN', 'Noto Serif JP', serif` | 見出し・キャッチ・ボタン（明朝） |

このLPは**本文ゴシック＋見出し明朝**の2書体構成です。集客版（`samples/manga/`）は全体が明朝1書体なので、方針が異なります。

### 背景

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--bg-base` | `#1a1a1a` | ページ全体の背景 |
| `--bg-section-alt` | `#212121` | 明るめのセクション（選ばれる理由） |
| `--bg-section-dark` | `#161616` | 暗めのセクション（4コマ漫画・スタッフの声） |
| `--bg-hero` | `#1c1410` | ヒーローの背景 |
| `--bg-character` | `#1e1a14` | 店主紹介セクションの背景 |
| `--bg-cta` | `#1c1410` | CTAセクションの背景 |
| `--bg-card` | `#262216` | カード（店主プロフィール／理由／声） |
| `--bg-badge` | `#2e1f0a` | ヒーローのバッジ背景 |
| `--bg-photo-slot` | `#2a2018` | 店主アイコンの丸枠背景 |
| `--bg-footer` | `#111111` | フッターの背景 |

### 文字色

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--text-base` | `#e8ddd0` | 本文 |
| `--text-heading` | `#f5a623` | 見出し |
| `--text-emphasis` | `#f5a623` | 本文中の強調（現在は未使用。強調を足すときの受け皿） |
| `--text-sub` | `#b0a090` | 補足・注記・ナレーション・コマ番号 |
| `--text-hero-main` | `#f7f0e6` | ヒーローのメインコピー、CTAボタンの文字 |
| `--text-hero-sub` | `#c8b89a` | ヒーローのサブコピー |
| `--text-character` | `#e8ddd0` | 店主紹介の本文 |
| `--text-badge` | `#f5a623` | ヒーローのバッジ文字 |
| `--text-cta-heading` | `#f7f0e6` | CTAの見出し |
| `--text-footer` | `#8a7a6a` | コピーライト |

### アクセント

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--accent` | `#e8821a` | 基準色（現在は直接参照されていない起点の値） |
| `--accent-label` | `#e8821a` | ラベル文字・話者名・引用符 |
| `--accent-line` | `#c06010` | 罫線・縦帯・店主アイコンの枠 |
| `--accent-fill` | `#d97318` | CTAボタンの塗り |
| `--accent-fill-hover` | `#c06010` | CTAボタンのホバー |

### 罫線・影

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--border-section` | `#3a2e20` | セクションの区切り線 |
| `--border-card` | `#3e3020` | カードの枠線 |
| `--border-badge` | `#6a4a1a` | ヒーローのバッジ枠線 |
| `--koma-border` | `#4a3820` | 4コマの外枠とコマ間の仕切り（太い構造線） |
| `--shadow-card` | `rgba(0,0,0,0.5)` | カードの影（現在は未使用） |

### 4コマ専用

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--koma-illust-bg` | `#2a1e10` | 絵エリアの下地（画像が入る前に見える色） |
| `--koma-serif-bg` | `#1e160a` | セリフ欄の背景 |
| `--koma-serif-text` | `#e8ddd0` | セリフ欄の文字 |

### 差し込み画像用（このLPでは未使用）

| 変数 | 値 | 制御対象 |
|---|---|---|
| `--profile-hero-border` | `rgba(126,232,200,0.8)` | 人物画像枠の枠線 |
| `--profile-hero-shadow` | `rgba(0,0,0,0.3)` | 人物画像枠の影 |

---

## 2. どこを何行直せばよいか

| やりたいこと | 直す場所 | 行数 |
|---|---|---|
| **本文のフォントを変えたい** | `--font-base` | **1行** |
| **見出しのフォントを変えたい** | `--font-heading` | **1行** |
| **アクセント色を変えたい** | `--accent-label` / `--accent-line` / `--accent-fill` | **3行**（下記参照） |
| **本文の文字色を変えたい** | `--text-base` | **1行** |
| **背景色を変えたい（ベースだけ）** | `--bg-base` | **1行** |
| **背景色を全体的に変えたい** | 背景ブロックの10行 | **10行** |
| ボタンだけ色を変えたい | `--accent-fill`（ホバーは `--accent-fill-hover`） | 1〜2行 |
| 見出しの色だけ変えたい | `--text-heading` | 1行 |
| 4コマの枠を太く／目立たせたい | `--koma-border`、太さは `.koma-strip` と `.koma-box` の `3px` | 1〜3行 |
| セリフ欄の見た目を変えたい | `--koma-serif-bg` / `--koma-serif-text` | 1〜2行 |
| ナレーションの見え方を変えたい | `.koma-serif-inner .narration` | 1ルール |

### アクセント色について

集客版（`samples/manga/`）は `--accent-label` などが `var(--accent)` を参照していて**1行で全部変わります**が、
このLPは生成時点でそれぞれ別の色値（`#e8821a` / `#c06010` / `#d97318`）を持っており、意図的な濃淡差になっています。
まとめて1行で管理したい場合は、次のように書き換えれば集客版と同じ運用にできます。

```css
--accent-label: var(--accent);
--accent-line: var(--accent);
--accent-fill: var(--accent);
```

ただし濃淡が消えて平坦になるため、見た目は変わります。

---

## 3. 同じ色でも用途ごとに分かれている箇所

| 色 | 分かれている変数 | 分けている理由 |
|---|---|---|
| `#f5a623` | `--text-heading` / `--text-emphasis` / `--text-badge` | 見出し・本文中の強調・バッジ文字。見出しだけ変える要望が来やすい |
| `#f7f0e6` | `--text-hero-main` / `--text-cta-heading` | ヒーローのキャッチとCTAの見出し |
| `#e8ddd0` | `--text-base` / `--text-character` / `--koma-serif-text` | 本文・店主紹介・コマのセリフ |
| `#1c1410` | `--bg-hero` / `--bg-cta` | ヒーローとCTA。片方だけ締めたいことがある |
| `#c06010` | `--accent-line` / `--accent-fill-hover` | 罫線とボタンのホバー |

---

## 4. セクション識別子

| `data-section` | 内容 |
|---|---|
| `hero` | ファーストビュー（バッジ・キャッチ・サブコピー） |
| `character` | 店主について |
| `manga` | 縦4コマ漫画 |
| `reasons` | この職場が選ばれる3つの理由 |
| `voice` | 実際に聞こえてきた言葉 |
| `cta` | 応募CTA（サンプルのためボタンは無効） |
| `footer` | フッター（架空店舗の注記・コピーライト） |

CSSのセレクタが `[data-section="hero"]` の形で識別子を直接使っています。**値を変えるとスタイルが外れる**ので、リネームするときはCSS側も合わせて変更してください。この点は `samples/normal/` `samples/manga/`（`id` とクラスでスタイルを当て、`data-section` は目印専用）と方針が異なります。

---

## 5. 4コマ画像

| ファイル | 場面 | セリフ |
|---|---|---|
| `media/koma-01.jpg` | 大型店の厨房・疲れた顔 | 「また今日も、誰とも喋らなかった」 |
| `media/koma-02.jpg` | 路地でとりきを見つける | 「カウンター8席か。小さい店だな」 |
| `media/koma-03.jpg` | 大将の手元を横で見る | 大将「最初の1ヶ月は、焼き場には立たせない」 |
| `media/koma-04.jpg` | 閉店後のカウンター | 「焼けるようになるまで、待ってもらえる場所がある」 |

差し替えるときは、**同じファイル名で `media/` に上書き**すればHTMLの変更は不要です。
HTML側は `media/koma-0N.jpg` を相対パスで参照しているだけなので、`index.html` と `media/` を同じ階層に置いたまま移動してください。

この4枚には吹き出しが描き込まれていないため、**セリフはHTML側の `.koma-serif` で表示しています**。
文言を直す場合は各 `.koma-box` 内の `.koma-serif-inner` を編集してください。構造は次のとおりです。

```html
<div class="koma-serif-inner">
  <span class="speaker">場面の見出し</span>
  「セリフ」
  <span class="narration">ナレーション（地の文）</span>
</div>
```

吹き出しが焼き込まれた画像に差し替える場合は、`.koma-serif` に `style="display: none;"` を付けると
セリフ欄ごと隠せます（集客版 `samples/manga/` はその状態です）。
