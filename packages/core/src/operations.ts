import { Operation, ToolName } from './schema';

export class OperationLedger {
  private records = new Map<string,{ fingerprint:string; operation:Operation }>();
  constructor(private limit=256) {}
  propose(id:string, tool:ToolName, args:unknown, summary:string): { operation:Operation; fresh:boolean } {
    const fingerprint=JSON.stringify({tool,args}); const existing=this.records.get(id);
    if(existing) { if(existing.fingerprint!==fingerprint) throw new Error('This request ID was already used with different parameters.'); return {operation:existing.operation,fresh:false}; }
    if(this.records.size>=this.limit) throw new Error('This editor session has reached its operation limit. Reload the plugin before starting a new session.');
    const operation:Operation={id,tool,state:'pending_approval',summary,createdAt:new Date().toISOString()};
    this.records.set(id,{fingerprint,operation}); return {operation,fresh:true};
  }
  get(id:string):Operation {const op=this.records.get(id)?.operation;if(!op) throw new Error('Operation not found in this editor session.');return op;}
  transition(id:string,state:Operation['state'],details:Partial<Pick<Operation,'result'|'error'>>={}) {
    const op=this.get(id);
    const allowed:Record<Operation['state'],Operation['state'][]>={pending_approval:['applying','rejected','cancelled','failed'],applying:['applied','failed','cancelled'],applied:[],failed:[],cancelled:[],rejected:[]};
    if(!allowed[op.state].includes(state)) throw new Error(`Cannot change an operation from ${op.state} to ${state}.`);
    Object.assign(op,{state},details);return op;
  }
  list() {return [...this.records.values()].map(v=>v.operation);}
  cancelPending() {for(const op of this.list()) if(op.state==='pending_approval') this.transition(op.id,'cancelled');}
}
