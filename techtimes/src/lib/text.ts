/**
 * Markdown/HTML を含む本文から、誘導用の短い概要（抜粋）を生成する。
 * 全文転載を避けるため必ず短く切り詰める。
 */
export function makeExcerpt(raw: string | undefined | null, maxLength = 110): string {
  if (!raw) return '';
  let text = raw;

  // コードブロックを除去
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]*`/g, ' ');
  // 画像・リンクはテキストだけ残す
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // HTMLタグを除去
  text = text.replace(/<[^>]+>/g, ' ');
  // 見出し記号・装飾記号を除去
  text = text.replace(/^[#>\-*\s]+/gm, ' ');
  text = text.replace(/[*_~#>]/g, '');
  // 連続する空白・改行を1つに
  text = text.replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}
