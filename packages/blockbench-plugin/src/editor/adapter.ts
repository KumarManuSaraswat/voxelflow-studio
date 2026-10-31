import { Asset, AssetSpec, Clip, CubeData, FaceName, faces, Palette, PropMaterial, PropMaterialsSchema, PropSpec, RigMapping, Role, roles, V3 } from '../../../core/src/schema';
import {generateProp,propAtlasPixels,recolorProp} from '../../../core/src/props';
import {inspectGeometry} from '../../../core/src/inspection';
import { detectRig, generateRobot } from '../../../core/src/modeling';
import { generateAnimations } from '../../../core/src/animation';
import { validateAsset } from '../../../core/src/validation';
import { exportPackage, validatePackage, zipPackage } from '../../../core/src/exporters';
import { encodePng, fromBase64, palettePixels, recolorPreservingPaint, toBase64 } from '../../../core/src/textures';

type VFGroup = Group & { voxelflow_role:string };
type VFTexture = Texture & { voxelflow_palette:string; voxelflow_prop_palette:string };
type VFProject = ModelProject & { voxelflow_meta:string };
const lastEdits=new WeakMap<ModelProject,UndoEntry>();
const vector=(v:number[]):V3=>[v[0],v[1],v[2]];
function project() { if(typeof Project==='undefined'||!Project)throw new Error('Open a model or create a robot first.');return Project as VFProject; }
export function requireBedrock() {const p=project();if(Format.id!=='bedrock')throw new Error('Use a Bedrock Entity project. Create a new robot, or convert a copy of the imported model using File → Convert Project.');return p;}
function identity(){ const p=project();let meta:{name?:string;namespace?:string;kind?:string}={};try{meta=JSON.parse(p.voxelflow_meta||'{}');}catch{}return {name:meta.name||p.name.toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/^[^a-z]+/,'')||'imported_model',namespace:meta.namespace||'voxelflow',kind:meta.kind==='prop'?'prop' as const:'humanoid' as const}; }
export function isPropProject(){return typeof Project!=='undefined'&&!!Project&&identity().kind==='prop';}
export function getPropMaterials():PropMaterial[]{const t=Texture.all.find(t=>(t as VFTexture).voxelflow_prop_palette) as VFTexture|undefined;if(!t)return [];try{return PropMaterialsSchema.parse(JSON.parse(t.voxelflow_prop_palette));}catch{return [];}}
export function initializeProperties() {return [new Property(ModelProject,'string','voxelflow_meta',{default:''}),new Property(Group,'string','voxelflow_role',{default:''}),new Property(Texture,'string','voxelflow_palette',{default:''}),new Property(Texture,'string','voxelflow_prop_palette',{default:''})];}
export function editorStatus() {
  const p=typeof Project!=='undefined'&&Project?Project:undefined;
  return {connected:true,blockbenchVersion:Blockbench.version,project:p?{id:p.uuid,name:p.name,format:Format.id,kind:identity().kind}:null,supported:{templates:['robot','bag','staff'],customProps:{tool:'create_prop',maxParts:128,maxMaterials:16,repeatParts:true,inspectionDetails:['summary','full'],promptLocation:'ChatGPT or Codex'},targets:['bedrock'],animations:['idle','walk','attack'],approvalRequired:true},undoAvailable:p?Undo.history[Undo.index-1]===lastEdits.get(p):false};
}
export function sceneStamp() {
  if(typeof Project==='undefined'||!Project)return 'no-project';
  if(Outliner.elements.length>512||Group.all.length>128||Texture.all.some(t=>t.width>4096||t.height>4096))throw new Error('The active project exceeds the safe snapshot limits. Open a smaller project before proposing changes.');
  // The full saved editor state catches manual edits even when the undo index returns to the same value.
  const snapshot=JSON.stringify(Codecs.project.compile({raw:true,backup:true,absolute_paths:false}));
  if(snapshot.length>16*1024*1024)throw new Error('The project snapshot exceeds 16 MB. Reduce embedded assets before using VoxelFlow.');
  return `${Project.uuid}:${Undo.index}:`+snapshot;
}
export function captureAsset():Asset {
  requireBedrock();
  if(Outliner.elements.length>512 || Group.all.length>128 || Texture.all.length>8 || BBAnimation.all.length>32) throw new Error('This project exceeds VoxelFlow’s safe inspection limits (512 elements, 128 bones, 8 textures, 32 animations).');
  const unsupported:string[]=[];
  if(AnimationController.all.length)unsupported.push('Native animation controllers are not copied; VoxelFlow exports its own three-state controller.');
  for(const el of Outliner.elements) if(!(el instanceof Cube))unsupported.push(`Unsupported ${el.type}: ${el.name}.`);
  const bones=Group.all.map(b=>({name:b.name,parent:b.parent instanceof Group?b.parent.name:undefined,pivot:vector(b.origin),rotation:vector(b.rotation)}));
  for(const b of Group.all) if(!b.export || b.bedrock_binding || b.reset) unsupported.push(`${b.name} has a disabled export flag, binding, or reset feature.`);
  const mapping:Partial<RigMapping>={};
  for(const g of Group.all as VFGroup[]) if((roles as readonly string[]).includes(g.voxelflow_role)) {
    if(mapping[g.voxelflow_role as Role])unsupported.push(`Two groups claim body part ${g.voxelflow_role}.`);
    mapping[g.voxelflow_role as Role]=g.name;
  }
  if(!Object.keys(mapping).length)Object.assign(mapping,detectRig(bones).mapping);
  const cubes:CubeData[]=Cube.all.map(c=>{
    if(!c.export)unsupported.push(`${c.name} is excluded from export.`);
    return {id:c.uuid,name:c.name,bone:c.parent instanceof Group?c.parent.name:'',from:vector(c.from),to:vector(c.to),origin:vector(c.origin),rotation:vector(c.rotation),inflate:c.inflate,boxUv:c.box_uv,faces:Object.fromEntries(faces.map(side=>{
      const face=c.faces[side]; if(face.material_name)unsupported.push(`${c.name} has a custom face material.`);
      return [side,{texture:typeof face.texture==='string'?face.texture:null,uv:[...face.uv],rotation:face.rotation}];
    })) as CubeData['faces']};
  });
  const textures=Texture.all.map(t=>{
    if(t.width>4096||t.height>4096)throw new Error('Texture exceeds the 4096 pixel safety limit.');
    if(t.layers_enabled)unsupported.push(`${t.name} has paint layers. Flatten a copy before VoxelFlow export.`);
    if((t.frameCount??1)>1)unsupported.push(`${t.name} is an animated texture.`);
    let png=new Uint8Array();try{if(!t.error)png=fromBase64(t.getBase64());}catch{}
    return {id:t.uuid,name:t.name,width:Project.texture_width,height:Project.texture_height,png};
  });
  let frameCount=0;
  const animations:Clip[]=BBAnimation.all.map(a=>{
    if(a.override || a.anim_time_update || a.blend_weight && a.blend_weight!=='1' || a.start_delay || a.loop_delay || a.loop==='hold')unsupported.push(`${a.name} uses custom timing, blending, override, or hold behavior.`);
    const tracks:Clip['tracks']=[];
    for(const [uuid,animator] of Object.entries(a.animators)) {
      if(!(animator instanceof BoneAnimator)) {if(animator.keyframes.length)unsupported.push(`${a.name} contains effects or non-bone animation.`);continue;}
      const bone=Group.all.find(g=>g.uuid===uuid)?.name??`missing_${uuid}`;
      for(const channel of ['rotation','position','scale'] as const) {
        const keyframes=(animator[channel] as BBKeyframe[]|undefined)??[];
        if(!keyframes.length)continue;
        frameCount+=keyframes.length;if(frameCount>12000)throw new Error('More than 12,000 keyframes; reduce the animation set before inspecting.');
        if(animator.muted[channel])unsupported.push(`${a.name}/${bone}/${channel} is muted.`);
        tracks.push({bone,channel,frames:keyframes.map(k=>{
          if(!['linear','step'].includes(k.interpolation)||k.data_points.length!==1)unsupported.push(`${a.name}/${bone} has advanced interpolation or multiple data points.`);
          const value=(['x','y','z'] as const).map(axis=>{const raw=k.get(axis);return typeof raw==='number'?raw:typeof raw==='string'&&/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(raw.trim())?Number(raw):NaN;}) as V3;
          return {time:k.time,value,interpolation:k.interpolation==='step'?'step' as const:'linear' as const};
        }).sort((a,b)=>a.time-b.time)});
      }
    }
    return {name:a.name,loop:a.loop==='loop',length:a.length,tracks};
  });
  return {...identity(),bones,cubes,textures,animations,mapping,unsupported:[...new Set(unsupported)]};
}
export function inspectProject(detail:'summary'|'full'='summary') {
  if(typeof Project==='undefined'||!Project)return {project:null,message:'Create a robot to begin.'};
  const a=captureAsset();
  return {detail,project:{id:Project.uuid,name:Project.name,format:Format.id,kind:a.kind},identifier:`${a.namespace}:${a.name}`,geometry:inspectGeometry(a,detail),materials:a.kind==='prop'?getPropMaterials():undefined,mapping:a.mapping,rigDetection:a.kind==='prop'?null:detectRig(a.bones),textures:a.textures.map(({png,...t})=>({...t,pngBytes:png.length})),animations:a.animations.map(c=>({name:c.name,loop:c.loop,length:c.length,tracks:c.tracks.length,keyframes:c.tracks.reduce((n,t)=>n+t.frames.length,0)})),unsupported:a.unsupported};
}
function finish(label:string,aspects:UndoAspects){const entry=Undo.finishEdit(`VoxelFlow: ${label}`,aspects);lastEdits.set(Project,entry);Canvas.updateAll();}
function writePixels(texture:VFTexture,pixels:Uint8Array,width=64,height=16) {
  texture.canvas.width=width;texture.canvas.height=height;texture.width=width;texture.height=height;
  texture.ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);
  texture.convertToInternal(texture.canvas.toDataURL('image/png')); texture.updateSource(texture.source);
}
function addAnimations(clips:Clip[],undoTracked:BBAnimation[],existing=new Map<string,BBAnimation>()) {
  const animations:BBAnimation[]=[];
  for(const clip of clips) {
    const data={name:clip.name,length:clip.length,loop:clip.loop?'loop' as const:'once' as const,snapping:1000};
    let a=existing.get(clip.name);
    if(a){
      // Keep native identity: replacing objects makes Undo restore the old clip
      // before removing the new one, causing Blockbench to suffix its name.
      for(const animator of Object.values(a.animators))for(const frame of animator.keyframes.slice())frame.remove();
      a.extend(data);
    }else{a=new BBAnimation(data).add(false);undoTracked.push(a);}
    animations.push(a);
    for(const track of clip.tracks) {
      const g=Group.all.find(g=>g.name===track.bone);if(!g)throw new Error(`Missing bone ${track.bone}.`);
      const animator=a.getBoneAnimator(g);if(!animator)throw new Error(`Cannot animate ${g.name} in this format.`);
      for(const frame of track.frames)animator.addKeyframe({channel:track.channel,time:frame.time,interpolation:frame.interpolation,data_points:[{x:frame.value[0],y:frame.value[1],z:frame.value[2]}]});
    }
  }
  return animations;
}
export function createRobot(spec:AssetSpec) {
  return createGenerated(generateRobot(spec),{kind:'humanoid'},spec.palette);
}
export function createProp(spec:PropSpec){return createGenerated(generateProp(spec),{kind:'prop',description:spec.description},undefined,spec.materials);}
function createGenerated(a:Asset,meta:Record<string,unknown>,palette?:Palette,propMaterials?:PropMaterial[]){
  const validation=validateAsset(a);if(!validation.ready)throw new Error('Generated plan failed validation: '+validation.findings.filter(f=>f.status==='failed').map(f=>f.message).join(' '));
  const previous=typeof Project!=='undefined'&&Project?Project:undefined;
  if(!newProject(Formats.bedrock))throw new Error('Blockbench could not create a Bedrock project.');
  const p=project();p.name=a.name;p.geometry_name=`${a.namespace}.${a.name}`;p.texture_width=a.textures[0].width;p.texture_height=a.textures[0].height;p.box_uv=false;p.voxelflow_meta=JSON.stringify({name:a.name,namespace:a.namespace,version:2,...meta});
  const elements:Cube[]=[],groups:Group[]=[],textures:Texture[]=[],animations:BBAnimation[]=[];
  const aspects={elements,groups,textures,animations,outliner:true,bitmap:true,uv_mode:true};
  Undo.initEdit(aspects);
  try {
    const texture=new Texture({name:`${a.name}.png`}) as VFTexture;
    if(palette)texture.voxelflow_palette=JSON.stringify(palette);
    if(propMaterials)texture.voxelflow_prop_palette=JSON.stringify(propMaterials);
    texture.add(false);textures.push(texture);writePixels(texture,propMaterials?propAtlasPixels(propMaterials):palettePixels(palette!),p.texture_width,p.texture_height);
    const byName=new Map<string,Group>();
    for(const b of a.bones){const g=new Group({name:b.name,origin:b.pivot,rotation:b.rotation}) as VFGroup;g.voxelflow_role=a.kind==='prop'?'':b.name;g.addTo(b.parent?byName.get(b.parent)!:'root').init();groups.push(g);byName.set(b.name,g);}
    for(const c of a.cubes){const cube=new Cube({name:c.name,from:c.from,to:c.to,origin:c.origin,rotation:c.rotation,box_uv:false,autouv:0});for(const side of faces)cube.faces[side].extend({...c.faces[side],texture:texture.uuid});cube.addTo(byName.get(c.bone)!).init();elements.push(cube);}
    addAnimations(a.animations,animations);finish(a.kind==='prop'?'Create prop':'Create robot',aspects);texture.select();
    const min=[0,1,2].map(i=>Math.min(...a.cubes.map(c=>c.from[i]))),max=[0,1,2].map(i=>Math.max(...a.cubes.map(c=>c.to[i]))),center=min.map((v,i)=>(v+max[i])/2),span=Math.max(8,...max.map((v,i)=>v-min[i]));
    if(Preview.selected){Preview.selected.controls.target.set(...center as V3);Preview.selected.camera.position.set(center[0]+span*1.1,center[1]+span*.25,center[2]-span*1.5);Preview.selected.controls.update();}
    return {projectId:p.uuid,kind:a.kind??'humanoid',cubes:elements.length,bones:groups.length,animations:animations.map(a=>a.name),message:'Created in a new tab. The original project is preserved.'};
  }catch(error){Undo.cancelEdit(true);if(previous)previous.select();throw error;}
}
export function applyPropMaterials(updates:PropMaterial[]){
  requireBedrock();const t=Texture.all.find(t=>(t as VFTexture).voxelflow_prop_palette) as VFTexture|undefined;
  if(!t||!isPropProject())throw new Error('Open a VoxelFlow prop to edit its named materials.');
  if(t.layers_enabled||t.width!==128||t.height!==16)throw new Error('The prop texture was resized or has layers. Preserve it and recolor in Paint mode.');
  const result=recolorProp(new Uint8Array(t.ctx.getImageData(0,0,128,16).data),getPropMaterials(),updates);
  const aspects={textures:[t],bitmap:true};Undo.initEdit(aspects);
  try{writePixels(t,result.pixels,128,16);t.voxelflow_prop_palette=JSON.stringify(result.materials);finish('Recolor prop',aspects);return {materials:result.materials,preservedPaintedPixels:result.preserved};}catch(error){Undo.cancelEdit(true);throw error;}
}
export function applyMaterials(palette:Palette) {
  requireBedrock();const t=Texture.all.find(t=>(t as VFTexture).voxelflow_palette) as VFTexture|undefined;
  if(!t)throw new Error('This model has no VoxelFlow palette. Paint the imported texture directly in Blockbench.');
  if(t.layers_enabled||t.width!==64||t.height!==16)throw new Error('The palette was resized or has layers. Preserve it and recolor manually in Paint mode.');
  const pixels=new Uint8Array(t.ctx.getImageData(0,0,64,16).data);const result=recolorPreservingPaint(pixels,JSON.parse(t.voxelflow_palette),palette);
  const aspects={textures:[t],bitmap:true};Undo.initEdit(aspects);
  try{writePixels(t,result.pixels);t.voxelflow_palette=JSON.stringify(palette);finish('Recolor palette',aspects);return {preservedPaintedPixels:result.preserved,changedTexture:t.name};}catch(error){Undo.cancelEdit(true);throw error;}
}
export function mapRig(mapping?:RigMapping) {
  if(isPropProject())throw new Error('This is a static prop. Its named groups do not need a humanoid rig.');
  const a=captureAsset(), detected=detectRig(a.bones);const next=mapping??detected.mapping;
  const check=validateAsset({...a,mapping:next},false);const errors=check.findings.filter(f=>f.stage==='rig'&&f.status==='failed');
  if(errors.length)throw new Error(errors.map(f=>f.message).join(' ')+' Use Map body parts, then adjust the imported joints if needed.');
  const aspects={groups:Group.all.slice()};Undo.initEdit(aspects);
  try {for(const g of Group.all as VFGroup[])g.voxelflow_role=roles.find(r=>next[r]===g.name)??'';finish('Map humanoid rig',aspects);return {mapping:next,findings:check.findings.filter(f=>f.stage==='rig')};}catch(error){Undo.cancelEdit(true);throw error;}
}
export function animate(options:unknown) {
  if(isPropProject())throw new Error('Idle, walk and punch are humanoid presets. This prop is a static object; use the native timeline for custom animation.');
  const a=captureAsset(), validation=validateAsset(a,false);const failures=validation.findings.filter(f=>['rig','geometry'].includes(f.stage)&&f.status==='failed');
  if(failures.length)throw new Error(failures[0].message);
  const clips=generateAnimations(a.name,a.namespace,a.mapping as RigMapping,options),names=new Set(clips.map(c=>c.name));
  const before=BBAnimation.all.filter(a=>names.has(a.name));
  // Include empty bone channels in the before snapshot. Native Undo merges
  // animator maps; it needs an explicit empty channel to clear newly added tracks.
  for(const animation of before)for(const group of Group.all)animation.getBoneAnimator(group);
  const previousLengths=new Map(before.map(a=>[a.uuid,a.length]));
  const aspects={animations:before.slice()};Undo.initEdit(aspects);
  try{Timeline.pause();const added=addAnimations(clips,aspects.animations,new Map(before.map(a=>[a.name,a])));finish('Generate animations',aspects);return {animations:added.map(a=>a.name),replaced:before.length};}catch(error){
    Undo.cancelEdit(true);
    // A cancelled transaction is not in Undo.history, so restore its durations
    // here after native rollback has finished restoring keyframes.
    for(const [uuid,length] of previousLengths)BBAnimation.all.find(a=>a.uuid===uuid)?.setLength(length);
    throw error;
  }
}
export function preview(clip:string,playing:boolean) {
  requireBedrock();const id=identity();const a=BBAnimation.all.find(a=>a.name===`animation.${id.namespace}.${id.name}.${clip}`);if(!a)throw new Error(`Generate ${clip} first.`);
  Timeline.pause();Modes.options.animate.select();a.select();Timeline.setTime(0);Animator.preview();if(playing)Timeline.start();return {animation:a.name,playing,keyframes:Object.values(a.animators).reduce((n,t)=>n+t.keyframes.length,0)};
}
export function undoLast() {
  const p=requireBedrock();if(!lastEdits.get(p)||Undo.history[Undo.index-1]!==lastEdits.get(p))throw new Error('An artist edit or selection follows the last VoxelFlow change. Use Blockbench’s Undo history to choose what to revert.');
  const action=Undo.history[Undo.index-1].action;Undo.undo();lastEdits.delete(p);return {undone:action};
}
export function exportLive() {
  const a=captureAsset();const files=exportPackage(a,[crypto.randomUUID(),crypto.randomUUID()],Codecs.project.compile({bitmaps:true,absolute_paths:false}) as string);const zipped=zipPackage(files);let savedPath:string|undefined;
  // Desktop Blockbench's native binary writer and save dialog are synchronous in 5.2.2.
  Blockbench.export({type:'VoxelFlow Bedrock assets',extensions:['zip'],name:`${a.name}_bedrock_assets`,savetype:'binary',content:zipped.buffer.slice(zipped.byteOffset,zipped.byteOffset+zipped.byteLength) as ArrayBuffer},(path:string)=>{savedPath=path;});
  if(!savedPath)return {cancelled:true};
  return {saved:true,path:savedPath,files:Object.keys(files),bytes:zipped.length,packageValidation:validatePackage(files),engineVerified:false};
}
