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
  create_prop:'Create a Minecraft-style prop from the user’s natural-language request: bags/backpacks, staffs, swords, shields, furniture, chests, lanterns, or other objects representable by cubes. YOU design a structured PropSpec with 1–128 named cube parts and 1–16 named hex-color materials. There is NO category whitelist or keyword parser. Y is up, front is negative Z, coordinates/pivots must be -128..128 pixels, from < to, rotations in degrees. Organize related parts with group names; include recognizable silhouette and details. This tool builds real geometry, part groups, PNG atlas and UVs in a NEW Blockbench tab. It creates a static prop, not a humanoid or a registered game item. Returns pending_approval; wait for the artist to approve in Blockbench, then poll get_operation. Do not claim emissive materials or gameplay behavior.',
  apply_prop_materials:'Propose changing named colors on an existing VoxelFlow prop. First inspect_project to read its actual material names. Supply only the names/colors to update; preserve other materials, painted pixels and geometry. Requires Blockbench approval.',
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
const server=new McpServer({name:'voxelflow-studio',version:'0.3.1'},{instructions:'VoxelFlow is a prompt-to-Minecraft-model plugin. The artist enters the prompt HERE in ChatGPT/Codex; Blockbench is the approval, editing, and preview workspace. First get_editor_status. For bags, staffs, weapons, furniture and other props, translate the brief into create_prop geometry and named materials. Do not force props into the robot template or invent a humanoid rig. You may design new object types: the generic cube blueprint is not limited to presets. Use create_model only for the animated robot template. Present the design, call the appropriate tool once, then wait for native approval and poll get_operation. All changes require approval; never report success before applied or bypass it. Reuse IDs for retries. Inspect actual material names before recoloring props. Validate before export. Output is editable resource assets, not a game-tested item, wearable, weapon, or mob. Creating a held item or equippable bag requires additional game integration.'});
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
server.registerPrompt('create_minecraft_asset',{description:'Turn a prompt into an editable Minecraft prop or animated robot',argsSchema:{brief:z.string().min(1).max(3000)}},({brief})=>({messages:[{role:'user',content:{type:'text',text:`Create this Minecraft-style model with VoxelFlow: ${brief}\nCheck editor status. For a prop, design a PropSpec for create_prop: a recognizable silhouette, useful named parts/groups, up to 128 cubes, and up to 16 named hex-color materials. Use pixels, Y up, front negative Z, positive dimensions, and finite coordinates within -128..128. Include requested details such as straps, buckles, pockets, handles, crystal facets or fittings. This is a general geometry builder, not a fixed preset selector. Use create_model only for the robot character template. Explain the plan, submit one UUID request, wait for native approval, and poll until applied. Inspect and validate the live result. Propose export only when requested. Do not claim automatic game item registration or unimplemented effects.`}}]}));
await server.connect(new StdioServerTransport());
