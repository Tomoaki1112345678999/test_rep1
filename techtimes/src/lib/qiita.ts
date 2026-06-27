import type { Article } from './types';
import { makeExcerpt } from './text';

interface QiitaUser {
  id: string;
}
interface QiitaTag {
  name: string;
}
interface QiitaItem {
  id: string;
  title: string;
  url: string;
  likes_count: number;
  created_at: string;
  body?: string;
  user: QiitaUser;
  tags: QiitaTag[];
}

const API = 'https://qiita.com/api/v2/items';

/**
 * Qiitaの公式API v2から、指定日数以内に投稿され、かつ一定以上ストックされた
 * 「人気記事」を取得する。新着順ではなくストック数で絞ることで、期間ごとに
 * その期間で人気の記事を集められる。
 * 未認証でも利用可能（IPあたり毎時60回）。QIITA_TOKEN があればレート上限が上がる。
 */
export async function fetchQiita(sinceDays = 30, minStocks = 0, pages = 4): Promise<Article[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const token = process.env.QIITA_TOKEN;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const articles: Article[] = [];
  for (let page = 1; page <= pages; page++) {
    const q =
      minStocks > 0 ? `created:>=${since} stocks:>=${minStocks}` : `created:>=${since}`;
    const query = encodeURIComponent(q);
    const url = `${API}?page=${page}&per_page=100&query=${query}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) {
        console.warn(`[qiita] HTTP ${res.status} on page ${page}`);
        break;
      }
      const items = (await res.json()) as QiitaItem[];
      if (!Array.isArray(items) || items.length === 0) break;
      for (const item of items) {
        articles.push({
          id: `qiita:${item.id}`,
          title: item.title,
          url: item.url,
          author: item.user?.id ?? 'unknown',
          authorUrl: item.user?.id ? `https://qiita.com/${item.user.id}` : undefined,
          likes: item.likes_count ?? 0,
          source: 'qiita',
          tags: (item.tags ?? []).map((t) => t.name).slice(0, 5),
          publishedAt: item.created_at,
          excerpt: makeExcerpt(item.body),
        });
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return articles;
}
