# AI Static Website Platform

Schema-driven static website generation with versioned, site-wide themes.

## Quick start

```bash
npm ci
npm run validate
npm run build
npm run preview
```

Open `http://127.0.0.1:4173` after starting the preview server.

## Commands

```text
ai-cms build [all|products|cases|news|downloads|faq] [--changed] [--theme <id>]
ai-cms validate [--theme <id>]
ai-cms report [--json]
ai-cms preview [--port <port>]
ai-cms theme list
ai-cms theme validate <id|--all>
```

`--changed` compares SHA-256 hashes and keeps the previous output when validation or rendering fails. Shared content, schemas, public assets and theme changes trigger a full rebuild.

## Project layout

```text
content/                         Business content only
themes/<theme-id>/               Versioned templates, tokens and theme assets
public/                          Site-owned local media and downloads
schemas/                         Content and theme-independent contracts
dist/                            Generated deployable website
.ai-cms/                         Build manifest and report cache
```

The selected theme is configured in `ai-cms.config.json`. A theme consumes the same canonical page ViewModel as every other theme and declares a strict `themeApiVersion`, engine range, complete page-template map, local asset arrays and required helpers. Theme tokens are exposed under `theme.tokens` so each package can own its visual system. Theme code cannot read the filesystem or execute Node.js during rendering.

## Content workflow

1. Edit `content` or `public`.
2. Run `npm run validate`.
3. Run `npm run build` or `ai-cms build --changed`.
4. Run `npm run report`.

Do not edit `dist` directly. AI agents should follow `AGENTS.md`.
