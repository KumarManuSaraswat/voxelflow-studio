import { afterEach,describe,it,expect } from 'vitest';
import { WebSocket } from 'ws';
import { randomBytes } from 'node:crypto';
import { startBridge } from '../packages/mcp-server/src/transport/bridge';
import { editorRequest } from '../packages/mcp-server/src/transport/client';
const token=randomBytes(32).toString('hex');
let bridge:Awaited<ReturnType<typeof startBridge>>|undefined;
afterEach(async()=>{await bridge?.close();bridge=undefined;});
const start=async()=>{bridge=await startBridge({port:0,token,timeoutMs:100});return {port:bridge.port,token};};
async function fakeEditor(port:number){const ws=new WebSocket(`ws://127.0.0.1:${port}/editor`,{origin:'file://'});await new Promise<void>((resolve,reject)=>{ws.on('open',()=>ws.send(JSON.stringify({type:'hello',token})));ws.on('message',raw=>{if(JSON.parse(raw.toString()).type==='welcome')resolve();});ws.on('error',reject);});return ws;}
describe('authenticated localhost transport',()=>{
  it('fails honestly when Blockbench is disconnected',async()=>{const c=await start();const result=await editorRequest(c,'inspect_project',{});expect(result.ok).toBe(false);expect(result.error).toContain('disconnected');});
  it('rejects an invalid session token',async()=>{const c=await start();await expect(editorRequest({...c,token:'0'.repeat(64)},'inspect_project',{})).rejects.toThrow('Invalid session token');});
  it('rejects unrelated website Origins before authentication',async()=>{const c=await start();const ws=new WebSocket(`ws://127.0.0.1:${c.port}/client`,{origin:'https://unrelated.example'});await expect(new Promise((_r,j)=>ws.on('error',j))).rejects.toThrow('403');});
  it('routes only responses from the connected editor',async()=>{const c=await start(),ws=await fakeEditor(c.port);ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.type==='command')ws.send(JSON.stringify({type:'result',id:m.id,result:{ok:true,data:{marker:'test fixture',tool:m.tool}}}));});const result=await editorRequest(c,'inspect_project',{});expect(result).toEqual({ok:true,data:{marker:'test fixture',tool:'inspect_project'}});ws.close();});
  it('times out without pretending the command succeeded',async()=>{const c=await start(),ws=await fakeEditor(c.port);const result=await editorRequest(c,'inspect_project',{});expect(result.ok).toBe(false);expect(result.error).toContain('did not reply');ws.close();});
  it('rejects a second authenticated editor',async()=>{const c=await start(),first=await fakeEditor(c.port);const second=new WebSocket(`ws://127.0.0.1:${c.port}/editor`);second.on('open',()=>second.send(JSON.stringify({type:'hello',token})));const reason=await new Promise<string>(resolve=>second.on('close',(_code,reason)=>resolve(reason.toString())));expect(reason).toContain('Another editor');first.close();});
  it('validates inputs on the bridge independently of the MCP host',async()=>{const c=await start();const ws=new WebSocket(`ws://127.0.0.1:${c.port}/client`);const error=await new Promise<string>((resolve,reject)=>{ws.on('open',()=>ws.send(JSON.stringify({type:'hello',token})));ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.type==='welcome')ws.send(JSON.stringify({type:'command',id:'1',tool:'execute_script',args:{script:'bad'}}));if(m.type==='protocol_error'){resolve(m.error);ws.close();}});ws.on('error',reject);});expect(error).toContain('Unknown operation');});
});
