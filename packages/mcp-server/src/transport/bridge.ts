import { createServer } from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { parseTool, ToolResponseSchema } from '../../../core/src/schema';

export async function startBridge(options:{port:number;token:string;timeoutMs?:number}) {
  if(!/^[a-f0-9]{64}$/.test(options.token)) throw new Error('Bridge token must be 32 cryptographically random bytes encoded as hex.');
  const timeoutMs=options.timeoutMs??15000;
  const http=createServer((_req,res)=>{res.writeHead(404,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('VoxelFlow local bridge');});
  const wss=new WebSocketServer({noServer:true,maxPayload:2*1024*1024,perMessageDeflate:false});
  let editor:WebSocket|undefined;
  const clients=new Set<WebSocket>();
  const pending=new Map<string,{client:WebSocket;clientId:string;timer:ReturnType<typeof setTimeout>}>();
  const send=(ws:WebSocket,data:unknown)=>{if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(data));};
  const fail=(ws:WebSocket,id:string,error:string)=>send(ws,{type:'result',id,result:{ok:false,error}});
  http.on('upgrade',(req,socket,head)=>{
    const host=req.headers.host, origin=req.headers.origin;
    const validHost=host===`127.0.0.1:${(http.address() as {port:number})?.port}`;
    if(!validHost || (origin!==undefined && origin!=='file://' && origin!=='null') || !['/editor','/client'].includes(req.url??'')) {socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>{
      let authenticated=false; const role=req.url==='/editor'?'editor':'client';
      const authTimer=setTimeout(()=>ws.close(1008,'Authenticate first'),3000);
      let alive=true; ws.on('pong',()=>{alive=true;});
      const heartbeat=setInterval(()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();},15000);
      ws.on('message',raw=>{
        try {
          const data=JSON.parse(raw.toString());
          if(!authenticated) {
            if(data.type!=='hello'||typeof data.token!=='string'||!/^[a-f0-9]{64}$/.test(data.token)||!timingSafeEqual(Buffer.from(data.token),Buffer.from(options.token))) {ws.close(1008,'Invalid session token');return;}
            if(role==='editor' && editor) {ws.close(1008,'Another editor is connected');return;}
            authenticated=true;clearTimeout(authTimer);
            if(role==='editor')editor=ws;else clients.add(ws);
            send(ws,{type:'welcome',role,protocol:1});return;
          }
          if(role==='client' && data.type==='command') {
            if(typeof data.id!=='string'||data.id.length>80) throw new Error('Invalid transport ID.');
            const command=parseTool(data.tool,data.args);
            if(!editor || editor.readyState!==WebSocket.OPEN){fail(ws,data.id,'Blockbench is disconnected. Open VoxelFlow Studio and connect with this session token.');return;}
            if(pending.size>=32) {fail(ws,data.id,'The editor is busy. Wait for the current operation.');return;}
            const id=randomUUID(); const timer=setTimeout(()=>{const p=pending.get(id);if(p){fail(p.client,p.clientId,'The editor did not reply. Inspect the operation before retrying with the same request_id.');pending.delete(id);}},timeoutMs);
            pending.set(id,{client:ws,clientId:data.id,timer}); send(editor,{type:'command',id,tool:command.name,args:command.args});
          } else if(role==='editor' && data.type==='result') {
            const p=pending.get(data.id);if(!p)return;
            const result=ToolResponseSchema.parse(data.result);clearTimeout(p.timer);pending.delete(data.id);send(p.client,{type:'result',id:p.clientId,result});
          } else throw new Error('Message is not allowed for this connection.');
        } catch(error) {send(ws,{type:'protocol_error',error:error instanceof Error?error.message:'Invalid message'});}
      });
      ws.on('error',()=>{});
      ws.on('close',()=>{
        clearTimeout(authTimer);clearInterval(heartbeat);clients.delete(ws);
        if(editor===ws) {editor=undefined;for(const [id,p] of pending){clearTimeout(p.timer);fail(p.client,p.clientId,'Blockbench disconnected before replying. Check the operation before retrying.');pending.delete(id);}}
        else for(const [id,p] of pending) if(p.client===ws){clearTimeout(p.timer);pending.delete(id);}
      });
    });
  });
  await new Promise<void>((resolve,reject)=>{http.once('error',reject);http.listen(options.port,'127.0.0.1',()=>{http.off('error',reject);resolve();});});
  return {port:(http.address() as {port:number}).port,close:async()=>{for(const ws of wss.clients)ws.terminate();for(const p of pending.values())clearTimeout(p.timer);pending.clear();await new Promise<void>(resolve=>wss.close(()=>resolve()));await new Promise<void>(resolve=>http.close(()=>resolve()));}};
}
