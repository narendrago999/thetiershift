# TierShift Engineering Studio v1.0

A browser-based architecture design workspace for data engineering and enterprise AI.

## Scope
- Drag-and-drop architecture canvas with typed component ports
- Data engineering and enterprise AI component catalogue
- Six editable starter templates
- TAPF 1.0 JSON project import/export
- Browser-local project persistence
- Deterministic design checks
- SVG and printable blueprint exports

## Hosting
This first implementation is a dependency-free static application served from `/studio/` on GitHub Pages. Relative assets are intentional. The standalone implementation avoids changing the existing static website or requiring a build pipeline. It can be migrated to React/TypeScript and XYFlow after usage and interaction requirements are validated.

## Privacy and limitations
Projects are stored in browser localStorage in this initial release. They are not synchronised across devices. No live cloud systems are connected or provisioned. Do not enter credentials, secrets or confidential data. Validation is architecture guidance, not certification.

## Files
- `index.html`: application shell and views
- `studio.css`: responsive dark interface
- `studio.js`: catalogue, canvas interactions, TAPF model, validation, storage and exports
