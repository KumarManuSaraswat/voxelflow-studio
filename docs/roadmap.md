# Supported scope and next milestones

Version 0.3 packages the desktop beta with bundled MCP dependencies, setup/modeling skills, automatic local pairing, and a Windows launcher. It includes general prompt-designed static props: up to 128 cubes and 16 named materials, native texture/UVs, material edits, validation, Undo, and static Bedrock resource exports. Bag and Staff are working examples. It retains the animated robot pipeline, including humanoid mapping and idle/walk/attack clips.

Creative prompts go in connected ChatGPT/Codex, which designs a general prop specification or a robot specification. There is no local free-text parser or hidden model endpoint. Structural revisions currently create a fresh project; targeted in-place part editing over MCP is a next milestone. Animated custom characters and quadruped rigs are not implemented.

## Next artist milestones

The immediate focus after 0.3.3 is first-use reliability and useful revisions: independent fresh-account setup reports, in-place editing of named prop parts with approval and Undo, and reproducible Minecraft integration examples. The downloadable diagnostic, prompt gallery, and contributor report forms are now available. Automated package checks on an OS do not establish native Blockbench support there; macOS/Linux still need real editor testing.

These are proposed directions, not delivery promises. Contributions and concrete artist examples help decide priority; discuss substantial work in an issue before implementation.

1. Test with more imported humanoids and add a joint-placement preview; currently mapping requires an existing appropriate hierarchy and does not reposition joints.
2. Add targeted prop geometry editing, richer pixel textures, and Bedrock item/attachable export with hand/body transforms.
3. Add a live nonmutating pose preview before animation replacement. Currently approval shows a textual change summary; native animation preview follows application.
4. Add run, jump, hurt, and death, with transition and foot-contact checks. Existing clips use a simple deterministic gait and punch, not physics or inverse kinematics.
5. Add broader platform testing. Windows Blockbench 5.2.2 is verified; macOS/Linux and the web editor are not.

## Product expansion

Behavior-pack generation and Minecraft content-log integration come before a “playable mob” claim. Later work can add quadrupeds, custom sequences, animation blending, GeckoLib export, and more game adapters. Reference-image or AI texture services would require explicit provider credentials and consent; none are present now.

MCP follow-up work includes account-level Codex/ChatGPT demo verification, a properly authenticated HTTPS deployment if needed, and persisted operation history with careful project/session identity. Operation IDs remain in one bounded editor session; retries do not survive plugin reloads.

## Community milestones

Improve first-install testing, collect a small gallery of reproducible prompts and editable models, and welcome contributors through the [contribution guide](../CONTRIBUTING.md). Add maintainers as sustained participation grows. A dedicated organization and shared administration can follow the process in [governance](../GOVERNANCE.md); they are not prerequisites for contributing today.
