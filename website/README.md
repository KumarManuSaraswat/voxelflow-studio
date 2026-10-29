# VoxelFlow Studio website

A buildless, responsive website for the VoxelFlow Studio desktop beta. The published assets are in `dist/`; no package installation is required.

The interactive viewer renders the actual bag, staff, and Atlas robot cube blueprints using Canvas 2D projection. It is an illustrative sample explorer, not a live AI service. All model and release links point to real downloadable files. The setup guide stores its optional checklist only in the visitor's browser. There is no analytics, login, form backend, or AI endpoint.

Preview `dist/` with a static HTTP server. Main files: `index.html`, `guide.html`, `styles.css`, `app.js`, and `assets/models.json`. Typography is bundled Manrope under its included SIL Open Font License. Models and original website code follow the VoxelFlow project MIT license.

Update versioned download URLs and the setup compatibility notes when publishing a new plugin release. Keep the distinction between verified Codex/editor functionality and unverified ChatGPT account onboarding visible.

## Vercel deployment

Public website: <https://voxelflow-studio.vercel.app>.

Vercel project: `voxelflow-studio`, connected to `KumarManuSaraswat/voxelflow-studio` on GitHub.

The repository-root `vercel.json` publishes `website/dist` as a static site. Leave the Vercel Root Directory at the repository root, select the **Other** framework preset, and use the checked-in overrides for empty install/build commands. The website does not need the companion server or any environment variables.

Production deployments follow the GitHub `main` branch. To deploy manually from the repository root with an authorized Vercel account, run `vercel --prod`. `.vercelignore` limits CLI uploads to the public website and deployment configuration. The local `.vercel` project link stays out of Git.
