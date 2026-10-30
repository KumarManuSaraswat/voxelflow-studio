import {readFile,writeFile,mkdir,mkdtemp,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {WebSocket} from 'ws';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const temp=await mkdtemp(join(tmpdir(),'voxelflow-desktop-check-'));
const files=unzipSync(await readFile(`dist/voxelflow-desktop-beta-${version}.zip`));
for(const [path,bytes] of Object.entries(files)){
  assert(!path.includes('..')&&!path.startsWith('/')&&!path.includes('\\'));
  assert(!/(^|\/)(node_modules|\.local|\.research|\.git)(\/|$)/.test(path));
  const dest=resolve(temp,path);assert(dest.startsWith(temp+sep));
  await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes);
}
const root=join(temp,'plugins','voxelflow-studio'),manifest=JSON.parse(await readFile(join(root,'plugin.json'),'utf8'));
assert.equal(manifest.version,version);assert.equal(manifest.extensions['com.openai'].requires_local_executor,true);
const config=JSON.parse(await readFile(join(root,'mcp.json'),'utf8')).mcpServers.voxelflow;
const catalog=JSON.parse(await readFile(join(temp,'.agents/plugins/marketplace.json'),'utf8'));
assert.equal(catalog.plugins[0].name,manifest.name);
for(const path of [manifest.extensions['com.openai'].onboardingSkill,...manifest.extensions['com.openai'].interface.screenshots])await stat(resolve(root,path));
const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const state=join(temp,'state'),env={...process.env,VOXELFLOW_STATE_DIR:state,VOXELFLOW_PORT:String(port)};delete env.VOXELFLOW_TOKEN;
const bridge=spawn(process.execPath,[join(root,'server/bridge-cli.mjs'),'--desktop'],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';bridge.stderr.on('data',b=>logs+=b);bridge.stdout.on('data',b=>logs+=b);
const client=new Client({name:'voxelflow-desktop-package-check',version});
let diagnosticEditor;
async function diagnose(args=[]){
  return await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[join(root,'server/doctor.mjs'),'--json',...args],{cwd:temp,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill();reject(Error('Diagnostics did not terminate'));},25000);
    child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('close',code=>{clearTimeout(timeout);try{resolve({code,stdout,stderr,report:JSON.parse(stdout)});}catch{reject(Error('Diagnostics did not return JSON'));}});
  });
}
try{
  let pairing;
  for(let i=0;i<100;i++){
    try{pairing=JSON.parse(await readFile(join(state,'bridge.json'),'utf8'));break;}catch{}
    if(bridge.exitCode!==null)throw Error(`Companion exited: ${logs}`);
    await new Promise(r=>setTimeout(r,50));
  }
  assert(pairing,'Companion did not start');assert.equal(pairing.port,port);assert(!logs.includes(pairing.token),'Desktop launcher logged its credential');
  await client.connect(new StdioClientTransport({command:process.execPath,args:config.args.map(a=>a.replace('${PLUGIN_ROOT}',root)),cwd:temp,env,stderr:'pipe'}));
  const list=await client.listTools();assert.equal(list.tools.length,14);
  const prompts=await client.listPrompts();assert.equal(prompts.prompts.length,2);
  const status=await client.callTool({name:'get_editor_status',arguments:{}});assert.deepEqual(status.structuredContent.data.connected,false);
  const bad=await client.callTool({name:'create_prop',arguments:{request_id:crypto.randomUUID(),spec:{}}});assert.equal(bad.isError,true);
  await stat(join(root,'Check VoxelFlow.cmd'));
  const disconnected=await diagnose();assert.equal(disconnected.code,1);assert.equal(disconnected.report.ready,false);assert.equal(disconnected.report.checks.find(c=>c.name==='MCP discovery').ok,true);assert.equal(disconnected.report.checks.find(c=>c.name==='Live Blockbench').ok,false);
  const missing=await diagnose(['--root',join(temp,'missing-package')]);assert.equal(missing.code,1);assert.equal(missing.report.checks.find(c=>c.name==='Desktop package').ok,false);
  // Protocol fixture for diagnostics only; this is not evidence of live editor behavior.
  diagnosticEditor=new WebSocket(`ws://127.0.0.1:${port}/editor`);
  await new Promise((resolve,reject)=>{
    diagnosticEditor.once('error',reject);
    diagnosticEditor.once('open',()=>diagnosticEditor.send(JSON.stringify({type:'hello',token:pairing.token})));
    diagnosticEditor.on('message',bytes=>{
      const message=JSON.parse(bytes.toString());
      if(message.type==='welcome')resolve();
      if(message.type==='command'){
        assert.equal(message.tool,'get_editor_status','Diagnostics must never mutate the editor');
        diagnosticEditor.send(JSON.stringify({type:'result',id:message.id,result:{ok:true,data:{connected:true,blockbenchVersion:'fixture',reason:pairing.token}}}));
      }
    });
  });
  const connected=await diagnose();assert.equal(connected.code,0,JSON.stringify(connected.report));assert.equal(connected.report.ready,true);assert.equal(connected.report.checksNaturalLanguageHost,false);
  for(const run of [disconnected,missing,connected])assert(!(run.stdout+run.stderr).includes(pairing.token),'Diagnostics leaked a credential');
  const result={version,archiveFiles:Object.keys(files).length,nodeModulesRequired:false,mcpTools:list.tools.length,mcpPrompts:prompts.prompts.length,disconnectedReportedHonestly:true,invalidInputRejected:true,tokenPrinted:false,manifestPathsExist:true,standaloneDiagnostics:{disconnected:true,incompletePackage:true,connectedProtocolFixture:true,readOnly:true,hostAccessNotAssumed:true}};
  await writeFile('docs/evidence/desktop-package.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{diagnosticEditor?.terminate();await client.close();bridge.kill();}
