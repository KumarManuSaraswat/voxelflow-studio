import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {generateProp,propPreset} from '../packages/core/src/props';
import {editParts,describePartEdits,undoLast,inspectProject} from '../packages/blockbench-plugin/src/editor/adapter';
import {faces} from '../packages/core/src/schema';

// Native API doubles exercise the real adapter and transaction boundaries.
// This is not a substitute for a live Blockbench smoke test.
class TestGroup {static all:TestGroup[]=[];name='root';parent:TestGroup|'root'='root';origin=[0,0,0];rotation=[0,0,0];export=true;locked=false;}
class TestCube {
  static all:TestCube[]=[];uuid=crypto.randomUUID();name='';type='cube';from:number[]=[];to:number[]=[];origin:number[]=[];rotation:number[]=[];
  parent:TestGroup|'root'='root';export=true;locked=false;inflate=0;box_uv=false;autouv=0;fail=false;faces:any={};
  extend(patch:any){if(this.fail){this.fail=false;throw Error('Native edit failed');}for(const k of ['from','to','origin','rotation'])if(patch[k])this[k as 'from']=[...patch[k]];return this;}
  snapshot(){return {uuid:this.uuid,name:this.name,from:[...this.from],to:[...this.to],origin:[...this.origin],rotation:[...this.rotation],faces:Object.fromEntries(faces.map(side=>[side,{texture:this.faces[side].texture,uv:[...this.faces[side].uv],rotation:this.faces[side].rotation}]))};}
  restore(saved:any){this.extend(saved);for(const side of faces)this.faces[side].extend(saved.faces[side]);}
}
let project:any,texture:any,undo:any,before:any[],newProject:any,animations:any;
beforeEach(()=>{
  const spec=propPreset('bag'),asset=generateProp(spec);const group=new TestGroup();TestGroup.all=[group];
  TestCube.all=asset.cubes.slice(0,2).map(c=>{const cube=new TestCube();Object.assign(cube,{name:c.name,from:[...c.from],to:[...c.to],origin:[...c.origin],rotation:[...c.rotation],parent:group});for(const side of faces)cube.faces[side]={...structuredClone(c.faces[side]),texture:'atlas',extend(data:any){Object.assign(this,structuredClone(data));}};return cube;});
  project={uuid:crypto.randomUUID(),name:'artist_bag',texture_width:128,texture_height:16,voxelflow_meta:JSON.stringify({name:'artist_bag',kind:'prop'})};
  texture={uuid:'atlas',name:'painted',width:128,height:16,voxelflow_prop_palette:JSON.stringify(spec.materials),getBase64:()=>Buffer.from(asset.textures[0].png).toString('base64'),pixels:new Uint8Array([1,2,3,255])};
  before=[];undo={history:[] as any[],index:0,initEdit:vi.fn((aspects:any)=>{before=aspects.elements.map((cube:TestCube)=>({cube,saved:cube.snapshot()}));}),finishEdit:vi.fn((action:string,aspects:any)=>{const entry={action,before,aspects};undo.history.push(entry);undo.index++;return entry;}),cancelEdit:vi.fn(()=>before.forEach(({cube,saved})=>cube.restore(saved))),undo:vi.fn(()=>{undo.history[--undo.index].before.forEach(({cube,saved}:any)=>cube.restore(saved));})};
  newProject=vi.fn();animations=[];
  for(const [name,value] of Object.entries({Project:project,Format:{id:'bedrock'},Cube:TestCube,Group:TestGroup,Outliner:{elements:TestCube.all},Texture:{all:[texture]},BBAnimation:{all:animations},AnimationController:{all:[]},Undo:undo,Canvas:{updateAll:vi.fn()},newProject}))vi.stubGlobal(name,value);
});
afterEach(()=>vi.unstubAllGlobals());
it('updates the same cube in the same tab, preserving all other state, and undoes the batch',()=>{
  const [cube,other]=TestCube.all,original=cube.snapshot(),otherBefore=other.snapshot(),pixels=texture.pixels.slice(),parent=cube.parent;
  const edits=[{part_id:cube.uuid,move:[2,0,0]}];
  expect(describePartEdits(project.uuid,edits)).toContain(cube.name);expect(undo.initEdit).not.toHaveBeenCalled();
  const result=editParts(project.uuid,edits);
  expect(result.projectId).toBe(project.uuid);expect(TestCube.all[0]).toBe(cube);expect(cube.parent).toBe(parent);expect(cube.uuid).toBe(original.uuid);
  expect(cube.from[0]).toBe(original.from[0]+2);expect(cube.snapshot().faces).toEqual(original.faces);expect(other.snapshot()).toEqual(otherBefore);
  expect(texture.pixels).toEqual(pixels);expect(animations).toEqual([]);expect(newProject).not.toHaveBeenCalled();
  expect(undo.initEdit).toHaveBeenCalledWith({elements:[cube],mirror_modeling:false});expect(undo.finishEdit).toHaveBeenCalledTimes(1);
  undoLast();expect(cube.snapshot()).toEqual(original);
});
it('rejects a whole batch before Undo if a later target is invalid',()=>{
  const cube=TestCube.all[0],saved=cube.snapshot();
  expect(()=>editParts(project.uuid,[{part_id:cube.uuid,move:[1,0,0]},{part_id:crypto.randomUUID(),move:[1,0,0]}])).toThrow('missing');
  expect(undo.initEdit).not.toHaveBeenCalled();expect(cube.snapshot()).toEqual(saved);
});
it('rolls back the first edit when the second native edit fails',()=>{
  const saved=TestCube.all.map(c=>c.snapshot());TestCube.all[1].fail=true;
  expect(()=>editParts(project.uuid,TestCube.all.map(c=>({part_id:c.uuid,move:[1,0,0]})))).toThrow('Native edit failed');
  expect(undo.cancelEdit).toHaveBeenCalledWith(true);expect(undo.finishEdit).not.toHaveBeenCalled();expect(TestCube.all.map(c=>c.snapshot())).toEqual(saved);
});
it('preserves painted pixels and hidden faces while changing the selected material, and restores UVs on Undo',()=>{
  const cube=TestCube.all[0];cube.faces.north.texture=null;const saved=cube.snapshot(),pixels=texture.pixels.slice();
  editParts(project.uuid,[{part_id:cube.uuid,material:'brass'}]);
  expect(cube.faces.north.texture).toBeNull();expect(cube.faces.south.uv).toEqual([24,0,32,16]);expect(texture.pixels).toEqual(pixels);
  undoLast();expect(cube.snapshot()).toEqual(saved);
});
it.each(['project','format','cube_lock','group_lock','project_lock','atlas'])('refuses unsafe %s targets',problem=>{
  const cube=TestCube.all[0];const edits:any[]=[{part_id:cube.uuid,move:[1,0,0]}];let projectId=project.uuid;
  if(problem==='project')projectId=crypto.randomUUID();
  if(problem==='format')vi.stubGlobal('Format',{id:'java_block'});
  if(problem==='cube_lock')cube.locked=true;
  if(problem==='group_lock')TestGroup.all[0].locked=true;
  if(problem==='project_lock')project.locked=true;
  if(problem==='atlas'){texture.width=64;edits[0]={part_id:cube.uuid,material:'brass'};}
  expect(()=>editParts(projectId,edits)).toThrow();expect(undo.initEdit).not.toHaveBeenCalled();
});
it('exposes real IDs in full inspection and keeps summary material data',()=>{
  const full=inspectProject('full'),summary=inspectProject();
  expect(full.project?.id).toBe(project.uuid);expect(full.geometry?.parts?.[0].id).toBe(TestCube.all[0].uuid);
  expect(summary.materials).toEqual(propPreset('bag').materials);expect(summary.geometry).not.toHaveProperty('parts');
});
it('refuses to undo a later unrelated artist edit',()=>{
  editParts(project.uuid,[{part_id:TestCube.all[0].uuid,move:[1,0,0]}]);undo.history.push({action:'Artist edit'});undo.index++;
  expect(()=>undoLast()).toThrow('artist edit');expect(undo.undo).not.toHaveBeenCalled();
});
