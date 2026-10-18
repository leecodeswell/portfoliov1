/**
 * Publish to the gh-pages branch:  npm run deploy
 * Builds the desk, then commits the whole site as the content of gh-pages and pushes it:
 *   /        the hub page (hub/index.html, hub/portrait.png) and hub/CNAME (custom domain ares-web.com)
 *   /desk/   the desk portfolio (dist/)
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const run = (cmd, cwd = process.cwd()) => execSync(cmd, { cwd, stdio: 'inherit' })
const out = (cmd, cwd = process.cwd()) => execSync(cmd, { cwd }).toString().trim()

run('npm run build:pages')
fs.writeFileSync('dist/.nojekyll', '') // serve files as-is (no Jekyll processing)

const remote = out('git remote get-url origin')
const sha = out('git rev-parse --short HEAD')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghpages-'))
fs.cpSync('hub', tmp, { recursive: true })
fs.cpSync('dist', path.join(tmp, 'desk'), { recursive: true })
// site icons at the root too, so the hub and browsers' /favicon.ico requests find them
for (const f of ['favicon.ico', 'favicon-32.png', 'icon-512.png', 'apple-touch-icon.png']) fs.copyFileSync(path.join('public', f), path.join(tmp, f))
fs.writeFileSync(path.join(tmp, '.nojekyll'), '')
run('git init -q -b gh-pages', tmp)
run('git add -A', tmp)
run(`git -c user.name="${out('git config user.name') || 'deploy'}" -c user.email="${out('git config user.email') || 'deploy@local'}" commit -q -m "Deploy ${sha}"`, tmp)
run(`git push -f ${remote} gh-pages`, tmp)
fs.rmSync(tmp, { recursive: true, force: true })
console.log('\nPublished to gh-pages: https://ares-web.com/ (hub) and https://ares-web.com/desk/ (desk)')
