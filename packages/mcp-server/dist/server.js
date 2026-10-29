// packages/mcp-server/src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z as z2 } from "zod";

// packages/core/src/schema.ts
import { z } from "zod";
var Vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
var safeName = z.string().min(1).max(48).regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores; start with a letter.");
var PaletteSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  eyes: z.string().regex(/^#[0-9a-fA-F]{6}$/)
}).strict();
var defaultPalette = { primary: "#2878c8", secondary: "#e7ad42", eyes: "#6df5ff" };
var ClipName = z.enum(["idle", "walk", "attack"]);
var AnimationOptionsSchema = z.object({
  clips: z.array(ClipName).min(1).max(3).refine((a) => new Set(a).size === a.length, "Choose each animation once.").default(["idle", "walk", "attack"]),
  speed: z.number().min(0.25).max(3).default(1),
  intensity: z.number().min(0.1).max(1.5).default(1)
}).strict();
var AssetSpecSchema = z.object({
  name: safeName.default("atlas_robot"),
  namespace: safeName.default("voxelflow"),
  template: z.literal("robot").default("robot"),
  height: z.number().min(16).max(64).default(36),
  build: z.enum(["balanced", "slender", "heavy"]).default("balanced"),
  detail: z.enum(["simple", "detailed"]).default("detailed"),
  palette: PaletteSchema.default(defaultPalette),
  target: z.literal("bedrock").default("bedrock"),
  animations: AnimationOptionsSchema.prefault({})
}).strict();
var roles = ["root", "torso", "head", "left_upper_arm", "left_lower_arm", "right_upper_arm", "right_lower_arm", "left_upper_leg", "left_lower_leg", "right_upper_leg", "right_lower_leg"];
var RigMappingSchema = z.object(Object.fromEntries(roles.map((r) => [r, z.string().min(1).max(128)]))).strict();
var requestId = z.string().uuid().describe("Unique operation ID. Reuse the SAME ID and parameters when retrying; never regenerate on a timeout.");
var toolSchemas = {
  get_editor_status: z.object({}).strict(),
  inspect_project: z.object({}).strict(),
  create_model: z.object({ request_id: requestId, spec: AssetSpecSchema }).strict(),
  apply_materials: z.object({ request_id: requestId, palette: PaletteSchema }).strict(),
  generate_rig: z.object({ request_id: requestId, mapping: RigMappingSchema.optional() }).strict(),
  generate_animations: z.object({ request_id: requestId, options: AnimationOptionsSchema }).strict(),
  validate_asset: z.object({}).strict(),
  export_asset: z.object({ request_id: requestId, target: z.literal("bedrock") }).strict(),
  undo_last_change: z.object({ request_id: requestId }).strict(),
  get_operation: z.object({ operation_id: requestId }).strict(),
  cancel_operation: z.object({ operation_id: requestId }).strict(),
  preview_animation: z.object({ clip: ClipName, playing: z.boolean().default(true) }).strict()
};
var toolNames = Object.keys(toolSchemas);
var mutationNames = ["create_model", "apply_materials", "generate_rig", "generate_animations", "export_asset", "undo_last_change"];
var ToolResponseSchema = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.string().optional() }).strict();

