# Changelog

## 0.3.2 — AI-host compatibility and demo kit

- Fix `create_prop` discovery in Codex: coordinate schemas now advertise homogeneous numeric arrays with exactly three values, preserving validation bounds and tuple values internally.
- Add a regression check against the actual advertised MCP schema.
- Add a read-only setup doctor and an offline hackathon kit with saved models, exports, prompts, troubleshooting, and adaptable demo scripts.

See [release notes](docs/releases/0.3.2.md) and the [presenter guide](docs/hackathon-demo.md).

## 0.3.1 — Public desktop beta

- Correct dependency-lock entries accidentally changed during the 0.3.0 version update, restoring clean npm installs.
- Retain the 0.3 desktop functionality, with rebuilt packages and automated public release checks.

See [release notes and known limits](docs/releases/0.3.1.md). The 0.3.0 tag is retained for history; its release workflow stopped before publishing assets.

## 0.3.0 — Desktop beta

- Installable local desktop plugin with a portable manifest, MCP configuration, and setup/modeling skills.
- Bundled server dependencies, a Windows companion launcher, and automatic local pairing discovery.
- Downloadable desktop and plugin ZIPs with checksums; fresh-extraction and live-editor verification.
- Public contribution, governance, support, security, and release documentation.

See [release notes and known limits](docs/releases/0.3.0.md).

## 0.2.0 — Prompt-designed props

- General cube-based props with named materials, grouping, pivots, and rotations.
- Bag and Staff examples, editable source, PNG textures, and static Bedrock resource exports.
- Material recoloring, native approval and Undo, and live-editor verification.

## 0.1.0 — Artist pipeline

- Configurable Atlas robot with texture, humanoid mapping, and idle/walk/attack animation.
- Authenticated local MCP companion, reviewed operations, validation, and Bedrock resource exports.
