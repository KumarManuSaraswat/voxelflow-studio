import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';

// Explicit allowlist: never package local session tokens, research, or dependencies.
const files = {};
async function include(path) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) await include(child);
    else if (entry.isFile()) files[child] = new Uint8Array(await readFile(child));
  }
}
for (const path of ['packages', 'scripts', 'tests', 'docs', 'examples']) await include(path);
for (const path of ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', '.gitignore', '.gitattributes', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'dist/voxelflow_studio.js', 'dist/atlas_robot_bedrock_assets.zip', 'dist/atlas_robot_live_bedrock_assets.zip', 'dist/adventurer_bag_bedrock_assets.zip','dist/arcane_staff_bedrock_assets.zip','dist/adventurer_bag_live_bedrock_assets.zip']) {
  files[path] = new Uint8Array(await readFile(path));
}
await mkdir('dist', { recursive: true });
const version=JSON.parse(await readFile('package.json','utf8')).version;
const archive = `dist/voxelflow-studio-${version}.zip`;
const zipped = zipSync(files, { level: 6 });
const extracted = unzipSync(zipped);
if (Object.keys(extracted).length !== Object.keys(files).length) throw new Error('Release archive is incomplete.');
for (const [path, bytes] of Object.entries(files)) {
  if (!Buffer.from(extracted[path]).equals(Buffer.from(bytes))) throw new Error(`Archive mismatch: ${path}`);
}
await writeFile(archive, zipped);
const artifacts = [archive, 'dist/voxelflow_studio.js', 'dist/atlas_robot_bedrock_assets.zip', 'dist/atlas_robot_live_bedrock_assets.zip','dist/adventurer_bag_bedrock_assets.zip','dist/arcane_staff_bedrock_assets.zip','dist/adventurer_bag_live_bedrock_assets.zip'];
const hashes = [];
for (const path of artifacts) hashes.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${path.split('/').at(-1)}`);
await writeFile('dist/SHA256SUMS.txt', hashes.join('\n') + '\n');
console.log(`Release verified: ${Object.keys(files).length} files, ${zipped.length} bytes. ${archive}`);
