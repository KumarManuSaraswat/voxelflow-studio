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
export interface Asset { name: string; namespace: string; bones: BoneData[]; cubes: CubeData[]; textures: TextureData[]; animations: Clip[]; mapping: Partial<RigMapping>; unsupported: string[] }

const requestId = z.string().uuid().describe('Unique operation ID. Reuse the SAME ID and parameters when retrying; never regenerate on a timeout.');
export const toolSchemas = {
  get_editor_status: z.object({}).strict(),
  inspect_project: z.object({}).strict(),
  create_model: z.object({ request_id: requestId, spec: AssetSpecSchema }).strict(),
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
export const mutationNames = ['create_model', 'apply_materials', 'generate_rig', 'generate_animations', 'export_asset', 'undo_last_change'] as const;
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
