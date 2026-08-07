# 修正ガイド｜炭火焼鳥 とりき 採用LP（通常版サンプル）

対象ファイル：`samples/recruit/index.html`

色とフォントはすべて `<style>` 冒頭の `:root` ブロックに集約してあります。
それ以降のCSSは `var(--〇〇)` を参照するだけなので、**見た目を変えるときは `:root` だけを触ります**。
色コードが `:root` の外に書かれている箇所はありません。

このLPは生成時点で `:root` 変数と `data-section` を備えていたため、構造の変換はしていません。
サンプル化のための変更（title・CTA無効化・フッターの注記）のみ加えています。

「使用」列は、そのCSS内で `var()` として参照されている回数です。**0 は現在どこからも使われていない予備の変数**で、消しても見た目は変わりません。

---

## 1. 定義したCSS変数の一覧

### フォント

| 変数 | 値 | 制御対象 | 使用 |
|---|---|---|---|
| `--font-base` | `'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', sans-serif` | 本文（ゴシック） | 3 |
| `--font-serif` | `'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif` | 見出し・引用・ボタン（明朝） | 15 |

**本文ゴシック＋見出し明朝**の2書体構成です。見出し側の使用箇所が多いので、印象を大きく変えたいときは `--font-serif` から触ります。

### 背景

| 変数 | 値 | 制御対象 | 使用 |
|---|---|---|---|
| `--bg-base` | `#1a1410` | ページ全体の背景 | 1 |
| `--bg-section-alt` | `#211c17` | 交互に挟まる明るめのセクション | 4 |
| `--bg-section-dark` | `#0f0d0b` | 暗いセクション | 8 |
| `--bg-section-mid` | `#1e1812` | 中間の暗さのセクション（未使用） | 0 |
| `--bg-cta` | `#0f0d0b` | CTAセクションの背景 | 1 |
| `--bg-empathy-item` | `#1e1710` | 共感セクションの各項目の背景 | 1 |
| `--bg-slot-hero` | `#2e2118` | heroの写真枠の背景 | 1 |
| `--bg-slot-about` | `#1c1510` | aboutの写真枠の背景 | 1 |
| `--bg-slot-craft` | `#251c13` | craftの写真枠の背景 | 1 |
| `--bg-slot-voice` | `#1a1410` | voiceの写真枠の背景 | 1 |

写真枠の背景がセクションごとに分かれているので、**特定の枠だけ色を変える**ことができます。

### 文字色

| 変数 | 値 | 制御対象 | 使用 |
|---|---|---|---|
| `--text-base` | `#d4c8b8` | 本文 | 6 |
| `--text-heading` | `#f0e6d2` | 見出し | 7 |
| `--text-sub` | `#9e8e7a` | 補足・注釈・フッターの注記 | 7 |
| `--text-emphasis` | `#e8c87a` | 本文中の強調 | 4 |
| `--text-section-label` | `#e8a050` | セクション番号・ラベル | 7 |
| `--text-hero-catch` | `#f5ece0` | ファーストビューのキャッチ | 1 |
| `--text-hero-sub` | `#b8a898` | ファーストビューのサブコピー | 1 |
| `--text-quote` | `#c8b898` | 引用・スタッフの声 | 3 |
| `--text-info-label` | `#9e8e7a` | 店舗情報の項目名 | 1 |
| `--text-info-value` | `#d4c8b8` | 店舗情報の値 | 1 |
| `--text-slot-label` | `#7a6858` | 写真枠のラベル文字 | 1 |
| `--text-footer` | `#6a5a4a` | フッターの店名・コピーライト | 2 |
| `--text-cta-btn` | `#1a1410` | CTAボタンの文字 | 1 |

### アクセント

| 変数 | 値 | 制御対象 | 使用 |
|---|---|---|---|
| `--accent` | `#e8883a` | 基準色（起点の値。直接は参照されていない） | 0 |
| `--accent-label` | `#e8883a` | ラベルに使うアクセント | 2 |
| `--accent-line` | `#c06828` | 罫線に使うアクセント | 2 |
| `--accent-fill` | `#e8883a` | 塗りに使うアクセント（未使用） | 0 |
| `--accent-glow` | `#e8883a` | 光彩に使うアクセント（未使用） | 0 |
| `--accent-muted` | `#8a4e20` | 控えめなアクセント | 1 |

### 罫線

| 変数 | 値 | 制御対象 | 使用 |
|---|---|---|---|
| `--border-base` | `#2e2418` | 汎用の罫線 | 3 |
| `--border-accent` | `#c06828` | アクセント色の罫線 | 2 |
| `--border-quote` | `#5a3e28` | 引用ブロックの罫線 | 1 |
| `--border-info` | `#2a2018` | 店舗情報の行区切り | 2 |
| `--border-empathy` | `#3a2a18` | 共感セクションの項目枠 | 1 |

### ボタン・影

| 変数 | 値 | 制御対象 | 使用 |
|---|---|---|---|
| `--bg-btn` | `#e8883a` | CTAボタンの背景 | 2 |
| `--bg-btn-hover` | `#d07828` | CTAボタンのホバー | 1 |
| `--shadow-accent` | `#e8883a` | ボタンの影の色 | 1 |
| `--shadow-dark` | `#000000` | 暗い影（未使用） | 0 |

