import {parsePairing,Pairing} from '../../../core/src/pairing';
// Installed Blockbench desktop APIs; read only our fixed per-user connection file.
declare const PathModule:typeof import('node:path');
export function localPairing():Pairing|undefined {
  try{
    const file=PathModule.join(SystemInfo.home_directory,'.voxelflow-studio','bridge.json');
    let pairing:Pairing|undefined;
    // Desktop read() invokes its callback synchronously. Use the public read API;
    // Blockbench 5.2 doesn't expose the internal fs binding to plugins.
    Blockbench.read([file],{readtype:'text',errorbox:false},(files:{content?:unknown}[])=>{
      const content=files[0]?.content;if(typeof content==='string')pairing=parsePairing(content);
    });
    return pairing;
  }catch{return;}
}
