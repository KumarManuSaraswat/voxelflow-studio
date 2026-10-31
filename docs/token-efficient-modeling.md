# Token-efficient modeling

Ask normally, for example: “Create a wooden ladder with eight evenly spaced gold rungs. Use repeated parts and concise inspection, keeping every rung editable.” The shipped modeling skill and tool descriptions direct the assistant to use these features. No separate switch is required for summary inspection.

## Describe repeated parts once

Add `repeat` to a `create_prop` part:

```json
{
  "name": "rung",
  "group": "rungs",
  "from": [-4, 0, -1],
  "to": [4, 1, 1],
  "material": "gold",
  "repeat": {"count": 8, "step": [0, 3, 0]}
}
```

Define `gold` in the usual materials list. Count includes the original: this expands into `rung`, `rung_2` through `rung_8`, spaced three pixels apart on Y. Copies share the material, group and rotation. Explicit pivots translate by the same offset; omitted pivots use each cube's center. These are independent cubes, not linked instances. The final cube count appears in the approval dialog.

Counts must be integers from 2 to 128, the step must be nonzero, and the whole expanded model must stay within 128 cubes. Every resulting coordinate and pivot must remain within −128 to 128, all cube dimensions must be positive, and generated names must be unique and at most 48 characters. Expansion is bounded before allocation. Names colliding with explicitly supplied parts are rejected. Explicit blueprints remain supported; use them for irregular spacing or different materials, rotations or groups.

Namespace defaults to `voxelflow`, group to `root`, and rotation to zero. Omit those fields when the defaults fit. Do not simplify requested details just to shorten a request.

## Read only the detail needed

`inspect_project {}` uses `detail: "summary"`: geometry counts and group counts instead of every coordinate. Actual material names/colors, rig mapping/detection, texture and animation summaries, and unsupported-feature warnings are retained. The editor still captures the real scene, and `validate_asset` still performs its complete checks.

Use `inspect_project {"detail":"full"}` when analyzing coordinates, pivots, rotations, UVs or bone transforms. Existing clients that consume `geometry.parts` or the `geometry.bones` array must explicitly request full detail. Summary uses a number for `geometry.bones` and omits `geometry.parts`.

Keep plans brief, avoid reproducing tool JSON in the chat, and wait for the artist's approval before checking operation status. Repeated polling while approval is pending wastes tokens without advancing the edit.

## Reproducible payload measurements

Run `npm run measure:payloads`. It compares minified JSON character counts for equivalent inputs and the geometry section of inspection:

| Example | Explicit/full | Compact/summary | Reduction |
| --- | ---: | ---: | ---: |
| Eight-rung creation spec | 772 | 225 | 70.9% |
| Bag inspection geometry | 4,882 | 262 | 94.6% |
| Staff inspection geometry | 2,669 | 198 | 92.6% |

These are payload character counts, **not measured token counts or billing reductions**. The creation comparison omits defaults in both inputs and produces identical geometry. Inspection summaries intentionally omit coordinates, which remain available through full inspection. Tool schemas, other result fields, conversation history, reasoning and retries are outside these measurements. The repeat schema adds some discovery overhead; designs without repetition benefit primarily from shorter inspections. Actual savings depend on the model and host.

Update both companion and Blockbench plugin and refresh tool discovery before using this feature. It does not change the local-host requirement or make a cloud chat connect automatically.
