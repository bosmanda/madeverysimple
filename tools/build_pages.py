"""Build the static, SEO-friendly shop pages from one list of books.
Run:  python3 tools/build_pages.py   (writes colouring-books/*, index.html cards, sitemap.xml, robots.txt)"""
import json, html, os, re, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://madeverysimple.co.za'
PRICE = 100
TAG = 'madeverysimpl-20'
SERIES = {'boys': f'https://www.amazon.com/dp/B0HP7V2BKH?binding=paperback&tag={TAG}',
          'girls': f'https://www.amazon.com/dp/B0HPP6FDPB?binding=paperback&tag={TAG}'}

BOOKS = [
 dict(key='dinosaurs', slug='dinosaur-colouring-book', title='My Dinosaur Colouring Book', brand='Made Very Simple', line='boys',
      seo='Dinosaur Colouring Book for Kids 3–6', what='dinosaurs',
      blurb='36 friendly dinosaurs and prehistoric creatures, from the mighty T. rex to a baby dinosaur hatching from its egg.',
      inside='T. rex, Triceratops, Stegosaurus, Brachiosaurus, Velociraptor, Spinosaurus, Ankylosaurus, Pteranodon, a baby T. rex hatching and a Mosasaurus splashing through the sea'),
 dict(key='african-safari', slug='african-safari-colouring-book', title='My African Safari Colouring Book', brand='Made Very Simple', line='boys',
      seo='African Safari Animals Colouring Book for Kids 3–6', what='African animals',
      blurb='36 African animals – lion, elephant, giraffe, meerkat, dassie, secretary bird and many more.',
      inside='the lion, elephant, rhino, buffalo and leopard (the Big Five), plus a giraffe, zebra, hippo, cheetah, meerkat, aardvark, dassie and secretary bird'),
 dict(key='tractors', slug='tractor-colouring-book', title='My Tractor Colouring Book', brand='Made Very Simple', line='boys',
      seo='Tractor Colouring Book for Kids 3–6', what='tractors and farm machines',
      blurb='36 busy tractors and farm machines, from an old steam engine to a giant combine harvester.',
      inside='a red farm tractor, an old steam engine, a combine harvester, a telehandler, a hay baler, a snowplough and a tractor splashing through a muddy puddle'),
 dict(key='cars', slug='car-colouring-book', title='My Car Colouring Book', brand='Made Very Simple', line='boys',
      seo='Car Colouring Book for Kids 3–6 – Old to Modern', what='cars',
      blurb='From old to modern: 36 cars from the first horseless carriage to the flying car of the future.',
      inside='a horseless carriage, a steam car, an old taxi, a 1950s car with tail fins, a camper van, a rally car, a monster truck, a police car, an electric car and a supercar'),
 dict(key='construction-vehicles', slug='construction-vehicles-colouring-book', title='My Construction Vehicles Colouring Book', brand='Made Very Simple', line='boys',
      seo='Construction Vehicles Colouring Book for Kids 3–6', what='construction vehicles',
      blurb='36 busy diggers, dump trucks, cranes and bulldozers – build a house, a bridge and a brand-new road.',
      inside='an excavator, bulldozer, dump truck, cement mixer, tower crane, road roller, forklift, cherry picker and a giant tunnel borer'),
 dict(key='north-american-wildlife', slug='north-american-wildlife-colouring-book', title='My North American Wildlife Colouring Book', brand='Made Very Simple', line='boys',
      seo='North American Animals Colouring Book for Kids 3–6', what='North American animals',
      blurb='36 amazing animals – grizzly bear, moose, bald eagle, raccoon, polar bear and humpback whale.',
      inside='a grizzly bear, moose, bald eagle, raccoon, armadillo, bison, polar bear and humpback whale in forest, prairie, desert, Arctic and ocean scenes'),
 dict(key='christmas-animals', slug='christmas-animals-colouring-book', title='My Christmas Animals Colouring Book', brand='Made Very Simple', line='boys', season='Christmas',
      seo='Christmas Animals Colouring Book for Kids 3–6', what='Christmas animals',
      blurb='36 festive animals – a reindeer with jingle bells, a penguin ice-skating and a puppy in a Santa hat.',
      inside='a reindeer with jingle bells, a penguin ice-skating, a bear cub decorating the tree, a puppy in a Santa hat and a kitten playing with tinsel'),
 dict(key='little-princess', slug='princess-colouring-book', title='My Little Princess Colouring Book', brand='Made Very Sweet', line='girls',
      seo='Princess Colouring Book for Girls 3–6', what='princess pictures',
      blurb='36 sweet princess pictures – tea parties, ponies, unicorns, a baby dragon and happily ever after.',
      inside='a little princess in her castle, a tea party, a pony ride, a unicorn, a glass slipper, a royal ball, a baby dragon and a happily-ever-after balcony'),
 dict(key='unicorns', slug='unicorn-colouring-book', title='My Unicorn Colouring Book', brand='Made Very Sweet', line='girls',
      seo='Unicorn Colouring Book for Girls 3–6', what='unicorns',
      blurb='36 adorable unicorns having tea parties, flying over rainbows, dancing and making wishes.',
      inside='a rainbow-maned unicorn, a baby unicorn, a unicorn tea party, a ballerina unicorn, a flying unicorn, a unicorn mermaid and a unicorn sleepover'),
 dict(key='mermaids', slug='mermaid-colouring-book', title='My Mermaid Colouring Book', brand='Made Very Sweet', line='girls',
      seo='Mermaid Colouring Book for Girls 3–6', what='mermaids',
      blurb='36 little mermaids and their sea friends – dolphins, turtles, seahorses, treasure and tea parties under the sea.',
      inside='little mermaids with a dolphin, a sea turtle, an octopus, a seahorse, a treasure chest, a shell castle and a sleepy shell bed'),
 dict(key='sweet-christmas', slug='girls-christmas-colouring-book', title='My Sweet Christmas Colouring Book', brand='Made Very Sweet', line='girls', season='Christmas',
      seo='Christmas Colouring Book for Girls 3–6', what='Christmas pictures',
      blurb='36 cosy Christmas pictures – baking gingerbread, ice skating, the Sugar Plum Fairy and waiting for Santa.',
      inside='decorating the tree, baking gingerbread, a snowman family, ice skating, a unicorn pulling Santa\'s sleigh, the Sugar Plum Fairy and waiting for Santa'),
]
by = {b['key']: b for b in BOOKS}
e = html.escape

