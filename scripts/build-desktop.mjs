import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root='plugins/voxelflow-studio';
const result=await build({entryPoints:['packages/mcp-server/src/server.ts','packages/mcp-server/src/bridge-cli.ts'],outdir:`${root}/server`,outExtension:{'.js':'.mjs'},bundle:true,format:'esm',platform:'node',target:'node22',external:['bufferutil','utf-8-validate'],banner:{js:'import { createRequire as vfCreateRequire } from "node:module"; const require = vfCreateRequire(import.meta.url);'},metafile:true,legalComments:'inline'});
for(const dir of ['blockbench','assets'])await mkdir(`${root}/${dir}`,{recursive:true});
await copyFile('dist/voxelflow_studio.js',`${root}/blockbench/voxelflow_studio.js`);
for(const image of ['adventurer-bag.png','arcane-staff.png'])await copyFile(`docs/evidence/${image}`,`${root}/assets/${image}`);
await copyFile('LICENSE',`${root}/LICENSE`);
const dependencies=new Set(['fflate','zod']);
for(const input of Object.keys(result.metafile.inputs)){
  const match=input.replaceAll('\\','/').match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);if(match)dependencies.add(match[1]);
}
const notices=['VoxelFlow Studio bundled dependency notices\n\nNode.js and Blockbench are installed separately.'];
for(const name of [...dependencies].sort()){
  const folder=resolve('node_modules',name),pkg=JSON.parse(await readFile(`${folder}/package.json`,'utf8'));
  const licenses=(await readdir(folder)).filter(p=>/^licen[sc]e(?:\..*)?$/i.test(p));
  if(!licenses.length)throw Error(`Missing license notice for ${name}`);
  notices.push(`\n=== ${name} ${pkg.version} (${pkg.license}) ===\n`);
  for(const file of licenses)notices.push(await readFile(`${folder}/${file}`,'utf8'));
}
await writeFile(`${root}/THIRD_PARTY_NOTICES.txt`,notices.join('\n'));
console.log(`Built standalone desktop companion with ${dependencies.size} dependency notices. Node.js 22+ is required; npm install is not.`);
