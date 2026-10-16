# ares — interactive portfolio

A book on a desk that you open and page through. The desk, coffee, plant and pencil are rendered in
Blender (Cycles) and baked into textures; the book is live WebGL (React Three Fiber) and its pages
show the projects exactly as their sites render — unlit, ungraded.

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
| `src/three/` | Scene: desk, book (page curl, covers, live page), camera, contact card |
| `src/content/` | Page list (`projects.ts`) and painted pages (contents, intro, contact) |
| `public/pages/` | Captured page stills (3840×2270) and motion clips |
| `capture/` | Playwright scripts that capture pages from the live sites (`node capture/capture.mjs`) |
| `blender/scripts/` | Scene build, preview renders, light bake + glTF export, latte and cover textures |

The live cologne page and the Ares clips come from the projects' own sites; the dev/preview servers
proxy `/cologne/` and `/ares-web/` so the embedded cologne page is same-origin.