HEAD = '''<!doctype html>
<html lang="en-ZA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="{ogtype}">
  <meta property="og:site_name" content="Made Very Simple">
  <meta property="og:title" content="{ogtitle}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{img}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%23F2643A'/><text x='50' y='68' font-size='54' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>m</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">{ld}</script>
</head>'''
NAV = '''<body>
  <header class="site-header">
    <div class="wrap">
      <a class="logo" href="/">made very simple<span>.</span></a>
      <nav class="nav">
        <a href="/">Colouring books</a>
        <a href="/free.html">Free pages</a>
        <a href="/topics.html">Topics</a>
        <a href="/cart.html" class="cart-link">Cart <span class="count" data-cart-count hidden>0</span></a>
      </nav>
    </div>
  </header>'''
FOOT = '''  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <footer class="site-footer">
    <div class="wrap">
      <div>© <span id="y">2026</span> Made Very Simple · madeverysimple.co.za</div>
      <div><a href="/terms.html">Terms, refunds &amp; privacy</a></div>
    </div>
  </footer>
  <script src="/js/shop.js"></script>
  <script>document.getElementById('y').textContent = new Date().getFullYear(); wireAddButtons();</script>
</body>
</html>
'''

def url(b): return f'{SITE}/colouring-books/{b["slug"]}/'
def path(b): return f'/colouring-books/{b["slug"]}/'

