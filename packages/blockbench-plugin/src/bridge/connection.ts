import { Workflow } from '../editor/workflow';
export class Connection {
  socket?:WebSocket;
  status='Offline · presets available';
  connected=false;
  onChange=()=>{};
  constructor(private workflow:Workflow){}
  connect(port:number,token:string) {
    if(!Number.isInteger(port)||port<1024||port>65535||!/^[a-f0-9]{64}$/.test(token))throw new Error('Use the bridge’s port and 64-character session token.');
    this.disconnect();this.status='Connecting…';this.onChange();
    const socket=this.socket=new WebSocket(`ws://127.0.0.1:${port}/editor`);
    socket.onopen=()=>socket.send(JSON.stringify({type:'hello',token}));
    socket.onmessage=async event=>{
      try{const m=JSON.parse(event.data);if(m.type==='welcome'){this.connected=true;this.status='Connected to local MCP';this.onChange();}
      else if(m.type==='command'&&typeof m.id==='string'&&m.id.length<81){const result=await this.workflow.request(m.tool,m.args,true);if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'result',id:m.id,result}));}}
      catch{this.status='Invalid bridge message';this.onChange();}
    };
    socket.onerror=()=>{if(this.socket!==socket)return;this.status='Cannot connect · start the bridge';this.onChange();};
    socket.onclose=event=>{if(this.socket!==socket)return;this.connected=false;this.status=event.reason?`Disconnected · ${event.reason}`:'Disconnected · reconnect when ready';this.workflow.disconnected();this.onChange();};
  }
  disconnect(){const socket=this.socket;this.socket=undefined;if(socket){socket.onclose=null;socket.close();}this.connected=false;this.status='Offline · presets available';this.workflow.disconnected();this.onChange();}
}
