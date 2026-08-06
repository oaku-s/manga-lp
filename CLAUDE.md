# 漫画LP制作サービス プロジェクト記録

## プロジェクト概要
飲食店・地元ビジネス向けの縦読み漫画LPを制作・納品するサービス

## 現状
- GitHub：oaku-s/manga-lp
- 技術スタック：HTML/CSS/JS

### 公開URL（Vercelプロジェクトが複数ある。取り違え注意）

| URL | Vercelプロジェクト | 中身 | このリポジトリの `main` を配信するか |
|---|---|---|---|
| **manga-lp-gyvq.vercel.app** | `manga-lp-gyvq` | 漫画LPプロンプト自動生成ツール（トップ）＋制作サンプル | **する**（`.vercel/repo.json` で連携。`main` へのpushで自動デプロイ） |
| manga-lp-eight.vercel.app | `manga-lp` | 飲食店集客LP（初期の公開物） | **しない**（別プロジェクト。最終更新 2026-05-18頃で停止） |
| manga-lp-sample.vercel.app | `manga-lp-sample` | 別サンプル | **しない**（最終更新 2026-06-16頃） |

- `main` にpushしたあとの反映確認は **manga-lp-gyvq.vercel.app** で行う。
- 制作サンプルは manga-lp-gyvq にのみ存在する：
  - https://manga-lp-gyvq.vercel.app/samples/normal/ （通常版）
  - https://manga-lp-gyvq.vercel.app/samples/manga/ （4コマ漫画版。画像は `media/` に分離）
  - https://manga-lp-gyvq.vercel.app/samples/leadgen/ （リード獲得版）
  - https://manga-lp-gyvq.vercel.app/samples/recruiting/ （求人版・旧仕様。ファイルは残しているが `monitor/` からはリンクしていない）
- manga-lp-eight.vercel.app と manga-lp-sample.vercel.app では `/samples/...` は 404 になる。

## 役割分担
| 作業 | ツール |
|---|---|
| ヒアリング分析・ストーリー作成 | Claude Sonnet 4.6 |
| 重要案件・複雑な設計 | Claude Opus 4.7 |
| 画像プロンプト生成 | Claude Sonnet 4.6 |
| 画像生成 | ChatGPT手動（1枚ずつ） |
| コード実装 | Cursor + Claude Code |
| 公開 | Vercel |

## 制作フロー
1. ヒアリングフォームに入力
2. Claude APIがストーリー構成・画像プロンプトを生成
3. ChatGPTで画像を1枚ずつ手動生成
4. CursorでLPに組み込み
5. GitHubにpush → Vercelで自動公開

## 今後の展開
- Phase 1：ヒアリングフォーム→プロンプト自動生成ツール作成
- Phase 2：Claude API連携
- Phase 3：半自動化
- Phase 4：入力→LP完成まで全自動

## APIキー方針
- Claude API：メイン頭脳（要取得・$5〜）
- ChatGPT API：画像生成・補助
- Gemini API：補助

## ターゲット業種
- 飲食店（集客・求人）
- 美容・サロン
- 教育・スクール
- BtoB・サービス業