def card(b):
    rib = f'<span class="ribbon">{b["season"]}</span>' if b.get('season') else ''
    return f'''<article class="book" id="{b["key"]}">
    <a class="book-cover" href="{path(b)}" aria-label="See inside {e(b["title"])}">
      <img src="/books/{b["key"]}.jpg" alt="{e(b["title"])} cover – printable colouring book for kids" width="600" height="776" loading="lazy">{rib}
    </a>
    <div class="book-body">
      <div class="book-brand">by {b["brand"]}</div>
      <h3><a href="{path(b)}">{e(b["title"])}</a></h3>
      <p>{e(b["blurb"])}</p>
      <div class="book-buy">
        <span class="price">R{PRICE}</span>
        <button class="btn add" data-add="{b["key"]}" type="button">Add to cart</button>
      </div>
      <a class="see" href="{path(b)}">See inside →</a>
    </div>
  </article>'''

def mixed():
    a=[b for b in BOOKS if b['line']=='boys']; g=[b for b in BOOKS if b['line']=='girls']; out=[]
    while a or g:
        if a: out.append(a.pop(0))
        if a: out.append(a.pop(0))
        if g: out.append(g.pop(0))
    return out

def book_page(b):
    who = 'girls' if b['line']=='girls' else 'kids'
    title = f'{b["seo"]} – Printable PDF (R{PRICE}) · {b["brand"]}'
    desc = f'{b["blurb"]} Printable A4 colouring book for {who} aged 3–6. R{PRICE}, instant PDF download – print at home as often as you like.'
    img = f'{SITE}/books/{b["key"]}.jpg'
    ld = [{
        "@context": "https://schema.org", "@type": "Product",
        "name": b['title'] + ' (Printable PDF)', "description": desc,
        "image": [img] + [f'{SITE}/books/{b["key"]}-sample{n}.jpg' for n in (1,2,3)],
        "sku": b['key'], "brand": {"@type": "Brand", "name": b['brand']},
        "audience": {"@type": "PeopleAudience", "suggestedMinAge": 3, "suggestedMaxAge": 6},
        "offers": {"@type": "Offer", "url": url(b), "price": f"{PRICE}.00", "priceCurrency": "ZAR",
                   "availability": "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition",
                   "seller": {"@type": "Organization", "name": "Made Very Simple"}}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Colouring books", "item": SITE + '/'},
            {"@type": "ListItem", "position": 2, "name": b['title'], "item": url(b)}]}]
    others = [x for x in mixed() if x['key'] != b['key']]
    idx = BOOKS.index(b); rel = [others[(idx + i) % len(others)] for i in range(3)]
    body = f'''
  <main class="wrap">
    <section class="book-detail">
      <div class="detail-cover"><img src="/books/{b["key"]}.jpg" alt="{e(b["title"])} – front cover" width="600" height="776"></div>
      <div class="detail-text">
        <nav aria-label="Breadcrumb"><a class="back" href="/#{b["key"]}">← All colouring books</a></nav>
        <div class="book-brand">by {b["brand"]}{(" · " + b["season"]) if b.get("season") else ""}</div>
        <h1>{e(b["title"])}</h1>
        <p class="lead">{e(b["blurb"])}</p>
        <ul class="ticks">
          <li>36 big, bold pictures, each with its name at the top</li>
          <li>Made for {who} aged 3–6: thick lines and large areas to colour</li>
          <li>Printable A4 PDF with front and back cover – about 10 MB</li>
          <li>Print as many copies as you like for your family or one classroom</li>
        </ul>
        <div class="book-buy big">
          <span class="price">R{PRICE}</span>
          <button class="btn add" data-add="{b["key"]}" type="button">Add to cart</button>
          <a class="btn ghost amazon" href="{SERIES[b["line"]]}" target="_blank" rel="sponsored noopener">Buy at Amazon</a>
        </div>
        <p class="small-note">Instant download after paying with PayFast. We email you the link too.</p>
        <p class="small-note">"Buy at Amazon" opens our printed paperback series on Amazon (affiliate link – we may earn a small commission).</p>
      </div>
    </section>
    <section class="prose" style="padding:24px 0 0;max-width:72ch">
      <h2>What's inside</h2>
      <p>This printable colouring book is full of {e(b["what"])} – 36 pictures for {who} aged 3 to 6, including {e(b["inside"])}. Every picture has thick, clear outlines and big shapes, so little hands can colour with crayons, pencils or markers.</p>
      <p>After you pay, you download a single A4 PDF straight away. Print the whole book or just your favourite pages, as often as you like – perfect for rainy days, road trips, birthday parties, preschool and the classroom.</p>
    </section>
    <section>
      <div class="section-head"><h2>A peek inside</h2><p>3 of the 36 pictures</p></div>
      <div class="samples">
        {"".join(f'<img src="/books/{b["key"]}-sample{n}.jpg" alt="Sample colouring page {n} from {e(b["title"])}" width="408" height="528" loading="lazy">' for n in (1,2,3))}
      </div>
    </section>
    <section>
      <div class="section-head"><h2>You might also like</h2></div>
      <div class="books">{"".join(card(x) for x in rel)}</div>
    </section>
  </main>
'''
    head = HEAD.format(title=e(title), desc=e(desc), url=url(b), ogtype='product', ogtitle=e(f'{b["title"]} – printable PDF, R{PRICE}'), img=img,
                       ld=json.dumps(ld, ensure_ascii=False))
    d = os.path.join(ROOT, 'colouring-books', b['slug']); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(head + '\n' + NAV + body + FOOT)

