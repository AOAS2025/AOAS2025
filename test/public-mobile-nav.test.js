const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const careersHtml = fs.readFileSync(path.resolve(__dirname, '../careers.html'), 'utf8');
const styleCss = fs.readFileSync(path.resolve(__dirname, '../assets/css/style.css'), 'utf8');
const scriptJs = fs.readFileSync(path.resolve(__dirname, '../assets/js/script.js'), 'utf8');

test('public pages expose the premium mobile drawer markup and required destinations', () => {
  assert.doesNotMatch(indexHtml, /https:\/\/cdn\.tailwindcss\.com/);
  assert.doesNotMatch(careersHtml, /https:\/\/cdn\.tailwindcss\.com/);
  assert.doesNotMatch(indexHtml, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(careersHtml, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(indexHtml, /\/assets\/vendor\/leaflet\/leaflet\.css\?v=1\.9\.4/);
  assert.match(indexHtml, /\/assets\/vendor\/leaflet-routing-machine\/leaflet-routing-machine\.css\?v=3\.2\.12/);
  assert.match(indexHtml, /\/assets\/vendor\/leaflet\/leaflet\.js\?v=1\.9\.4/);
  assert.match(indexHtml, /\/assets\/vendor\/leaflet-routing-machine\/leaflet-routing-machine\.js\?v=3\.2\.12/);
  assert.match(careersHtml, /\/assets\/vendor\/leaflet\/leaflet\.css\?v=1\.9\.4/);
  assert.match(careersHtml, /\/assets\/vendor\/leaflet-routing-machine\/leaflet-routing-machine\.css\?v=3\.2\.12/);
  assert.match(careersHtml, /\/assets\/vendor\/leaflet\/leaflet\.js\?v=1\.9\.4/);
  assert.match(careersHtml, /\/assets\/vendor\/leaflet-routing-machine\/leaflet-routing-machine\.js\?v=3\.2\.12/);
  assert.doesNotMatch(indexHtml, /https:\/\/unpkg\.com\/leaflet|https:\/\/unpkg\.com\/leaflet-routing-machine/);
  assert.doesNotMatch(careersHtml, /https:\/\/unpkg\.com\/leaflet|https:\/\/unpkg\.com\/leaflet-routing-machine/);
  assert.match(indexHtml, /aria-controls="mobileNavDrawer"/);
  assert.match(careersHtml, /aria-controls="mobileNavDrawer"/);
  assert.match(indexHtml, /id="mobileNavDrawer"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(careersHtml, /id="mobileNavDrawer"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(indexHtml, /class="mobile-nav-drawer"/);
  assert.match(careersHtml, /class="mobile-nav-drawer"/);
  assert.match(indexHtml, /class="mobile-nav-link"/);
  assert.match(careersHtml, /class="mobile-nav-link"/);
  assert.doesNotMatch(indexHtml, /z-\[1090\]|bg-\[/);
  assert.doesNotMatch(careersHtml, /z-\[1090\]|bg-\[/);
  assert.match(indexHtml, /assets\/images\/brand\/aoas-logo\.png/);
  assert.match(careersHtml, /assets\/images\/brand\/aoas-logo\.png/);
  assert.match(indexHtml, /data-mobile-nav-close/);
  assert.match(careersHtml, /data-mobile-nav-close/);
  assert.match(indexHtml, /Facebook[\s\S]*Join Our Team[\s\S]*Services[\s\S]*About Us[\s\S]*Contact Us/);
  assert.match(careersHtml, /Facebook[\s\S]*Join Our Team[\s\S]*Services[\s\S]*About Us[\s\S]*Contact Us/);
  assert.match(indexHtml, /href="#about"/);
  assert.match(indexHtml, /href="#contact"/);
  assert.match(careersHtml, /href="\/#about"/);
  assert.match(careersHtml, /href="\/#contact"/);
  assert.match(indexHtml, /&copy; 2026 AOAS/);
  assert.match(careersHtml, /&copy; 2026 AOAS/);
});

test('homepage hero includes a floating AOAS brand panel while careers does not', () => {
  assert.match(indexHtml, /class="hero-content"[\s\S]*class="hero-brand-panel"/);
  assert.match(indexHtml, /class="hero-brand-logo-wrap"[\s\S]*assets\/images\/brand\/aoas-logo\.png/);
  assert.doesNotMatch(indexHtml, /class="hero-brand-label">AOAS<\//);
  assert.doesNotMatch(careersHtml, /class="hero-brand-panel"/);
});

test('public script manages drawer state, focus trapping, and responsive close behavior', () => {
  assert.match(scriptJs, /function setupMobileDrawer\(\)/);
  assert.match(scriptJs, /document\.body\.classList\.add\('mobile-nav-open'\)/);
  assert.match(scriptJs, /document\.body\.classList\.remove\('mobile-nav-open'\)/);
  assert.match(scriptJs, /setAttribute\('aria-expanded', open \? 'true' : 'false'\)/);
  assert.match(scriptJs, /event\.key === 'Escape'/);
  assert.match(scriptJs, /event\.key !== 'Tab'/);
  assert.match(scriptJs, /closeDrawer\(\{ returnFocus: false \}\)/);
  assert.match(scriptJs, /window\.addEventListener\('resize'/);
});

test('public stylesheet defines the drawer shell and removes the legacy dropdown selector', () => {
  assert.match(styleCss, /body\.mobile-nav-open/);
  assert.match(styleCss, /\.mobile-nav-drawer/);
  assert.match(styleCss, /\.mobile-nav-drawer-panel/);
  assert.match(styleCss, /\.mobile-nav-item/);
  assert.match(styleCss, /\.hero-brand-panel/);
  assert.match(styleCss, /@keyframes heroBrandReveal/);
  assert.match(styleCss, /backdrop-filter: blur\(10px\) !important/);
  assert.match(styleCss, /backdrop-filter: blur\(13px\) !important/);
  assert.match(styleCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styleCss, /\.hamburger-menu~\.header-actions/);
  assert.doesNotMatch(styleCss, /\.hamburger-menu\.active span:nth-child\(1\)/);
});
