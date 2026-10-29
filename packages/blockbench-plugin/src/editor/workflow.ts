import { mutationNames, Operation, parseTool, ToolName, ToolResponse, ValidationReport } from '../../../core/src/schema';
import { OperationLedger } from '../../../core/src/operations';
import { validateAsset } from '../../../core/src/validation';
import * as editor from './adapter';

export class Workflow {
  ledger=new OperationLedger();
  plans=new Map<string,{args:any;stamp:string;remote:boolean}>();
  busy=false;
  lastReport?:ValidationReport;
  onChange=()=>{};
  onProposal=(_op:Operation)=>{};
  async request(name:string,input:unknown,remote=false):Promise<ToolResponse> {
    try {
      const {name:tool,args}=parseTool(name,input);
      if((mutationNames as readonly string[]).includes(tool)) {
        let existing:Operation|undefined;try{existing=this.ledger.get(args.request_id);}catch{}
        if(!existing && (this.busy||this.ledger.list().some(o=>o.state==='pending_approval')))throw new Error('Review or cancel the current proposal before starting another change.');
        const summary=this.summary(tool,args);
        const proposal=this.ledger.propose(args.request_id,tool,args,summary);
        if(proposal.fresh){
          // Capture before returning; approval is bound to this exact project state.
          try {this.plans.set(args.request_id,{args,stamp:editor.sceneStamp(),remote});}
          catch(error){this.ledger.transition(args.request_id,'failed',{error:String(error)});throw error;}
          this.onChange();setTimeout(()=>{if(proposal.operation.state==='pending_approval')this.onProposal(proposal.operation);},0);
        }
        return {ok:true,data:proposal.operation};
      }
      switch(tool) {
        case 'get_editor_status':return {ok:true,data:editor.editorStatus()};
        case 'inspect_project':return {ok:true,data:editor.inspectProject()};
        case 'validate_asset':this.lastReport=validateAsset(editor.captureAsset());this.onChange();return {ok:true,data:this.lastReport};
        case 'get_operation':return {ok:true,data:this.ledger.get(args.operation_id)};
        case 'cancel_operation':{const o=this.ledger.transition(args.operation_id,'cancelled');this.plans.delete(args.operation_id);this.onChange();return {ok:true,data:o};}
        case 'preview_animation':if(this.busy)throw new Error('Wait for the current change to finish.');return {ok:true,data:editor.preview(args.clip,args.playing)};
        default:throw new Error('Unsupported command.');
      }
    } catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)};}
  }
  summary(tool:ToolName,args:any) {
    switch(tool){
      case 'create_model':return `Create “${args.spec.name}” in a new Bedrock tab: ${args.spec.height} units tall, ${args.spec.build} build, ${args.spec.detail} geometry. Colors ${args.spec.palette.primary}, ${args.spec.palette.secondary}, eyes ${args.spec.palette.eyes}. Add 11 editable joints and ${args.spec.animations.clips.join(', ')} animations at ${args.spec.animations.speed}× speed and ${args.spec.animations.intensity}× intensity. Existing tabs remain open.`;
      case 'apply_materials':return `Recolor the palette to ${args.palette.primary} / ${args.palette.secondary}, eyes ${args.palette.eyes}. Preserve individually painted pixels, all geometry, and animations. Undo is available.`;
      case 'generate_rig':return `Map the current humanoid’s 11 body parts ${args.mapping?'using your selected bone names':'using exact names and known aliases'}. Check shoulder, elbow, hip, and knee connections. Imported joints and geometry will not move.`;
      case 'generate_animations':return `Replace the current ${args.options.clips.join(', ')} preset clips with editable keyframes at ${args.options.speed}× speed and ${args.options.intensity}× intensity. Other clips stay. This replaces manual edits within the selected clips; Undo is available.`;
      case 'export_asset':return 'Check the current scene, then choose where to save a ZIP with Bedrock geometry, the current PNG texture, animations, controllers, client entity, manifest, source model, and validation report. This is a resource asset package requiring game-side integration.';
      case 'undo_last_change':return 'Undo the latest VoxelFlow edit in the active tab. This will stop if another artist edit follows it. The exported ZIP, if any, stays on disk.';
      default:return tool;
    }
  }
  async approve(id:string) {
    const op=this.ledger.get(id);if(op.state!=='pending_approval'||this.busy)return;
    const plan=this.plans.get(id)!;
    if(Date.now()-Date.parse(op.createdAt)>5*60*1000){this.ledger.transition(id,'failed',{error:'This proposal expired. Submit a fresh plan.'});this.plans.delete(id);this.onChange();return;}
    this.lastReport=undefined;this.busy=true;this.ledger.transition(id,'applying');this.onChange();Blockbench.setProgress(0.15);
    await new Promise(r=>setTimeout(r,30));
    try{
      if(editor.sceneStamp()!==plan.stamp)throw new Error('The project changed after this plan was proposed. Review the current model and submit a new proposal.');
      let result:any;
      switch(op.tool){
        case 'create_model':result=editor.createRobot(plan.args.spec);break;
        case 'apply_materials':result=editor.applyMaterials(plan.args.palette);break;
        case 'generate_rig':result=editor.mapRig(plan.args.mapping);break;
        case 'generate_animations':result=editor.animate(plan.args.options);break;
        case 'export_asset':result=editor.exportLive();break;
        case 'undo_last_change':result=editor.undoLast();break;
        default:throw new Error('This operation cannot modify the editor.');
      }
      this.ledger.transition(id,result?.cancelled?'cancelled':'applied',{result});
      Blockbench.showQuickMessage(result?.cancelled?'Export cancelled.':'VoxelFlow: change applied.',2500);
    }catch(error){this.ledger.transition(id,'failed',{error:error instanceof Error?error.message:String(error)});}
    finally{this.plans.delete(id);this.busy=false;Blockbench.setProgress(0);this.onChange();}
  }
  reject(id:string){if(this.ledger.get(id).state==='pending_approval')this.ledger.transition(id,'rejected');this.plans.delete(id);this.onChange();}
  disconnected(){for(const op of this.ledger.list())if(op.state==='pending_approval'&&this.plans.get(op.id)?.remote){this.ledger.transition(op.id,'cancelled');this.plans.delete(op.id);}this.onChange();}
}
