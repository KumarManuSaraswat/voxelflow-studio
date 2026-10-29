import {it,expect} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {startBridge} from '../packages/mcp-server/src/transport/bridge';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
it('official SDK negotiates stdio, exposes schemas, validates inputs and reports disconnection',async()=>{
  const token=randomBytes(32).toString('hex'),bridge=await startBridge({port:0,token});
  const client=new Client({name:'voxelflow-test',version:'0.1.0'});
  try{
    await client.connect(new StdioClientTransport({command:process.execPath,args:['--import','tsx',resolve('packages/mcp-server/src/server.ts')],env:{...Object.fromEntries(Object.entries(process.env).filter((e):e is [string,string]=>e[1]!==undefined)),VOXELFLOW_PORT:String(bridge.port),VOXELFLOW_TOKEN:token},stderr:'pipe'}));
    const list=await client.listTools();expect(list.tools).toHaveLength(14);const create=list.tools.find(t=>t.name==='create_prop')!;expect(create.annotations?.readOnlyHint).toBe(false);expect(create.inputSchema.required).toContain('request_id');expect(list.tools.some(t=>t.name==='apply_prop_materials')).toBe(true);
    // Regression: the real Codex host rejected tuple-style `items: [...]`, hiding
    // create_prop even though ordinary MCP discovery succeeded.
    const part=(create.inputSchema.properties!.spec as any).properties.parts.items;
    for(const field of ['from','to','rotation','pivot']){
      expect(part.properties[field]).toMatchObject({type:'array',items:{type:'number'},minItems:3,maxItems:3});
      expect(Array.isArray(part.properties[field].items)).toBe(false);
    }
    const status=await client.callTool({name:'get_editor_status',arguments:{}});expect(status.structuredContent).toMatchObject({ok:true,data:{connected:false}});
    const inspect=await client.callTool({name:'inspect_project',arguments:{}});expect(inspect.isError).toBe(true);
    const bad=await client.callTool({name:'create_model',arguments:{request_id:crypto.randomUUID(),spec:{height:-100}}});expect(bad.isError).toBe(true);
  }finally{await client.close();await bridge.close();}
},15000);
