// Read-only preflight for the packaged desktop beta. Never prints session credentials.
import {readFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const rootFlag=process.argv.indexOf('--root');
const root=resolve(rootFlag>=0?process.argv[rootFlag+1]||'.':'.');
const plugin=join(root,'plugins','voxelflow-studio');
const results=[];
const record=(name,ok,detail)=>results.push({name,ok,detail});
const json=process.argv.includes('--json');
let client;
try {
  const major=Number(process.versions.node.split('.')[0]);
  record('Node.js',major>=22,process.versions.node);
  if(major<22)throw Error('Install Node.js 22 or newer.');
  const manifest=JSON.parse(await readFile(join(plugin,'plugin.json'),'utf8'));
  await access(join(plugin,'server','server.mjs'));
  await access(join(plugin,'blockbench','voxelflow_studio.js'));
  record('Desktop package',true,`VoxelFlow ${manifest.version}`);
  client=new Client({name:'voxelflow-preflight',version:manifest.version});
  const transport=new StdioClientTransport({command:process.execPath,args:[join(plugin,'server','server.mjs'),'--desktop'],cwd:plugin,stderr:'pipe'});
  transport.stderr?.on('data',()=>{});
  const timeout=setTimeout(()=>{void client.close();},15000);
  try{
    await client.connect(transport);
    const tools=await client.listTools();
    const prompts=await client.listPrompts();
    record('MCP discovery',tools.tools.length===14&&prompts.prompts.length===2,`${tools.tools.length} tools, ${prompts.prompts.length} prompts`);
    const response=await client.callTool({name:'get_editor_status',arguments:{}});
    const status=response.structuredContent;
    record('Live Blockbench',status?.ok===true&&status.data?.connected===true,status?.data?.connected?`Connected to Blockbench ${status.data.blockbenchVersion||status.data.version||'desktop'}`:'Disconnected. Start the companion, then Tools > VoxelFlow Studio > Connect.');
  }finally{clearTimeout(timeout);}
} catch(error) {
  record('Setup',false,String(error?.message||error).replace(/[a-f\d]{64}/gi,'[redacted]'));
} finally {await client?.close();}
const ready=results.length>=4&&results.every(result=>result.ok);
const report={checkedAt:new Date().toISOString(),ready,checks:results,checksNaturalLanguageHost:false,note:'This checks the package, MCP discovery, and editor connection. Rehearse a prompt in your chosen AI chat separately.'};
if(json)console.log(JSON.stringify(report,null,2));
else{for(const result of results)console.log(`${result.ok?'PASS':'FIX '}  ${result.name}: ${result.detail}`);console.log(`\n${ready?'Editor connection ready.':'Setup needs attention.'} ${report.note}`);}
process.exitCode=ready?0:1;
