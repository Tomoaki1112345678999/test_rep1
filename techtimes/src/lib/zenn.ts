import type { Article } from './types';

interface ZennUser {
  username?: string;
  name?: string;
}
interface ZennArticle {
  id: number;
  title: string;
  slug: string;
  path?: string;
  liked_count?: number;
  published_at?: string;
  user?: ZennUser;
  topics?: { name?: string; display_name?: string }[];
}
interface ZennResponse {
  articles?: ZennArticle[];
}

const API = 'https://zenn.dev/api/articles';

/**
 * Zennの公開JSON APIから最新記事を取得する。
 * 公式SDKは無いが、フィード相当の公開エンドポイントを利用する。
 * いいね数(liked_count)で後段のランキングを行うため複数ページ取得する。
 */
export async function fetchZenn(pages = 5): Promise<Article[]> {
  const articles: Article[] = [];
  for (let page = 1; page <= pages; page++) {
    const url = `${API}?order=latest&page=${page}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        console.warn(`[zenn] HTTP ${res.status} on page ${page}`);
        break;
      }
      const data = (await res.json()) as ZennResponse;
      const items = data.articles ?? [];
      if (items.length === 0) break;
      for (const item of items) {
        const path = item.path ?? `/${item.user?.username ?? ''}/articles/${item.slug}`;
        articles.push({
          id: `zenn:${item.id}`,
          title: item.title,
          url: `https://zenn.dev${path}`,
          author: item.user?.name ?? item.user?.username ?? 'unknown',
          authorUrl: item.user?.username
            ? `https://zenn.dev/${item.user.username}`
            : undefined,
          likes: item.liked_count ?? 0,
          source: 'zenn',
          tags: (item.topics ?? [])
            .map((t) => t.display_name ?? t.name ?? '')
            .filter(Boolean)
            .slice(0, 5),
          publishedAt: item.published_at ?? new Date().toISOString(),
          // Zennの一覧APIは本文を返さないため抜粋は空（タイトル＋メタで誘導）
          excerpt: '',
        });
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return articles;
}
