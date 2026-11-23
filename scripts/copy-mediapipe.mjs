import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const packageRoot = join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision");
const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const target = join(process.cwd(), "public", "mediapipe");
await mkdir(target, { recursive: true });

for (const name of [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm"
]) {
  await copyFile(join(packageRoot, "wasm", name), join(target, name));
}

console.log(`MediaPipe ${manifest.version}: arquivos WebAssembly copiados para public/mediapipe`);
