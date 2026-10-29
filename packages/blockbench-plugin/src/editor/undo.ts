// Blockbench 5.2 restores clip length before restoring its keyframes. When a
// redo shortens a clip, setLength clamps against the old (longer) keyframes.
// Reapply only our saved lengths after the native snapshot has fully loaded.
export function installAnimationUndoFix() {
  const loaded=({save}:{save:UndoSave})=>{
    if(!Undo.history.some(entry=>entry.action.startsWith('VoxelFlow: ')&&(entry.before===save||entry.post===save)))return;
    const animations=(save as unknown as {animations?:Record<string,{length?:number}>}).animations;
    if(!animations)return;
    for(const [uuid,snapshot] of Object.entries(animations)){
      if(typeof snapshot.length!=='number'||!Number.isFinite(snapshot.length))continue;
      BBAnimation.all.find(animation=>animation.uuid===uuid)?.setLength(snapshot.length);
    }
  };
  Blockbench.on('load_undo_save',loaded);
  return ()=>Blockbench.removeListener('load_undo_save',loaded);
}
