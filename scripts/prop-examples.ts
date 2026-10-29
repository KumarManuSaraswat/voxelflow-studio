import {mkdir,writeFile} from 'node:fs/promises';
import {propPreset,generateProp} from '../packages/core/src/props';
import {validateAsset} from '../packages/core/src/validation';
import {exportPackage,zipPackage} from '../packages/core/src/exporters';
for(const preset of ['bag','staff'] as const){
 const spec=propPreset(preset),asset=generateProp(spec),folder=`examples/props/${preset}`;
 const report=validateAsset(asset);if(!report.ready)throw Error(JSON.stringify(report));
 const files=exportPackage(asset,[`97000000-0000-4000-8000-00000000000${preset==='bag'?1:3}`,`97000000-0000-4000-8000-00000000000${preset==='bag'?2:4}`]);
 await mkdir(folder,{recursive:true});await writeFile(`${folder}/spec.json`,JSON.stringify(spec,null,2)+'\n');await writeFile(`${folder}/validation-report.json`,JSON.stringify(report,null,2)+'\n');await writeFile(`${folder}/${asset.name}.png`,asset.textures[0].png);await writeFile(`dist/${asset.name}_bedrock_assets.zip`,zipPackage(files));
 console.log(`${preset}: ${asset.cubes.length} editable cubes, ${spec.materials.length} colors, ${Object.keys(files).length} resource files; ${report.counts.failed} failed checks.`);
}
