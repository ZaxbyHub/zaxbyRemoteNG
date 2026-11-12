# zremote plan review and UI design framework

Review of the `ZaxbyHub/zremote` program plan (commit `c0993d2`) and a complete interface
specification for it. Produced 2026-11-12. This folder is self-contained and is intended to be
copied into the zremote repository (suggested location: `docs/review/2026-11-12/` for the
review and `docs/design/` for the design folder).

| File | Contents |
|---|---|
| `01-plan-review.md` | 32 findings with severity, evidence grade, and required change; verified claims; RDP engine bake-off; limits of this review |
| `design/DESIGN.md` | The interface specification: anatomy, tokens, state system, components, surfaces, screens, keyboard, accessibility, copy, library mapping, budgets |
| `design/BUILD-GUIDE.md` | Build order, component contracts, and acceptance checks for an implementing agent |
| `design/tokens.css` | Design tokens: dark, light, contrast themes, three densities |
| `design/mockups/` | Static HTML reference mockups, their stylesheet, and the generator script |
| `design/screens/` | The mockups rendered at 1440×900 @2x (14 images) |

Reading order for an implementing agent: `01-plan-review.md` §1 and §4, then `design/DESIGN.md`,
then `design/BUILD-GUIDE.md`, with `design/screens/` open alongside.
