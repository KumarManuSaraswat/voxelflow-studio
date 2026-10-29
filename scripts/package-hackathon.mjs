import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {zipSync,unzipSync,strToU8} from 'fflate';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const files=unzipSync(await readFile(`dist/voxelflow-desktop-beta-${version}.zip`));
for(const [from,to] of [
  ['docs/hackathon-demo.md','Presenter guide.md'],['docs/hackathon.html','START HERE.html'],
  ['examples/props/bag/adventurer_bag.bbmodel','samples/adventurer_bag.bbmodel'],
  ['examples/props/staff/arcane_staff.bbmodel','samples/arcane_staff.bbmodel'],
  ['examples/robot/atlas_robot.bbmodel','samples/atlas_robot.bbmodel'],
  ['examples/props/lantern/brass_festival_lantern.bbmodel','samples/brass_festival_lantern.bbmodel'],
  ['docs/evidence/festival-lantern.png','images/lantern.png'],
  ['dist/brass_festival_lantern_bedrock_assets.zip','exports/brass_festival_lantern.zip'],
  ['docs/evidence/adventurer-bag.png','images/bag.png'],['docs/evidence/arcane-staff.png','images/staff.png'],
  ['dist/adventurer_bag_bedrock_assets.zip','exports/adventurer_bag.zip'],
  ['dist/arcane_staff_bedrock_assets.zip','exports/arcane_staff.zip'],['dist/atlas_robot_bedrock_assets.zip','exports/atlas_robot.zip']
])files[to]=new Uint8Array(await readFile(from));
const doctor=await build({entryPoints:['scripts/doctor.mjs'],bundle:true,write:false,format:'esm',platform:'node',target:'node22',legalComments:'inline',banner:{js:'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);'}});
files['doctor.mjs']=doctor.outputFiles[0].contents;
files['Check Setup.cmd']=strToU8('@echo off\r\nnode "%~dp0doctor.mjs" --root "%~dp0."\r\necho.\r\npause\r\n');
files['Start Companion.cmd']=strToU8('@echo off\r\ncall "%~dp0plugins\\voxelflow-studio\\Start VoxelFlow.cmd"\r\n');
files['START HERE.html']=strToU8(new TextDecoder().decode(files['START HERE.html']).replaceAll('{{VERSION}}',version));
files['Presenter guide.md']=strToU8(new TextDecoder().decode(files['Presenter guide.md']).replaceAll('../plugins/','plugins/'));
for(const path of Object.keys(files)){
  assert(!path.includes('..')&&!path.includes('\\')&&!path.startsWith('/'));
  assert(!/(^|\/)(node_modules|\.local|\.research|\.git|\.env)(\/|$)/.test(path));
}
const zipped=zipSync(files,{level:6}),check=unzipSync(zipped);
for(const [path,data] of Object.entries(files))assert(Buffer.from(data).equals(Buffer.from(check[path])));
await mkdir('dist',{recursive:true});
const name=`voxelflow-hackathon-kit-${version}.zip`;
await writeFile(`dist/${name}`,zipped);
await writeFile('dist/HACKATHON-SHA256SUMS.txt',`${createHash('sha256').update(zipped).digest('hex')}  ${name}\n`);
console.log(`Verified ${name}: ${Object.keys(files).length} files, ${zipped.length} bytes. Extract completely; open START HERE.html.`);
