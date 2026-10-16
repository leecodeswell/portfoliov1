# ares — interactive portfolio

A book on a desk that you open and page through, live at **https://ares-web.com**. The desk, mug,
notepad and pencil are rendered in Blender (Cycles) and baked into textures; the book and the pile of
books beside it are live WebGL (React Three Fiber), and the pages show the projects exactly as their
sites render — unlit, ungraded.

## Run it

**Codespace:** open the repo in a Codespace. It installs and starts automatically and opens the
forwarded port (5173). To restart it yourself:

```bash
npm run serve
```

**Locally:** `npm install`, then `npm run dev` for development or `npm run serve` for the
production build.

> Quality: WebGL always renders on the GPU of the computer viewing the page, never in the cloud
> (a Codespace only serves files). If the page looks soft or stutters, the browser has hardware
> acceleration off; the site shows a warning when that happens (Chrome: Settings → System).

## Layout

| Path | What |
| --- | --- |
| `src/three/` | Scene: desk, book (page curl, covers, live page), book pile, camera, contact card |
| `src/content/` | Page list (`projects.ts`) and painted pages (contents, intro, contact) |
| `src/ShelfPanel.tsx` | The pile's books when opened: links, privacy policy |
| `public/pages/` | Captured page stills (3840×2270) and motion clips |
| `public/live/cologne/` | The live cologne hero, with its libraries vendored in `vendor/` (no CDN) |
| `capture/` | Playwright scripts that capture pages from the live sites (`node capture/capture.mjs`) |
| `blender/scripts/` | Scene build, preview renders, light bake + glTF export, cover textures |
| `scripts/deploy.mjs` | `npm run deploy`: builds and publishes to the `gh-pages` branch |

The live cologne page is a trimmed copy of the cologne site's hero in `public/live/cologne`, so it is
same-origin everywhere and loads fast; its libraries are served from the site itself, pinned, rather
than from a CDN. Every other page is a capture (`capture/`). The AUREL pages are captured from a local
2× build of the LuxuryCar site (see `capture/shots.mjs`).

## Publish

`npm run deploy` builds the site and force-pushes it to the `gh-pages` branch, which GitHub Pages
serves at ares-web.com (`public/CNAME`).
