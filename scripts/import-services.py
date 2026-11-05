"""
Refresh hub/services (ares-web.com/services) from a checkout of the old Outreachdev site, applying the
Ares Web Services rebrand:

  python scripts/import-services.py <path to the outreachdev site checkout>

- Copies the site and both apps, except root-only and private files (CNAME, robots, sitemap, the
  IndexNow key, setup notes, security rules, tests, the _archive folder).
- Keeps the rebranded images already in hub/services (logo, favicons, share image, app screenshots).
- Rebrands text: name, wordmark, "by Outreachdev" labels, the logo symbol, page titles and legal text,
  structured data, frame labels and image URLs. Firebase config is left alone (backend addresses).
"""
import os, re, shutil, sys

src = sys.argv[1]
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hub', 'services')
SKIP_NAMES = {'CNAME', 'HOW-TO-UPDATE.txt', 'SETUP.txt', 'robots.txt', 'sitemap.xml', 'firestore.rules', 'test_solver.js', '.nojekyll'}
SKIP_DIRS = {'.git', '_archive', 'node_modules', '.github'}
KEEP_REBRANDED = {'assets/favicon.svg', 'assets/logo-mark.svg', 'assets/logo-mark-1024.png', 'assets/apple-touch-icon.png',
                  'assets/og-image.png', 'scheduling-agent/favicon.svg', 'work-orders/favicon.svg'}

BOOK_SYMBOL = ('<symbol id="o-mark" viewBox="2 8 60 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">'
  '<path stroke-width="3.2" d="M32 48 C24 44.5 14 44.5 6 48 V18 C14 14.5 24 14.5 32 18 C40 14.5 50 14.5 58 18 V48 C50 44.5 40 44.5 32 48 Z"/>'
  '<path stroke-width="2.4" stroke-opacity=".55" d="M32 18 V48"/>'
  '<path stroke-width="2.4" stroke-opacity=".8" fill="currentColor" fill-opacity=".08" d="M32 18 C37 15.8 42 15.6 46 16.4 V44.6 C42 43.8 37 44 32 46 Z"/></g></symbol>')
TEXT = [
  ('<span class="brand-name">Outreach<span class="brand-dev">dev</span></span>', '<span class="brand-name">Ares<span class="brand-dev"> Web Services</span></span>'),
  ('OUTREACHDEV BY LEE THOMPSON', 'ARES WEB SERVICES BY LEE THOMPSON'),
  ('Outreachdev by Lee Thompson', 'Ares Web Services by Lee Thompson'),
  ('Outreachdev by Thompson Technologies', 'Ares Web Services by Thompson Technologies'),
  ('<small>by Outreachdev</small>', '<small>by Ares</small>'),
  ('PRODID:-//Outreachdev//', 'PRODID:-//Ares Web Services//'),
  ('Scheduling Agent v1 (Outreachdev)', 'Scheduling Agent v1 (Ares Web Services)'),
  ('Accent:   Outreachdev purple', 'Accent:   purple'),
  ('/* Outreachdev wordmark */', '/* Wordmark */'),
  ('Outreachdev (by Thompson Technologies): shared site behavior', 'Ares Web Services (by Thompson Technologies): shared site behavior'),
  ('Work Order Manager by Outreachdev', 'Work Order Manager by Ares Web Services'),
  ('Scheduling Agent by Outreachdev', 'Scheduling Agent by Ares Web Services'),
  ('https://outreachdev.dev/assets/', 'https://ares-web.com/services/assets/'),
  ('<span>outreachdev.dev/', '<span>ares-web.com/services/'),
  ('@outreachdev.dev"', '@ares-web.com"'),
  ('"alternateName": ["Outreachdev", "ARES"]', '"alternateName": ["ARES"]'),
  ('"sameAs": ["https://ares-web.com/", "https://outreachdev.dev/", ', '"sameAs": ["https://ares-web.com/", '),
  ('{"@type": "WebSite", "@id": "https://outreachdev.dev/#website", "url": "https://outreachdev.dev/", "name": "Outreachdev"',
   '{"@type": "WebSite", "@id": "https://ares-web.com/services/#website", "url": "https://ares-web.com/services/", "name": "Ares Web Services"'),
  ("Outreachdev's", "Ares Web Services'"),
  ('Outreachdev', 'Ares Web Services'),
]

copied = 0
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), src).replace(os.sep, '/')
        if f in SKIP_NAMES or re.fullmatch(r'[0-9a-f]{32}\.txt', f) or rel in KEEP_REBRANDED or rel.startswith('assets/apps/'):
            continue
        out = os.path.join(dst, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if f.endswith(('.html', '.js', '.css')) and not f == 'config.js':
            t = open(os.path.join(root, f), encoding='utf8').read()
            if '<symbol id="o-mark"' in t:
                a = t.index('<symbol id="o-mark"'); b = t.index('</symbol>', a) + len('</symbol>')
                t = t[:a] + BOOK_SYMBOL + t[b:]
            for x, y in TEXT:
                t = t.replace(x, y)
            open(out, 'w', encoding='utf8', newline='').write(t)
        else:
            shutil.copy2(os.path.join(root, f), out)
        copied += 1
print('copied', copied, 'files into', os.path.normpath(dst))
