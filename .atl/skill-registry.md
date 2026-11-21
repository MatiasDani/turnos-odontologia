# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

Project: turnos-odontologia (TypeScript + Node.js, hexagonal domain, Vitest, Fastify optional). Generated: 2026-11-21. Skills: 19.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Writing tests, mocking, coverage, test filtering/fixtures (project test runner) | vitest | C:\Users\Usuario\.claude\skills\vitest\SKILL.md |
| Starting a feature/change with no spec; ambiguous requirements; capability decomposition | spec-driven-development | C:\Users\Usuario\.agents\skills\spec-driven-development\SKILL.md |
| "openspec apply", "opsx apply", implement/continue tasks of a change | openspec-apply-change | C:\0-PROYECTOS\Desarrollo-de-Software\Global-desarrollo\.claude\skills\openspec-apply-change\SKILL.md |
| "openspec archive", "opsx archive", finalize a completed change | openspec-archive-change | C:\0-PROYECTOS\Desarrollo-de-Software\Global-desarrollo\.claude\skills\openspec-archive-change\SKILL.md |
| "openspec explore", "opsx explore", think through ideas before/during a change | openspec-explore | C:\0-PROYECTOS\Desarrollo-de-Software\Global-desarrollo\.claude\skills\openspec-explore\SKILL.md |
| "openspec propose", "opsx propose", new change with all artifacts | openspec-propose | C:\0-PROYECTOS\Desarrollo-de-Software\Global-desarrollo\.claude\skills\openspec-propose\SKILL.md |
| "openspec sync", sync delta specs to main specs without archiving | openspec-sync-specs | C:\0-PROYECTOS\Desarrollo-de-Software\Global-desarrollo\.claude\skills\openspec-sync-specs\SKILL.md |
| "openspec update change", "opsx update", revise planning artifacts of a change | openspec-update-change | C:\0-PROYECTOS\Desarrollo-de-Software\Global-desarrollo\.claude\skills\openspec-update-change\SKILL.md |
| /active-orchestrator:*, start a new project via SDD/OpenSpec foundation flow | active-orchestrator | C:\Users\Usuario\.claude\skills\active-orchestrator\SKILL.md |
| Create/generate/update AGENTS.md / CLAUDE.md; "reglas del proyecto" | agent-instruction | C:\Users\Usuario\.claude\skills\agent-instruction\SKILL.md |
| Define/audit project visual identity; visual policy (mockups/system/none) | design-system | C:\Users\Usuario\.claude\skills\design-system\SKILL.md |
| Frontend/UI generation requiring high-taste anti-slop design (v1) | design-taste-frontend-v1 | C:\Users\Usuario\.claude\skills\design-taste-frontend-v1\SKILL.md |
| Discovery/market research phase before KB (checklist Q&A, competitors) | discovery-research | C:\Users\Usuario\.claude\skills\discovery-research\SKILL.md |
| UI polish, component design, animation decisions, UI code review | emil-design-eng | C:\Users\Usuario\.claude\skills\emil-design-eng\SKILL.md |
| "find a skill for X", "how do I do X", extend capabilities | find-skill | C:\Users\Usuario\.claude\skills\find-skill\SKILL.md |
| Create/build/generate a knowledge base; "armar KB", "documentar proyecto" | kb-creator | C:\Users\Usuario\.claude\skills\kb-creator\SKILL.md |
| Create/regenerate CHANGES.md, roadmap, change map | roadmap-generator | C:\Users\Usuario\.claude\skills\roadmap-generator\SKILL.md |
| Create/modify/optimize skills, run skill evals | skill-creator | C:\Users\Usuario\.claude\skills\skill-creator\SKILL.md |
| Research a competitor from a URL into fixed-schema notes | web-scraper | C:\Users\Usuario\.claude\skills\web-scraper\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### vitest
- Config in `vitest.config.ts` via `defineConfig` (shares Vite config); native ESM + TypeScript, no transform setup needed.
- Jest-compatible API: `describe/test/it/expect`, hooks `beforeEach/afterEach/beforeAll/afterAll`; import explicitly from `vitest` (or enable globals + types).
- Mocking via `vi.fn()`, `vi.spyOn()`, `vi.mock()` (hoisted), fake timers/dates with `vi.useFakeTimers()` / `vi.setSystemTime()` — useful for time-based booking rules.
- Filter runs: `vitest run -t "name"`, file patterns, `.only`/`.skip`; use `vitest run` in CI (no watch).
- Coverage: `--coverage` with V8 (default) or Istanbul provider; configure `coverage.include/thresholds`.
- Fixtures: `test.extend` for custom context; `test.each` for table-driven scenarios (triangulation).
- Environment defaults to `node`; use jsdom/happy-dom only for DOM tests.
- Type-level tests with `expectTypeOf` / `assertType`.

