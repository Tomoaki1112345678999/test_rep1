import type { Article, Period } from './types';
import { PERIODS } from './types';
import { fetchQiita } from './qiita';
import { fetchZenn } from './zenn';
import { sampleArticles } from './sample';
import { rankByPeriod } from './ranking';

async function safe(label: string, fn: () => Promise<Article[]>): Promise<Article[]> {
  try {
    const result = await fn();
    console.log(`[articles] ${label}: ${result.length}件取得`);
    return result;
  } catch (err) {
    console.warn(`[articles] ${label} の取得に失敗: ${(err as Error).message}`);
    return [];
  }
}

/** id重複を除去（先勝ち） */
function dedupe(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

export interface PeriodRanking {
  key: Period;
  label: string;
  /** メイン紙面用（Qiita/Zenn混合・いいね数順） */
  items: Article[];
  /** サイドバー用 Qiitaランキング */
  qiitaTop: Article[];
  /** サイドバー用 Zennランキング */
  zennTop: Article[];
}

const byLikes = (a: Article, b: Article) => b.likes - a.likes;

/**
 * 期間ごとの人気記事ランキングを構築する。ビルド時に1度だけ呼ばれる。
 *
 * - Qiita: 期間ごとにストック数しきい値を変えて「その期間の人気記事」を取得
 * - Zenn: 新着を多めに取得し、各期間の公開日で絞り込んでいいね数順に並べる
 *   （ZennのAPIは期間指定・人気順に非対応のため新着からの近似）
 *
 * どのソースからも取得できなかった場合はサンプルにフォールバックする。
 */
export async function getRankings(
  limit = 18
): Promise<{ rankings: PeriodRanking[]; usedFallback: boolean }> {
  // Zennの新着はまとめて1回だけ取得し、各期間で使い回す（人気記事を拾うため多めに取得）
  const zennAll = await safe('zenn', () => fetchZenn(24));

  const rankings: PeriodRanking[] = [];
  let realCount = 0;

  for (const p of PERIODS) {
    const qiita = await safe(`qiita:${p.key}`, () =>
      fetchQiita(p.days, p.minStocks, 4)
    );
    const cutoff = Date.now() - p.days * 24 * 60 * 60 * 1000;
    const zenn = zennAll.filter((a) => {
      const t = Date.parse(a.publishedAt);
      return Number.isFinite(t) && t >= cutoff;
    });

    const qiitaTop = [...qiita].sort(byLikes);
    const zennTop = [...zenn].sort(byLikes);
    const items = dedupe([...qiita, ...zenn]).sort(byLikes).slice(0, limit);

    realCount += qiitaTop.length + zennTop.length;
    rankings.push({
      key: p.key,
      label: p.label,
      items,
      qiitaTop: qiitaTop.slice(0, 5),
      zennTop: zennTop.slice(0, 5),
    });
  }

  if (realCount === 0) {
    console.warn('[articles] 実データを取得できなかったためサンプルを使用します');
    return {
      rankings: PERIODS.map((p) => {
        const items = rankByPeriod(sampleArticles, p.key, limit);
        return {
          key: p.key,
          label: p.label,
          items,
          qiitaTop: items.filter((a) => a.source === 'qiita').slice(0, 5),
          zennTop: items.filter((a) => a.source === 'zenn').slice(0, 5),
        };
      }),
      usedFallback: true,
    };
  }

  return { rankings, usedFallback: false };
}
