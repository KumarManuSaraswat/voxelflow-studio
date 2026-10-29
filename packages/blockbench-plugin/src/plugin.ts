import { Workflow } from './editor/workflow';
import { initializeProperties } from './editor/adapter';
import { installAnimationUndoFix } from './editor/undo';
import { Connection } from './bridge/connection';
import { Studio } from './ui/studio';

let studio:Studio|undefined, connection:Connection|undefined, properties:Property[]=[], removeUndoFix:(()=>void)|undefined;
BBPlugin.register('voxelflow_studio',{
  title:'VoxelFlow Studio',author:'VoxelFlow Studio contributors',description:'An artist-first robot pipeline: editable models, pixel palettes, humanoid joints, native animations, quality checks and Bedrock exports. Optional local MCP connection.',
  icon:'smart_toy',version:'0.1.0',min_version:'5.2.0',variant:'desktop',tags:['Minecraft: Bedrock Edition','Animation','Utility'],
  onload(){
    if(!Formats.bedrock||typeof BBAnimation==='undefined'||typeof Panel==='undefined')throw new Error('VoxelFlow requires Blockbench 5.2+ with Bedrock Entity and native animations.');
    properties=initializeProperties();removeUndoFix=installAnimationUndoFix();const workflow=new Workflow();connection=new Connection(workflow);studio=new Studio(workflow,connection);
    Blockbench.showQuickMessage('VoxelFlow ready · Tools → VoxelFlow Studio',5000);
  },
  onunload(){connection?.disconnect();studio?.delete();removeUndoFix?.();removeUndoFix=undefined;properties.forEach(p=>p.delete());properties=[];studio=undefined;connection=undefined;}
});
