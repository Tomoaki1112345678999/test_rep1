# TECH TIMES（テック・タイムズ）

QiitaとZennで公開された技術記事のうち、**いいね/LGTM数の多い人気記事**を
**日経新聞風の紙面レイアウト**でランキング配信する、技術ニュースのキュレーションサイトです。

- ソース: Qiita（公式API v2）/ Zenn（公開JSON API）
- 集計期間: 日間 / 週間 / 月間（既定: 週間）
- 配信: GitHub Pages（完全無料・サーバ不要）
- 更新: GitHub Actions が6時間ごとに自動ビルド＆デプロイ

各記事は **見出し・概要・メタ情報のみ** を掲載し、本文は転載していません。
全文は元記事のリンク先で読む設計とすることで、著作権・各サービス規約に配慮しています。

## 技術スタック

- [Astro](https://astro.build/)（静的サイト生成）
- TypeScript
- Tailwind CSS v4

## ローカル開発

```bash
cd techtimes
npm install
npm run dev      # 開発サーバ
npm run build    # 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果をプレビュー
npm run check    # 型チェック
```

> ネットワーク環境によりQiita/Zenn APIへ到達できない場合は、自動的にサンプルデータに
> フォールバックします（サイトが壊れないようにするため）。本番のGitHub Actions上では
> 実データが取得されます。

## デプロイ手順（初回のみ）

1. GitHubリポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **「GitHub Actions」** に設定
3. `.github/workflows/techtimes.yml` を **デフォルトブランチ（main）** に取り込む
   - スケジュール実行（cron）はデフォルトブランチのワークフローのみ動作するため
4. 以降は6時間ごとに自動更新。手動更新は Actions タブから `workflow_dispatch` で実行可能

公開URL: `https://tomoaki1112345678999.github.io/test_rep1/`
（カスタムドメインを使う場合は `astro.config.mjs` の `site` / `base` を変更）

### 任意設定: Qiita APIトークン

未認証でも動作しますが、Qiita APIのレート上限（IPあたり毎時60回）を引き上げたい場合は、
リポジトリの **Settings → Secrets and variables → Actions** に `QIITA_TOKEN` を登録してください。

## ディレクトリ構成

```
techtimes/
├── astro.config.mjs        # site/base とTailwindプラグイン設定
├── src/
│   ├── lib/                # 記事取得・ランキング・整形ロジック
│   │   ├── qiita.ts        # Qiita API取得
│   │   ├── zenn.ts         # Zenn API取得
│   │   ├── articles.ts     # 集約＋フォールバック
│   │   ├── ranking.ts      # 期間別ランキング
│   │   ├── sample.ts       # フォールバック用サンプル
│   │   ├── text.ts         # 概要(抜粋)生成
│   │   ├── format.ts       # 日付/数値の整形
│   │   └── types.ts
│   ├── components/         # 紙面パーツ（カード・ランキング等）
│   ├── layouts/Base.astro
│   ├── pages/index.astro   # トップ（紙面）
│   └── styles/global.css   # 日経風デザイントークン
└── README.md
```

## マネタイズについて

初期リリースでは広告を掲載していません。将来 Google AdSense 等を導入しやすいよう、
本文を転載しない（出典明記＋元記事へ誘導する）方針を取っています。
