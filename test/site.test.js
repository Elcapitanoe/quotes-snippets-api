import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function resolveRootPath(path) {
  return resolve(root.pathname, path.replace(/^\//, ''));
}

test('site shell references existing local assets only', () => {
  assert.ok(existsSync(resolveRootPath('src/styles.css')));
  assert.ok(existsSync(resolveRootPath('src/main.js')));
  assert.ok(existsSync(resolveRootPath('public/quotes.png')));
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /<main\b/);
  assert.match(html, /<h1\b/);
});

test('HTML IDs are unique and every copy control has a target', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML id attributes must be unique');

  const idSet = new Set(ids);
  const targets = [...html.matchAll(/\bdata-copy-target="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(targets.length > 0, 'Expected at least one copy control');
  for (const target of targets) {
    assert.ok(idSet.has(target), `Missing copy target #${target}`);
  }
});
