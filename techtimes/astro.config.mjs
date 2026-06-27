// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages 配信を想定した設定。
// オーナー名は github.io 上では小文字に正規化されるため小文字で指定する。
// カスタムドメインを使う場合は site を書き換え、base を '/' にすること。
export default defineConfig({
  site: 'https://tomoaki1112345678999.github.io',
  base: '/test_rep1',
  trailingSlash: 'ignore',
  vite: {
    // tailwindcss() の型は Vite のバージョン差で衝突するため any でキャストする（実行時は問題なし）
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
