# TECH TIMES 技術教科書

このドキュメントは、TECH TIMES（QiitaとZennの人気技術記事を日経新聞風レイアウトで
配信するキュレーションサイト）が、**どんな技術を・なぜ・どう使って**作られているかを
体系的に説明する「教科書」です。初めて触る人がこれを読めば全体像と仕組みを理解できる
ことを目指しています。

---

## 0. ひとことで言うと

> **「サーバーを持たずに、6時間ごとに QiitaとZennの人気記事を集めて、
> 新聞風の静的サイトとして自動で公開し続ける仕組み」**

- お金: **0円**（GitHubの無料枠だけ）
- サーバー管理: **不要**（静的サイト＋GitHub Pages）
- 更新: **全自動**（GitHub Actionsのスケジュール実行）

---

## 1. システム全体像

```
            ┌─────────────────── GitHub Actions（無料CI） ───────────────────┐
            │  6時間ごと / push / 手動 でトリガー                              │
            │                                                                  │
  Qiita API ─┐                                                                 │
            ├─▶  ① 記事を取得  ─▶  ② 期間別にランキング  ─▶  ③ 静的HTML生成   │
  Zenn API ─┘     (build時)          (いいね数で並べる)        (Astro build)    │
            │                                                          │        │
            └──────────────────────────────────────────────────────── ▼ ──────┘
                                                          ④ GitHub Pages へ配信
                                                                       │
                                                                       ▼
                                          https://<user>.github.io/test_rep1/
```

ポイントは **「動的なサーバーで毎回処理する」のではなく、「ビルド時に1回だけ処理して
出来上がったHTMLを置いておく」** という静的サイト（SSG）の発想です。これにより
サーバー費用・運用がゼロになります。

---

## 2. 技術スタックと選定理由

| 分類 | 採用技術 | なぜこれか |
| --- | --- | --- |
| サイト生成 | **Astro 5**（静的サイトジェネレーター） | ニュース/コンテンツ系サイトに最適。ビルド時にAPIを叩いて静的化でき、必要な箇所だけJSを送る「アイランド」構成で高速。 |
| 言語 | **TypeScript** | 取得データの型を定義して安全に扱う。`Article` 型で全体を統一。 |
| スタイル | **Tailwind CSS v4** | クラスでスタイルを当てる。`@theme` で日経風の配色・フォントをトークン化。 |
| 取得処理 | **Node標準の `fetch`** | 追加ライブラリ不要。Astroのビルド（Node）上で動く。 |
| ホスティング | **GitHub Pages** | 完全無料・静的配信。サーバー不要。 |
| 自動化 | **GitHub Actions** | cron（定期実行）＋ Pagesデプロイを無料で。 |

> なぜ「動的サーバー（Flask等）」にしなかったか:
> 無料の常駐サーバーはスリープ・制限が多く運用が重い。記事は数時間に一度更新できれば
> 十分なので、**ビルド時生成＋静的配信**が最もコスト・運用効率がよい。

---

## 3. データフロー詳解（取得 → ランキング → 生成）

### 3.1 取得（`src/lib/qiita.ts` / `src/lib/zenn.ts`）

- **Qiita**: 公式API v2 `GET /api/v2/items` を使用。
  検索クエリで `created:>=<日付> stocks:>=<しきい値>` を指定し、
  「その期間に投稿された“ストックの多い人気記事”」だけを取得する。
  - 未認証でも動くが、Secrets に `QIITA_TOKEN` を入れるとレート上限が緩和される。
- **Zenn**: 公式SDKは無いため、公開JSON `GET /api/articles?order=latest&page=N` を使用。
  新着を多めに取得し、後段で期間内に絞って `liked_count`（いいね数）順に並べる。

各記事は、ソースごとの生データを共通の **`Article` 型**（`src/lib/types.ts`）に
正規化する。これにより以降の処理は出所を意識せず統一的に扱える。

```ts
interface Article {
  id; title; url; author; authorUrl?;
  likes;        // Qiita=LGTM / Zenn=liked_count（ランキング指標）
  source;       // 'qiita' | 'zenn'
  tags; publishedAt; excerpt;
}
```

