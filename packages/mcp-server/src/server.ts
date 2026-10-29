import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { toolSchemas, toolNames, mutationNames, ToolResponseSchema } from '../../core/src/schema';
import { editorRequest } from './transport/client';
import { readConfig } from './config';

const descriptions:Record<typeof toolNames[number],string>={
  get_editor_status:'Read live Blockbench connection, project, version and format. Returns connected:false when unavailable; never simulates an editor.',
  inspect_project:'Read actual geometry, bone mapping, textures and native keyframe summaries of the active Blockbench project.',
  create_model:'Propose an editable humanoid robot with palette, articulated rig, and idle/walk/attack clips in a NEW Bedrock project tab. Translate natural language into AssetSpec; only robot/bedrock is implemented. Returns pending_approval. Ask the artist to approve in Blockbench, then poll get_operation. Eye color is bright cyan, not an emissive shader.',
  apply_materials:'Propose recoloring the VoxelFlow atlas while preserving pixels painted by the artist. Does not rebuild geometry or animations. Requires Blockbench approval.',
  generate_rig:'Propose a body-part mapping for an existing humanoid hierarchy. Exact/alias detection is conservative; provide all 11 mapped bone names when detection is ambiguous. Does not invent joints or move imported geometry. Requires approval and a valid existing hierarchy.',
  generate_animations:'Propose real native idle/walk/attack keyframes for a validated mapped humanoid. Replaces only the named preset clips after approval; speed/intensity do not rebuild the model.',
  validate_asset:'Run deterministic quality gates against the LIVE project, including unsupported geometry, hierarchy, pivots, texture/UVs and actual native keyframes. This does not certify Minecraft runtime compatibility.',
  export_asset:'Propose a Bedrock resource asset ZIP with geometry, current PNG, animations, controllers, client entity, manifest, source bbmodel and report. Requires passing gates and editor approval, then a native Save dialog. Poll until applied; cancelled is not success. No arbitrary output path accepted.',
  undo_last_change:'Propose undoing the most recent VoxelFlow edit using native Undo. Refuses to undo unrelated artist edits. Requires editor approval.',
  get_operation:'Read a proposed operation by its request_id. Only applied means the scene/export action completed. pending_approval means the artist must approve in Blockbench. Retry an uncertain command only with its original request_id and parameters.',
  cancel_operation:'Cancel a pending approval without changing the scene. Running exports must be cancelled in the native Save dialog.',
  preview_animation:'Select and play or stop an existing idle, walk, or attack clip in the real Blockbench animation timeline. Does not create or edit keyframes.'
};
const server=new McpServer({name:'voxelflow-studio',version:'0.1.0'},{instructions:'VoxelFlow controls a live Blockbench desktop editor. First get_editor_status. All modifications return a pending approval; never say they succeeded until get_operation returns applied. Ask the artist to approve the proposal in Blockbench. Never bypass approval. Reuse request_id for retries. A robot creation includes the complete requested rig and clips; do not generate duplicates. Validate the live scene before exporting. Bedrock output is an integration-ready resource asset package, not a tested playable mob.'});
for(const name of toolNames) {
  const mutation=(mutationNames as readonly string[]).includes(name);
  server.registerTool(name,{
    title:name.split('_').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),description:descriptions[name],
    inputSchema:toolSchemas[name].shape as z.ZodRawShape, outputSchema:ToolResponseSchema.shape,
    annotations:{readOnlyHint:!mutation&&name!=='preview_animation'&&name!=='cancel_operation',destructiveHint:mutation,idempotentHint:mutation||name!=='preview_animation',openWorldHint:false}
  },async(args)=>{
    let result;
    try {const parsed=toolSchemas[name].parse(args);result=await editorRequest(await readConfig(),name,parsed);}
    catch(error){result={ok:false,error:error instanceof Error?error.message:String(error)};}
    if(name==='get_editor_status'&&!result.ok)result={ok:true,data:{connected:false,reason:result.error}};
    return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:result,isError:!result.ok};
  });
}
server.registerPrompt('create_animated_robot',{description:'Guided VoxelFlow robot pipeline',argsSchema:{brief:z.string().max(2000)}},({brief})=>({messages:[{role:'user',content:{type:'text',text:`Use VoxelFlow Studio to create this character: ${brief}\nInspect editor status. Translate the brief into create_model AssetSpec using template robot and target bedrock; supported controls are height 16–64, build balanced/slender/heavy, detail simple/detailed, palette primary/secondary/eyes hex colors, and idle/walk/attack speed 0.25–3 and intensity 0.1–1.5. Present the plan. Submit once with a UUID request_id, then ask me to approve in Blockbench. Poll get_operation until applied. Preview walk and attack, validate, and propose export. Wait for my export approval and save selection. Explain unsupported requests clearly.`}}]}));
await server.connect(new StdioServerTransport());
