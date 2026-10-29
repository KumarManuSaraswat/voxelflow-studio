# Security policy

The latest desktop beta is the currently maintained version. Older beta releases do not receive separate security backports. This is a volunteer project without a guaranteed response time.

## Report a vulnerability privately

Use **Security → Advisories → Report a vulnerability** in the [GitHub repository](https://github.com/KumarManuSaraswat/voxelflow-studio/security/advisories) when that option is available. Include the affected version, a minimal reproduction, impact, and any proposed fix. Use dummy credentials and test models.

If private reporting is unavailable, open an issue titled **Private security contact requested**, without exploit details, credentials, or personal information, and wait for the maintainer to arrange a private channel. Do not publish a vulnerability's sensitive details in an ordinary issue.

## Relevant boundaries

- The companion listens on loopback and pairs with Blockbench using a local session credential. Keep `.voxelflow-studio/bridge.json`, development `.local/bridge.json`, and terminal tokens private.
- Scene mutations and exports require native approval. Treat unexpected changes, approval bypasses, cross-project access, and credentials appearing in logs as potential security issues.
- The local bridge is not a multi-user internet service. A future hosted version needs separate authentication and isolation work.
- A connected AI host may receive model information returned by its tools. Its account and data policies apply separately from the local plugin.

Maintainers should reproduce reports with synthetic data, coordinate a fix and release, and acknowledge the reporter with their consent. Public advisories should avoid revealing private credentials or unrelated user data.
