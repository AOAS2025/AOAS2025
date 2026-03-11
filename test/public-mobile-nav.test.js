const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const careersHtml = fs.readFileSync(path.resolve(__dirname, '../careers.html'), 'utf8');
const styleCss = fs.readFileSync(path.resolve(__dirname, '../assets/css/style.css'), 'utf8');
const scriptJs = fs.readFileSync(path.resolve(__dirname, '../assets/js/script.js'), 'utf8');

test('public pages expose the premium mobile drawer markup and required destinations', () => {
  assert.match(indexHtml, /https:\/\/cdn\.tailwindcss\.com/);
  assert.match(careersHtml, /https:\/\/cdn\.tailwindcss\.com/);
  assert.match(indexHtml, /aria-controls="mobileNavDrawer"/);
  assert.match(careersHtml, /aria-controls="mobileNavDrawer"/);
  assert.match(indexHtml, /id="mobileNavDrawer"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(careersHtml, /id="mobileNavDrawer"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
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
  assert.match(styleCss, /backdrop-filter: blur\(16px\) !important/);
  assert.match(styleCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styleCss, /\.hamburger-menu~\.header-actions/);
  assert.doesNotMatch(styleCss, /\.hamburger-menu\.active span:nth-child\(1\)/);
});
