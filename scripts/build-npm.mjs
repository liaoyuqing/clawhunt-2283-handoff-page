/**
 * 构建 npm 的等价实现。
 *
 * 微信开发者工具的「工具 → 构建 npm」会把 node_modules 里的组件库打包到
 * miniprogram/miniprogram_npm/ 下。CI 与干净克隆里没有 GUI，所以由脚本做同一件事：
 * 把 tdesign-miniprogram 的 miniprogram_dist 拷到 miniprogram/miniprogram_npm/tdesign-miniprogram/。
 *
 * 用法：node scripts/build-npm.mjs
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = join(ROOT, 'node_modules', 'tdesign-miniprogram');
const SRC = join(PKG, 'miniprogram_dist');
const DEST = join(ROOT, 'miniprogram', 'miniprogram_npm', 'tdesign-miniprogram');

if (!existsSync(SRC)) {
  console.error('[build-npm] 未找到 ' + SRC + '，请先执行 npm install');
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(dirname(DEST), { recursive: true });
cpSync(SRC, DEST, { recursive: true });

function measure(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = measure(full);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));
const m = measure(DEST);
console.log('[build-npm] tdesign-miniprogram@' + pkg.version + ' → miniprogram/miniprogram_npm/tdesign-miniprogram');
console.log('[build-npm] 产物文件数 ' + m.files + '，总字节 ' + m.bytes);

