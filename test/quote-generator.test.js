import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createQuoteDataset, serializeQuoteDataset } from '../scripts/build-quotes.mjs';

function withAssets(files, runTest) {
  const directory = mkdtempSync(join(tmpdir(), 'quotes-api-'));
  try {
    for (const [filename, contents] of Object.entries(files)) {
      writeFileSync(join(directory, filename), contents, 'utf8');
    }
    return runTest(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('generator orders files, assigns stable IDs, and removes exact duplicate quotes', () => {
  withAssets({
    '0002-quotes.txt': '9|Second Author|A second quote here.\n10|Third Author|First quote here.\n',
    '0001-quotes.txt': '1|First Author|First quote here.\n2|Another Author|A quote with a | pipe and "quotes".\n',
  }, (directory) => {
    const dataset = createQuoteDataset(directory);

    assert.equal(dataset.sourceCount, 4);
    assert.equal(dataset.quotes.length, 3);
    assert.equal(dataset.duplicateCount, 1);
    assert.deepEqual(dataset.quotes.map(({ id }) => id), ['000001', '000002', '000003']);
    assert.equal(dataset.quotes[0].from, 'First Author');
    assert.equal(dataset.quotes[1].quote, 'A quote with a | pipe and "quotes".');
    assert.deepEqual(dataset.duplicateGroups, [{
      quote: 'First quote here.',
      sourceIds: ['1', '10'],
    }]);

    const serialized = serializeQuoteDataset(dataset);
    assert.deepEqual(Object.keys(serialized).sort(), ['data.log', 'quotes.json', 'quotes.min.json']);
    assert.deepEqual(JSON.parse(serialized['quotes.min.json']), dataset.quotes);
    assert.match(serialized['data.log'], /Duplicates Removed: 1/);
  });
});

test('generator rejects malformed and incomplete source records with a line location', () => {
  withAssets({ '0001-quotes.txt': '1|Author Only\n' }, (directory) => {
    assert.throws(() => createQuoteDataset(directory), /0001-quotes\.txt:1: expected ID\|Author\|Quote/);
  });

  withAssets({ '0001-quotes.txt': '1| |A valid-looking quote with enough words.\n' }, (directory) => {
    assert.throws(() => createQuoteDataset(directory), /ID, author, and quote must not be empty/);
  });
});

test('generator rejects an empty source directory', () => {
  const directory = mkdtempSync(join(tmpdir(), 'quotes-api-empty-'));
  try {
    assert.throws(() => createQuoteDataset(directory), /No \.txt quote files found/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
