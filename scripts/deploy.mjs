/**
 * Publish the Pages build to the gh-pages branch:  npm run deploy
 * Builds the site, then commits dist/ as the whole content of gh-pages and pushes it.
 * The site is served at https://ares-web.com/ (public/CNAME holds the custom domain)
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
fs.cpSync('dist', tmp, { recursive: true })
run('git init -q -b gh-pages', tmp)
run('git add -A', tmp)
run(`git -c user.name="${out('git config user.name') || 'deploy'}" -c user.email="${out('git config user.email') || 'deploy@local'}" commit -q -m "Deploy ${sha}"`, tmp)
run(`git push -f ${remote} gh-pages`, tmp)
fs.rmSync(tmp, { recursive: true, force: true })
console.log('\nPublished to gh-pages: https://ares-web.com/')
