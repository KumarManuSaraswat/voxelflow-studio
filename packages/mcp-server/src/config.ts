import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const sessionFile = resolve(projectRoot,'.local/bridge.json');
export async function readConfig():Promise<{port:number;token:string}> {
  let disk:{port?:number;token?:string}={};
  if(!process.env.VOXELFLOW_TOKEN) { try {disk=JSON.parse(await readFile(sessionFile,'utf8'));}catch{throw new Error('Start npm run bridge first, then connect VoxelFlow in Blockbench.');} }
  const port=Number(process.env.VOXELFLOW_PORT??disk.port??32123), token=process.env.VOXELFLOW_TOKEN??disk.token;
  if(!Number.isInteger(port)||port<1024||port>65535||!token||!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid bridge configuration: use a port from 1024–65535 and a 64-character hexadecimal session token.');
  return {port,token};
}
