// usage: node readme.mjs <dir> <json>  json: {repo,title,pitch,features[],how[]}
import { readFileSync, writeFileSync } from 'node:fs'
const [dir, mj] = process.argv.slice(2)
const m = JSON.parse(readFileSync(mj, 'utf8'))
const url = `https://hermes98761234.github.io/${m.repo}/`
writeFileSync(`${dir}/README.md`, `# ${m.title}

${m.pitch}

**Try it: ${url}**

[![Deploy](https://github.com/hermes98761234/${m.repo}/actions/workflows/deploy.yml/badge.svg)](https://github.com/hermes98761234/${m.repo}/actions/workflows/deploy.yml)

![Screenshot](docs/screenshot.png)

## Features

${m.features.map((f) => `- ${f}`).join('\n')}
- English and Ukrainian UI, light/dark/system theme, settings saved in the browser, shareable links
- Fully client-side: no backend, no tracking, your data never leaves the browser

## How it works

${m.how}

## Quick start

\`\`\`sh
npm install
npm run dev      # development server
npm test         # unit tests (vitest)
npm run lint     # oxlint
npm run build    # type-check and production build into dist/
\`\`\`

## License

MIT, see [LICENSE](LICENSE).
`)
