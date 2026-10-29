import { Asset, AssetSpecSchema, BoneData, CubeData, faces, V3, RigMapping, roles, Role } from './schema';
import { Material, materialFace, palettePixels, encodePng } from './textures';
import { generateAnimations } from './animation';

export const parents: Record<Role, Role | undefined> = {
  root: undefined, torso: 'root', head: 'torso', left_upper_arm: 'torso', left_lower_arm: 'left_upper_arm', right_upper_arm: 'torso', right_lower_arm: 'right_upper_arm', left_upper_leg: 'root', left_lower_leg: 'left_upper_leg', right_upper_leg: 'root', right_lower_leg: 'right_upper_leg'
};
export function generateRobot(input: unknown): Asset {
  const spec = AssetSpecSchema.parse(input), s = spec.height / 36, w = spec.build === 'heavy' ? 1.23 : spec.build === 'slender' ? 0.85 : 1;
  const v = (a: V3): V3 => [a[0] * s * w, a[1] * s, a[2] * s];
  const bones: BoneData[] = [], cubes: CubeData[] = [];
  const bone = (name: Role, pivot: V3) => bones.push({ name, parent: parents[name], pivot: v(pivot), rotation: [0,0,0] });
  const cube = (name: string, parent: Role, from: V3, to: V3, material: Material) => cubes.push({ id: name, name, bone: parent, from: v(from), to: v(to), origin: v([0,0,0]), rotation: [0,0,0], inflate: 0, faces: Object.fromEntries(faces.map(f => [f, materialFace(material)])) as CubeData['faces'] });
  bone('root', [0,17,0]); bone('torso', [0,18,0]); bone('head', [0,29,0]);
  cube('pelvis', 'root', [-4,16,-2], [4,19,2], 'joint');
  cube('chest_armor', 'torso', [-5,20,-2.5], [5,28,2.5], 'primary');
  cube('waist_core', 'torso', [-2.8,18,-1.7], [2.8,21,1.7], 'dark');
  cube('collar', 'torso', [-4.5,27,-2.8], [4.5,28.5,2.8], 'secondary');
  cube('chest_inset', 'torso', [-2.7,22,-3], [2.7,26,-2.5], 'dark');
  cube('reactor', 'torso', [-1.2,23,-3.3], [1.2,25,-3], 'eyes');
  cube('neck', 'head', [-1.5,28,-1.4], [1.5,30,1.4], 'joint');
  cube('helmet', 'head', [-3.7,29.5,-2.7], [3.7,35.5,2.7], 'primary');
  cube('visor', 'head', [-3.2,31.5,-3], [3.2,34,-2.7], 'dark');
  cube('left_eye', 'head', [0.6,32,-3.2], [2.8,33.2,-3], 'eyes');
  cube('right_eye', 'head', [-2.8,32,-3.2], [-0.6,33.2,-3], 'eyes');
  cube('jaw_guard', 'head', [-2.8,29.5,-3], [2.8,31,-2.6], 'light');
  cube('helmet_crest', 'head', [-0.8,34.7,-2.8], [0.8,36,1.8], 'secondary');
  for (const side of ['left', 'right'] as const) {
    // In Blockbench front view +X is the character's left; Bedrock exporter mirrors X.
    const sign = side === 'left' ? 1 : -1;
    const mirrored = (from: V3, to: V3): [V3,V3] => sign === 1 ? [from,to] : [[-to[0],from[1],from[2]],[-from[0],to[1],to[2]]];
    const arm = `${side}_upper_arm` as Role, forearm = `${side}_lower_arm` as Role, leg = `${side}_upper_leg` as Role, shin = `${side}_lower_leg` as Role;
    bone(arm, [6*sign,26,0]); bone(forearm, [6.7*sign,21,0]); bone(leg, [2.5*sign,17,0]); bone(shin, [2.5*sign,9,0]);
    const part = (n:string, b:Role, f:V3, t:V3, m:Material) => cube(`${side}_${n}`,b,...mirrored(f,t),m);
    part('shoulder',arm,[5.2,24,-2],[8,27.8,2],'secondary');
    part('upper_arm_armor',arm,[5.6,21.5,-1.5],[7.8,25,1.5],'primary');
    part('elbow',forearm,[5.7,20,-1.1],[7.7,22,1.1],'joint');
    part('gauntlet',forearm,[5.2,16.5,-2],[8.2,20.5,2],'primary');
    part('fist',forearm,[5.5,14.6,-1.8],[7.9,17,1.8],'light');
    part('thigh',leg,[1.1,9.8,-1.6],[4,16.8,1.6],'primary');
    part('knee',shin,[1.3,8,-1.8],[3.8,10,1.8],'joint');
    part('shin_armor',shin,[1,2,-1.9],[4.1,8.5,1.9],'primary');
    part('boot',shin,[0.8,0.5,-3.4],[4.3,2.5,2],'dark');
    part('sole',shin,[0.7,0,-3.5],[4.4,0.6,2.1],'sole');
    if (spec.detail === 'detailed') {
      part('shin_stripe',shin,[1.5,3,-2.1],[2.2,7.6,-1.9],'secondary');
      part('wrist_light',forearm,[5.8,17.5,-2.2],[7.5,18.3,-2],'eyes');
      part('ear', 'head', [3.7,31,-1],[4.4,33.5,1],'joint');
    }
  }
  if (spec.detail === 'detailed') {
    cube('backpack','torso',[-3,21,2.5],[3,26,4],'joint');
    for (let i=0;i<3;i++) cube(`vent_${i}`,'torso',[-2.4,22+i,4],[2.4,22.35+i,4.3],'dark');
  }
  const mapping = Object.fromEntries(roles.map(r => [r,r])) as RigMapping;
  return { name: spec.name, namespace: spec.namespace, bones, cubes, mapping, textures: [{ id:'palette', name:'palette', width:64, height:16, png:encodePng(palettePixels(spec.palette)) }], animations: generateAnimations(spec.name, spec.namespace, mapping, spec.animations), unsupported: [] };
}
export function detectRig(bones: BoneData[]): { mapping: Partial<RigMapping>; ambiguous: string[]; missing: Role[] } {
  const aliases: Record<Role,string[]> = { root:['root','hips','pelvis'],torso:['torso','body','chest'],head:['head'],left_upper_arm:['leftupperarm','leftarm','armleft'],left_lower_arm:['leftlowerarm','leftforearm','forearmleft'],right_upper_arm:['rightupperarm','rightarm','armright'],right_lower_arm:['rightlowerarm','rightforearm','forearmright'],left_upper_leg:['leftupperleg','leftleg','leftthigh'],left_lower_leg:['leftlowerleg','leftshin'],right_upper_leg:['rightupperleg','rightleg','rightthigh'],right_lower_leg:['rightlowerleg','rightshin'] };
  const mapping: Partial<RigMapping> = {}, ambiguous: string[] = [];
  for (const role of roles) {
    const matches = bones.filter(b => aliases[role].includes(b.name.toLowerCase().replace(/[^a-z0-9]/g,'')));
    if (matches.length === 1) mapping[role] = matches[0].name; else if (matches.length > 1) ambiguous.push(role);
  }
  return { mapping, ambiguous, missing: roles.filter(r => !mapping[r]) };
}