### spec-driven-development
- Spec before code: Specify -> Plan -> Tasks -> Implement; human reviews each gate, do not advance unvalidated.
- Phase 0: if one request bundles several independently testable capabilities, propose a capability map (kebab-case module ids, one-way deps, build order) first.
- List ASSUMPTIONS explicitly before writing the spec and ask for correction.
- Spec covers objective, boundaries, success criteria; specs are the source of truth, code without spec is guessing.
- Skip for one-line fixes/typos or unambiguous self-contained changes.
- Note: in this project OpenSpec (openspec-* skills) is the operative workflow; use this only as complementary guidance.

### openspec-apply-change
- Read contextFiles from `openspec instructions apply` output; never assume file names.
- Keep code changes minimal and scoped to each task; mark `- [x]` immediately and only when specified behavior is FULLY implemented (never when partial/deferred).
- Ambiguous task, blocker, or error: pause and ask; never guess. If implementation reveals design issues, suggest artifact updates.
- Never silently narrow/defer/simplify specified behavior; surface added scope and pause.
- Use each task's sourcePath and line to update its exact checkbox.
- Do not copy runtime context/operation guidance into code or artifacts; preserve CLI-controlled blocked/ready/all-done behavior.

### openspec-archive-change
- Announce the selected change; prompt if ambiguous. Use `openspec status --json` for completion checking.
- If delta specs exist, always run sync assessment and show combined summary before prompting.
- Never archive while a spec sync is in flight; sync inline (`openspec-sync-specs`) and verify main specs before moving.
- Warnings do not block archive: inform and confirm. Preserve `.openspec.yaml` (moves with the directory).
- Archive target: `openspec/changes/archive/YYYY-MM-DD-<name>/`.

### openspec-explore
- Thinking partner only: NEVER write code or edit schemas/templates/`openspec/config.yaml`.
- Never create change dirs by hand; use `openspec new change "<name>"`.
- Before the first write-capable action, name files/changes, ask yes/no, wait for explicit confirmation in a separate message.
- Ground discussion in the codebase; visualize with diagrams; question assumptions; do not fake understanding.
- Handoff to implementation goes via `openspec-propose`.

### openspec-propose
- Planning only: do NOT implement or edit project code; after presenting artifacts stop and wait for a new request.
- Create every artifact apply transitively depends on; re-read dependency artifacts from disk before creating the next.
- Ask only about ambiguities that materially change scope/behavior/acceptance; record minor assumptions.
- If change name exists, ask continue vs. new. Verify each artifact file exists after writing.

### openspec-sync-specs
- Read both delta and main specs first; preserve main content not mentioned in delta.
- Never copy a delta as-is into main spec; merge so main keeps its format (no delta operation headers). Idempotent.
- Use only `artifactPaths.specs.existingOutputPaths` (honor caller-supplied subset); stop on non-zero/invalid JSON instructions.
- Show what is changing as you go.

### openspec-update-change
- Planning artifacts only; NEVER edit implementation code (point to `openspec-apply-change`).
- Use artifact ids/paths from `openspec status`; edit only `existingOutputPaths`; do not advance the build frontier.
- Confirm every edit with the user before writing.
- If intent changes (not refinement), recommend a new change name via `openspec new change`.

### active-orchestrator
- Routes to sub-skills; never reimplements discovery/KB/roadmap/rules logic; never asks strategic content questions itself.
- Owns only `version`, `step`, `owner` in `.active-orchestrator-state.json`; sub-skills write their own sections (e.g. `registry`).
- Resume by default if state exists and `step != "done"`; STOP and wait after each question; no phase chaining without user checkpoint ("Continuar").
- Never install anything autonomously (HIGH governance): recommend, user picks.

### agent-instruction
- Pre-check: `knowledge-base/` and `02_descripcion_general.md` must exist; CHANGES.md optional (omit roadmap section with warning).
- Output `AGENTS.md` and `CLAUDE.md` at project root with identical content (copies, not references).
- Read `.atl/skill-registry.md` as source of truth for skills; do NOT repeat global `~/.claude/CLAUDE.md` content.
- Project-specific hard rules are stack-aware and confirmed interactively with the user.

