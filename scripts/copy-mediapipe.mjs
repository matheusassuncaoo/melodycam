import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
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

// O modelo de mãos fica local: sem depender de rede na hora de ligar a câmera.
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const modelDir = join(process.cwd(), "public", "models");
const modelFile = join(modelDir, "hand_landmarker.task");
await mkdir(modelDir, { recursive: true });
const exists = await stat(modelFile).then((info) => info.size > 1_000_000, () => false);
if (exists) {
  console.log("Modelo de mãos já está em public/models");
} else {
  try {
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await writeFile(modelFile, Buffer.from(await response.arrayBuffer()));
    console.log("Modelo de mãos baixado para public/models");
  } catch (error) {
    console.warn(`Não foi possível baixar o modelo (${error.message}). O app tentará o servidor público em tempo de execução.`);
  }
}