### 3.2 ランキング（`src/lib/articles.ts`）

`getRankings()` がビルド時に1回だけ呼ばれ、**日間/週間/月間それぞれ**の
ランキングを構築する。期間定義は `PERIODS`（`types.ts`）に集約：

| 期間 | 集計日数 | Qiitaストックしきい値 |
| --- | --- | --- |
| 日間 | 1日 | 2以上 |
| 週間 | 7日 | 10以上 |
| 月間 | 30日 | 30以上 |

> **なぜ期間ごとにしきい値を変えるか**:
> 全期間で同じ条件にすると「直近の新着記事」ばかりが並び、どの期間も同じ顔ぶれに
> なってしまう（実際に初期バージョンで発生したバグ）。期間が長いほどしきい値を
> 上げることで「その期間で本当に人気だった記事」を集め、日間/週間/月間が
> きちんと別物になるようにしている。

サイドバーの「Qiitaランキング」「Zennランキング」は、**混合した上位リストからではなく
各ソースのプールから別々に集計**している。混合上位から作ると、いいね数の大きい
Qiitaに席を奪われてZennがサイドバーから消えてしまうため。

### 3.3 生成（Astro）

- `src/pages/index.astro` が `getRankings()` を呼び、3期間分のデータを取得。
- 3期間すべてのHTMLを生成しておき、タブ切替は**わずかなJSで表示/非表示を切り替える**
  だけ（再取得しないので一瞬で切り替わる）。
- 紙面の部品はコンポーネント化:
  - `components/ArticleCard.astro` … 記事カード（リード/サブ/標準の3種）
  - `components/PaperSection.astro` … 1期間分の紙面レイアウト（リード＋グリッド＋サイドバー）
  - `components/RankItem.astro` … サイドバーのランキング1行
  - `components/SourceBadge.astro` … Qiita/Zennのバッジ

### 3.4 日経新聞風デザインの作り方（`src/styles/global.css`）

- `@theme` で配色・フォントをCSS変数化（生成り色の紙面 `--color-paper`、
  クリムゾンの見出し `--color-accent`、明朝体 `--font-serif` など）。
- 二重罫線のマストヘッド、明朝体の大見出し、罫線区切りのマルチカラムで“紙面感”を出す。
- タブの選択状態は `aria-pressed` 属性 + CSS（`.period-tab[aria-pressed='true']`）で
  一元管理。クラスの足し引きで切り替えると競合して表示が壊れるため、状態を属性に
  寄せている。

---

## 4. 壊れない工夫（フォールバック）

`getRankings()` は、Qiita/Zenn の**どちらからも取得できなかった場合**に
`src/lib/sample.ts` のサンプル記事へ自動的に切り替える。

- ネットワーク障害・API仕様変更・レート制限などでもサイトが真っ白にならない。
- 開発環境（外部APIに到達できない場合）でもレイアウト確認ができる。
- フォールバック時は「サンプル表示中」の注意書きを画面に出す。

---

## 5. 法律・規約への配慮（重要な設計判断）

- **本文は転載しない**。掲載するのは「見出し・著者・いいね数・短い概要・元記事リンク」のみ。
- 全文は必ず**元記事へ誘導**する。これにより著作権・各サービス規約のリスクを避けている。
- フッターに出典・著作権・取り下げ窓口を明記。
- マネタイズは初期は無し。将来 Google AdSense 等を入れやすいよう、上記の
  「非転載・出典明記」方針を保っている。

---

## 6. CI/CD と自動デプロイ（`.github/workflows/techtimes.yml`）

```
on:
  schedule: 6時間ごと (cron)
  push:     master の techtimes/** が変わったとき
  workflow_dispatch: 手動実行ボタン

jobs:
  build:   Node 22 で npm ci → npm run build → dist をアーティファクト化
  deploy:  actions/deploy-pages で GitHub Pages へ配信
```

- **build と deploy を分離**し、`permissions: pages: write / id-token: write` を付与。
- `concurrency: pages` で同時デプロイを防止。
- `QIITA_TOKEN`（任意）は Secrets から環境変数として渡す。

