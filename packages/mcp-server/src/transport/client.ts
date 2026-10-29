import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { ToolName, ToolResponse, ToolResponseSchema } from '../../../core/src/schema';
export async function editorRequest(config:{port:number;token:string},tool:ToolName,args:unknown,timeoutMs=18000):Promise<ToolResponse> {
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(`ws://127.0.0.1:${config.port}/client`,{maxPayload:2*1024*1024,perMessageDeflate:false});
    const id=randomUUID();let done=false;
    const finish=(result?:ToolResponse,error?:Error)=>{if(done)return;done=true;clearTimeout(timer);ws.close();if(error)reject(error);else resolve(result!);};
    const timer=setTimeout(()=>{finish(undefined,new Error('Bridge timed out. Check get_operation before retrying the same request_id.'));ws.terminate();},timeoutMs);
    ws.on('open',()=>ws.send(JSON.stringify({type:'hello',token:config.token})));
    ws.on('message',raw=>{try{const m=JSON.parse(raw.toString());if(m.type==='welcome')ws.send(JSON.stringify({type:'command',id,tool,args}));else if(m.type==='result'&&m.id===id)finish(ToolResponseSchema.parse(m.result));else if(m.type==='protocol_error')finish(undefined,new Error(m.error));}catch(e){finish(undefined,e as Error);}});
    ws.on('error',()=>finish(undefined,new Error('Cannot reach the local bridge. Start npm run bridge and connect the Blockbench panel.')));
    ws.on('close',(_code,reason)=>{if(!done)finish(undefined,new Error(`Bridge connection closed: ${reason.toString()||'check the session token'}`));});
  });
}
