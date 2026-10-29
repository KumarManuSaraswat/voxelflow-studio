import {describe,it,expect} from 'vitest';
import {PropSpecSchema,parseTool} from '../packages/core/src/schema';
import {generateProp,propPreset,propAtlasPixels,recolorProp} from '../packages/core/src/props';
import {validateAsset} from '../packages/core/src/validation';
import {exportPackage,validatePackage,bedrockGeometry} from '../packages/core/src/exporters';

describe('prompt-designed prop geometry',()=>{
  it.each(['bag','staff'] as const)('builds a complete editable %s with a real atlas and no humanoid requirements',preset=>{
    const spec=propPreset(preset),asset=generateProp(spec),report=validateAsset(asset);
    expect(asset.cubes.length).toBe(spec.parts.length);expect(asset.bones.length).toBeGreaterThan(1);
    expect(report.ready).toBe(true);expect(asset.animations).toEqual([]);expect(asset.mapping).toEqual({});
    expect(asset.textures[0].width).toBe(128);expect([...asset.textures[0].png.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(report.findings.find(f=>f.code==='animation.ok')?.message).toContain('Static prop');
  });
  it('accepts a new object outside the presets and preserves its designed placement and rotation',()=>{
    const spec={name:'moon_lantern',description:'A moon lantern designed by the assistant.',materials:[{name:'moonstone',color:'#aaccee'}],parts:[{name:'lamp',group:'light',from:[-2,4,-2],to:[2,8,2],material:'moonstone',rotation:[0,45,0]}]};
    const command=parseTool('create_prop',{request_id:crypto.randomUUID(),spec});const asset=generateProp(command.args.spec);
    expect(asset.name).toBe('moon_lantern');expect(asset.cubes[0].origin).toEqual([0,6,0]);expect(asset.cubes[0].rotation).toEqual([0,45,0]);expect(validateAsset(asset).ready).toBe(true);
  });
  it.each(['missing_material','duplicate_part','duplicate_material','inverted_cube','out_of_bounds','code','too_many_parts'])('rejects %s before scene mutation',problem=>{
    const spec:any=propPreset('bag');
    if(problem==='missing_material')spec.parts[0].material='missing';
    if(problem==='duplicate_part')spec.parts[1].name=spec.parts[0].name;
    if(problem==='duplicate_material')spec.materials.push({...spec.materials[0]});
    if(problem==='inverted_cube')spec.parts[0].to=spec.parts[0].from;
    if(problem==='out_of_bounds')spec.parts[0].pivot=[9999,0,0];
    if(problem==='code')spec.script='alert(1)';
    if(problem==='too_many_parts')spec.parts=Array.from({length:129},(_,i)=>({...spec.parts[0],name:`part_${i}`}));
    expect(()=>PropSpecSchema.parse(spec)).toThrow();
  });
  it('still validates static hierarchy references and fails unsupported prop animation',()=>{
    const asset=generateProp(propPreset('bag'));asset.bones[1].parent='lost';asset.animations=[{name:'animation.voxelflow.adventurer_bag.open',loop:false,length:1,tracks:[]}];
    const codes=validateAsset(asset).findings.map(f=>f.code);expect(codes).toContain('rig.parent');expect(codes).toContain('animation.prop_static');
  });
});
describe('named prop colors and exports',()=>{
  it('includes deep props below the origin in export visibility bounds',()=>{const spec=propPreset('bag');spec.parts[0].from=[-2,-40,-70];spec.parts[0].to=[2,-10,70];const geometry=bedrockGeometry(generateProp(spec))['minecraft:geometry'][0].description;expect(geometry.visible_bounds_width).toBeGreaterThanOrEqual(140/16);expect(geometry.visible_bounds_offset[1]-geometry.visible_bounds_height/2).toBeLessThanOrEqual(-40/16);});
  it('recolors selected named materials while preserving a painted pixel and other materials',()=>{
    const before=propPreset('bag').materials,pixels=propAtlasPixels(before);pixels.set([3,4,5,255],4);
    const result=recolorProp(pixels,before,[{name:'leather',color:'#337755'}]);
    expect(result.preserved).toBe(1);expect([...result.pixels.slice(4,8)]).toEqual([3,4,5,255]);expect(result.pixels[0]).not.toBe(pixels[0]);expect(result.materials.find(m=>m.name==='brass')).toEqual(before.find(m=>m.name==='brass'));
    expect(()=>recolorProp(pixels,before,[{name:'new_color',color:'#ffffff'}])).toThrow('existing');
  });
  it.each(['bag','staff'] as const)('exports %s without dangling character clip/controller references',preset=>{
    const asset=generateProp(propPreset(preset)),files=exportPackage(asset,[crypto.randomUUID(),crypto.randomUUID()]);
    expect(validatePackage(files).ready).toBe(true);expect(Object.keys(files)).toHaveLength(7);expect(Object.keys(files).some(p=>p.startsWith('animations/')||p.startsWith('animation_controllers/'))).toBe(false);
    const client=JSON.parse(new TextDecoder().decode(files[`entity/${asset.name}.entity.json`]));expect(client['minecraft:client_entity'].description.animations).toBeUndefined();
    const withSource=exportPackage(asset,[crypto.randomUUID(),crypto.randomUUID()],'{}');expect(Object.keys(withSource)).toHaveLength(8);
    delete files[`textures/entity/${asset.name}.png`];expect(validatePackage(files).ready).toBe(false);
  });
});
