import {readFile,writeFile,mkdir,mkdtemp,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
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
  const result={version,archiveFiles:Object.keys(files).length,nodeModulesRequired:false,mcpTools:list.tools.length,mcpPrompts:prompts.prompts.length,disconnectedReportedHonestly:true,invalidInputRejected:true,tokenPrinted:false,manifestPathsExist:true};
  await writeFile('docs/evidence/desktop-package.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await client.close();bridge.kill();}
