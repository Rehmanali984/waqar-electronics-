// Auto-generates js/products.js from data/categories.json and data/products.json
// This script runs automatically (via GitHub Action) whenever the admin panel
// saves changes to the JSON data files, so the live website always reflects
// the latest edits without anyone touching code by hand.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readAllJson(dir) {
  const full = path.join(ROOT, dir);
  return fs.readdirSync(full)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')));
}

const categoriesList = readAllJson('data/categories');
const products = readAllJson('data/products');

// Website code expects CATEGORIES_DATA as an object keyed by category slug.
const categories = {};
for (const cat of categoriesList) {
  const { slug, ...rest } = cat;
  categories[slug] = { slug, ...rest };
}

// Admin panel edits specs as a friendly [{label, value}] list; the website
// runtime expects a plain { label: value } object — convert it back here.
for (const p of products) {
  if (Array.isArray(p.specs)) {
    const obj = {};
    for (const s of p.specs) {
      if (s && s.label) obj[s.label] = s.value;
    }
    p.specs = obj;
  }
}

const output = `// Waqar Electronics - Comprehensive Products Database & Categories Engine
// ⚠️ AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
// This file is rebuilt automatically from data/categories.json and data/products.json
// whenever those files change (edited via the /admin panel). Edit the data there instead.

const CATEGORIES_DATA = ${JSON.stringify(categories, null, 2)};

const ALL_PRODUCTS = ${JSON.stringify(products, null, 2)};

// Helper functions for currency & stars
function formatPKR(val) {
  return "Rs. " + Number(val).toLocaleString('en-PK');
}

function renderStarIcons(rating) {
  const rounded = Math.round(rating);
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += \`<span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' \${i <= rounded ? 1 : 0}">star</span>\`;
  }
  return html;
}
`;

fs.writeFileSync(path.join(ROOT, 'js/products.js'), output);
console.log('js/products.js regenerated successfully.');
console.log('Categories:', Object.keys(categories).length, '| Products:', products.length);
