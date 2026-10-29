import { AnimationOptionsSchema, Clip, RigMapping, Track, V3 } from './schema';

export function generateAnimations(name: string, namespace: string, mapping: RigMapping, input: unknown): Clip[] {
  const opts = AnimationOptionsSchema.parse(input), intensity = opts.intensity;
  return opts.clips.map(kind => {
    const length = (kind === 'idle' ? 3 : kind === 'walk' ? 1.2 : 1) / opts.speed;
    const tracks: Track[] = [];
    function track(role: keyof RigMapping, channel: Track['channel'], values: V3[], times?: number[]) {
      if (!mapping[role]) throw new Error(`Map the ${role.replaceAll('_',' ')} before animating.`);
      tracks.push({bone:mapping[role],channel,frames:values.map((value,i) => ({time: +(length * (times?.[i] ?? i / (values.length-1))).toFixed(6),value:value.map(v=> +(v*intensity).toFixed(5)) as V3, interpolation:'linear'}))});
    }
    const zero: V3 = [0,0,0];
    if (kind === 'idle') {
      track('torso','position',[zero,[0,0.3,0],[0,0.45,0],[0,0.3,0],zero]);
      track('head','rotation',[zero,[0,2,0],[0,0,0],[0,-2,0],zero]);
      track('left_upper_arm','rotation',[[0,0,-2],[1,0,-3],[0,0,-4],[-1,0,-3],[0,0,-2]]);
      track('right_upper_arm','rotation',[[0,0,2],[-1,0,3],[0,0,4],[1,0,3],[0,0,2]]);
    } else if (kind === 'walk') {
      track('left_upper_leg','rotation',[[28,0,0],zero,[-28,0,0],zero,[28,0,0]]);
      track('right_upper_leg','rotation',[[-28,0,0],zero,[28,0,0],zero,[-28,0,0]]);
      track('left_lower_leg','rotation',[[3,0,0],[26,0,0],[3,0,0],zero,[3,0,0]]);
      track('right_lower_leg','rotation',[[3,0,0],zero,[3,0,0],[26,0,0],[3,0,0]]);
      track('left_upper_arm','rotation',[[-22,0,-3],[0,0,-3],[22,0,-3],[0,0,-3],[-22,0,-3]]);
      track('right_upper_arm','rotation',[[22,0,3],[0,0,3],[-22,0,3],[0,0,3],[22,0,3]]);
      track('root','position',[zero,[0,0.45,0],zero,[0,0.45,0],zero]);
      track('torso','rotation',[[0,-3,0],zero,[0,3,0],zero,[0,-3,0]]);
    } else {
      const times = [0,0.28,0.42,0.56,1];
      track('right_upper_arm','rotation',[zero,[28,-18,10],[-92,0,4],[-86,0,3],zero],times);
      track('right_lower_arm','rotation',[zero,[-70,0,0],[-4,0,0],[-8,0,0],zero],times);
      track('torso','rotation',[zero,[0,18,0],[8,-16,0],[6,-12,0],zero],times);
      track('left_upper_arm','rotation',[zero,[-28,0,-10],[-36,0,-12],[-30,0,-8],zero],times);
      track('root','position',[zero,[0,0,0.4],[0,0,-0.8],[0,0,-0.6],zero],times);
    }
    return {name:`animation.${namespace}.${name}.${kind}`,loop:kind!=='attack',length:+length.toFixed(6),tracks};
  });
}
