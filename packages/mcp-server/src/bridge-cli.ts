import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { startBridge } from './transport/bridge';
import { sessionFile,desktopMode } from './config';
const port=Number(process.env.VOXELFLOW_PORT??32123);
if(!Number.isInteger(port)||port<1024||port>65535) throw new Error('VOXELFLOW_PORT must be between 1024 and 65535.');
const token=process.env.VOXELFLOW_TOKEN??randomBytes(32).toString('hex');
const bridge=await startBridge({port,token});
await mkdir(dirname(sessionFile),{recursive:true,mode:0o700});
await writeFile(sessionFile,JSON.stringify({port,token}),{mode:0o600});
console.error(desktopMode?`VoxelFlow companion ready on 127.0.0.1:${port}.\nOpen Blockbench → VoxelFlow → Connect. The connection is filled in automatically.\nKeep this window open while using VoxelFlow. Close it or press Ctrl+C to stop.`:`VoxelFlow bridge listening on 127.0.0.1:${port}\nPaste this session token into Blockbench → VoxelFlow → Connect:\n${token}\nKeep this terminal open. The token stays local and changes on restart.`);
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await bridge.close();try{const current=JSON.parse(await readFile(sessionFile,'utf8'));if(current.token===token)await unlink(sessionFile);}catch{}process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