### design-system
- Honor recorded `visual_design.mode` (JSON) / `Mode:` (design-system/README.md); ask once only if absent/deferred; stop if they disagree.
- Foundation lives at `design-system/` (README, brand.md, brand.js, tokens.css, components.html, assets/, previews/); never overwrite an existing identity.
- Mark unknown facts `(TBD)`; never invent brand facts as final; provisional logo must say placeholder.
- Approval is explicit from the user; revision bumps reset approval.

### design-taste-frontend-v1
- Defaults DESIGN_VARIANCE 8 / MOTION 6 / DENSITY 4; user chat overrides.
- Check `package.json` before importing any 3rd-party lib; output install command if missing; respect Tailwind version.
- No emojis in code/markup; use `@phosphor-icons/react` or `@radix-ui/react-icons`.
- Use `min-h-[100dvh]` not `h-screen`; CSS Grid over flex percentage math; animate only `transform`/`opacity`.
- Ban Inter, serif in dashboards, AI purple/neon glows, pure `#000`, generic names ("John Doe"), fake round numbers.
- Always implement loading (skeleton), empty, error states; labels above inputs.
- NOTE: project design-system (`design-system/tokens.css`, revision 1) takes precedence over these defaults.

### emil-design-eng
- When first invoked without a question, reply only with the one-line readiness message.
- UI reviews MUST be a markdown table with Before/After columns (never list format).
- Never animate from `scale(0)`; animate transform/opacity; keep animations purposeful and fast; respect reduced motion.
- Polish unseen details (hover/active/focus states, easing, timing) as compounding quality.

### discovery-research
- Never fill a checklist item with an assumption when it can be asked or researched.
- Covers: problem, users, use cases, competitors, needed/optional features, business rules, integrations, constraints, risks, open questions.
- Uses `web-scraper` for competitor URLs; output feeds `kb-creator` (does not replace it); writes `state.discovery`.
- Whether to run Discovery is the orchestrator's decision, not this skill's.

### find-skill
- Use `npx skills find [query]` to search, `npx skills add <package>` to install, `npx skills update` to update.
- Recommend only; never install without user choice (installing globally is HIGH governance).
- Check popularity/source quality before recommending.

### kb-creator
- Output ONLY to `knowledge-base/` at project root; never mix with `docs/` (source documents).
- Exactly 10 canonical files (01_vision_y_objetivos ... 10_preguntas_abiertas) plus `README.md` index.
- Business rules coded RN-XX; decisions/assumptions in 09; inconsistencies/open questions in 10.
- Dual mode: silent from `docs/` sources, or interactive from scratch.

### roadmap-generator
- Generates `CHANGES.md` fire-and-forget (no questions): dependency tree, parallelism gates, critical path, 3-agent plan, per-change scope, governance, deps, "Leer antes" KB pointers.
- Change IDs C-NN; infer deps from KB; governance levels CRITICAL/HIGH/MEDIUM/LOW.
- Each change points to specific `knowledge-base/` files to read first.

### skill-creator
- Loop: draft skill -> test prompts -> evaluate (qualitative + quantitative) -> rewrite -> repeat; flexible if user wants no evals.
- Frontmatter `name` + `description` (description drives triggering); optimize description at the end.
- Keep SKILL.md concise; put bulk in references/, scripts/, assets/.

### web-scraper
- Fixed 8-field output schema, same order every time; empty field marked `(no publicado)`.
- Never invent data the page does not show.
- No crawling/mass scraping; only explicitly given pages; uses WebFetch/WebSearch (no API keys).
- File names via kebab-case slug (`scripts/slugify.py`) to avoid duplicate notes.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| CLAUDE.md / AGENTS.md | (not yet created) | Pending `agent-instruction` |
| Knowledge base index | knowledge-base/README.md | Index of 10 canonical KB files (01_vision_y_objetivos.md ... 10_preguntas_abiertas.md) |
| Roadmap | CHANGES.md | OpenSpec change index C-01..C-15 |
| Design system | design-system/README.md | Mode system-and-mockups, revision 1, approved; tokens.css, brand.md, components.html |
| Discovery | docs/discovery/informe-discovery.md | Product discovery report |
| OpenSpec | openspec/ | Specs and changes (managed by openspec CLI) |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