// packages/mcp-server/src/transport/client.ts
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
async function editorRequest(config, tool, args, timeoutMs = 18e3) {
  return new Promise((resolve2, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${config.port}/client`, { maxPayload: 2 * 1024 * 1024, perMessageDeflate: false });
    const id = randomUUID();
    let done = false;
    const finish = (result, error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ws.close();
      if (error) reject(error);
      else resolve2(result);
    };
    const timer = setTimeout(() => {
      finish(void 0, new Error("Bridge timed out. Check get_operation before retrying the same request_id."));
      ws.terminate();
    }, timeoutMs);
    ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: config.token })));
    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === "welcome") ws.send(JSON.stringify({ type: "command", id, tool, args }));
        else if (m.type === "result" && m.id === id) finish(ToolResponseSchema.parse(m.result));
        else if (m.type === "protocol_error") finish(void 0, new Error(m.error));
      } catch (e) {
        finish(void 0, e);
      }
    });
    ws.on("error", () => finish(void 0, new Error("Cannot reach the local bridge. Start npm run bridge and connect the Blockbench panel.")));
    ws.on("close", (_code, reason) => {
      if (!done) finish(void 0, new Error(`Bridge connection closed: ${reason.toString() || "check the session token"}`));
    });
  });
}

// packages/mcp-server/src/config.ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
var projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
var sessionFile = resolve(projectRoot, ".local/bridge.json");
async function readConfig() {
  let disk = {};
  if (!process.env.VOXELFLOW_TOKEN) {
    try {
      disk = JSON.parse(await readFile(sessionFile, "utf8"));
    } catch {
      throw new Error("Start npm run bridge first, then connect VoxelFlow in Blockbench.");
    }
  }
  const port = Number(process.env.VOXELFLOW_PORT ?? disk.port ?? 32123), token = process.env.VOXELFLOW_TOKEN ?? disk.token;
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || !token || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Invalid bridge configuration: use a port from 1024\u201365535 and a 64-character hexadecimal session token.");
  return { port, token };
}

// packages/mcp-server/src/server.ts
var descriptions = {
  get_editor_status: "Read live Blockbench connection, project, version and format. Returns connected:false when unavailable; never simulates an editor.",
  inspect_project: "Read actual geometry, bone mapping, textures and native keyframe summaries of the active Blockbench project.",
  create_model: "Propose an editable humanoid robot with palette, articulated rig, and idle/walk/attack clips in a NEW Bedrock project tab. Translate natural language into AssetSpec; only robot/bedrock is implemented. Returns pending_approval. Ask the artist to approve in Blockbench, then poll get_operation. Eye color is bright cyan, not an emissive shader.",
  apply_materials: "Propose recoloring the VoxelFlow atlas while preserving pixels painted by the artist. Does not rebuild geometry or animations. Requires Blockbench approval.",
  generate_rig: "Propose a body-part mapping for an existing humanoid hierarchy. Exact/alias detection is conservative; provide all 11 mapped bone names when detection is ambiguous. Does not invent joints or move imported geometry. Requires approval and a valid existing hierarchy.",
  generate_animations: "Propose real native idle/walk/attack keyframes for a validated mapped humanoid. Replaces only the named preset clips after approval; speed/intensity do not rebuild the model.",
  validate_asset: "Run deterministic quality gates against the LIVE project, including unsupported geometry, hierarchy, pivots, texture/UVs and actual native keyframes. This does not certify Minecraft runtime compatibility.",
  export_asset: "Propose a Bedrock resource asset ZIP with geometry, current PNG, animations, controllers, client entity, manifest, source bbmodel and report. Requires passing gates and editor approval, then a native Save dialog. Poll until applied; cancelled is not success. No arbitrary output path accepted.",
  undo_last_change: "Propose undoing the most recent VoxelFlow edit using native Undo. Refuses to undo unrelated artist edits. Requires editor approval.",
  get_operation: "Read a proposed operation by its request_id. Only applied means the scene/export action completed. pending_approval means the artist must approve in Blockbench. Retry an uncertain command only with its original request_id and parameters.",
  cancel_operation: "Cancel a pending approval without changing the scene. Running exports must be cancelled in the native Save dialog.",
  preview_animation: "Select and play or stop an existing idle, walk, or attack clip in the real Blockbench animation timeline. Does not create or edit keyframes."
};
var server = new McpServer({ name: "voxelflow-studio", version: "0.1.0" }, { instructions: "VoxelFlow controls a live Blockbench desktop editor. First get_editor_status. All modifications return a pending approval; never say they succeeded until get_operation returns applied. Ask the artist to approve the proposal in Blockbench. Never bypass approval. Reuse request_id for retries. A robot creation includes the complete requested rig and clips; do not generate duplicates. Validate the live scene before exporting. Bedrock output is an integration-ready resource asset package, not a tested playable mob." });
for (const name of toolNames) {
  const mutation = mutationNames.includes(name);
  server.registerTool(name, {
    title: name.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join(" "),
    description: descriptions[name],
    inputSchema: toolSchemas[name].shape,
    outputSchema: ToolResponseSchema.shape,
    annotations: { readOnlyHint: !mutation && name !== "preview_animation" && name !== "cancel_operation", destructiveHint: mutation, idempotentHint: mutation || name !== "preview_animation", openWorldHint: false }
  }, async (args) => {
    let result;
    try {
      const parsed = toolSchemas[name].parse(args);
      result = await editorRequest(await readConfig(), name, parsed);
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    if (name === "get_editor_status" && !result.ok) result = { ok: true, data: { connected: false, reason: result.error } };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: !result.ok };
  });
}
server.registerPrompt("create_animated_robot", { description: "Guided VoxelFlow robot pipeline", argsSchema: { brief: z2.string().max(2e3) } }, ({ brief }) => ({ messages: [{ role: "user", content: { type: "text", text: `Use VoxelFlow Studio to create this character: ${brief}
Inspect editor status. Translate the brief into create_model AssetSpec using template robot and target bedrock; supported controls are height 16\u201364, build balanced/slender/heavy, detail simple/detailed, palette primary/secondary/eyes hex colors, and idle/walk/attack speed 0.25\u20133 and intensity 0.1\u20131.5. Present the plan. Submit once with a UUID request_id, then ask me to approve in Blockbench. Poll get_operation until applied. Preview walk and attack, validate, and propose export. Wait for my export approval and save selection. Explain unsupported requests clearly.` } }] }));
await server.connect(new StdioServerTransport());
//# sourceMappingURL=server.js.map
