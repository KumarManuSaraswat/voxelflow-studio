import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const adapter=vi.hoisted(()=>({sceneStamp:vi.fn(()=> 'project-a:1'),createRobot:vi.fn(()=>({cubes:43})),createProp:vi.fn(()=>({kind:'prop',cubes:28})),applyPropMaterials:vi.fn(),applyMaterials:vi.fn(),mapRig:vi.fn(),animate:vi.fn(),exportLive:vi.fn(()=>({cancelled:true})),undoLast:vi.fn(),editorStatus:vi.fn(),inspectProject:vi.fn(),captureAsset:vi.fn(),preview:vi.fn()}));
vi.mock('../packages/blockbench-plugin/src/editor/adapter',()=>adapter);
import {Workflow} from '../packages/blockbench-plugin/src/editor/workflow';
import {propPreset} from '../packages/core/src/props';
beforeEach(()=>{vi.clearAllMocks();adapter.sceneStamp.mockReturnValue('project-a:1');vi.stubGlobal('Blockbench',{setProgress:vi.fn(),showQuickMessage:vi.fn()});});
afterEach(()=>vi.unstubAllGlobals());
describe('approval-bound editor workflow',()=>{
  it('approves the expanded pattern once and keeps retries idempotent',async()=>{
    const w=new Workflow(),request_id=crypto.randomUUID(),spec=propPreset('staff');
    const args={request_id,spec:{...spec,parts:[{name:'rung',from:[-4,0,-1],to:[4,1,1],material:'gold',repeat:{count:8,step:[0,3,0]}}]}};
    expect((await w.request('create_prop',args)).ok).toBe(true);
    expect(w.ledger.get(request_id).summary).toContain('8 editable cubes');
    expect(adapter.createProp).not.toHaveBeenCalled();
    await w.request('create_prop',args);await w.approve(request_id);await w.request('create_prop',args);await w.approve(request_id);
    expect(adapter.createProp).toHaveBeenCalledTimes(1);
    expect(adapter.createProp).toHaveBeenCalledWith(expect.objectContaining({parts:expect.arrayContaining([expect.objectContaining({name:'rung_8',from:[-4,21,-1]})])}));
    const changed=structuredClone(args);changed.spec.parts[0].repeat.step=[0,4,0];
    expect((await w.request('create_prop',changed)).ok).toBe(false);
  });
  it('passes inspection detail through and rejects unsafe patterns without a proposal',async()=>{
    const w=new Workflow();await w.request('inspect_project',{});expect(adapter.inspectProject).toHaveBeenLastCalledWith('summary');
    await w.request('inspect_project',{detail:'full'});expect(adapter.inspectProject).toHaveBeenLastCalledWith('full');
    const spec=propPreset('staff');
    const bad={...spec,parts:[{...spec.parts[0],repeat:{count:128,step:[0,3,0]}}]};
    expect((await w.request('create_prop',{request_id:crypto.randomUUID(),spec:bad})).ok).toBe(false);
    expect(w.ledger.list()).toEqual([]);expect(adapter.createProp).not.toHaveBeenCalled();
  });
  it('shows a custom prop plan and creates it only once after approval',async()=>{const w=new Workflow(),request_id=crypto.randomUUID(),args={request_id,spec:propPreset('bag')};const result=await w.request('create_prop',args);expect(result.ok).toBe(true);expect(w.ledger.get(request_id).summary).toContain('gold buckles');expect(adapter.createProp).not.toHaveBeenCalled();await w.approve(request_id);await w.request('create_prop',args);await w.approve(request_id);expect(adapter.createProp).toHaveBeenCalledTimes(1);expect(w.ledger.get(request_id).state).toBe('applied');});
  it('never mutates before approval and applies an identical retry once',async()=>{const w=new Workflow(),request_id=crypto.randomUUID();const first=await w.request('create_model',{request_id,spec:{}});expect(first.ok).toBe(true);expect(adapter.createRobot).not.toHaveBeenCalled();await w.request('create_model',{request_id,spec:{}});await w.approve(request_id);await w.approve(request_id);expect(adapter.createRobot).toHaveBeenCalledTimes(1);expect(w.ledger.get(request_id).state).toBe('applied');expect(w.plans.size).toBe(0);});
  it('rejects stale approval after an artist edit or project switch',async()=>{const w=new Workflow(),request_id=crypto.randomUUID();await w.request('create_model',{request_id,spec:{}});adapter.sceneStamp.mockReturnValue('project-b:2');await w.approve(request_id);expect(adapter.createRobot).not.toHaveBeenCalled();expect(w.ledger.get(request_id).state).toBe('failed');expect(w.ledger.get(request_id).error).toContain('changed');});
  it('cancels remote pending work on disconnect',async()=>{const w=new Workflow(),request_id=crypto.randomUUID();await w.request('create_model',{request_id,spec:{}},true);w.disconnected();await w.approve(request_id);expect(adapter.createRobot).not.toHaveBeenCalled();expect(w.ledger.get(request_id).state).toBe('cancelled');expect(w.plans.size).toBe(0);});
  it('a rejected plan cannot later be applied',async()=>{const w=new Workflow(),request_id=crypto.randomUUID();await w.request('create_model',{request_id,spec:{}});w.reject(request_id);await w.approve(request_id);expect(adapter.createRobot).not.toHaveBeenCalled();expect(w.ledger.get(request_id).state).toBe('rejected');});
  it('records native save cancellation as cancellation, never success',async()=>{const w=new Workflow(),request_id=crypto.randomUUID();await w.request('export_asset',{request_id,target:'bedrock'});await w.approve(request_id);expect(w.ledger.get(request_id).state).toBe('cancelled');});
  it('reports failures and releases the busy state',async()=>{adapter.createRobot.mockImplementationOnce(()=>{throw new Error('Editor failed');});const w=new Workflow(),request_id=crypto.randomUUID();await w.request('create_model',{request_id,spec:{}});await w.approve(request_id);expect(w.ledger.get(request_id).state).toBe('failed');expect(w.busy).toBe(false);expect(w.plans.size).toBe(0);});
});
