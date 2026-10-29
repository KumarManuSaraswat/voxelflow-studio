import { mkdir,writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { AssetSpecSchema } from '../packages/core/src/schema';
import { generateRobot } from '../packages/core/src/modeling';
import { bedrockAnimations,exportPackage,zipPackage } from '../packages/core/src/exporters';
import { validateAsset } from '../packages/core/src/validation';
const spec=AssetSpecSchema.parse({name:'atlas_robot',height:40,build:'slender'}),asset=generateRobot(spec);
const files=exportPackage(asset,['75a56d43-8309-49eb-a881-72d6d70abbe2','c8189acb-75a0-4b66-8c16-b4db74bb472f']);
async function save(path:string,content:string|Uint8Array){await mkdir(dirname(path),{recursive:true});await writeFile(path,content);}
for(const [path,data] of Object.entries(files))await save(`examples/exported-bedrock/${path}`,data);
await save('examples/robot/asset-spec.json',JSON.stringify(spec,null,2)+'\n');
await save('examples/robot/animations.json',JSON.stringify(bedrockAnimations(asset),null,2)+'\n');
await save('examples/robot/validation-report.json',JSON.stringify(validateAsset(asset),null,2)+'\n');
await save('dist/atlas_robot_bedrock_assets.zip',zipPackage(files));
console.log(`Generated ${asset.cubes.length} cubes, ${asset.bones.length} bones, ${asset.animations.length} clips; ${Object.keys(files).length} package files. ${validateAsset(asset).counts.failed} failed checks.`);
