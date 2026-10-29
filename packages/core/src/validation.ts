import { Asset, Finding, ValidationReport, roles, safeName, V3 } from './schema';
import { parents } from './modeling';

const finite = (v: number[]) => v.length === 3 && v.every(Number.isFinite);
const different = (a: V3, b: V3) => a.some((v,i) => Math.abs(v-b[i]) > 0.001);
export function report(findings: Finding[]): ValidationReport {
  const counts = { passed: 0, warning: 0, failed: 0 }; findings.forEach(f=> counts[f.status]++);
  return { ready:counts.failed===0, counts, findings, engineVerified:false };
}
export function validateAsset(asset: Asset, requireClips = true): ValidationReport {
  const prop=asset.kind==='prop';
  const f: Finding[] = [];
  const fail = (stage: Finding['stage'], code:string, message:string, correction:string) => f.push({stage,status:'failed',code,message,correction});
  const warn = (stage: Finding['stage'], code:string, message:string, correction:string) => f.push({stage,status:'warning',code,message,correction});
  const pass = (stage: Finding['stage'], message:string) => f.push({stage,status:'passed',code:`${stage}.ok`,message});
  if (!asset.cubes.length) fail('geometry','geometry.empty','The model has no cubes.','Create a robot or open a supported cube model.');
  if (asset.cubes.length > 512 || asset.bones.length > 128) fail('geometry','geometry.limit','This model exceeds the 512-cube / 128-bone safety limit.','Reduce the model size before using VoxelFlow.');
  asset.unsupported.forEach(s=>fail('geometry','geometry.unsupported',s,'Convert this feature to supported cubes and numeric, linear keyframes, or use the native Blockbench exporter.'));
  const names = asset.bones.map(b=>b.name), boneNames = new Set(names);
  for (const bone of asset.bones) {
    if (names.filter(n=>n===bone.name).length>1) fail('rig','rig.duplicate',`Two bones share the name ${bone.name}.`,'Give every bone a unique name.');
    if (!/^[a-zA-Z_][a-zA-Z0-9_.-]{0,127}$/.test(bone.name)) fail('rig','rig.name',`Bone name ${bone.name} is not supported.`,'Use letters, numbers, underscores, periods, or hyphens.');
    if (!finite(bone.pivot)||!finite(bone.rotation)) fail('rig','rig.pivot',`The ${bone.name} joint has invalid coordinates.`,'Reset its pivot and rotation to finite numbers.');
    if (bone.parent && !boneNames.has(bone.parent)) fail('rig','rig.parent',`${bone.name} connects to a missing bone.`,'Choose an existing parent in the Outliner.');
    const seen = new Set<string>([bone.name]); let p=bone.parent;
    while(p && boneNames.has(p)) { if(seen.has(p)) {fail('rig','rig.cycle',`The hierarchy loops back into ${bone.name}.`,'Move the bone outside its own children.');break;} seen.add(p);p=asset.bones.find(b=>b.name===p)?.parent; }
  }
  if(!prop){
  const mapped = Object.values(asset.mapping);
  if (new Set(mapped).size !== mapped.length) fail('rig','rig.mapping_duplicate','One bone is assigned to multiple body parts.','Map each body part to a different bone.');
  for (const role of roles) {
    const name = asset.mapping[role], b = asset.bones.find(b=>b.name===name);
    if(!b) {fail('rig','rig.mapping_missing',`The ${role.replaceAll('_',' ')} has not been mapped.`,'Use Rig → Map body parts.');continue;}
    const expected = parents[role] && asset.mapping[parents[role]!];
    if(expected && b.parent !== expected) fail('rig','rig.hierarchy',`${role.replaceAll('_',' ')} is not attached to ${parents[role]?.replaceAll('_',' ')}.`,'Connect these bones in the Outliner; mapping alone does not move joints.');
    if (role.includes('lower')) {
      const parent=asset.bones.find(x=>x.name===expected);
      if(parent && b.pivot[1] >= parent.pivot[1]-0.01) fail('rig','rig.joint_position',`The ${role.replaceAll('_',' ')} joint is not below its upper joint.`,'Place the elbow at the arm bend or the knee at the leg bend.');
    }
  }
  for(const limb of ['upper_arm','upper_leg'] as const) {
    const l=asset.bones.find(b=>b.name===asset.mapping[`left_${limb}`]), r=asset.bones.find(b=>b.name===asset.mapping[`right_${limb}`]);
    if(l && r && l.pivot[0]<=r.pivot[0]) fail('rig','rig.sides',`The left and right ${limb.replaceAll('_',' ')} joints are reversed or overlap.`,'Left is the character’s left (+X in Blockbench). Check the mapping.');
  }
  }
  const textures = new Map(asset.textures.map(t=>[t.id,t]));
  if(asset.textures.length !== 1) fail('texture','texture.count','This export supports one texture atlas.','Combine textures into one atlas before exporting.');
  for(const t of asset.textures) {
    if(t.width<1 || t.height<1 || t.width>4096 || t.height>4096 || !Number.isInteger(t.width)||!Number.isInteger(t.height)) fail('texture','texture.size','The texture dimensions are invalid or too large.','Use a texture up to 4096 × 4096 pixels.');
    if(t.png.length<24 || [137,80,78,71,13,10,26,10].some((b,i)=>t.png[i]!==b)) fail('texture','texture.file',`Texture ${t.name} has no readable PNG.`,'Load or create the texture before exporting.');
    else { const view=new DataView(t.png.buffer,t.png.byteOffset,t.png.byteLength); if(view.getUint32(16)!==t.width||view.getUint32(20)!==t.height) fail('texture','texture.dimensions','The PNG dimensions do not match the UV dimensions.','Use a single, non-animated texture with matching project UV dimensions.'); }
  }
  for(const cube of asset.cubes) {
    if(!finite(cube.from)||!finite(cube.to)||!finite(cube.origin)||!finite(cube.rotation)||!Number.isFinite(cube.inflate)) fail('geometry','geometry.nonfinite',`${cube.name} has invalid dimensions or transforms.`,'Reset the cube to finite numeric coordinates.');
    if(cube.to.some((n,i)=> n-cube.from[i]<=0 || n-cube.from[i]+2*cube.inflate<=0)) fail('geometry','geometry.dimension',`${cube.name} has an empty or inverted dimension.`,'Give the cube positive width, height, and depth.');
    if([...cube.from,...cube.to].some(v=>Math.abs(v)>256)) fail('geometry','geometry.scale',`${cube.name} is outside the supported 256-unit bounds.`,'Scale and center the model for a game entity.');
    if(!boneNames.has(cube.bone)) fail('rig','rig.loose_cube',`${cube.name} is not inside a bone.`,'Move the cube under a body-part group.');
    if(cube.boxUv) fail('texture','texture.box_uv',`${cube.name} uses box UVs.`,'Switch the cube to per-face UV before VoxelFlow export.');
    for(const [side,face] of Object.entries(cube.faces)) {
      const t=face.texture && textures.get(face.texture);
      if(!t) fail('texture','texture.reference',`${cube.name}: ${side} has no valid texture.`,'Assign the atlas to this face.');
      if(face.uv.length!==4 || !face.uv.every(Number.isFinite) || (t && face.uv.some((n,i)=>n<0 || n>(i%2?t.height:t.width)))) fail('texture','texture.uv',`${cube.name}: ${side} maps outside the texture.`,'Move the face UV rectangle inside the atlas.');
      if(![0,90,180,270].includes(face.rotation)) fail('texture','texture.rotation',`${cube.name}: ${side} has unsupported UV rotation.`,'Use a multiple of 90 degrees.');
      if(face.uv[0]===face.uv[2]||face.uv[1]===face.uv[3]) fail('texture','texture.empty_uv',`${cube.name}: ${side} has a zero-area UV.`,'Expand its UV rectangle to cover pixels.');
    }
  }
  if(prop&&asset.animations.length)fail('animation','animation.prop_static','This prop export currently supports static objects.','Keep a static copy for VoxelFlow export, or use native Blockbench export for custom prop animations.');
  if(requireClips&&!prop) for(const c of ['idle','walk','attack']) if(!asset.animations.some(a=>a.name===`animation.${asset.namespace}.${asset.name}.${c}`)) fail('animation','animation.missing',`The ${c} animation is missing.`,'Generate the three core animations.');
  const animNames=new Set<string>();
  for(const clip of asset.animations) {
    if(animNames.has(clip.name)) fail('animation','animation.duplicate',`Animation ${clip.name} is duplicated.`,'Give each clip a unique name.'); animNames.add(clip.name);
    if(!/^animation\.[a-z0-9_.]+$/.test(clip.name)) fail('animation','animation.name',`Animation ${clip.name} has an invalid identifier.`,'Use animation.namespace.name.clip with lowercase letters and underscores.');
    if(!Number.isFinite(clip.length)||clip.length<=0||clip.length>120) fail('animation','animation.length',`${clip.name} has an invalid duration.`,'Set its length between 0 and 120 seconds.');
    const kind=clip.name.split('.').at(-1);
    if((kind==='idle'||kind==='walk')&&!clip.loop || kind==='attack'&&clip.loop) fail('animation','animation.loop',`${kind} has the wrong looping setting.`,'Loop idle and walk; play attack once.');
    let moving=false; const keys = new Set<string>();
    for(const track of clip.tracks) {
      if(!boneNames.has(track.bone)) fail('animation','animation.bone',`${clip.name} animates missing bone ${track.bone}.`,'Map the bone and regenerate the animation.');
      const key=`${track.bone}/${track.channel}`;
      if(keys.has(key)) fail('animation','animation.track_duplicate',`${clip.name} contains two ${key} tracks.`,'Combine the duplicate tracks.'); keys.add(key);
      if(!track.frames.length) fail('animation','animation.empty_track',`${clip.name} has an empty track.`,'Add keyframes or remove the empty track.');
      let previous=-1;
      for(const frame of track.frames) {
        if(!Number.isFinite(frame.time)||frame.time<0||frame.time>clip.length+0.00001||frame.time<=previous||!finite(frame.value)) fail('animation','animation.keyframe',`${clip.name} has invalid or duplicate keyframes.`,'Use increasing numeric times within the clip and finite transforms.');
        previous=frame.time;
        if(track.frames[0] && different(frame.value,track.frames[0].value)) moving=true;
      }
      if(clip.loop && track.frames.length) {
        const first=track.frames[0], last=track.frames.at(-1)!;
        if(first.time!==0||Math.abs(last.time-clip.length)>0.00001||different(first.value,last.value)) fail('animation','animation.seam',`${clip.name}: ${track.bone} jumps at the loop boundary.`,'Match the first and last keyframes at 0 and the clip end.');
      }
    }
    if(!moving) fail('animation','animation.ineffective',`${clip.name} has no changing transforms.`,'Add at least two distinct poses.');
  }
  if(!safeName.safeParse(asset.name).success||!safeName.safeParse(asset.namespace).success) fail('export','export.identifier','The entity name or namespace is invalid.','Use lowercase names beginning with a letter.');
  for(const stage of ['geometry','rig','texture','animation','export'] as const) if(!f.some(x=>x.stage===stage && x.status==='failed')) pass(stage,{geometry:`${asset.cubes.length} editable cubes have valid dimensions.`,rig:prop?`${asset.bones.length} object groups form a valid hierarchy; no humanoid rig is required.`:`${asset.bones.length} bones form a valid mapped humanoid.`,texture:'All faces reference the PNG atlas and valid UVs.',animation:prop?'Static prop: character animations are not required.':`${asset.animations.length} clips contain effective keyframes and valid bone references.`,export:'Names and supported features are consistent with the Bedrock asset exporter.'}[stage]);
  warn('export','export.engine_unverified','Bedrock assets are structurally checked; Minecraft runtime has not been tested.','Integrate the resource assets with a behavior entity and test in Minecraft.');
  return report(f);
}
