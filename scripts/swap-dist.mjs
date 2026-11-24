// 开发时酒馆直接读 dist/（扩展文件夹连到这个仓库）。npm run build 先把整套写进 dist-new/，
// 写完再用这个脚本一个个换进 dist/：每个文件要么是旧的、要么是新的，
// 刷新页面时不会读到写了一半的文件（读到一半会卡在「Initializing…」）。
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'dist';
const TMP = 'dist-new';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const files = readdirSync(TMP);
mkdirSync(OUT, { recursive: true });
for (const f of files) {
  // 酒馆正在读这个文件时 Windows 不让替换，等一下再试
  for (let i = 0; ; i++) {
    try { renameSync(join(TMP, f), join(OUT, f)); break; } catch (e) { if (i >= 20) throw e; await sleep(100); }
  }
}
for (const f of existsSync(OUT) ? readdirSync(OUT) : []) if (!files.includes(f)) rmSync(join(OUT, f), { recursive: true });
rmSync(TMP, { recursive: true });
