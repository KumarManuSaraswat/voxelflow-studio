// A real MCP client, useful for Inspector-style testing without a paid AI API.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
import { AssetSpecSchema } from '../packages/core/src/schema';
import {propPreset} from '../packages/core/src/props';
const client=new Client({name:'voxelflow-demo',version:'0.3.2'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[resolve('packages/mcp-server/dist/server.js')],stderr:'inherit'}));
async function call(name:string,args:Record<string,unknown>={}){const r=await client.callTool({name,arguments:args});const d=r.structuredContent as any;if(!d?.ok)throw new Error(d?.error??JSON.stringify(r));return d.data;}
async function mutation(name:string,args:Record<string,unknown>){const request_id=crypto.randomUUID(),op=await call(name,{request_id,...args});console.log(`${op.summary}\nApprove this proposal in Blockbench. Operation: ${request_id}`);const until=Date.now()+5*60*1000;while(Date.now()<until){await new Promise(r=>setTimeout(r,700));const state=await call('get_operation',{operation_id:request_id});if(state.state==='applied'){console.log('Applied:',state.result);return;}if(['failed','rejected','cancelled'].includes(state.state))throw new Error(state.error??state.state);}throw new Error('Approval timed out. Inspect/cancel the operation before retrying.');}
try{
  const tools=await client.listTools();console.log(`${tools.tools.length} MCP tools available.`);
  const status=await call('get_editor_status');console.log(status);if(!status.connected)throw new Error(status.reason??'Connect Blockbench first.');
  if(process.argv.includes('--status'))process.exitCode=0;
  else {
    const index=process.argv.indexOf('--prop'),prop=index<0?undefined:process.argv[index+1];
    if(index>=0&&prop!=='bag'&&prop!=='staff')throw new Error('Use --prop bag or --prop staff. Design arbitrary props with create_prop in your connected AI host.');
    if(prop==='bag'||prop==='staff')await mutation('create_prop',{spec:propPreset(prop)});
    else await mutation('create_model',{spec:AssetSpecSchema.parse({height:40,build:'slender'})});
    console.log(await call('inspect_project'));if(!prop)await call('preview_animation',{clip:'walk',playing:true});
    console.log(await call('validate_asset'));await mutation('export_asset',{target:'bedrock'});
  }
}catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}finally{await client.close();}
