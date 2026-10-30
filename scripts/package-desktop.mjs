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
for(const path of ['server/doctor.mjs','Check VoxelFlow.cmd','PROMPTS.md'])assert(files[path],`Missing ${path}`);
for(const path of ['plugin.json','mcp.json','server/server.mjs','server/bridge-cli.mjs','blockbench/voxelflow_studio.js','skills/setup/SKILL.md','skills/create-model/SKILL.md','INSTALL.md','LICENSE','THIRD_PARTY_NOTICES.txt'])assert(files[path],`Missing ${path}`);
const catalog=new Uint8Array(await readFile('distribution/marketplace.json'));
const bundle=Object.fromEntries(Object.entries(files).map(([p,b])=>[`plugins/voxelflow-studio/${p}`,b]));
bundle['.agents/plugins/marketplace.json']=catalog;
bundle['START-HERE.md']=strToU8('# Start here: VoxelFlow Studio\n\n1. Read plugins/voxelflow-studio/INSTALL.md. Install Node.js 22+ and Blockbench desktop 5.2+ first.\n2. Load plugins/voxelflow-studio/blockbench/voxelflow_studio.js in Blockbench (File > Plugins > Load Plugin from File).\n3. Windows: double-click Start VoxelFlow.cmd in THIS folder, then connect in Blockbench (Tools > VoxelFlow Studio > Connect).\n4. Install VoxelFlow in a supported LOCAL desktop chat host. A cloud chat or plugin mention alone cannot access your laptop.\n5. Run Check VoxelFlow.cmd if setup fails. It checks local tools and the editor, not chat permissions.\n6. Try the prompts in plugins/voxelflow-studio/PROMPTS.md. Review and approve changes in Blockbench.\n\nNo AI account? The Bag, Staff and Robot examples in Blockbench work offline.\n\nThis is an early desktop beta, not a public ChatGPT directory listing.\n');
bundle['Start VoxelFlow.cmd']=strToU8('@echo off\r\ncall "%~dp0plugins\\voxelflow-studio\\Start VoxelFlow.cmd"\r\n');
bundle['Check VoxelFlow.cmd']=strToU8('@echo off\r\ncall "%~dp0plugins\\voxelflow-studio\\Check VoxelFlow.cmd"\r\n');
const sums=[];
for(const [suffix,entries] of [['plugin',files],['desktop-beta',bundle]]){
  const name=`voxelflow-${suffix}-${manifest.version}.zip`,bytes=zipSync(entries,{level:6}),check=unzipSync(bytes);
  for(const [path,data] of Object.entries(entries))assert(Buffer.from(data).equals(Buffer.from(check[path])),`Bad archive entry ${path}`);
  await writeFile(`dist/${name}`,bytes);sums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  console.log(`Verified ${name}: ${Object.keys(check).length} files, ${bytes.length} bytes.`);
}
await writeFile('dist/DESKTOP-SHA256SUMS.txt',sums.join('\n')+'\n');