def home():
    p = os.path.join(ROOT, 'index.html'); s = open(p).read()
    cards = '\n'.join(card(b) for b in mixed())
    s = re.sub(r'<div class="books" id="all-books">.*?</div>\s*</section>', '<div class="books" id="all-books">\n' + cards + '\n      </div>\n    </section>', s, count=1, flags=re.S)
    s = re.sub(r"\n    // Mix the two lines together.*?document.getElementById\('all-books'\).innerHTML = mixed.map\(cardHTML\).join\(''\);", '', s, flags=re.S)
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": "Printable colouring books for kids",
          "itemListElement": [{"@type": "ListItem", "position": i+1, "url": url(b), "name": b['title']} for i, b in enumerate(mixed())]}
    org = {"@context": "https://schema.org", "@type": "Organization", "name": "Made Very Simple", "url": SITE + '/',
           "email": "info@madeverysimple.co.za", "sameAs": ["https://www.pinterest.com/madeverysimple/"]}
    block = f'<script type="application/ld+json">{json.dumps([org, ld], ensure_ascii=False)}</script>'
    s = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)
    s = s.replace('</head>', f'  <link rel="canonical" href="{SITE}/">\n  {block}\n</head>') if 'rel="canonical"' not in s else s.replace('</head>', f'  {block}\n</head>')
    s = s.replace('<html lang="en">', '<html lang="en-ZA">')
    open(p, 'w').write(s)

def extras():
    today = datetime.date.today().isoformat()
    pages = ['/', '/free.html', '/topics.html', '/ai.html', '/terms.html', '/disclosure.html', '/links.html'] + [path(b) for b in BOOKS]
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in pages:
        pr = '1.0' if u == '/' else ('0.9' if u.startswith('/colouring-books/') else '0.5')
        xml.append(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>')
    xml.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w').write('\n'.join(xml) + '\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nDisallow: /cart.html\nDisallow: /thanks.html\n\nSitemap: {SITE}/sitemap.xml\n')
    # old book.html?b=key links -> new pages
    m = json.dumps({b['key']: path(b) for b in BOOKS})
    open(os.path.join(ROOT, 'book.html'), 'w').write(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Colouring books · Made Very Simple</title>
<meta name="robots" content="noindex"><link rel="canonical" href="{SITE}/">
<script>var m={m};var k=new URLSearchParams(location.search).get('b');location.replace(m[k]||'/');</script></head>
<body><p><a href="/">See all colouring books</a></p></body></html>
''')

for b in BOOKS: book_page(b)
home(); extras()
print('built', len(BOOKS), 'book pages')
