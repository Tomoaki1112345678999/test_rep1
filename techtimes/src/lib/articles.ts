import type { Article } from './types';
import { fetchQiita } from './qiita';
import { fetchZenn } from './zenn';
import { sampleArticles } from './sample';

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

/**
 * QiitaとZennから記事を集約する。ビルド時に1度だけ呼ばれる。
 * 両ソースとも取得できなかった場合はサンプルデータにフォールバックし、
 * サイトが壊れないようにする。
 */
export async function getArticles(): Promise<{ articles: Article[]; usedFallback: boolean }> {
  const [qiita, zenn] = await Promise.all([
    safe('qiita', () => fetchQiita()),
    safe('zenn', () => fetchZenn()),
  ]);

  const merged = dedupe([...qiita, ...zenn]);
  if (merged.length === 0) {
    console.warn('[articles] 実データを取得できなかったためサンプルを使用します');
    return { articles: sampleArticles, usedFallback: true };
  }
  return { articles: merged, usedFallback: false };
}
