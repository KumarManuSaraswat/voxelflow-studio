export interface Pairing {port:number;token:string}
export function parsePairing(text:string):Pairing {
  if(text.length>8192)throw new Error('The companion connection file is too large.');
  const value=JSON.parse(text);
  if(!value||!Number.isInteger(value.port)||value.port<1024||value.port>65535||typeof value.token!=='string'||!/^[a-f0-9]{64}$/.test(value.token))throw new Error('Invalid companion connection. Restart the VoxelFlow companion.');
  return {port:value.port,token:value.token};
}
