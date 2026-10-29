# Distribution status — 0.3 desktop beta

Public source: [KumarManuSaraswat/voxelflow-studio](https://github.com/KumarManuSaraswat/voxelflow-studio).

The desktop beta includes root `plugin.json`, `mcp.json`, two skills, bundled server dependencies, a Blockbench plugin, an install guide, and a companion launcher. The companion stays on loopback and stores its credential in the user's `.voxelflow-studio/bridge.json`. Blockbench reads that specific file when opening Connect. Native approval is required for model changes and exports.

| Destination | Status / next step |
| --- | --- |
| GitHub download | Public repository and downloadable package; users install locally. |
| Local desktop plugin list | Catalog supplied in `.agents/plugins/marketplace.json`; tested with `codex plugin marketplace add` and `codex plugin add`. Each user runs their own Blockbench and companion. |
| Universal ChatGPT/Codex directory | Not submitted or approved. Local MCP submissions currently require approved-partner eligibility, organization allowlisting, identity verification, review, and publication. |

The [official desktop-only submission guide](https://developers.openai.com/plugins/deploy/desktop-only) governs this architecture. GitHub publishing does not bypass directory review. Workspace publication is a separate administrator-controlled option; see [plugin packaging](https://developers.openai.com/plugins/build/plugins).

## Directory preparation still required

Confirm the submitting organization's local-MCP eligibility and verified developer identity. Prepare live support, privacy, and terms URLs; listing icons; a walkthrough; and reviewer instructions. Test the installed experience in the intended ChatGPT desktop host and supported account/workspace. Submit `voxelflow-plugin-0.3.0.zip` through the approved route, resolve review findings, and publish after approval. These account-level steps are not completed. Metadata intentionally does not invent legal URLs or claim certification.

## Browser-only ChatGPT

This needs a different deployment: host an authenticated HTTPS MCP service, generate downloadable models server-side, or securely pair each logged-in user with an outbound editor connection. Add per-user isolation, session expiration, deployment/monitoring, and a tested authentication flow. A tunnel to one developer's Blockbench is not a shared multi-user product. Do not expose the current loopback bridge as the public service.

## Release checks

Run `npm ci`, `npm run check`, `npm run package:desktop`, and `npm run verify:desktop`. Verification extracts outside the repository, starts the bundled companion, negotiates MCP, checks 14 tools and 2 prompts, verifies missing-editor and invalid-input behavior, and confirms desktop logs omit credentials. It does not simulate successful modeling.

Regenerate the ZIPs after changing their manifest, assets, guide, skills, or runtime. The source archive `dist/voxelflow-studio-0.2.0.zip` is historical; 0.3 desktop ZIPs are the end-user downloads. Refresh installed cache copies through the host plugin manager.
