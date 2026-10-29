import { describe,it,expect } from 'vitest';
import { unzipSync } from 'fflate';
import { AssetSpecSchema, parseTool, roles } from '../packages/core/src/schema';
import { generateRobot, detectRig } from '../packages/core/src/modeling';
import { generateAnimations } from '../packages/core/src/animation';
import { validateAsset } from '../packages/core/src/validation';
import { exportPackage, validatePackage, zipPackage, bedrockAnimations, bedrockGeometry } from '../packages/core/src/exporters';
import { palettePixels, recolorPreservingPaint } from '../packages/core/src/textures';
import { OperationLedger } from '../packages/core/src/operations';

const robot=()=>generateRobot({});
const codes=(asset:ReturnType<typeof robot>)=>validateAsset(asset).findings.filter(f=>f.status==='failed').map(f=>f.code);
describe('structured input boundaries',()=>{
  it('provides validated usable defaults',()=>{expect(AssetSpecSchema.parse({}).height).toBe(36);expect(codes(robot())).toEqual([]);});
  it.each([{height:Infinity},{height:-1},{height:10000},{name:'../secret'},{namespace:'test;process.exit()'},{script:'alert(1)'},{palette:{primary:'red'}},{animations:{speed:0}},{template:'dragon'}])('rejects unsafe or unsupported specification %j',value=>expect(()=>AssetSpecSchema.parse(value)).toThrow());
  it.each(['eval','execute_script','__proto__','constructor','read_file'])('rejects non-allowlisted tool %s',name=>expect(()=>parseTool(name,{})).toThrow());
  it('rejects extra tool parameters and absolute output paths',()=>{expect(()=>parseTool('export_asset',{request_id:crypto.randomUUID(),target:'bedrock',path:'C:/data'})).toThrow();expect(()=>parseTool('create_model',{request_id:'x',spec:{}})).toThrow();});
});
describe('editable model and rig',()=>{
  it('builds recognizable parts, unique names, joints and connected cubes',()=>{const a=robot();expect(a.bones).toHaveLength(11);expect(a.cubes.length).toBeGreaterThan(35);expect(new Set(a.cubes.map(c=>c.name)).size).toBe(a.cubes.length);expect(a.cubes.some(c=>c.name==='left_eye')).toBe(true);expect(a.bones.find(b=>b.name==='left_lower_arm')?.parent).toBe('left_upper_arm');expect(a.cubes.every(c=>a.bones.some(b=>b.name===c.bone))).toBe(true);});
  it.each([16,36,64])('validates scaled %i-unit robot',height=>expect(codes(generateRobot({height}))).toEqual([]));
  it.each(['slender','balanced','heavy'])('validates %s build',build=>expect(codes(generateRobot({build}))).toEqual([]));
  it('detects ambiguous aliases without guessing',()=>{const a=robot();a.bones.push({...a.bones[0],name:'hips'});const d=detectRig(a.bones);expect(d.ambiguous).toContain('root');expect(d.mapping.root).toBeUndefined();});
  it('detects cycles, duplicates, missing parents and overlapping joints',()=>{const a=robot();a.bones[0].parent='head';a.bones.push({...a.bones[1]});a.bones[2].parent='lost';a.bones.find(b=>b.name==='left_lower_arm')!.pivot=[6,26,0];const failures=codes(a);expect(failures).toContain('rig.duplicate');expect(failures).toContain('rig.parent');expect(failures).toContain('rig.joint_position');const cycle=robot();cycle.bones[0].parent='torso';expect(codes(cycle)).toContain('rig.cycle');});
  it('rejects missing mapping and left/right reversal',()=>{const a=robot();delete a.mapping.head;[a.mapping.left_upper_leg,a.mapping.right_upper_leg]=[a.mapping.right_upper_leg,a.mapping.left_upper_leg];expect(codes(a)).toContain('rig.mapping_missing');expect(codes(a)).toContain('rig.sides');});
  it('detects invalid geometry dimensions, nonfinite values, and unsupported features',()=>{const a=robot();a.cubes[0].to[0]=a.cubes[0].from[0];a.cubes[1].from[0]=NaN;a.unsupported.push('Mesh');expect(codes(a)).toEqual(expect.arrayContaining(['geometry.dimension','geometry.nonfinite','geometry.unsupported']));});
});
describe('texture workflow',()=>{
  it('creates a real PNG and maps every face within the atlas',()=>{const a=robot();expect([...a.textures[0].png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(codes(a)).not.toContain('texture.uv');});
  it('preserves user-painted pixels while changing generated pixels',()=>{const before=AssetSpecSchema.parse({}).palette,after={...before,primary:'#ff0000'};const pixels=palettePixels(before);pixels.set([1,2,3,255],4);const r=recolorPreservingPaint(pixels,before,after);expect([...r.pixels.subarray(4,8)]).toEqual([1,2,3,255]);expect(r.preserved).toBe(1);expect([...r.pixels.subarray(0,4)]).not.toEqual([...pixels.subarray(0,4)]);});
  it('detects missing texture refs, PNG and invalid UVs',()=>{const a=robot();a.cubes[0].faces.north.texture='missing';a.cubes[1].faces.north.uv=[-1,0,99,17];a.textures[0].png=new Uint8Array();expect(codes(a)).toEqual(expect.arrayContaining(['texture.reference','texture.uv','texture.file']));});
  it('rejects box UV export rather than silently changing it',()=>{const a=robot();a.cubes[0].boxUv=true;expect(codes(a)).toContain('texture.box_uv');});
});
describe('animation quality',()=>{
  it('has effective, native-ready tracks for all clips and closes both loops',()=>{const a=robot();expect(a.animations).toHaveLength(3);for(const clip of a.animations){expect(clip.tracks.length).toBeGreaterThan(3);if(clip.loop)for(const track of clip.tracks){expect(track.frames[0].value).toEqual(track.frames.at(-1)!.value);expect(track.frames.at(-1)!.time).toBe(clip.length);}}expect(a.animations[2].loop).toBe(false);});
  it('opposes left/right arms and legs during a walk',()=>{const c=robot().animations[1];const x=(bone:string)=>c.tracks.find(t=>t.bone===bone)!.frames[0].value[0];expect(x('left_upper_leg')).toBe(-x('right_upper_leg'));expect(x('left_upper_arm')).toBe(-x('right_upper_arm'));expect(Math.sign(x('left_upper_leg'))).toBe(-Math.sign(x('left_upper_arm')));});
  it.each([0.25,1,3])('keeps loops closed at speed %f',speed=>{const a=robot();a.animations=generateAnimations(a.name,a.namespace,a.mapping as any,{speed});expect(codes(a)).toEqual([]);});
  it('detects missing bones, ineffective clips, timestamps and seam jumps',()=>{const a=robot();a.animations[0].tracks[0].bone='missing';a.animations[0].tracks[0].frames.at(-1)!.value=[50,0,0];a.animations[1].tracks[0].frames[1].time=-1;a.animations[2].tracks=[];expect(codes(a)).toEqual(expect.arrayContaining(['animation.bone','animation.seam','animation.keyframe','animation.ineffective']));});
});
describe('Bedrock asset package',()=>{
  it('uses Bedrock geometry 1.21 for rotated face UVs',()=>{const a=robot();a.cubes[0].faces.north.rotation=90;expect(bedrockGeometry(a).format_version).toBe('1.21.0');});
  it('exports consistent identifiers, usable PNG, JSON and a readable ZIP',()=>{const a=robot(),files=exportPackage(a,[crypto.randomUUID(),crypto.randomUUID()]);expect(validatePackage(files).ready).toBe(true);const unzipped=unzipSync(zipPackage(files));expect(Object.keys(unzipped).length).toBe(9);const animation=bedrockAnimations(a);expect(Object.keys(animation.animations)).toHaveLength(3);for(const c of Object.values(animation.animations))expect(Object.keys(c.bones).every(b=>roles.includes(b as any))).toBe(true);const geo=JSON.parse(new TextDecoder().decode(files['models/entity/atlas_robot.geo.json']));expect(geo['minecraft:geometry'][0].bones[0].cubes[0].origin[0]).toBe(-a.cubes[0].to[0]);});
  it('blocks export on failed quality gates',()=>{const a=robot();a.bones=[];expect(()=>exportPackage(a,[crypto.randomUUID(),crypto.randomUUID()])).toThrow('Export blocked');});
  it('detects missing PNG, invalid JSON, dangling references and unsafe paths',()=>{const files=exportPackage(robot(),[crypto.randomUUID(),crypto.randomUUID()]);delete files['textures/entity/atlas_robot.png'];files['bad.json']=new TextEncoder().encode('{');files['../bad']=new Uint8Array();expect(validatePackage(files).ready).toBe(false);expect(validatePackage(files).findings.map(f=>f.code)).toEqual(expect.arrayContaining(['package.texture','package.json','package.path']));});
});
describe('approval ledger and retry protection',()=>{
  it('deduplicates pending and applied commands without reapplying',()=>{const l=new OperationLedger(),id=crypto.randomUUID();expect(l.propose(id,'create_model',{spec:{}},'create').fresh).toBe(true);expect(l.propose(id,'create_model',{spec:{}},'create').fresh).toBe(false);l.transition(id,'applying');l.transition(id,'applied',{result:{cubes:43}});expect(l.propose(id,'create_model',{spec:{}},'create').operation.state).toBe('applied');expect(()=>l.transition(id,'applying')).toThrow();});
  it('rejects ID reuse with changed parameters, cancellations and over-capacity',()=>{const l=new OperationLedger(1),id=crypto.randomUUID();l.propose(id,'create_model',{},'create');expect(()=>l.propose(id,'create_model',{height:99},'create')).toThrow();l.transition(id,'cancelled');expect(()=>l.transition(id,'applying')).toThrow();expect(()=>l.propose(crypto.randomUUID(),'create_model',{},'create')).toThrow('limit');});
});
