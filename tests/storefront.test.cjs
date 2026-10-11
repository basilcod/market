const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(value => value.trim()).join('\n');

function declaration(name) {
  const start = script.indexOf('    function ' + name + '(');
  assert.notEqual(start, -1, name + ' exists');
  const next = script.indexOf('    function ', start + 1);
  return script.slice(start, next === -1 ? undefined : next).split(/\n    \/\*/)[0];
}
function decodeAttribute(value) {
  return value.replace(/&#(?:0?39);/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#096;/g, '`')
    .replace(/&amp;/g, '&');
}
test('all inline JavaScript parses', () => {
  new vm.Script(script);
});
test('demo checkout sends nothing and preserves the cart', () => {
  const cart = [{ id: 'sample', qty: 1 }];
  const sandbox = { DEMO_MODE: true, cart, notices: [],
    alert: message => sandbox.notices.push(message),
    showToast: message => sandbox.notices.push(message),
    window: { open: () => assert.fail('must not open WhatsApp') },
    fetch: () => assert.fail('must not call the order API') };
  vm.createContext(sandbox);
  vm.runInContext(declaration('checkoutWhatsApp') + '\ncheckoutWhatsApp();', sandbox);
  assert.equal(sandbox.notices.length, 1);
  assert.equal(sandbox.cart, cart);
  assert.equal(cart.length, 1);
});
test('demo catalogs resolve to existing local CSV files', () => {
  const config = script.split('\n').filter(line => /const (DEMO_MODE|sheetURL|CATEGORIES_URL|PRODUCTS_URL) =/.test(line.replace(/ +/g, ' '))).join('\n');
  const sandbox = { URLSearchParams, location: { search: '?demo=1' } };
  vm.createContext(sandbox);
  vm.runInContext(config, sandbox);
  for (const key of ['CATEGORIES_URL', 'PRODUCTS_URL']) {
    const csv = vm.runInContext(key, sandbox);
    assert.match(csv, /^demo\//);
    assert.ok(fs.existsSync(path.join(__dirname, '..', csv)));
  }
});
test('demo state uses separate storage keys', () => {
  const reads = []; const writes = [];
  const calls = [...script.matchAll(/localStorage\.(getItem|setItem)\((\(DEMO_MODE \? [^)]*\))/g)];
  assert.ok(calls.length >= 2);
  for (const match of calls) {
    const normal = vm.runInNewContext(match[2], { DEMO_MODE: false });
    const demo = vm.runInNewContext(match[2], { DEMO_MODE: true });
    assert.notEqual(normal, demo);
    (match[1] === 'getItem' ? reads : writes).push(demo);
  }
  assert.ok(writes.length > 0);
  for (const key of writes) assert.ok(reads.includes(key));
});
test('catalog strings cannot break out of inline event arguments', () => {
  const helpers = script.slice(script.indexOf('    function escapeHtml('), script.indexOf('    function formatPrice('));
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(helpers, sandbox);
  for (const input of ["Basil's mug", 'a" autofocus onfocus="bad', "');globalThis.injected=true;//", '\\', '&quot;', '<tag>', 'line\nnext', 'فنجان']) {
    sandbox.input = input;
    const encoded = vm.runInContext('inlineArg(input)', sandbox);
    assert.ok(!encoded.includes('"'), 'attribute must contain no literal double quotes');
    const argument = decodeAttribute(encoded);
    const result = vm.runInNewContext('(' + argument + ')');
    assert.equal(result, input);
    assert.equal(sandbox.injected, undefined);
  }
});
