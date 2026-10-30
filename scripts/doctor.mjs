// Read-only diagnostics bundled for end users. Never print raw errors or credentials.
import {readFile,access} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const scriptDir=dirname(fileURLToPath(import.meta.url));
const rootFlag=process.argv.indexOf('--root');
let plugin=basename(scriptDir)==='server'?dirname(scriptDir):resolve(scriptDir,'../plugins/voxelflow-studio');
if(rootFlag>=0){
  const candidate=resolve(process.argv[rootFlag+1]||'.');
  try{await access(join(candidate,'plugin.json'));plugin=candidate;}
  catch{plugin=join(candidate,'plugins','voxelflow-studio');}
}
const checks=[];
const record=(name,ok,detail)=>checks.push({name,ok,detail});
let client,transport,timer;
let stage='Desktop package';
try{
  const major=Number(process.versions.node.split('.')[0]);
  record('Node.js',major>=22,major>=22?process.versions.node:'Install Node.js 22 or newer, then reopen this launcher.');
  if(major<22)throw Error('unsupported-node');
  const manifest=JSON.parse(await readFile(join(plugin,'plugin.json'),'utf8'));
  await access(join(plugin,'server','server.mjs'));
  await access(join(plugin,'blockbench','voxelflow_studio.js'));
  record(stage,true,`VoxelFlow ${manifest.version}`);
  stage='MCP discovery';
  client=new Client({name:'voxelflow-diagnostics',version:manifest.version});
  const env=Object.fromEntries(['VOXELFLOW_STATE_DIR','VOXELFLOW_PORT','VOXELFLOW_TOKEN'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
  transport=new StdioClientTransport({command:process.execPath,args:[join(plugin,'server','server.mjs'),'--desktop'],cwd:plugin,env,stderr:'pipe'});
  const run=async()=>{
    await client.connect(transport);
    transport.stderr?.on('data',()=>{});
    const tools=await client.listTools();
    const prompts=await client.listPrompts();
    const required=['get_editor_status','create_prop','inspect_project','validate_asset','get_operation','apply_prop_materials','export_asset'];
    const available=required.every(name=>tools.tools.some(tool=>tool.name===name))&&prompts.prompts.some(prompt=>prompt.name==='create_minecraft_asset');
    record(stage,available,`${tools.tools.length} tools, ${prompts.prompts.length} prompts${available?'':'; required modeling tools are missing. Re-extract the desktop ZIP.'}`);
    stage='Live Blockbench';
    const response=await client.callTool({name:'get_editor_status',arguments:{}});
    const status=response.structuredContent;
    const connected=status?.ok===true&&status.data?.connected===true;
    record(stage,connected,connected?'Editor connected.':'No editor connection. Keep Start VoxelFlow.cmd running, then open Blockbench > Tools > VoxelFlow Studio > Connect.');
  };
  await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),15000);})]);
}catch{
  if(!checks.some(check=>check.name===stage))record(stage,false,stage==='Desktop package'?'Package incomplete. Extract the entire desktop-beta ZIP before running diagnostics.':'Local check failed or timed out. Restart the companion, reconnect Blockbench, and run this check again.');
}finally{
  clearTimeout(timer);
  try{await client?.close();}catch{}
  try{await transport?.close();}catch{}
}
const ready=checks.length===4&&checks.every(check=>check.ok);
const report={checkedAt:new Date().toISOString(),ready,checks,checksNaturalLanguageHost:false,note:'This checks the local package and editor only. It cannot verify tools or permissions in your AI chat. If chat says tools are unavailable, select local execution, enable VoxelFlow, and start a fresh local chat. A plugin mention alone is not a connection.'};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{for(const check of checks)console.log(`${check.ok?'PASS':'FIX '}  ${check.name}: ${check.detail}`);console.log(`\n${ready?'Local editor connection ready.':'Setup needs attention.'}\n${report.note}`);}
process.exitCode=ready?0:1;
