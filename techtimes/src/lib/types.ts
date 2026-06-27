/** 記事の取得元 */
export type Source = 'qiita' | 'zenn';

/** ランキングの集計期間 */
export type Period = 'daily' | 'weekly' | 'monthly';

/** サイト内で扱う正規化済みの記事データ */
export interface Article {
  /** ソースを含む一意なID (例: "qiita:abc123") */
  id: string;
  title: string;
  /** 元記事のURL（本文は転載せず必ずここへ誘導する） */
  url: string;
  author: string;
  authorUrl?: string;
  /** いいね/LGTM数。ランキングの指標 */
  likes: number;
  source: Source;
  tags: string[];
  /** ISO8601の公開日時 */
  publishedAt: string;
  /** 短い概要（抜粋）。元記事への誘導が目的で全文は載せない */
  excerpt: string;
}

export const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: 'daily', label: '日間', days: 1 },
  { key: 'weekly', label: '週間', days: 7 },
  { key: 'monthly', label: '月間', days: 30 },
];