### 既存のAIワークフローについて
リポジトリには別途、PRレビュー/Issueトリアージ/セキュリティスキャンを行う
Claude製ワークフローがある。これらは `ANTHROPIC_API_KEY` が未設定のときは
**ジョブを失敗させず自動スキップ**するようガードを入れてある
（`if: env.ANTHROPIC_API_KEY != ''`）。

---

## 7. セットアップで詰まりやすいポイント（実体験ベース）

このプロジェクトを公開するまでに実際にハマった点と対処を残しておく。

1. **GitHub Pages の Source を「GitHub Actions」にする**
   「Deploy from a branch」のままだと `actions/deploy-pages` が 404 になる。
   Settings → Pages → Build and deployment → Source = **GitHub Actions**。

2. **`github-pages` 環境のブランチ保護**
   有効化直後は「特定ブランチのみデプロイ可」の保護ルールで `master` が弾かれることが
   ある（`Branch "master" is not allowed to deploy...`）。
   Settings → Environments → `github-pages` → Deployment branches を
   **No restriction** にするか `master` を許可する。

3. **デフォルトブランチは `main` ではなく `master`**
   ワークフローの push トリガーやドキュメントは `master` に合わせる。

4. **pytest が `app` を import できない**
   CIの `pytest tests/`（bare実行）は作業ディレクトリがsys.pathに入らないため、
   リポジトリルートに空の `conftest.py` を置いて解決。

5. **squashマージ後にブランチを使い回すと差分が壊れる**
   squashマージするとブランチ履歴とmasterが分岐する。続けて同じブランチで作業すると
   PRが「全ファイル再追加＋競合」になる。対処は、ブランチを `origin/master` 起点に
   作り直して（rebase/reset）からプッシュする。

---

## 8. ディレクトリ構成（再掲）

```
techtimes/
├── astro.config.mjs         # site/base（Pages配信パス）とTailwind設定
├── src/
│   ├── lib/
│   │   ├── types.ts         # Article型・PERIODS（期間と闾値）
│   │   ├── qiita.ts         # Qiita API取得（人気記事）
│   │   ├── zenn.ts          # Zenn API取得（新着→期間内）
│   │   ├── articles.ts      # getRankings(): 期間別ランキング構築＋フォールバック
│   │   ├── ranking.ts       # 期間フィルタ＋いいね順（サンプル用にも使用）
│   │   ├── text.ts          # 本文から短い概要を生成（全文転載しない）
│   │   ├── format.ts        # 日付「M月D日」・数値「1.2k」整形
│   │   └── sample.ts        # フォールバック用サンプル記事
│   ├── components/          # 紙面パーツ
│   ├── layouts/Base.astro   # HTMLの骨組み・フォント読み込み
│   ├── pages/index.astro    # トップ（紙面本体・タブ切替JS）
│   └── styles/global.css    # 日経風デザイントークン
└── docs/TEXTBOOK.md         # 本書
```

---

## 9. ローカルでの動かし方

```bash
cd techtimes
npm install
npm run dev      # 開発サーバ（http://localhost:4321/test_rep1）
npm run build    # 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果をプレビュー
npm run check    # 型チェック
```

---

## 10. 今後の拡張アイデア

- **マネタイズ**: Google AdSense をサイドバー/記事間に追加。
- **ソース追加**: はてなブックマークのテック人気エントリーなど。
- **Zennの人気取得改善**: 新着ベースの近似のため、月間の網羅性に限界がある。
  トピック別フィードの併用などで改善余地あり。
- **機能**: ジャンル別ページ、検索、OGP画像の自動生成、カスタムドメイン。

---

### まとめ

TECH TIMES は「**静的サイト生成 × 無料CI × 無料ホスティング**」という、
個人開発で“タダで・手間なく・壊れにくく”サービスを公開し続けるための
典型的な構成のお手本になっている。各技術は次の役割で噛み合っている:

- **Astro/TS/Tailwind** … データを取り、型安全に整形し、紙面に組む
- **GitHub Actions** … 定期的に取得→生成→配信を全自動化
- **GitHub Pages** … サーバーなしで世界に公開
- **フォールバック/非転載設計** … 壊れにくさと法的安全性を担保
