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
var PropMaterialSchema = z.object({ name: safeName, color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).strict();
var PropMaterialsSchema = z.array(PropMaterialSchema).min(1).max(16).refine((a) => new Set(a.map((m) => m.name)).size === a.length, "Material names must be unique.");
var propPosition = z.tuple([z.number().min(-128).max(128), z.number().min(-128).max(128), z.number().min(-128).max(128)]);
var propRotation = z.tuple([z.number().min(-180).max(180), z.number().min(-180).max(180), z.number().min(-180).max(180)]);
var PropPartSchema = z.object({
  name: safeName,
  group: safeName.default("root"),
  from: propPosition.describe("Minimum corner [x,y,z] in pixels. Y is up, front is negative Z."),
  to: propPosition.describe("Maximum corner; every component must be greater than from."),
  material: safeName,
  rotation: propRotation.default([0, 0, 0]),
  pivot: propPosition.optional().describe("Rotation pivot in model coordinates; defaults to this cube center.")
}).strict().refine((p) => p.to.every((v, i) => v > p.from[i]), "Every cube must have positive width, height and depth.");
var PropSpecSchema = z.object({
  name: safeName,
  namespace: safeName.default("voxelflow"),
  description: z.string().min(1).max(600).describe("Artist-facing description of the designed object and requested details."),
  materials: PropMaterialsSchema,
  parts: z.array(PropPartSchema).min(1).max(128).describe("Compose ANY block-style prop from editable cubes; not restricted to named presets.")
}).strict().superRefine((spec, ctx) => {
  const materials = new Set(spec.materials.map((m) => m.name)), names = /* @__PURE__ */ new Set();
  spec.parts.forEach((part, i) => {
    if (names.has(part.name)) ctx.addIssue({ code: "custom", path: ["parts", i, "name"], message: "Part names must be unique." });
    names.add(part.name);
    if (!materials.has(part.material)) ctx.addIssue({ code: "custom", path: ["parts", i, "material"], message: "Use a material defined in materials." });
  });
  if ((/* @__PURE__ */ new Set(["root", ...spec.parts.map((p) => p.group)])).size > 32) ctx.addIssue({ code: "custom", path: ["parts"], message: "Use at most 32 named groups." });
});
var roles = ["root", "torso", "head", "left_upper_arm", "left_lower_arm", "right_upper_arm", "right_lower_arm", "left_upper_leg", "left_lower_leg", "right_upper_leg", "right_lower_leg"];
var RigMappingSchema = z.object(Object.fromEntries(roles.map((r) => [r, z.string().min(1).max(128)]))).strict();
var requestId = z.string().uuid().describe("Unique operation ID. Reuse the SAME ID and parameters when retrying; never regenerate on a timeout.");
var toolSchemas = {
  get_editor_status: z.object({}).strict(),
  inspect_project: z.object({}).strict(),
  create_model: z.object({ request_id: requestId, spec: AssetSpecSchema }).strict(),
  create_prop: z.object({ request_id: requestId, spec: PropSpecSchema }).strict(),
  apply_prop_materials: z.object({ request_id: requestId, materials: PropMaterialsSchema.describe("Update existing named prop materials; omitted materials keep their colors.") }).strict(),
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
var mutationNames = ["create_model", "create_prop", "apply_prop_materials", "apply_materials", "generate_rig", "generate_animations", "export_asset", "undo_last_change"];
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
import { homedir } from "node:os";

// packages/core/src/pairing.ts
function parsePairing(text) {
  if (text.length > 8192) throw new Error("The companion connection file is too large.");
  const value = JSON.parse(text);
  if (!value || !Number.isInteger(value.port) || value.port < 1024 || value.port > 65535 || typeof value.token !== "string" || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error("Invalid companion connection. Restart the VoxelFlow companion.");
  return { port: value.port, token: value.token };
}

// packages/mcp-server/src/config.ts
var projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
var desktopMode = process.argv.includes("--desktop");
var sessionFile = resolve(process.env.VOXELFLOW_STATE_DIR ?? (desktopMode ? resolve(homedir(), ".voxelflow-studio") : resolve(projectRoot, ".local")), "bridge.json");
async function readConfig() {
  let disk = {};
  if (!process.env.VOXELFLOW_TOKEN) {
    try {
      disk = parsePairing(await readFile(sessionFile, "utf8"));
    } catch {
      throw new Error(desktopMode ? "Start the VoxelFlow companion launcher, then click Connect in Blockbench." : "Start npm run bridge first, then connect VoxelFlow in Blockbench.");
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
  create_prop: "Create a Minecraft-style prop from the user\u2019s natural-language request: bags/backpacks, staffs, swords, shields, furniture, chests, lanterns, or other objects representable by cubes. YOU design a structured PropSpec with 1\u2013128 named cube parts and 1\u201316 named hex-color materials. There is NO category whitelist or keyword parser. Y is up, front is negative Z, coordinates/pivots must be -128..128 pixels, from < to, rotations in degrees. Organize related parts with group names; include recognizable silhouette and details. This tool builds real geometry, part groups, PNG atlas and UVs in a NEW Blockbench tab. It creates a static prop, not a humanoid or a registered game item. Returns pending_approval; wait for the artist to approve in Blockbench, then poll get_operation. Do not claim emissive materials or gameplay behavior.",
  apply_prop_materials: "Propose changing named colors on an existing VoxelFlow prop. First inspect_project to read its actual material names. Supply only the names/colors to update; preserve other materials, painted pixels and geometry. Requires Blockbench approval.",
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
var server = new McpServer({ name: "voxelflow-studio", version: "0.3.1" }, { instructions: "VoxelFlow is a prompt-to-Minecraft-model plugin. The artist enters the prompt HERE in ChatGPT/Codex; Blockbench is the approval, editing, and preview workspace. First get_editor_status. For bags, staffs, weapons, furniture and other props, translate the brief into create_prop geometry and named materials. Do not force props into the robot template or invent a humanoid rig. You may design new object types: the generic cube blueprint is not limited to presets. Use create_model only for the animated robot template. Present the design, call the appropriate tool once, then wait for native approval and poll get_operation. All changes require approval; never report success before applied or bypass it. Reuse IDs for retries. Inspect actual material names before recoloring props. Validate before export. Output is editable resource assets, not a game-tested item, wearable, weapon, or mob. Creating a held item or equippable bag requires additional game integration." });
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
server.registerPrompt("create_minecraft_asset", { description: "Turn a prompt into an editable Minecraft prop or animated robot", argsSchema: { brief: z2.string().min(1).max(3e3) } }, ({ brief }) => ({ messages: [{ role: "user", content: { type: "text", text: `Create this Minecraft-style model with VoxelFlow: ${brief}
Check editor status. For a prop, design a PropSpec for create_prop: a recognizable silhouette, useful named parts/groups, up to 128 cubes, and up to 16 named hex-color materials. Use pixels, Y up, front negative Z, positive dimensions, and finite coordinates within -128..128. Include requested details such as straps, buckles, pockets, handles, crystal facets or fittings. This is a general geometry builder, not a fixed preset selector. Use create_model only for the robot character template. Explain the plan, submit one UUID request, wait for native approval, and poll until applied. Inspect and validate the live result. Propose export only when requested. Do not claim automatic game item registration or unimplemented effects.` } }] }));
await server.connect(new StdioServerTransport());
//# sourceMappingURL=server.js.map
