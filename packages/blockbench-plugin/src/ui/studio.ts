import { AssetSpecSchema, defaultPalette, Operation, Palette, RigMapping, roles, ValidationReport } from '../../../core/src/schema';
import { detectRig } from '../../../core/src/modeling';
import { validateAsset } from '../../../core/src/validation';
import { captureAsset, getPropMaterials, isPropProject } from '../editor/adapter';
import {propPreset} from '../../../core/src/props';
import { Workflow } from '../editor/workflow';
import { Connection } from '../bridge/connection';

const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,className?:string)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
const button=(text:string,fn:()=>void,className='')=>{const b=node('button',text,className);b.type='button';b.onclick=fn;return b;};
export class Studio {
  panel:Panel;
  action:Action;
  css:{delete():void};
  roots=new Set<HTMLElement>();
  stage=0;
  createKind:'bag'|'staff'|'robot'='bag';
  propColors=new Map<string,string>();
  spec=AssetSpecSchema.parse({});
  palette:Palette={...defaultPalette};
  speed=1;intensity=1;
  message='';
  report?:ValidationReport;
  welcome?:Dialog;
  approval?:Dialog;
  refreshing=false;
  invalidate=()=>{this.report=undefined;this.workflow.lastReport=undefined;this.propColors.clear();this.refresh();};
  constructor(public workflow:Workflow,public connection:Connection){
    this.css=Blockbench.addCSS(`
      .vf-studio{padding:12px;display:flex;flex-direction:column;gap:12px;color:var(--color-text);font-size:13px;line-height:1.45;overflow-y:auto;max-height:100%;box-sizing:border-box}
      .vf-brand{display:flex;align-items:center;justify-content:space-between;gap:8px}.vf-brand strong{font-size:19px;letter-spacing:-.6px}.vf-kicker{color:#77d7cd;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase}
      .vf-badge{font-size:10px;background:var(--color-back);border:1px solid var(--color-border);padding:3px 7px;border-radius:12px;white-space:nowrap}
      .vf-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px}.vf-steps button{width:100%;min-width:0;padding:7px 2px;font-size:11px;border-radius:5px;height:auto;line-height:1.6;background:var(--color-back);border:1px solid transparent}.vf-steps button.active{border-color:#70d3c8;color:#91efe4;background:#244744}
      .vf-studio h3{font-size:16px;font-weight:600;margin:0}.vf-studio p{margin:0}.vf-muted{font-size:12px;color:var(--color-subtle_text);line-height:1.5}.vf-card{border:1px solid var(--color-border);background:var(--color-back);border-radius:8px;padding:11px;display:flex;flex-direction:column;gap:8px}
      .vf-studio label{display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--color-subtle_text)}.vf-studio input,.vf-studio select{box-sizing:border-box;width:100%;height:30px;border-radius:4px;background:var(--color-ui);color:var(--color-text);border:1px solid var(--color-border);padding:4px 8px}.vf-studio input[type=color]{padding:2px;min-width:48px}.vf-row{display:flex;gap:8px;align-items:end}.vf-row>*{flex:1;min-width:0}
      .vf-studio button{border-radius:5px;min-height:29px;white-space:normal}.vf-primary{background:#79d7ca!important;color:#112e2b!important;font-weight:600;border:0;padding:9px 14px}.vf-secondary{border:1px solid var(--color-border);padding:7px 10px;background:var(--color-ui)}
      .vf-status{display:flex;gap:7px;align-items:center;font-size:11px}.vf-dot{width:6px;height:6px;border-radius:50%;background:#9aabb7;flex:none}.vf-dot.online{background:#7ce9b4}.vf-connect{font-size:11px!important;min-height:23px!important;margin-left:auto}
      .vf-check{padding:7px 9px;border-radius:4px;background:var(--color-ui);border-left:3px solid #77c7a0;font-size:12px}.vf-check.failed{border-color:#e87979}.vf-check.warning{border-color:#e4bb6d}.vf-check strong{display:block;font-size:10px;letter-spacing:.5px;text-transform:uppercase}.vf-history{font-size:11px;border-top:1px solid var(--color-border);padding-top:8px}.vf-error{border-left:3px solid #e4bb6d;padding:8px;background:var(--color-back);font-size:12px;white-space:pre-wrap}.vf-mini{font-size:10px;color:var(--color-subtle_text)}
      .vf-approval{padding:12px;font-size:14px;line-height:1.7;white-space:pre-wrap}.vf-studio details summary{cursor:pointer;font-size:12px}.vf-studio details>div{margin-top:8px}.vf-texture{height:42px;image-rendering:pixelated;width:100%;border-radius:4px}.vf-studio .vf-wide{width:100%}
    `);
    this.panel=new Panel('voxelflow_studio',{name:'VoxelFlow Studio',icon:'smart_toy',growable:false,resizable:true,min_height:360,default_position:{slot:'left_bar',height:620,fixed_height:true,sidebar_index:0},condition:()=>true});
    const root=node('div',undefined,'vf-studio');this.panel.node.append(root);this.roots.add(root);
    this.action=new Action('voxelflow_open',{name:'VoxelFlow Studio',description:'Create Minecraft props and animated robots from ChatGPT or local presets.',icon:'smart_toy',click:()=>this.open()});MenuBar.addAction(this.action,'tools');
    workflow.onChange=()=>{this.report=workflow.lastReport;this.refresh();};workflow.onProposal=op=>this.review(op);connection.onChange=()=>this.refresh();this.refresh();
    for(const event of ['finished_edit','undo','redo','select_project'] as const)Blockbench.on(event,this.invalidate);
  }
  open(){
    if(typeof Project!=='undefined'&&Project){this.panel.fold(false);if(this.panel.slot==='hidden')this.panel.moveTo('left_bar');this.panel.selectTab();this.refresh();return;}
    if(this.welcome)this.welcome.hide();const root=node('div',undefined,'vf-studio');root.style.maxHeight='70vh';this.roots.add(root);
    const dialog=this.welcome=new Dialog({id:'voxelflow_welcome',title:'VoxelFlow Studio',width:500,lines:[root],buttons:['Close'],onClose:()=>{this.roots.delete(root);}});dialog.show();this.refresh();
  }
  field(label:string,value:string|number,onChange:(v:string)=>void,type='text',min?:number,max?:number){const l=node('label',label);const input=node('input');input.type=type;input.value=String(value);if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);input.oninput=()=>onChange(input.value);l.append(input);return l;}
  select(label:string,value:string,choices:string[],change:(v:string)=>void){const l=node('label',label),s=node('select');for(const c of choices){const o=node('option',c[0].toUpperCase()+c.slice(1));o.value=c;s.append(o);}s.value=value;s.onchange=()=>change(s.value);l.append(s);return l;}
  row(...children:HTMLElement[]){const r=node('div',undefined,'vf-row');r.append(...children);return r;}
  async run(tool:string,args:unknown){this.message='';const result=await this.workflow.request(tool,args);if(!result.ok)this.message=result.error??'Operation failed.';this.refresh();}
  propose(tool:string,args:Record<string,unknown>={}){void this.run(tool,{request_id:crypto.randomUUID(),...args});}
  refresh(){if(this.refreshing)return;this.refreshing=true;for(const root of this.roots)this.render(root);this.refreshing=false;}
  render(root:HTMLElement){
    const prop=isPropProject();
    root.replaceChildren();const brand=node('div',undefined,'vf-brand');const title=node('div');title.append(node('div','ARTIST WORKSPACE','vf-kicker'),node('strong','VoxelFlow Studio'));brand.append(title,node('span','BEDROCK · 0.2','vf-badge'));root.append(brand);
    const status=node('div',undefined,'vf-status');status.append(node('span',undefined,`vf-dot ${this.connection.connected?'online':''}`),node('span',this.connection.status),button(this.connection.connected?'Disconnect':'Connect',()=>this.connection.connected?this.connection.disconnect():this.connectDialog(),'vf-connect'));root.append(status);
    const steps=node('div',undefined,'vf-steps');['Create','Texture',prop?'Parts':'Rig','Animate','Export'].forEach((text,i)=>steps.append(button(`${i+1} ${text}`,()=>{this.stage=i;this.message='';this.refresh();},i===this.stage?'active':'')));root.append(steps);
    const content=node('div',undefined,'vf-card');root.append(content);
    if(this.stage===0){
      content.append(node('h3','Describe it in ChatGPT.'),node('p','A leather bag. A crystal staff. A lantern, sword, chest, or your own idea. Your connected assistant designs the parts; you review the plan here.','vf-muted'));
      content.append(node('p','Try: “Use VoxelFlow to make a brown leather backpack with gold buckles and a front pocket.”','vf-mini'));
      content.append(this.select('Or start with an offline example',this.createKind,['bag','staff','robot'],v=>{this.createKind=v as typeof this.createKind;this.refresh();}));
      if(this.createKind!=='robot'){
        const preset=propPreset(this.createKind);
        content.append(node('p',preset.description,'vf-muted'),node('p',`${preset.parts.length} editable parts · ${preset.materials.length} named colors · PNG + UVs`,'vf-mini'),button(`Review ${this.createKind} plan`,()=>this.propose('create_prop',{spec:preset}),'vf-primary'));
        content.append(node('p','These are examples. ChatGPT can compose other objects from up to 128 cubes and 16 colors. No text interpretation runs inside this panel.','vf-mini'));
      }else{
      content.append(node('h3','Meet your next character.'),node('p','Start with Atlas, an articulated robot. Every cube, joint and keyframe stays editable.','vf-muted'));
      content.append(this.field('Character name',this.spec.name,v=>this.spec.name=v));
      content.append(this.row(this.field('Height · pixels',this.spec.height,v=>this.spec.height=Number(v),'number',16,64),this.select('Build',this.spec.build,['balanced','slender','heavy'],v=>this.spec.build=v as any)));
      content.append(this.select('Geometry detail',this.spec.detail,['simple','detailed'],v=>this.spec.detail=v as any));
      content.append(this.row(this.field('Armor',this.spec.palette.primary,v=>this.spec.palette.primary=v,'color'),this.field('Trim',this.spec.palette.secondary,v=>this.spec.palette.secondary=v,'color'),this.field('Eyes',this.spec.palette.eyes,v=>this.spec.palette.eyes=v,'color')));
      content.append(button('Review robot plan',()=>{this.palette={...this.spec.palette};this.propose('create_model',{spec:this.spec});},'vf-primary'));
      content.append(node('p','Includes texture + 11 joints + idle, walk and punch. Opens a fresh tab.','vf-mini'));
      const details=node('details');details.append(node('summary','Bring your own model / use AI'));const help=node('div',undefined,'vf-muted');help.textContent='Open a .bbmodel with File → Open Model. VoxelFlow can map an existing humanoid with separate upper/lower limbs. For natural language, connect Codex or an MCP host and describe the character there. Quadrupeds, arbitrary mesh rigging, and image generation are not available in this release.';details.append(help);content.append(details);
      }
    }else if(this.stage===1){
      content.append(node('h3','Make it yours.'),node('p','Change the generated colors without rebuilding. Individually painted pixels are preserved.','vf-muted'));
      if(prop){
        const materials=getPropMaterials();
        for(const m of materials){const key=`${Project.uuid}:${m.name}`;content.append(this.field(m.name.replaceAll('_',' '),this.propColors.get(key)??m.color,v=>this.propColors.set(key,v),'color'));}
        content.append(button('Review material colors',()=>this.propose('apply_prop_materials',{materials:materials.map(m=>({...m,color:this.propColors.get(`${Project.uuid}:${m.name}`)??m.color}))}),'vf-primary'),button('Open Paint mode',()=>this.guard(()=>Modes.options.paint.select()),'vf-secondary'));
      }else{
      content.append(this.row(this.field('Armor',this.palette.primary,v=>this.palette.primary=v,'color'),this.field('Trim',this.palette.secondary,v=>this.palette.secondary=v,'color'),this.field('Eyes',this.palette.eyes,v=>this.palette.eyes=v,'color')));
      if(typeof Project!=='undefined'&&Project&&Texture.all[0]){const img=node('img',undefined,'vf-texture');img.src=Texture.all[0].getDataURL();img.alt='Current editable palette texture';content.append(img);}
      content.append(button('Review color change',()=>this.propose('apply_materials',{palette:this.palette}),'vf-primary'),button('Open Paint mode',()=>this.guard(()=>Modes.options.paint.select()),'vf-secondary'));
      content.append(node('p','The eyes use bright pixels. An emissive shader is not part of this export.','vf-mini'));
      }
    }else if(this.stage===2){
      if(prop){content.append(node('h3','Every part stays editable.'),node('p','This object uses named groups in the Outliner. Edit the straps, handle, crystal, or other parts directly. A static prop does not need arms, legs, or a humanoid skeleton.','vf-muted'),button('Check object structure',()=>this.validate(),'vf-primary'));}
      else{
      content.append(node('h3','Give every part a joint.'),node('p','Generated robots arrive connected. For imported humanoids, match body parts to existing groups, then check their joint positions.','vf-muted'));
      content.append(button('Review detected rig',()=>this.propose('generate_rig'),'vf-primary'),button('Map body parts…',()=>this.mappingDialog(),'vf-secondary'),button('Check joints',()=>this.validate(),'vf-secondary'));
      content.append(node('p','Shoulder → upper arm → elbow → lower arm. Hip → thigh → knee → shin. Left means the character’s own left.','vf-mini'));
      }
    }else if(this.stage===3){
      if(prop){content.append(node('h3','A static Minecraft prop.'),node('p','Idle, walk, and punch are character presets. This object is ready for static export without those animations. Custom prop animation can be authored in Blockbench and exported with its native tools.','vf-muted'),button('Check export readiness',()=>{this.stage=4;this.validate();},'vf-primary'));}
      else{
      content.append(node('h3','Put character in motion.'),node('p','Preview native animations. Adjust timing and strength, then review before replacing the three preset clips.','vf-muted'));
      for(const [clip,label] of [['idle','Idle · breathing'],['walk','Walk · alternating gait'],['attack','Punch · windup & recovery']])content.append(button(`▶  ${label}`,()=>void this.run('preview_animation',{clip,playing:true}),'vf-secondary'));
      content.append(button('Stop playback',()=>{Timeline.pause();},'vf-secondary'));
      content.append(this.row(this.field('Speed · 0.25–3×',this.speed,v=>this.speed=Number(v),'number',0.25,3),this.field('Strength · 0.1–1.5×',this.intensity,v=>this.intensity=Number(v),'number',0.1,1.5)));
      content.append(button('Review animation update',()=>this.propose('generate_animations',{options:{clips:['idle','walk','attack'],speed:this.speed,intensity:this.intensity}}),'vf-primary'));
      }
    }else{
      content.append(node('h3','Ready for the next stage.'),node('p','Check the live scene, then save an organized Bedrock resource asset package.','vf-muted'),button('Run quality checks',()=>this.validate(),'vf-secondary'),button('Review Bedrock export',()=>this.propose('export_asset',{target:'bedrock'}),'vf-primary'));
      content.append(node('p',prop?'Includes geometry, PNG, static client entity, render controller, manifest and editable source. Held/worn items still need item and attachable definitions. Minecraft runtime is unverified.':'Includes geometry, PNG, animations, controllers, client entity, manifest and editable source. Requires a matching behavior entity. Minecraft runtime is unverified.','vf-mini'));
    }
    if(this.workflow.busy)root.append(node('div','Applying approved change…','vf-error'));
    if(this.message)root.append(node('div',this.message,'vf-error'));
    if(this.report){
      const r=node('div',undefined,'vf-card');r.append(node('h3',this.report.ready?'Asset checks passed':'A few things need attention'),node('p',`${this.report.counts.passed} passed · ${this.report.counts.warning} warning · ${this.report.counts.failed} failed`,'vf-muted'));
      const findings=this.stage===2?this.report.findings.filter(f=>f.stage==='rig'):this.report.findings;
      for(const finding of findings.slice(0,35)){const c=node('div',undefined,`vf-check ${finding.status}`);c.append(node('strong',`${finding.status} · ${finding.stage}`),node('div',finding.message));if(finding.correction&&finding.status!=='passed')c.append(node('div',finding.correction,'vf-mini'));r.append(c);}if(findings.length>35)r.append(node('p',`${findings.length-35} more findings. Fix the listed issues and check again.`,'vf-mini'));root.append(r);
    }
    const history=this.workflow.ledger.list().slice(-4).reverse();
    if(history.length){const h=node('details',undefined,'vf-history');h.open=true;h.append(node('summary','Creative history'));for(const op of history){const line=node('div');line.append(node('span',`${op.tool.replaceAll('_',' ')} · ${op.state.replaceAll('_',' ')}`));if(op.error)line.append(node('div',op.error,'vf-error'));if(op.state==='pending_approval')line.append(button('Review',()=>this.review(op),'vf-secondary'));h.append(line);}h.append(button('Review undo',()=>this.propose('undo_last_change'),'vf-secondary'));root.append(h);}
    root.append(node('div','Your idea. Your model. Your call.','vf-mini'));
  }
  guard(fn:()=>unknown){try{fn();}catch(e){this.message=e instanceof Error?e.message:String(e);this.refresh();}}
  validate(){this.guard(()=>{this.report=validateAsset(captureAsset());this.refresh();});}
  review(op:Operation){
    this.welcome?.hide();this.approval?.hide();const text=node('div',op.summary,'vf-approval');
    const d=this.approval=new Dialog({id:'voxelflow_approval',title:'Review proposed change',width:560,lines:[text],buttons:['Apply change','Cancel'],cancel_on_click_outside:false,onConfirm:()=>{d.hide();void this.workflow.approve(op.id);},onCancel:()=>{this.workflow.reject(op.id);}});d.show();
  }
  connectDialog(){
    const d=new Dialog({id:'voxelflow_connect',title:'Connect your AI assistant',width:520,lines:[node('p','Start “npm run bridge” in the project folder, then paste its local session token. The token is kept only in memory. The core presets work offline.','vf-muted')],form:{port:{label:'Local port',type:'number',value:32123,min:1024,max:65535},token:{label:'Session token',type:'password',value:''}},buttons:['Connect','Cancel'],onConfirm:(result)=>{try{this.connection.connect(Number(result.port),String(result.token).trim());}catch(e){this.message=String(e);}d.hide();this.refresh();}});d.show();
  }
  mappingDialog(){this.guard(()=>{
    const a=captureAsset(),mapping=detectRig(a.bones).mapping;const options=Object.fromEntries(a.bones.map(b=>[b.name,b.name]));
    const form:any={};for(const role of roles)form[role]={label:role.replaceAll('_',' '),type:'select',options:{'':'Choose a bone…',...options},value:a.mapping[role]??mapping[role]??''};
    const d=new Dialog({id:'voxelflow_mapping',title:'Map body parts to your bones',width:540,form,buttons:['Review mapping','Cancel'],onConfirm:(result)=>{d.hide();this.propose('generate_rig',{mapping:result as RigMapping});}});d.show();
  });}
  delete(){for(const event of ['finished_edit','undo','redo','select_project'] as const)Blockbench.removeListener(event,this.invalidate);this.welcome?.hide();this.approval?.hide();this.roots.clear();this.action.delete();this.panel.delete();this.css.delete();}
}
