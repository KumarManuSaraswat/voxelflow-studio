# Contributing to VoxelFlow Studio

You can contribute example prompts and models, test the desktop experience, improve documentation, report bugs, or write code. Read the [Code of Conduct](CODE_OF_CONDUCT.md) and [supported scope](docs/roadmap.md) first.

## Choose a contribution

See [specific starter tasks](docs/contributor-tasks.md), [installation reports](https://github.com/KumarManuSaraswat/voxelflow-studio/issues/new?template=installation.yml), and [model showcases](https://github.com/KumarManuSaraswat/voxelflow-studio/issues/new?template=showcase.yml). Artists and testers can contribute without setting up a development environment.

Use [issues](https://github.com/KumarManuSaraswat/voxelflow-studio/issues) to report a reproducible bug or propose a feature. For substantial changes, explain the artist's workflow and discuss the approach before implementation. Small corrections can go straight to a pull request. There are no response-time guarantees during this early volunteer stage.

For an example, include the prompt, editable source, a screenshot, and what you checked. Submit only models, textures, and other material you have permission to share. Remove private paths, connection tokens, and unrelated content from captures.

## Set up development

Use Node.js 22+, npm, and Blockbench desktop 5.2+. Fork and clone the repository, create a branch, then run:

```sh
npm ci
npm run check
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. Load `dist/voxelflow_studio.js` through Blockbench's **File → Plugins → Load Plugin from File**. Start `npm run bridge` and connect from the VoxelFlow panel. [MCP integration](docs/mcp-integration.md) covers host setup and live demos.

## Make the change reviewable

- Keep one focused purpose per pull request. Explain the problem, resulting behavior, and verification.
- Preserve native approval, Undo, validation, and explicit operation results. A proposal is not a successful scene change.
- Add meaningful tests for changed behavior. For editor changes, also describe the real Blockbench steps you tried; unit tests cannot establish native UI behavior.
- Run `npm run check` for code changes. For desktop packaging changes, also run `npm run package:desktop` and `npm run verify:desktop`.
- Documentation-only changes need a read-through and working links; the full test suite is unnecessary unless behavior or build inputs changed.
- Keep `.local`, `.research`, `node_modules`, `.env` files, tokens, and personal test assets out of commits. Never paste `bridge.json` into an issue.

Generated builds and example files are intentionally tracked so desktop users can install from GitHub. Include relevant regenerated outputs when changing their source, and explain unexpected generated changes. Maintainers refresh versioned release ZIPs and checksums when publishing a release.

## Pull requests and review

Open a pull request against `main` and complete its template. A maintainer reviews scope, behavior, and relevant checks before merging. Please avoid unrelated formatting changes and describe any remaining limitation honestly. The initial maintainer may publish documented maintenance and release changes directly while the project has a single maintainer.

Contributions are accepted under the existing MIT license. Keep attribution and third-party license notices. No separate contributor agreement is required. [Governance](GOVERNANCE.md) describes maintainership and project decisions.
