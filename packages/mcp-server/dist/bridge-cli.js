// packages/mcp-server/src/bridge-cli.ts
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { dirname as dirname2 } from "node:path";

// packages/mcp-server/src/transport/bridge.ts
import { createServer } from "node:http";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

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
function parseTool(name, args) {
  if (!Object.hasOwn(toolSchemas, name)) throw new Error(`Unknown operation: ${name}`);
  return { name, args: toolSchemas[name].parse(args) };
}
var ToolResponseSchema = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.string().optional() }).strict();

// packages/mcp-server/src/transport/bridge.ts
async function startBridge(options) {
  if (!/^[a-f0-9]{64}$/.test(options.token)) throw new Error("Bridge token must be 32 cryptographically random bytes encoded as hex.");
  const timeoutMs = options.timeoutMs ?? 15e3;
  const http = createServer((_req, res) => {
    res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("VoxelFlow local bridge");
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024, perMessageDeflate: false });
  let editor;
  const clients = /* @__PURE__ */ new Set();
  const pending = /* @__PURE__ */ new Map();
  const send = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };
  const fail = (ws, id, error) => send(ws, { type: "result", id, result: { ok: false, error } });
  http.on("upgrade", (req, socket, head) => {
    const host = req.headers.host, origin = req.headers.origin;
    const validHost = host === `127.0.0.1:${http.address()?.port}`;
    if (!validHost || origin !== void 0 && origin !== "file://" && origin !== "null" || !["/editor", "/client"].includes(req.url ?? "")) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      let authenticated = false;
      const role = req.url === "/editor" ? "editor" : "client";
      const authTimer = setTimeout(() => ws.close(1008, "Authenticate first"), 3e3);
      let alive = true;
      ws.on("pong", () => {
        alive = true;
      });
      const heartbeat = setInterval(() => {
        if (!alive) {
          ws.terminate();
          return;
        }
        alive = false;
        ws.ping();
      }, 15e3);
      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (!authenticated) {
            if (data.type !== "hello" || typeof data.token !== "string" || !/^[a-f0-9]{64}$/.test(data.token) || !timingSafeEqual(Buffer.from(data.token), Buffer.from(options.token))) {
              ws.close(1008, "Invalid session token");
              return;
            }
            if (role === "editor" && editor) {
              ws.close(1008, "Another editor is connected");
              return;
            }
            authenticated = true;
            clearTimeout(authTimer);
            if (role === "editor") editor = ws;
            else clients.add(ws);
            send(ws, { type: "welcome", role, protocol: 1 });
            return;
          }
          if (role === "client" && data.type === "command") {
            if (typeof data.id !== "string" || data.id.length > 80) throw new Error("Invalid transport ID.");
            const command = parseTool(data.tool, data.args);
            if (!editor || editor.readyState !== WebSocket.OPEN) {
              fail(ws, data.id, "Blockbench is disconnected. Open VoxelFlow Studio and connect with this session token.");
              return;
            }
            if (pending.size >= 32) {
              fail(ws, data.id, "The editor is busy. Wait for the current operation.");
              return;
            }
            const id = randomUUID();
            const timer = setTimeout(() => {
              const p = pending.get(id);
              if (p) {
                fail(p.client, p.clientId, "The editor did not reply. Inspect the operation before retrying with the same request_id.");
                pending.delete(id);
              }
            }, timeoutMs);
            pending.set(id, { client: ws, clientId: data.id, timer });
            send(editor, { type: "command", id, tool: command.name, args: command.args });
          } else if (role === "editor" && data.type === "result") {
            const p = pending.get(data.id);
            if (!p) return;
            const result = ToolResponseSchema.parse(data.result);
            clearTimeout(p.timer);
            pending.delete(data.id);
            send(p.client, { type: "result", id: p.clientId, result });
          } else throw new Error("Message is not allowed for this connection.");
        } catch (error) {
          send(ws, { type: "protocol_error", error: error instanceof Error ? error.message : "Invalid message" });
        }
      });
      ws.on("error", () => {
      });
      ws.on("close", () => {
        clearTimeout(authTimer);
        clearInterval(heartbeat);
        clients.delete(ws);
        if (editor === ws) {
          editor = void 0;
          for (const [id, p] of pending) {
            clearTimeout(p.timer);
            fail(p.client, p.clientId, "Blockbench disconnected before replying. Check the operation before retrying.");
            pending.delete(id);
          }
        } else for (const [id, p] of pending) if (p.client === ws) {
          clearTimeout(p.timer);
          pending.delete(id);
        }
      });
    });
  });
  await new Promise((resolve2, reject) => {
    http.once("error", reject);
    http.listen(options.port, "127.0.0.1", () => {
      http.off("error", reject);
      resolve2();
    });
  });
  return { port: http.address().port, close: async () => {
    for (const ws of wss.clients) ws.terminate();
    for (const p of pending.values()) clearTimeout(p.timer);
    pending.clear();
    await new Promise((resolve2) => wss.close(() => resolve2()));
    await new Promise((resolve2) => http.close(() => resolve2()));
  } };
}

// packages/mcp-server/src/config.ts
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
var projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
var sessionFile = resolve(projectRoot, ".local/bridge.json");

// packages/mcp-server/src/bridge-cli.ts
var port = Number(process.env.VOXELFLOW_PORT ?? 32123);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("VOXELFLOW_PORT must be between 1024 and 65535.");
var token = process.env.VOXELFLOW_TOKEN ?? randomBytes(32).toString("hex");
var bridge = await startBridge({ port, token });
await mkdir(dirname2(sessionFile), { recursive: true });
await writeFile(sessionFile, JSON.stringify({ port, token }), { mode: 384 });
console.error(`VoxelFlow bridge listening on 127.0.0.1:${port}
Paste this session token into Blockbench \u2192 VoxelFlow \u2192 Connect:
${token}
Keep this terminal open. The token stays local and changes on restart.`);
var stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await bridge.close();
  try {
    const current = JSON.parse(await readFile(sessionFile, "utf8"));
    if (current.token === token) await unlink(sessionFile);
  } catch {
  }
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
//# sourceMappingURL=bridge-cli.js.map
