import type { Article, Period } from './types';
import { PERIODS } from './types';

/** 指定期間内の記事をいいね数の降順で並べ、上位 limit 件を返す */
export function rankByPeriod(
  articles: Article[],
  period: Period,
  limit = 30
): Article[] {
  const def = PERIODS.find((p) => p.key === period);
  const days = def?.days ?? 7;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return articles
    .filter((a) => {
      const t = Date.parse(a.publishedAt);
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}

/** 記事群から人気タグを集計して上位を返す */
export function topTags(articles: Article[], limit = 12): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of articles) {
    for (const tag of a.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
