import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8} from 'fflate';
const root='plugins/voxelflow-studio',manifest=JSON.parse(await readFile(`${root}/plugin.json`,'utf8'));
const files={};
async function include(folder,relative=''){
  for(const entry of await readdir(folder,{withFileTypes:true})){
    const path=relative+entry.name;
    assert(!entry.name.startsWith('.')&&!entry.isSymbolicLink(),'Unexpected hidden file or symlink');
    if(entry.isDirectory())await include(`${folder}/${entry.name}`,`${path}/`);
    else files[path]=new Uint8Array(await readFile(`${folder}/${entry.name}`));
  }
}
await include(root);
for(const path of ['plugin.json','mcp.json','server/server.mjs','server/bridge-cli.mjs','blockbench/voxelflow_studio.js','skills/setup/SKILL.md','skills/create-model/SKILL.md','INSTALL.md','LICENSE','THIRD_PARTY_NOTICES.txt'])assert(files[path],`Missing ${path}`);
const catalog=new Uint8Array(await readFile('distribution/marketplace.json'));
const bundle=Object.fromEntries(Object.entries(files).map(([p,b])=>[`plugins/voxelflow-studio/${p}`,b]));
bundle['.agents/plugins/marketplace.json']=catalog;
bundle['START-HERE.md']=strToU8('VoxelFlow Studio desktop beta\n\nRead plugins/voxelflow-studio/INSTALL.md to install. This is a local desktop plugin, not a public ChatGPT directory listing.\n');
const sums=[];
for(const [suffix,entries] of [['plugin',files],['desktop-beta',bundle]]){
  const name=`voxelflow-${suffix}-${manifest.version}.zip`,bytes=zipSync(entries,{level:6}),check=unzipSync(bytes);
  for(const [path,data] of Object.entries(entries))assert(Buffer.from(data).equals(Buffer.from(check[path])),`Bad archive entry ${path}`);
  await writeFile(`dist/${name}`,bytes);sums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  console.log(`Verified ${name}: ${Object.keys(check).length} files, ${bytes.length} bytes.`);
}
await writeFile('dist/DESKTOP-SHA256SUMS.txt',sums.join('\n')+'\n');
