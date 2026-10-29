import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const client=new Client({name:'voxelflow-cli-check',version:'0.3.2'});
try{
  await client.connect(new StdioClientTransport({command:process.execPath,args:[resolve('packages/mcp-server/dist/server.js')],stderr:'inherit'}));
  const name=process.argv[2]??'get_editor_status',args=process.argv[3]?JSON.parse(await readFile(process.argv[3],'utf8')):{};
  const result=name==='list'?await client.listTools():await client.callTool({name,arguments:args});console.log(JSON.stringify(result,null,2));
  if('isError' in result&&result.isError)process.exitCode=1;
}catch(error){console.error(error);process.exitCode=1;}finally{await client.close();}
