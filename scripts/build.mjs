import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await build({ entryPoints: ['packages/blockbench-plugin/src/plugin.ts'], outfile: 'packages/blockbench-plugin/dist/voxelflow_studio.js', bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', sourcemap: true, legalComments: 'inline' });
await build({ entryPoints: ['packages/mcp-server/src/server.ts', 'packages/mcp-server/src/bridge-cli.ts'], outdir: 'packages/mcp-server/dist', bundle: true, format: 'esm', platform: 'node', target: 'node22', packages: 'external', sourcemap: true });
await mkdir('dist', { recursive: true });
await copyFile('packages/blockbench-plugin/dist/voxelflow_studio.js', 'dist/voxelflow_studio.js');
console.log('Built Blockbench plugin and MCP companion.');
