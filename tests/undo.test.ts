import {afterEach,expect,it,vi} from 'vitest';
import {installAnimationUndoFix} from '../packages/blockbench-plugin/src/editor/undo';
afterEach(()=>vi.unstubAllGlobals());
it('restores a shortened native clip after keyframes load, and removes its listener on unload',()=>{
  let loaded:Function=()=>{};
  const off=vi.fn(),setLength=vi.fn();const save={animations:{clip:{length:0.8}}};
  vi.stubGlobal('Blockbench',{on:vi.fn((_event,fn)=>{loaded=fn;}),removeListener:off});
  vi.stubGlobal('Undo',{history:[{action:'VoxelFlow: Generate animations',before:{},post:save}]});
  vi.stubGlobal('BBAnimation',{all:[{uuid:'clip',length:1.2,setLength}]});
  const dispose=installAnimationUndoFix();loaded({save});
  expect(setLength).toHaveBeenCalledWith(0.8);dispose();expect(off).toHaveBeenCalledWith('load_undo_save',loaded);
});
it('leaves unrelated artist Undo entries untouched',()=>{
  let loaded:Function=()=>{};const setLength=vi.fn(),save={animations:{clip:{length:0.8}}};
  vi.stubGlobal('Blockbench',{on:vi.fn((_event,fn)=>{loaded=fn;}),removeListener:vi.fn()});
  vi.stubGlobal('Undo',{history:[{action:'Artist timing edit',before:{},post:save}]});
  vi.stubGlobal('BBAnimation',{all:[{uuid:'clip',setLength}]});
  installAnimationUndoFix();loaded({save});expect(setLength).not.toHaveBeenCalled();
});
