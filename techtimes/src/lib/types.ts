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

/**
 * 集計期間の定義。
 * minStocks は Qiita 取得時の最小ストック数しきい値。期間が長いほど高くして
 * 「その期間で人気の記事」だけを集め、日間/週間/月間で別の顔ぶれになるようにする。
 */
export const PERIODS: { key: Period; label: string; days: number; minStocks: number }[] = [
  { key: 'daily', label: '日間', days: 1, minStocks: 2 },
  { key: 'weekly', label: '週間', days: 7, minStocks: 10 },
  { key: 'monthly', label: '月間', days: 30, minStocks: 30 },
];
