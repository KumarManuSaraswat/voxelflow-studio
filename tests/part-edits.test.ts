import {describe,it,expect} from 'vitest';
import {planPartEdits} from '../packages/core/src/part-edits';
import {generateProp,propPreset} from '../packages/core/src/props';
import {inspectGeometry} from '../packages/core/src/inspection';
import {generateRobot} from '../packages/core/src/modeling';
import {parseTool} from '../packages/core/src/schema';
const setup=()=>{const spec=propPreset('bag'),asset=generateProp(spec);asset.cubes.forEach(c=>c.id=crypto.randomUUID());return {asset,materials:spec.materials};};
describe('individual part edit planning',()=>{
  it('moves only the selected cube and pivot without modifying source geometry',()=>{
    const {asset}=setup(),before=structuredClone(asset),cube=asset.cubes[0];
    const [plan]=planPartEdits(asset.cubes,[{part_id:cube.id,move:[2,-1,3]}]);
    expect(plan.from).toEqual(cube.from.map((n,i)=>n+[2,-1,3][i]));expect(plan.origin).toEqual(cube.origin.map((n,i)=>n+[2,-1,3][i]));
    expect(plan.faceUpdates).toEqual({});expect(asset).toEqual(before);
  });
  it('sets absolute corners, pivot and rotation without altering bones or clips',()=>{
    const asset=generateRobot({});asset.cubes.forEach(c=>c.id=crypto.randomUUID());const before=structuredClone(asset);
    const [plan]=planPartEdits(asset.cubes,[{part_id:asset.cubes[0].id,from:[-2,1,-2],to:[2,5,2],rotation:[0,20,0],pivot:[0,1,0]}]);
    expect(plan).toMatchObject({from:[-2,1,-2],to:[2,5,2],rotation:[0,20,0],origin:[0,1,0]});expect(asset).toEqual(before);
    const full=inspectGeometry(asset,'full');expect(full.parts?.[0].id).toBe(asset.cubes[0].id);
  });
  it('preserves the existing pivot when resizing',()=>{
    const {asset}=setup(),cube=asset.cubes[0];expect(planPartEdits(asset.cubes,[{part_id:cube.id,from:[-6,0,-3],to:[6,15,3]}])[0].origin).toEqual(cube.origin);
  });
  it('allows moving box-UV cubes but refuses size changes that would remap texture',()=>{
    const {asset}=setup(),cube=asset.cubes[0];cube.boxUv=true;
    expect(planPartEdits(asset.cubes,[{part_id:cube.id,move:[1,0,0]}])[0].faceUpdates).toEqual({});
    expect(()=>planPartEdits(asset.cubes,[{part_id:cube.id,from:cube.from,to:cube.to.map(n=>n+1)}])).toThrow('box-UV');
  });
  it('assigns only visible faces to an existing material and leaves pixels untouched',()=>{
    const {asset,materials}=setup(),cube=asset.cubes[0];cube.faces.north.texture=null;const before=structuredClone(asset);
    const [plan]=planPartEdits(asset.cubes,[{part_id:cube.id,material:'brass'}],materials,'atlas-uuid');
    expect(plan.faceUpdates.north).toBeUndefined();expect(plan.faceUpdates.south).toMatchObject({texture:'atlas-uuid',uv:[24,0,32,16],rotation:0});expect(asset).toEqual(before);
  });
  it.each(['missing','duplicate_id','duplicate_target','bounds','inverted','nan','empty','partial','mixed','material','boxuv','hidden','too_many'])('rejects %s before mutation',problem=>{
    const {asset,materials}=setup(),cube=asset.cubes[0];let edits:any[]=[{part_id:cube.id,move:[1,0,0]}];
    if(problem==='missing')edits[0].part_id=crypto.randomUUID();
    if(problem==='duplicate_id')asset.cubes[1].id=cube.id;
    if(problem==='duplicate_target')edits.push({...edits[0]});
    if(problem==='bounds')edits[0].move=[128,0,0];
    if(problem==='inverted')edits=[{part_id:cube.id,from:[0,0,0],to:[0,1,1]}];
    if(problem==='nan')edits[0].move=[NaN,0,0];
    if(problem==='empty')edits=[{part_id:cube.id}];
    if(problem==='partial')edits=[{part_id:cube.id,from:[0,0,0]}];
    if(problem==='mixed')edits[0].pivot=[0,0,0];
    if(problem==='material')edits=[{part_id:cube.id,material:'missing'}];
    if(problem==='boxuv'){cube.boxUv=true;edits=[{part_id:cube.id,material:'brass'}];}
    if(problem==='hidden'){Object.values(cube.faces).forEach(f=>f.texture=null);edits=[{part_id:cube.id,material:'brass'}];}
    if(problem==='too_many')edits=Array.from({length:129},()=>({part_id:crypto.randomUUID(),move:[1,0,0]}));
    const before=structuredClone(asset);expect(()=>planPartEdits(asset.cubes,edits,materials,'atlas')).toThrow();expect(asset).toEqual(before);
  });
  it('requires the inspected project UUID and rejects unknown parameters',()=>{
    const {asset}=setup(),args={request_id:crypto.randomUUID(),project_id:crypto.randomUUID(),edits:[{part_id:asset.cubes[0].id,rotation:[0,0,10]}]};
    expect(parseTool('edit_parts',args).args).toEqual(args);
    const native={...args,project_id:'900bcb51-77ee-3b58-c59c-29b8fbc3b5a8',edits:[{part_id:'6e07f35a-c923-290d-5026-8ecf7a36e44d',move:[0,2,0]}]};
    expect(parseTool('edit_parts',native).args).toEqual(native);
    expect(()=>parseTool('edit_parts',{...args,project_id:'guess'})).toThrow();
    expect(()=>parseTool('edit_parts',{...args,script:'run()'})).toThrow();
  });
});
