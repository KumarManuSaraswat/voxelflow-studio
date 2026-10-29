// Development-only: read installed APIs to verify compatibility; never part of the plugin.
import fs from 'node:fs';
import path from 'node:path';
const archive = process.argv[2];
const fd = fs.openSync(archive, 'r');
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const header = Buffer.alloc(head.readUInt32LE(12)); fs.readSync(fd, header, 0, header.length, 16);
const tree = JSON.parse(header.toString()); const base = 8 + head.readUInt32LE(4);
function walk(files, prefix = '') {
  for (const [name, entry] of Object.entries(files)) {
    const p = prefix + name;
    if (entry.files) walk(entry.files, p + '/');
    else if (!entry.unpacked && /(^package.json$|^(dist|build|electron)\/.*\.(js|ts|map)$)/.test(p)) {
      const out = path.join('.research/blockbench', p); fs.mkdirSync(path.dirname(out), {recursive:true});
      const data = Buffer.alloc(entry.size); fs.readSync(fd, data, 0, data.length, base + Number(entry.offset)); fs.writeFileSync(out, data);
    }
  }
}
walk(tree.files); fs.closeSync(fd);
const mapPath = '.research/blockbench/dist/bundle.js.map';
if (fs.existsSync(mapPath)) {
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  map.sources.forEach((src, i) => {
    const match = src.match(/(?:^|\/)js\/(.+)$/);
    if (match && map.sourcesContent[i]) {
      const out = path.join('.research/blockbench/js', match[1]);
      fs.mkdirSync(path.dirname(out), {recursive:true}); fs.writeFileSync(out, map.sourcesContent[i]);
    }
  });
  console.log('Source map paths:', map.sources.slice(-15));
}
console.log('Extracted local Blockbench API source into .research/blockbench');
