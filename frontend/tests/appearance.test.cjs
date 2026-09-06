const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'appearance.js'), 'utf8');

function setup(saved = null, blocked = false) {
  class Element {
    constructor(dataset = {}) { this.dataset = dataset; this.events = {}; this.attrs = {}; this.hidden = false; }
    addEventListener(name, handler) { this.events[name] = handler; }
    setAttribute(name, value) { this.attrs[name] = value; }
    contains(target) { return target === this; }
    focus() { this.focused = true; }
    click() { this.clicks = (this.clicks || 0) + 1; this.events.click?.({ target: this }); }
  }
  const elements = Object.fromEntries(['compactMode', 'appearanceStatus', 'appearancePanel', 'appearanceToggle', 'questionInput', 'solveBtn'].map(id => [id, new Element()]));
  elements.appearancePanel.hidden = true;
  const choices = ['violet', 'cyan', 'mint'].map(accentChoice => new Element({ accentChoice }));
  const document = {
    documentElement: { dataset: {} }, events: {},
    getElementById: id => elements[id] || null,
    querySelectorAll: selector => selector === '[data-accent-choice]' ? choices : [],
    addEventListener(name, handler) { this.events[name] = handler; },
  };
  const storage = { value: saved };
  const localStorage = {
    getItem() { if (blocked) throw Error('Storage blocked'); return storage.value; },
    setItem(key, value) { if (blocked) throw Error('Storage blocked'); storage.value = value; },
  };
  vm.runInNewContext(source, { document, localStorage });
  document.events.DOMContentLoaded();
  return { document, elements, choices, storage };
}

test('restores saved appearance and rejects unknown preference values', () => {
  const restored = setup(JSON.stringify({ accent: 'mint', density: 'compact' }));
  assert.equal(restored.document.documentElement.dataset.accent, 'mint');
  assert.equal(restored.elements.compactMode.checked, true);
  assert.equal(restored.choices[2].attrs['aria-pressed'], 'true');
  for (const invalid of ['{broken', JSON.stringify({ accent: 'unknown', density: 'invalid' })]) {
    const result = setup(invalid);
    assert.equal(result.document.documentElement.dataset.accent, 'violet');
    assert.equal(result.document.documentElement.dataset.density, 'comfortable');
  }
});

test('color and density changes persist together across page loads', () => {
  const ui = setup();
  ui.choices[1].click();
  ui.elements.compactMode.events.change({ target: { checked: true } });
  const restored = setup(ui.storage.value);
  assert.equal(restored.document.documentElement.dataset.accent, 'cyan');
  assert.equal(restored.elements.compactMode.checked, true);
  assert.equal(ui.choices[0].attrs['aria-pressed'], 'false');
});

test('blocked storage still allows customization and reports persistence failure', () => {
  const ui = setup(null, true);
  ui.choices[2].click();
  assert.equal(ui.document.documentElement.dataset.accent, 'mint');
  assert.match(ui.elements.appearanceStatus.textContent, /não permitiu salvar/);
});

test('personalization closes on Escape with focus restored, and on outside click', () => {
  const ui = setup();
  const { appearanceToggle: toggle, appearancePanel: panel } = ui.elements;
  toggle.click();
  assert.equal(panel.hidden, false);
  assert.equal(toggle.attrs['aria-expanded'], 'true');
  ui.document.events.keydown({ key: 'Escape' });
  assert.equal(panel.hidden, true);
  assert.equal(toggle.focused, true);
  toggle.click();
  ui.document.events.click({ target: {} });
  assert.equal(panel.hidden, true);
  assert.equal(toggle.attrs['aria-expanded'], 'false');
});

test('submit shortcut preserves Enter, composition, and disabled button behavior', () => {
  const { elements } = setup();
  const handler = elements.questionInput.events.keydown;
  const event = { key: 'Enter', ctrlKey: true, preventDefault() {} };
  handler(event);
  assert.equal(elements.solveBtn.clicks, 1);
  handler({ ...event, ctrlKey: false });
  handler({ ...event, isComposing: true });
  elements.solveBtn.disabled = true;
  handler(event);
  assert.equal(elements.solveBtn.clicks, 1);
  elements.solveBtn.disabled = false;
  handler({ ...event, ctrlKey: false, metaKey: true });
  assert.equal(elements.solveBtn.clicks, 2);
});
