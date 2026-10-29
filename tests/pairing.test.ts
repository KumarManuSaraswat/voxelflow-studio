import {describe,it,expect,vi,afterEach} from 'vitest';
import {parsePairing} from '../packages/core/src/pairing';
import {localPairing} from '../packages/blockbench-plugin/src/bridge/pairing';
import path from 'node:path';
afterEach(()=>vi.unstubAllGlobals());
describe('local companion pairing boundary',()=>{
  it('keeps only local port and token, never an injected address or command',()=>{expect(parsePairing(JSON.stringify({port:32123,token:'a'.repeat(64),url:'https://remote.example',command:'bad'}))).toEqual({port:32123,token:'a'.repeat(64)});});
  it.each([{},null,{port:80,token:'a'.repeat(64)},{port:32123,token:'short'},{port:'32123',token:'a'.repeat(64)}])('rejects malformed connection data %j',value=>expect(()=>parsePairing(JSON.stringify(value))).toThrow());
  it('bounds the connection file',()=>expect(()=>parsePairing(' '.repeat(8193))).toThrow('too large'));
});
it('pairs through the public Blockbench read API without a global fs binding',()=>{
  vi.stubGlobal('SystemInfo',{home_directory:'/test/home'});vi.stubGlobal('PathModule',path);
  const read=vi.fn((_paths,_options,callback)=>callback([{content:JSON.stringify({port:32124,token:'b'.repeat(64)})}]));vi.stubGlobal('Blockbench',{read});
  expect(localPairing()).toEqual({port:32124,token:'b'.repeat(64)});
  expect(read.mock.calls[0][0]).toEqual([path.join('/test/home','.voxelflow-studio','bridge.json')]);
});
it('leaves manual pairing available when the companion file does not exist',()=>{
  vi.stubGlobal('SystemInfo',{home_directory:'/test/home'});vi.stubGlobal('PathModule',path);vi.stubGlobal('Blockbench',{read:()=>undefined});expect(localPairing()).toBeUndefined();
});
