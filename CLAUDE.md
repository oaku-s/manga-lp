# 漫画LP制作サービス プロジェクト記録

## プロジェクト概要
飲食店・地元ビジネス向けの縦読み漫画LPを制作・納品するサービス

## 現状
- 飲食店集客LP公開済み：manga-lp-eight.vercel.app
- GitHub：oaku-s/manga-lp
- 技術スタック：HTML/CSS/JS

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