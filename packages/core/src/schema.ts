import { z } from 'zod';

export const Vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export type V3 = z.infer<typeof Vec3>;
export const safeName = z.string().min(1).max(48).regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores; start with a letter.');
export const PaletteSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  eyes: z.string().regex(/^#[0-9a-fA-F]{6}$/)
}).strict();
export type Palette = z.infer<typeof PaletteSchema>;
export const defaultPalette: Palette = { primary: '#2878c8', secondary: '#e7ad42', eyes: '#6df5ff' };
export const ClipName = z.enum(['idle', 'walk', 'attack']);
export const AnimationOptionsSchema = z.object({
  clips: z.array(ClipName).min(1).max(3).refine(a => new Set(a).size === a.length, 'Choose each animation once.').default(['idle', 'walk', 'attack']),
  speed: z.number().min(0.25).max(3).default(1),
  intensity: z.number().min(0.1).max(1.5).default(1)
}).strict();
export type AnimationOptions = z.infer<typeof AnimationOptionsSchema>;
export const AssetSpecSchema = z.object({
  name: safeName.default('atlas_robot'),
  namespace: safeName.default('voxelflow'),
  template: z.literal('robot').default('robot'),
  height: z.number().min(16).max(64).default(36),
  build: z.enum(['balanced', 'slender', 'heavy']).default('balanced'),
  detail: z.enum(['simple', 'detailed']).default('detailed'),
  palette: PaletteSchema.default(defaultPalette),
  target: z.literal('bedrock').default('bedrock'),
  animations: AnimationOptionsSchema.prefault({})
}).strict();
export type AssetSpec = z.infer<typeof AssetSpecSchema>;
export const PropMaterialSchema = z.object({name:safeName,color:z.string().regex(/^#[0-9a-fA-F]{6}$/)}).strict();
export const PropMaterialsSchema = z.array(PropMaterialSchema).min(1).max(16).refine(a=>new Set(a.map(m=>m.name)).size===a.length,'Material names must be unique.');
export type PropMaterial = z.infer<typeof PropMaterialSchema>;
// Homogeneous arrays serialize to a single JSON Schema `items` object. Tuple
// schemas emit an `items` array, which some AI hosts reject during discovery.
const propPosition = z.array(z.number().min(-128).max(128)).length(3).transform((v):V3=>[v[0],v[1],v[2]]);
const propRotation = z.array(z.number().min(-180).max(180)).length(3).transform((v):V3=>[v[0],v[1],v[2]]);
const propPartFields = {
  name:safeName,
  group:safeName.default('root'),
  from:propPosition.describe('Minimum corner [x,y,z] in pixels. Y is up, front is negative Z.'),
  to:propPosition.describe('Maximum corner; every component must be greater than from.'),
  material:safeName,
  rotation:propRotation.default([0,0,0]),
  pivot:propPosition.optional().describe('Rotation pivot in model coordinates; defaults to this cube center.')
};
export const PropPartSchema = z.object(propPartFields).strict().refine(p=>p.to.every((v,i)=>v>p.from[i]),'Every cube must have positive width, height and depth.');
const repeatSchema = z.object({
  count:z.number().int().min(2).max(128).describe('Total cubes including the original. Copies are named name_2, name_3, etc.'),
  step:propPosition.describe('Translation per copy [x,y,z]; explicit pivots translate too. Rotation, group and material stay unchanged.')
}).strict().refine(r=>r.step.some(v=>v!==0),'Repeated cubes need a nonzero step.');
const compactPartSchema = z.object({...propPartFields,repeat:repeatSchema.optional()}).strict();
const propSpecFields = {
  name:safeName,
  namespace:safeName.default('voxelflow'),
  description:z.string().min(1).max(600).describe('Artist-facing description of the designed object and requested details.'),
  materials:PropMaterialsSchema,
};
const expandedPropSpecSchema = z.object({...propSpecFields,parts:z.array(PropPartSchema).min(1).max(128)}).strict().superRefine((spec,ctx)=>{
  const materials=new Set(spec.materials.map(m=>m.name)),names=new Set<string>();
  spec.parts.forEach((part,i)=>{
    if(names.has(part.name))ctx.addIssue({code:'custom',path:['parts',i,'name'],message:'Part names must be unique.'});names.add(part.name);
    if(!materials.has(part.material))ctx.addIssue({code:'custom',path:['parts',i,'material'],message:'Use a material defined in materials.'});
  });
  if(new Set(['root',...spec.parts.map(p=>p.group)]).size>32)ctx.addIssue({code:'custom',path:['parts'],message:'Use at most 32 named groups.'});
});
export const PropSpecSchema = z.object({
  ...propSpecFields,
  parts:z.array(compactPartSchema).min(1).max(128).describe('Editable cubes. Use repeat for evenly spaced copies to save tokens; the expanded total must be at most 128.')
}).strict().transform((spec,ctx)=>{
  // Bound expansion before allocation; validate the resulting geometry with the
  // same rules as explicit cubes. Re-parsing the expanded result is idempotent.
  if(spec.parts.reduce((n,p)=>n+(p.repeat?.count??1),0)>128){
    ctx.addIssue({code:'custom',path:['parts'],message:'Use at most 128 cubes after repeat expansion.'});return z.NEVER;
  }
  const parts=spec.parts.flatMap(({repeat,...part})=>Array.from({length:repeat?.count??1},(_,i)=>{
    const move=(v:V3):V3=>v.map((n,axis)=>n+i*(repeat?.step[axis]??0)) as V3;
    return {...part,name:i===0?part.name:`${part.name}_${i+1}`,from:move(part.from),to:move(part.to),...(part.pivot?{pivot:move(part.pivot)}:{})};
  }));
  const parsed=expandedPropSpecSchema.safeParse({...spec,parts});
  if(!parsed.success){for(const issue of parsed.error.issues)ctx.addIssue({code:'custom',path:issue.path,message:issue.message});return z.NEVER;}
  return parsed.data;
});
export type PropSpec = z.infer<typeof PropSpecSchema>;
export const roles = ['root', 'torso', 'head', 'left_upper_arm', 'left_lower_arm', 'right_upper_arm', 'right_lower_arm', 'left_upper_leg', 'left_lower_leg', 'right_upper_leg', 'right_lower_leg'] as const;
export type Role = typeof roles[number];
export const RigMappingSchema = z.object(Object.fromEntries(roles.map(r => [r, z.string().min(1).max(128)])) as Record<Role, z.ZodString>).strict();
export type RigMapping = z.infer<typeof RigMappingSchema>;
export const faces = ['north', 'east', 'south', 'west', 'up', 'down'] as const;
export type FaceName = typeof faces[number];
export interface FaceData { texture: string | null; uv: [number, number, number, number]; rotation: number }
export interface CubeData { id: string; name: string; bone: string; from: V3; to: V3; origin: V3; rotation: V3; inflate: number; faces: Record<FaceName, FaceData>; boxUv?: boolean }
export interface BoneData { name: string; parent?: string; pivot: V3; rotation: V3 }
export interface TextureData { id: string; name: string; width: number; height: number; png: Uint8Array }
export interface Frame { time: number; value: V3; interpolation: 'linear' | 'step' }
export interface Track { bone: string; channel: 'rotation' | 'position' | 'scale'; frames: Frame[] }
export interface Clip { name: string; loop: boolean; length: number; tracks: Track[] }
export interface Asset { name: string; namespace: string; kind?: 'humanoid'|'prop'; bones: BoneData[]; cubes: CubeData[]; textures: TextureData[]; animations: Clip[]; mapping: Partial<RigMapping>; unsupported: string[] }

const requestId = z.string().uuid().describe('Unique operation ID. Reuse the SAME ID and parameters when retrying; never regenerate on a timeout.');
export const toolSchemas = {
  get_editor_status: z.object({}).strict(),
  inspect_project: z.object({detail:z.enum(['summary','full']).default('summary').describe('Summary saves tokens and includes counts, groups, materials and warnings. Use full only when coordinates, pivots or UVs are needed.')}).strict(),
  create_model: z.object({ request_id: requestId, spec: AssetSpecSchema }).strict(),
  create_prop: z.object({ request_id: requestId, spec: PropSpecSchema }).strict(),
  apply_prop_materials: z.object({ request_id: requestId, materials: PropMaterialsSchema.describe('Update existing named prop materials; omitted materials keep their colors.') }).strict(),
  apply_materials: z.object({ request_id: requestId, palette: PaletteSchema }).strict(),
  generate_rig: z.object({ request_id: requestId, mapping: RigMappingSchema.optional() }).strict(),
  generate_animations: z.object({ request_id: requestId, options: AnimationOptionsSchema }).strict(),
  validate_asset: z.object({}).strict(),
  export_asset: z.object({ request_id: requestId, target: z.literal('bedrock') }).strict(),
  undo_last_change: z.object({ request_id: requestId }).strict(),
  get_operation: z.object({ operation_id: requestId }).strict(),
  cancel_operation: z.object({ operation_id: requestId }).strict(),
  preview_animation: z.object({ clip: ClipName, playing: z.boolean().default(true) }).strict()
};
export type ToolName = keyof typeof toolSchemas;
export const toolNames = Object.keys(toolSchemas) as ToolName[];
export const mutationNames = ['create_model', 'create_prop', 'apply_prop_materials', 'apply_materials', 'generate_rig', 'generate_animations', 'export_asset', 'undo_last_change'] as const;
export function parseTool(name: string, args: unknown): { name: ToolName; args: any } {
  if (!Object.hasOwn(toolSchemas, name)) throw new Error(`Unknown operation: ${name}`);
  return { name: name as ToolName, args: toolSchemas[name as ToolName].parse(args) };
}
export interface Finding { stage: 'geometry' | 'rig' | 'texture' | 'animation' | 'export'; status: 'passed' | 'warning' | 'failed'; code: string; message: string; correction?: string }
export interface ValidationReport { ready: boolean; counts: { passed: number; warning: number; failed: number }; findings: Finding[]; engineVerified: false }
export type OperationState = 'pending_approval' | 'applying' | 'applied' | 'rejected' | 'cancelled' | 'failed';
export interface Operation { id: string; tool: ToolName; state: OperationState; summary: string; createdAt: string; result?: unknown; error?: string }
export const ToolResponseSchema = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.string().optional() }).strict();
export type ToolResponse = z.infer<typeof ToolResponseSchema>;
