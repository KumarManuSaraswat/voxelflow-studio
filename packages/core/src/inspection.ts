import { Asset } from './schema';

/** Keep routine chat inspection small without changing the captured scene. */
export function inspectGeometry(asset:Asset,detail:'summary'|'full'='summary') {
  if(detail==='full')return {
    cubes:asset.cubes.length,bones:asset.bones,
    ...(asset.kind==='prop'?{parts:asset.cubes.map(c=>({name:c.name,group:c.bone,from:c.from,to:c.to,pivot:c.origin,rotation:c.rotation,uv:c.faces.north.uv}))}:{})
  };
  const counts=new Map<string,number>(asset.bones.map(b=>[b.name,0]));
  for(const cube of asset.cubes)counts.set(cube.bone,(counts.get(cube.bone)??0)+1);
  return {cubes:asset.cubes.length,bones:asset.bones.length,groups:[...counts].map(([name,cubes])=>({name,cubes}))};
}
