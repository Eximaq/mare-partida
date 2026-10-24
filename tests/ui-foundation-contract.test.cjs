'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const tokens = read('ui-tokens.css');
const components = read('ui-components.css');
const responsive = read('ui-responsive.css');

// Characterization of the shared UI foundations, independent from game data/saves.
assert.match(tokens, /--rpg-touch-target\s*:\s*44px\s*;/, 'shared 44px coarse-pointer target token');
assert.match(components, /a:focus-visible/, 'links must expose visible keyboard focus');
assert.match(components, /\[role=button\]:focus-visible/, 'ARIA buttons need keyboard focus');
assert.match(components, /@media\s*\(pointer:\s*coarse\)/, 'touch improvements must be pointer-scoped');
assert.match(components, /min-height:\s*var\(--rpg-touch-target\)/, 'touch controls must use the shared size');
assert.match(components, /overflow-wrap:\s*anywhere/, 'modal headings must avoid clipping on narrow screens');
assert.match(responsive, /safe-area-inset-left/, 'mobile overlays must respect landscape left notch');
assert.match(responsive, /safe-area-inset-right/, 'mobile overlays must respect landscape right notch');
console.log('UI foundation contracts: OK');
