// usage: node meta.mjs <dir> <meta.json>  -> writes index.html, manifest, favicon, og.html, sitemap, robots
import { readFileSync, writeFileSync } from 'node:fs'
const [dir, mj] = process.argv.slice(2)
const m = JSON.parse(readFileSync(mj, 'utf8'))
const url = `https://hermes98761234.github.io/${m.repo}/`
const c = m.color ?? '#2563eb'
writeFileSync(`${dir}/index.html`, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${m.title}: ${m.tagline}</title>
    <meta name="description" content="${m.desc}" />
    <meta name="keywords" content="${m.keywords}" />
    <meta name="author" content="Volodymyr Kopytsia" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#f4f5f7" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-title" content="${m.short}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${m.title}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${m.title}" />
    <meta property="og:description" content="${m.tagline}" />
    <meta property="og:image" content="${url}og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${m.title}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="uk_UA" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${m.title}" />
    <meta name="twitter:description" content="${m.tagline}" />
    <meta name="twitter:image" content="${url}og-image.png" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "${m.title}",
        "url": "${url}",
        "description": "${m.desc}",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any",
        "inLanguage": ["en", "uk"],
        "isAccessibleForFree": true,
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "author": { "@type": "Person", "name": "Volodymyr Kopytsia" }
      }
    </script>
  </head>
  <body>
    <noscript>This tool needs JavaScript.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`)
writeFileSync(`${dir}/public/manifest.webmanifest`, JSON.stringify({ name: m.title, short_name: m.short, description: m.desc, start_url: './', scope: './', display: 'standalone', background_color: '#f4f5f7', theme_color: c, icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2))
writeFileSync(`${dir}/public/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${c}"/><g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${m.icon}</g></svg>\n`)
writeFileSync(`${dir}/scripts/icon.html`, `<!doctype html>\n<html><body style="margin:0;background:${c}">\n<img src="../public/favicon.svg" style="width:100vw;height:100vh;display:block" alt="">\n</body></html>\n`)
let og = readFileSync(`${dir}/scripts/og.html`, 'utf8')
og = og.replace(/<h1>.*<\/h1>/, `<h1>${m.title}</h1>`).replace(/<p>.*<\/p>/, `<p>${m.tagline}</p>`).replace(/<div class="url">.*<\/div>/, `<div class="url">hermes98761234.github.io/${m.repo}</div>`)
writeFileSync(`${dir}/scripts/og.html`, og)
writeFileSync(`${dir}/public/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${url}</loc>\n    <changefreq>monthly</changefreq>\n  </url>\n</urlset>\n`)
writeFileSync(`${dir}/public/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${url}sitemap.xml\n`)
