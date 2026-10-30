/* Made Very Simple – colouring book shop (catalogue + cart).
   The real prices are checked again on the payment server, so this list is only for display. */
const PAY_URL = 'https://pay.madeverysimple.co.za/checkout.php';
const PRICE = 100;
const AMAZON_TAG = 'madeverysimpl-20';
// Amazon series pages (paperbacks). Add the Made Very Sweet series link here once it is live on Amazon.
const AMAZON_SERIES = {
  boys: 'https://www.amazon.com/dp/B0HP7V2BKH?binding=paperback&tag=' + AMAZON_TAG,
  girls: 'https://www.amazon.com/dp/B0HPP6FDPB?binding=paperback&tag=' + AMAZON_TAG,
};

const BOOKS = [
  { key: 'dinosaurs', title: 'My Dinosaur Colouring Book', brand: 'Made Very Simple', line: 'boys',
    blurb: '36 friendly dinosaurs and prehistoric creatures, from the mighty T. rex to a baby dinosaur hatching from its egg.',
    amazon: 'https://www.amazon.com/dp/B0HP7CRQTD' },
  { key: 'african-safari', title: 'My African Safari Colouring Book', brand: 'Made Very Simple', line: 'boys',
    blurb: '36 African animals – lion, elephant, giraffe, meerkat, dassie, secretary bird and many more.',
    amazon: 'https://www.amazon.com/dp/B0HP7D78YM' },
  { key: 'tractors', title: 'My Tractor Colouring Book', brand: 'Made Very Simple', line: 'boys',
    blurb: '36 busy tractors and farm machines, from an old steam engine to a giant combine harvester.' },
  { key: 'cars', title: 'My Car Colouring Book', brand: 'Made Very Simple', line: 'boys',
    blurb: 'From old to modern: 36 cars from the first horseless carriage to the flying car of the future.' },
  { key: 'construction-vehicles', title: 'My Construction Vehicles Colouring Book', brand: 'Made Very Simple', line: 'boys',
    blurb: '36 busy diggers, dump trucks, cranes and bulldozers – build a house, a bridge and a brand-new road.' },
  { key: 'north-american-wildlife', title: 'My North American Wildlife Colouring Book', brand: 'Made Very Simple', line: 'boys',
    blurb: '36 amazing animals – grizzly bear, moose, bald eagle, raccoon, polar bear and humpback whale.',
    amazon: 'https://www.amazon.com/dp/B0HP7GBYSJ' },
  { key: 'christmas-animals', title: 'My Christmas Animals Colouring Book', brand: 'Made Very Simple', line: 'boys', season: 'Christmas',
    blurb: '36 festive animals – a reindeer with jingle bells, a penguin ice-skating and a puppy in a Santa hat.',
    amazon: 'https://www.amazon.com/dp/B0HP828ZFB' },
  { key: 'little-princess', title: 'My Little Princess Colouring Book', brand: 'Made Very Sweet', line: 'girls',
    blurb: '36 sweet princess pictures – tea parties, ponies, unicorns, a baby dragon and happily ever after.' },
  { key: 'unicorns', title: 'My Unicorn Colouring Book', brand: 'Made Very Sweet', line: 'girls',
    blurb: '36 adorable unicorns having tea parties, flying over rainbows, dancing and making wishes.' },
  { key: 'mermaids', title: 'My Mermaid Colouring Book', brand: 'Made Very Sweet', line: 'girls',
    blurb: '36 little mermaids and their sea friends – dolphins, turtles, seahorses, treasure and tea parties under the sea.' },
  { key: 'sweet-christmas', title: 'My Sweet Christmas Colouring Book', brand: 'Made Very Sweet', line: 'girls', season: 'Christmas',
    blurb: '36 cosy Christmas pictures – baking gingerbread, ice skating, the Sugar Plum Fairy and waiting for Santa.' },
];
const SLUGS = {"dinosaurs": "dinosaur-colouring-book", "african-safari": "african-safari-colouring-book", "tractors": "tractor-colouring-book", "cars": "car-colouring-book", "construction-vehicles": "construction-vehicles-colouring-book", "north-american-wildlife": "north-american-wildlife-colouring-book", "christmas-animals": "christmas-animals-colouring-book", "little-princess": "princess-colouring-book", "unicorns": "unicorn-colouring-book", "mermaids": "mermaid-colouring-book", "sweet-christmas": "girls-christmas-colouring-book"};
BOOKS.forEach(b => { b.url = '/colouring-books/' + SLUGS[b.key] + '/'; });
const byKey = Object.fromEntries(BOOKS.map(b => [b.key, b]));

/* ---- cart (kept in this browser; falls back to memory if storage is blocked) ---- */
let memCart = [];
function readCart() {
  try { const c = JSON.parse(localStorage.getItem('mvs_cart') || '[]'); return Array.isArray(c) ? c.filter(k => byKey[k]) : []; }
  catch (e) { return memCart; }
}
function writeCart(c) {
  memCart = c;
  try { localStorage.setItem('mvs_cart', JSON.stringify(c)); } catch (e) {}
  updateBadge();
}
function inCart(key) { return readCart().includes(key); }
function addToCart(key) { const c = readCart(); if (!c.includes(key)) { c.push(key); writeCart(c); } }
function removeFromCart(key) { writeCart(readCart().filter(k => k !== key)); }
function rand(n) { return 'R' + n.toFixed(0); }

function updateBadge() {
  const n = readCart().length;
  document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
}

/* ---- book cards ---- */
function cardHTML(b) {
  const added = inCart(b.key);
  return `<article class="book" id="${b.key}">
    <a class="book-cover" href="${b.url}" aria-label="See inside ${b.title}">
      <img src="/books/${b.key}.jpg" alt="${b.title} cover" width="600" height="776" loading="lazy">
      ${b.season ? `<span class="ribbon">${b.season}</span>` : ''}
    </a>
    <div class="book-body">
      <div class="book-brand">by ${b.brand}</div>
      <h3><a href="${b.url}">${b.title}</a></h3>
      <p>${b.blurb}</p>
      <div class="book-buy">
        <span class="price">${rand(PRICE)}</span>
        <button class="btn add ${added ? 'added' : ''}" data-add="${b.key}" type="button">${added ? 'In cart ✓' : 'Add to cart'}</button>
      </div>
      <a class="see" href="${b.url}">See inside →</a>
    </div>
  </article>`;
}

function wireAddButtons(root = document) {
  root.querySelectorAll('[data-add]').forEach(btn => {
    if (inCart(btn.dataset.add)) { btn.textContent = 'In cart ✓'; btn.classList.add('added'); }
    btn.addEventListener('click', () => {
      const key = btn.dataset.add;
      if (inCart(key)) { location.href = '/cart.html'; return; }
      addToCart(key);
      btn.textContent = 'In cart ✓'; btn.classList.add('added');
      const toast = document.getElementById('toast');
      if (toast) {
        toast.innerHTML = `Added to cart · <a href="/cart.html">View cart (${readCart().length})</a>`;
        toast.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
      }
    });
  });
}

// After a successful payment the thank-you page links back with ?paid=1 – empty the cart.
if (new URLSearchParams(location.search).get('paid')) { writeCart([]); }
document.addEventListener('DOMContentLoaded', updateBadge);
