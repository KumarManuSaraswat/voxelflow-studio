import { strToU8, zipSync } from 'fflate';
import { Asset } from './schema';
import { report, validateAsset } from './validation';
import type { Finding } from './schema';

export type PackageFiles = Record<string,Uint8Array>;
const json = (v:unknown) => strToU8(JSON.stringify(v,null,2)+'\n');
const rotation = (v:number[]) => [-v[0],-v[1],v[2]];
export function bedrockGeometry(a:Asset) {
  const rotatedUV=a.cubes.some(c=>Object.values(c.faces).some(f=>f.rotation!==0));
  // Include depth and negative Y, and conservatively bound rotated prop cubes.
  const bounds=a.cubes.flatMap(c=>{
    if(!c.rotation.some(v=>v!==0))return [c.from,c.to];
    const radius=Math.hypot(...c.from.map((v,i)=>Math.max(Math.abs(v-c.origin[i]),Math.abs(c.to[i]-c.origin[i]))));
    return [c.origin.map(v=>v-radius),c.origin.map(v=>v+radius)];
  });
  const lowY=Math.min(0,...bounds.map(p=>p[1])),highY=Math.max(0,...bounds.map(p=>p[1]));
  return {format_version:rotatedUV?'1.21.0':'1.12.0','minecraft:geometry':[{
    description:{identifier:`geometry.${a.namespace}.${a.name}`,texture_width:a.textures[0]?.width,texture_height:a.textures[0]?.height,visible_bounds_width:Math.max(4,...bounds.flatMap(p=>[Math.abs(p[0])/8+2,Math.abs(p[2])/8+2])),visible_bounds_height:Math.max(4,(highY-lowY)/16+2),visible_bounds_offset:[0,(lowY+highY)/32,0]},
    bones:a.bones.map(b=>({name:b.name,...(b.parent?{parent:b.parent}:{}),pivot:[-b.pivot[0],b.pivot[1],b.pivot[2]],rotation:rotation(b.rotation),cubes:a.cubes.filter(c=>c.bone===b.name).map(c=>({origin:[-c.to[0],c.from[1],c.from[2]],size:c.to.map((v,i)=>v-c.from[i]),pivot:[-c.origin[0],c.origin[1],c.origin[2]],rotation:rotation(c.rotation),inflate:c.inflate,uv:Object.fromEntries(Object.entries(c.faces).filter(([,f])=>f.texture).map(([side,f])=>{
      const flip=side==='up'||side==='down';
      return [side,{uv:flip?[f.uv[2],f.uv[3]]:[f.uv[0],f.uv[1]],uv_size:[(f.uv[2]-f.uv[0])*(flip?-1:1),(f.uv[3]-f.uv[1])*(flip?-1:1)],...(f.rotation?{uv_rotation:f.rotation}:{})}];
    }))}))}))
  }]};
}
export function bedrockAnimations(a:Asset) {
  return {format_version:'1.8.0',animations:Object.fromEntries(a.animations.map(clip=>{
    const bones: Record<string,Record<string,unknown>>={};
    for(const track of clip.tracks) { bones[track.bone]??={}; bones[track.bone][track.channel]=Object.fromEntries(track.frames.map((f,i)=>{
      const previous=track.frames[i-1];
      return [String(f.time),previous?.interpolation==='step'?{pre:previous.value,post:f.value}:f.value];
    })); }
    return [clip.name,{loop:clip.loop,animation_length:clip.length,bones}];
  }))};
}
export function exportPackage(a:Asset, uuids: [string,string], projectJson?:string): PackageFiles {
  const validation=validateAsset(a); if(!validation.ready) throw new Error(`Export blocked: ${validation.counts.failed} failed checks. ${validation.findings.find(f=>f.status==='failed')?.message}`);
  const id=`${a.namespace}.${a.name}`, controller=`controller.animation.${id}`, render=`controller.render.${id}`;
  const files:PackageFiles={
    [`models/entity/${a.name}.geo.json`]:json(bedrockGeometry(a)),
    [`textures/entity/${a.name}.png`]:a.textures[0].png,
    [`animations/${a.name}.animation.json`]:json(bedrockAnimations(a)),
    [`animation_controllers/${a.name}.controller.json`]:json({format_version:'1.10.0',animation_controllers:{[controller]:{initial_state:'idle',states:{
      idle:{animations:['idle'],transitions:[{attack:'query.is_delayed_attacking'},{walk:'query.modified_move_speed > 0.05'}],blend_transition:0.15},
      walk:{animations:['walk'],transitions:[{attack:'query.is_delayed_attacking'},{idle:'query.modified_move_speed <= 0.05'}],blend_transition:0.15},
      attack:{animations:['attack'],transitions:[{idle:'query.all_animations_finished'}],blend_transition:0.1}
    }}}}),
    [`entity/${a.name}.entity.json`]:json({format_version:'1.10.0','minecraft:client_entity':{description:{identifier:`${a.namespace}:${a.name}`,materials:{default:'entity_alphatest'},textures:{default:`textures/entity/${a.name}`},geometry:{default:`geometry.${id}`},animations:{idle:`animation.${id}.idle`,walk:`animation.${id}.walk`,attack:`animation.${id}.attack`,main:controller},scripts:{animate:['main']},render_controllers:[render]}}}),
    [`render_controllers/${a.name}.render_controllers.json`]:json({format_version:'1.8.0',render_controllers:{[render]:{geometry:'Geometry.default',materials:[{'*':'Material.default'}],textures:['Texture.default']}}}),
    'manifest.json':json({format_version:2,header:{name:`VoxelFlow · ${a.name}`,description:'Integration-ready resource assets; requires a behavior entity.',uuid:uuids[0],version:[1,0,0],min_engine_version:a.cubes.some(c=>Object.values(c.faces).some(f=>f.rotation!==0))?[1,21,0]:[1,20,0]},modules:[{type:'resources',uuid:uuids[1],version:[1,0,0]}]}),
    'validation-report.json':json(validation),
    'INTEGRATION.txt':strToU8(`VoxelFlow Studio — ${a.namespace}:${a.name}\n\nThis is a resource asset package, not a complete playable mob.\nMerge these files into a Bedrock resource pack, or enable this resource pack with a behavior pack defining the same identifier.\nConfigure your behavior entity's collision box, health, movement, spawn rules, and attack behavior.\nThe controller uses query.modified_move_speed and query.is_delayed_attacking. A behavior with a delayed attack must drive the latter; otherwise the punch remains previewable in Blockbench only.\nCyan eye pixels are bright colors, not an emissive material.\nNumeric, linear/step keyframes and per-face cube UVs are supported.\nValidate in your Minecraft Bedrock version. Runtime compatibility is NOT verified.\n`)
  };
  if(a.kind==='prop'){
    delete files[`animations/${a.name}.animation.json`];
    delete files[`animation_controllers/${a.name}.controller.json`];
    files[`entity/${a.name}.entity.json`]=json({format_version:'1.10.0','minecraft:client_entity':{description:{identifier:`${a.namespace}:${a.name}`,materials:{default:'entity_alphatest'},textures:{default:`textures/entity/${a.name}`},geometry:{default:`geometry.${id}`},render_controllers:[render]}}});
    files['INTEGRATION.txt']=strToU8(`VoxelFlow Studio — ${a.namespace}:${a.name}\n\nStatic Minecraft-style prop resource assets.\nIncludes geometry, PNG, a static client-entity/render-controller scaffold, and an editable source when exported from Blockbench.\nThis is not a registered inventory item, wearable backpack, or usable weapon.\nFor a held/worn item, create the matching Bedrock item and attachable definitions and set its hand/body transforms. For a world entity, provide a behavior entity with the same identifier.\nNo humanoid rig or character animations are required for this static object.\nBright crystal colors are not an emissive shader.\nMinecraft runtime compatibility is NOT verified.\n`);
  }
  if(projectJson) files[`source/${a.name}.bbmodel`]=strToU8(projectJson);
  const integrity=validatePackage(files); if(!integrity.ready) throw new Error('Package consistency check failed: '+integrity.findings.filter(f=>f.status==='failed').map(f=>f.message).join(' '));
  return files;
}
export function zipPackage(files:PackageFiles) { return zipSync(files,{level:6}); }
export function validatePackage(files:PackageFiles) {
  const findings:Finding[]=[];
  const bad=(code:string,message:string)=>findings.push({stage:'export',status:'failed',code,message,correction:'Re-export from a validated asset.'});
  const parsed:Record<string,any>={};
  for(const [path,data] of Object.entries(files)) {
    if(path.startsWith('/')||path.includes('..')||path.includes('\\')) bad('package.path',`Unsafe package path: ${path}`);
    if(path.endsWith('.json')) try{ parsed[path]=JSON.parse(new TextDecoder().decode(data)); }catch{bad('package.json',`Invalid JSON: ${path}`);}
  }
  for(const folder of ['models/entity/','textures/entity/','entity/','render_controllers/']) if(!Object.keys(files).some(p=>p.startsWith(folder))) bad('package.missing',`Missing ${folder} files.`);
  const geometry=Object.values(parsed).flatMap(p=>p['minecraft:geometry']??[]), animations=Object.assign({},...Object.values(parsed).map(p=>p.animations??{})), controllers=Object.assign({},...Object.values(parsed).map(p=>p.animation_controllers??{})), renders=Object.assign({},...Object.values(parsed).map(p=>p.render_controllers??{}));
  for(const data of Object.values(parsed)) if(data['minecraft:client_entity']) {
    const d=data['minecraft:client_entity'].description;
    if(!d||!/^\w+:\w+$/.test(d.identifier??'')) {bad('package.identifier','Invalid client entity identifier.');continue;}
    if(!geometry.some(g=>g.description?.identifier===d.geometry?.default)) bad('package.geometry','Broken client geometry reference.');
    if(!files[`${d.textures?.default}.png`]) bad('package.texture','Missing exported texture PNG.');
    for(const ref of Object.values(d.animations??{}) as string[]) if(!animations[ref]&&!controllers[ref]) bad('package.animation',`Missing animation/controller ${ref}.`);
    for(const ref of d.render_controllers??[]) if(!renders[ref]) bad('package.render','Broken render controller reference.');
    for(const ref of d.scripts?.animate??[]) if(typeof ref!=='string'||!d.animations[ref]) bad('package.script','Unknown animation in client scripts.');
    for(const c of Object.values(controllers) as any[]) for(const state of Object.values(c.states??{}) as any[]) {
      for(const ref of state.animations??[]) if(!d.animations[ref]) bad('package.alias',`Unknown animation alias ${ref}.`);
      for(const transition of state.transitions??[]) for(const next of Object.keys(transition)) if(!c.states[next]) bad('package.state',`Unknown controller state ${next}.`);
    }
  }
  const boneNames=new Set(geometry.flatMap(g=>(g.bones??[]).map((b:any)=>b.name)));
  for(const clip of Object.values(animations) as any[]) for(const b of Object.keys(clip.bones??{})) if(!boneNames.has(b)) bad('package.bone',`Animation references missing bone ${b}.`);
  const manifest=parsed['manifest.json'];
  if(!manifest?.header?.uuid||!manifest?.modules?.[0]?.uuid||manifest.header.uuid===manifest.modules[0].uuid) bad('package.manifest','Manifest UUIDs must exist and be distinct.');
  if(!findings.length) findings.push({stage:'export',status:'passed',code:'package.ok',message:'JSON, files, and geometry, texture, animation, controller references are consistent.'});
  return report(findings);
}
