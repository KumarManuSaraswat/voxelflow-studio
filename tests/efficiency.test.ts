import {describe,it,expect} from 'vitest';
import {PropSpecSchema,parseTool} from '../packages/core/src/schema';
import {generateProp,propPreset} from '../packages/core/src/props';
import {inspectGeometry} from '../packages/core/src/inspection';
import {validateAsset} from '../packages/core/src/validation';

const repeated=()=>({name:'ladder',description:'Eight gold rungs.',materials:[{name:'gold',color:'#e3b34e'}],parts:[{name:'rung',group:'rungs',from:[-4,0,-1],to:[4,1,1],material:'gold',repeat:{count:8,step:[0,3,0]}}]});
describe('token-efficient prop creation',()=>{
  it('expands into the same editable geometry as an explicit blueprint',()=>{
    const compact=repeated();
    const explicit={...compact,parts:Array.from({length:8},(_,i)=>({name:i?`rung_${i+1}`:'rung',group:'rungs',from:[-4,i*3,-1],to:[4,1+i*3,1],material:'gold'}))};
    expect(generateProp(compact)).toEqual(generateProp(explicit));
    expect(validateAsset(generateProp(compact)).ready).toBe(true);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(explicit).length*0.4);
    const expanded=PropSpecSchema.parse(compact);
    expect(PropSpecSchema.parse(expanded)).toEqual(expanded);
    expect(expanded.parts[0]).not.toHaveProperty('repeat');
  });
  it('translates explicit pivots and preserves rotations; implicit pivots use each new center',()=>{
    const spec=repeated();
    Object.assign(spec.parts[0],{pivot:[0,0,0],rotation:[0,0,15]});
    const asset=generateProp(spec);
    expect(asset.cubes[7].origin).toEqual([0,21,0]);
    expect(asset.cubes.every(c=>c.rotation[2]===15)).toBe(true);
    expect(generateProp(repeated()).cubes[7].origin).toEqual([0,21.5,0]);
  });
  it('accepts negative steps and the exact expanded cube limit',()=>{
    const spec=repeated();spec.parts[0].repeat={count:128,step:[0,-1,0]};
    expect(generateProp(spec).cubes.at(-1)?.from).toEqual([-4,-127,-1]);
  });
  it.each(['limit','count','fraction','zero','bounds','pivot','duplicate','long_name','material','dimensions','rotation','unknown'])('rejects invalid %s before approval',problem=>{
    const spec:any=repeated(),part=spec.parts[0];
    if(problem==='limit')spec.parts.push({...part,name:'extra',repeat:{count:128,step:[0,1,0]}});
    if(problem==='count')part.repeat.count=129;
    if(problem==='fraction')part.repeat.count=2.5;
    if(problem==='zero')part.repeat.step=[0,0,0];
    if(problem==='bounds')part.repeat.step=[0,30,0];
    if(problem==='pivot')part.pivot=[0,125,0];
    if(problem==='duplicate')spec.parts.push({...part,name:'rung_2',repeat:undefined});
    if(problem==='long_name')part.name='a'.repeat(48);
    if(problem==='material')part.material='missing';
    if(problem==='dimensions')part.to=part.from;
    if(problem==='rotation')part.rotation=[0,Infinity,0];
    if(problem==='unknown')part.repeat.code='run()';
    expect(()=>parseTool('create_prop',{request_id:crypto.randomUUID(),spec})).toThrow();
  });
});
describe('compact geometry inspection',()=>{
  it('defaults to counts and groups, with exact detailed geometry on demand',()=>{
    const asset=generateProp(propPreset('bag')),summary=inspectGeometry(asset),full=inspectGeometry(asset,'full');
    expect(parseTool('inspect_project',{}).args.detail).toBe('summary');
    expect(parseTool('inspect_project',{detail:'full'}).args.detail).toBe('full');
    expect(summary.cubes).toBe(asset.cubes.length);expect(summary.bones).toBe(asset.bones.length);
    expect(summary).not.toHaveProperty('parts');
    expect(summary.groups!.reduce((n,g)=>n+g.cubes,0)).toBe(asset.cubes.length);
    expect(full.bones).toEqual(asset.bones);
    expect('parts' in full && full.parts?.[0]).toMatchObject({name:asset.cubes[0].name,from:asset.cubes[0].from,pivot:asset.cubes[0].origin});
    expect(JSON.stringify(summary).length).toBeLessThan(JSON.stringify(full).length*0.2);
  });
});
