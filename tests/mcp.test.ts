import {it,expect} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {startBridge} from '../packages/mcp-server/src/transport/bridge';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {WebSocket} from 'ws';
it('official SDK negotiates stdio, exposes schemas, validates inputs and reports disconnection',async()=>{
  const token=randomBytes(32).toString('hex'),bridge=await startBridge({port:0,token});
  const client=new Client({name:'voxelflow-test',version:'0.1.0'});
  let fixture:WebSocket|undefined;
  try{
    await client.connect(new StdioClientTransport({command:process.execPath,args:['--import','tsx',resolve('packages/mcp-server/src/server.ts')],env:{...Object.fromEntries(Object.entries(process.env).filter((e):e is [string,string]=>e[1]!==undefined)),VOXELFLOW_PORT:String(bridge.port),VOXELFLOW_TOKEN:token},stderr:'pipe'}));
    const list=await client.listTools();expect(list.tools).toHaveLength(14);const create=list.tools.find(t=>t.name==='create_prop')!;expect(create.annotations?.readOnlyHint).toBe(false);expect(create.inputSchema.required).toContain('request_id');expect(list.tools.some(t=>t.name==='apply_prop_materials')).toBe(true);
    // Regression: the real Codex host rejected tuple-style `items: [...]`, hiding
    // create_prop even though ordinary MCP discovery succeeded.
    const part=(create.inputSchema.properties!.spec as any).properties.parts.items;
    expect(part.properties.repeat.properties.count).toMatchObject({type:'integer',minimum:2,maximum:128});
    expect(part.properties.repeat.properties.step).toMatchObject({type:'array',items:{type:'number'},minItems:3,maxItems:3});
    expect(list.tools.find(t=>t.name==='inspect_project')!.inputSchema.properties!.detail).toMatchObject({default:'summary',enum:['summary','full']});
    for(const field of ['from','to','rotation','pivot']){
      expect(part.properties[field]).toMatchObject({type:'array',items:{type:'number'},minItems:3,maxItems:3});
      expect(Array.isArray(part.properties[field].items)).toBe(false);
    }
    const status=await client.callTool({name:'get_editor_status',arguments:{}});expect(status.structuredContent).toMatchObject({ok:true,data:{connected:false}});
    const inspect=await client.callTool({name:'inspect_project',arguments:{}});expect(inspect.isError).toBe(true);
    const bad=await client.callTool({name:'create_model',arguments:{request_id:crypto.randomUUID(),spec:{height:-100}}});expect(bad.isError).toBe(true);
    // A transport fixture verifies compact input survives SDK + bridge parsing;
    // native approval and actual scene edits are covered separately.
    const received:any[]=[];
    fixture=new WebSocket(`ws://127.0.0.1:${bridge.port}/editor`);
    await new Promise<void>((resolve,reject)=>{
      fixture!.once('error',reject);fixture!.once('open',()=>fixture!.send(JSON.stringify({type:'hello',token})));
      fixture!.on('message',raw=>{
        const message=JSON.parse(raw.toString());if(message.type==='welcome')resolve();
        if(message.type==='command'){received.push(message);fixture!.send(JSON.stringify({type:'result',id:message.id,result:{ok:true,data:{state:'pending_approval',id:message.args.request_id}}}));}
      });
    });
    const compact={name:'steps',description:'Three steps',materials:[{name:'wood',color:'#775533'}],parts:[{name:'step',from:[0,0,0],to:[2,1,1],material:'wood',repeat:{count:3,step:[0,2,0]}}]};
    const proposed=await client.callTool({name:'create_prop',arguments:{request_id:crypto.randomUUID(),spec:compact}});
    expect(proposed.structuredContent).toMatchObject({ok:true,data:{state:'pending_approval'}});
    expect(received[0].args.spec.parts).toHaveLength(3);
    expect(received[0].args.spec.parts[2]).toMatchObject({name:'step_3',from:[0,4,0]});
    await client.callTool({name:'inspect_project',arguments:{}});expect(received.at(-1).args).toEqual({detail:'summary'});
    await client.callTool({name:'inspect_project',arguments:{detail:'full'}});expect(received.at(-1).args).toEqual({detail:'full'});
  }finally{fixture?.terminate();await client.close();await bridge.close();}
},15000);