---

## 2. どこを何行直せばよいか

| やりたいこと | 直す場所 | 行数 |
|---|---|---|
| **本文のフォントを変えたい** | `--font-base` | **1行** |
| **見出しのフォントを変えたい** | `--font-serif` | **1行** |
| **本文の文字色を変えたい** | `--text-base` | **1行** |
| **背景色を変えたい（ベースだけ）** | `--bg-base` | **1行** |
| **背景色を全体的に変えたい** | `--bg-base` / `--bg-section-alt` / `--bg-section-dark` / `--bg-cta` | **4行** |
| **アクセント色を変えたい** | `--text-section-label` / `--accent-label` / `--accent-line` / `--bg-btn` / `--shadow-accent` | **5行**（下記参照） |
| ボタンだけ色を変えたい | `--bg-btn`（ホバーは `--bg-btn-hover`、文字は `--text-cta-btn`） | 1〜3行 |
| 見出しの色だけ変えたい | `--text-heading` | 1行 |
| 写真枠の色を変えたい | `--bg-slot-*` の4行、ラベルは `--text-slot-label` | 1〜5行 |
| 罫線を目立たせたい／消したい | 罫線ブロックの該当行 | 1行ずつ |

### アクセント色について

このLPは `--accent` を定義しつつ、実際に描画へ効いているのは
`--text-section-label`（ラベル文字）、`--accent-label`、`--accent-line`（罫線）、`--bg-btn`（ボタン塗り）、`--shadow-accent`（ボタンの影）の5つで、
**`--accent` 本体はどこからも参照されていません**。オレンジを別の色にしたい場合はこの5行を書き換えます。

1行で管理したい場合は、次のように `--accent` を参照させれば以降1行で変わります。

```css
--text-section-label: var(--accent);
--accent-label: var(--accent);
--accent-line: var(--accent);   /* 罫線は少し暗くしたいなら別値のままが無難 */
--bg-btn: var(--accent);
--shadow-accent: var(--accent);
```

ただし現在は罫線 `#c06828` だけ意図的に暗くしてあるので、揃えると濃淡が消えます。

---

## 3. 同じ色でも用途ごとに分かれている箇所

| 色 | 分かれている変数 | 分けている理由 |
|---|---|---|
| `#e8883a` | `--accent` / `--accent-label` / `--accent-fill` / `--accent-glow` / `--bg-btn` / `--shadow-accent` | ラベル・塗り・光彩・ボタン・影。ボタンだけ変える要望が来やすい |
| `#0f0d0b` | `--bg-section-dark` / `--bg-cta` | 暗いセクションとCTA。CTAだけ締めたいことがある |
| `#1a1410` | `--bg-base` / `--bg-slot-voice` / `--text-cta-btn` | ページ背景・写真枠の背景・ボタン上の文字。役割が全く違う |
| `#d4c8b8` | `--text-base` / `--text-info-value` | 本文と店舗情報の値 |
| `#9e8e7a` | `--text-sub` / `--text-info-label` | 補足文と店舗情報の項目名 |
| `#c06828` | `--accent-line` / `--border-accent` | 罫線アクセントとボーダー |

---

## 4. セクション識別子

| `data-section` | 内容 |
|---|---|
| `hero` | ファーストビュー「焼けるようになるまで、待ってもらえる場所」（写真枠あり） |
| `empathy` | 共感「こんなことで、迷っていませんか。」 |
| `about` | 店主「なぜ、カウンター8席にしたのか。」（写真枠あり） |
| `craft` | 教え方「最初の1ヶ月、焼き場には立たせない。」（写真枠あり） |
| `regular` | 先輩スタッフの声「3年目スタッフが、こう言っています。」（写真枠あり） |
| `voice` | 実際にかけられた言葉 |
| `info` | 募集要項・店舗情報 |
| `cta` | 応募CTA（サンプルのためボタンは無効） |
| `footer` | フッター（架空店舗の注記・コピーライト） |

CSSのセレクタが `[data-section="hero"]` の形で識別子を直接使っています。**値を変えるとスタイルが外れる**ので、リネームするときはCSS側も合わせて変更してください。`samples/recruit-manga/` と同じ方針で、`samples/normal/` `samples/manga/`（クラスでスタイルを当て、`data-section` は目印専用）とは異なります。

---

## 5. 写真枠

画像はまだ入っておらず、差し替え用の枠が4つ置いてあります。

| `data-slot` | 位置 | 想定する写真 |
|---|---|---|
| `hero` | hero | 店の外観・炭火の焼き場 |
| `about` | about | 大将（店主）の写真 |
| `craft` | craft | 仕込み・洗い物の作業風景 |
| `regular` | regular | スタッフが働いている様子 |

枠は `<div class="photo-slot" data-slot="◯◯">` の形です。写真を入れるときは、枠の中身を `<img>` に差し替えます。
画像はこのLPと同じ階層に `media/` を作って置くと、他のサンプル（`samples/manga/` `samples/recruit-manga/`）と構成が揃います。

```html
<div class="photo-slot" data-slot="hero"><img src="media/photo-hero.jpg" alt="店の外観"></div>
```
