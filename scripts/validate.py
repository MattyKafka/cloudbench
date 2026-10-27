"""Static project validation, no third-party dependencies required."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json

ROOT = Path(__file__).resolve().parents[1]
PAGES = [ROOT/'index.html', *sorted((ROOT/'tests').glob('*.html'))]
class HTMLLinks(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=set()
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.add(d['id'])
        for key in ('src','href'):
            if key in d:self.links.append((key,d[key]))
errors=[]
for page in PAGES:
    p=HTMLLinks();p.feed(page.read_text(encoding="utf-8"))
    for key, ref in p.links:
        u=urlsplit(ref)
        if not u.path:
            if u.fragment and u.fragment not in p.ids:errors.append(f'{page.name}: #{u.fragment} not found')
            continue
        if u.scheme or u.netloc:continue
        file=(page.parent/unquote(u.path)).resolve()
        if not file.is_file():errors.append(f'{page.name}: missing {u.path}')
        if u.fragment and u.path in (page.name, '') and u.fragment not in p.ids: errors.append(f'{page.name}: target #{u.fragment} not found')
for size in (128,512,1024):
    path=ROOT/'assets'/'payloads'/f'{size}kb.bin'
    if path.stat().st_size!=size*1024:errors.append(f'{path}: unexpected length')
conf=json.loads((ROOT/'data'/'platforms.json').read_text(encoding="utf-8"))
if len(conf.get('platforms',[]))!=3:errors.append('provider config malformed')
for platform in conf['platforms']:
    url = platform.get('url', '')
    if url:
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.query or parsed.fragment or parsed.path.endswith('.html'):
            errors.append('provider URL must be an HTTPS base URL')
rows=json.loads((ROOT/'data'/'synthetic-records.json').read_text(encoding="utf-8"))
assert len(rows['items'])==180
print('Checked',len(PAGES),'HTML pages, local links, all binary payloads, configuration and demo data')
if errors:
    for e in errors:print('ERROR:',e)
    raise SystemExit(1)
print('PASS: no missing references or malformed datasets')
