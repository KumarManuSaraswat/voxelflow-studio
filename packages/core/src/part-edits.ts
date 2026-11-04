import {CubeData,PartEditsSchema,PropMaterial,V3} from './schema';

/** Pure preflight: compute the complete batch before any native editor mutation. */
export function planPartEdits(cubes:CubeData[],input:unknown,materials:PropMaterial[]=[],atlasId?:string) {
  const edits=PartEditsSchema.parse(input);
  return edits.map(edit=>{
    const matches=cubes.filter(c=>c.id===edit.part_id);
    if(matches.length!==1)throw Error(`Part ${edit.part_id} is missing or ambiguous. Inspect the current project again.`);
    const before=matches[0];
    const shift=(v:V3):V3=>v.map((n,i)=>n+(edit.move?.[i]??0)) as V3;
    const from=edit.move?shift(before.from):[...(edit.from??before.from)] as V3;
    const to=edit.move?shift(before.to):[...(edit.to??before.to)] as V3;
    const origin=edit.move?shift(before.origin):[...(edit.pivot??before.origin)] as V3;
    const rotation=[...(edit.rotation??before.rotation)] as V3;
    if([from,to,origin].some(v=>v.some(n=>!Number.isFinite(n)||n < -128||n > 128)))throw Error(`${before.name}: corners and pivot must stay within -128..128.`);
    if(!to.every((n,i)=>n>from[i]))throw Error(`${before.name}: every dimension must be positive.`);
    if(before.boxUv&&to.some((n,i)=>Math.abs((n-from[i])-(before.to[i]-before.from[i]))>1e-9))throw Error(`${before.name}: resizing box-UV cubes would change their texture mapping. Convert a copy to per-face UVs in Blockbench first.`);
    if(rotation.some(n=>!Number.isFinite(n)||n < -180||n > 180))throw Error(`${before.name}: rotation must stay within -180..180.`);
    const faceUpdates:Partial<CubeData['faces']>={};
    if(edit.material!==undefined){
      const index=materials.findIndex(m=>m.name===edit.material);
      if(index<0||!atlasId)throw Error('Assign an existing named material from a VoxelFlow prop. Inspect materials first.');
      if(before.boxUv)throw Error(`${before.name}: material assignment requires per-face UVs. Convert a copy to per-face UVs in Blockbench first.`);
      for(const side of Object.keys(before.faces) as (keyof CubeData['faces'])[]){
        const face=before.faces[side];
        if(face.texture!==null)faceUpdates[side]={...face,texture:atlasId,uv:[index*8,0,index*8+8,16],rotation:0};
      }
      if(!Object.keys(faceUpdates).length)throw Error(`${before.name}: all faces are disabled; enable the intended faces in Blockbench first.`);
    }
    const changes=[...(edit.move?[`move ${edit.move.join(', ')}`]:[]),...(edit.from?[`bounds ${from.join(', ')} → ${to.join(', ')}`]:[]),...(edit.rotation?[`rotation ${rotation.join(', ')}`]:[]),...(edit.pivot?[`pivot ${origin.join(', ')}`]:[]),...(edit.material?[`material ${edit.material} (replace visible-face UVs)`]:[])];
    return {id:before.id,name:before.name,from,to,origin,rotation,faceUpdates,changes};
  });
}
