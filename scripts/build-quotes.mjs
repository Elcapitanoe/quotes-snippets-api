import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ASSETS_DIR = resolve(ROOT, 'assets');
const DATA_DIR = resolve(ROOT, 'data');
const OUTPUT_FILES = ['quotes.json', 'quotes.min.json', 'data.log'];

function parseQuoteLine(line, filename, lineNumber) {
  const firstSeparator = line.indexOf('|');
  const secondSeparator = line.indexOf('|', firstSeparator + 1);

  if (firstSeparator < 1 || secondSeparator < 0) {
    throw new Error(`${filename}:${lineNumber}: expected ID|Author|Quote`);
  }

  const sourceId = line.slice(0, firstSeparator).trim();
  const author = line.slice(firstSeparator + 1, secondSeparator).trim();
  const quote = line.slice(secondSeparator + 1).trim();

  if (!sourceId || !author || !quote) {
    throw new Error(`${filename}:${lineNumber}: ID, author, and quote must not be empty`);
  }

  return { sourceId, author, quote };
}

export function createQuoteDataset(assetsDirectory = ASSETS_DIR) {
  const files = readdirSync(assetsDirectory)
    .filter((filename) => filename.endsWith('.txt'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .txt quote files found in ${assetsDirectory}`);
  }

  const quotes = [];
  const quotesByText = new Map();
  let sourceCount = 0;

  for (const filename of files) {
    const contents = readFileSync(resolve(assetsDirectory, filename), 'utf8');
    const lines = contents.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;

      const source = parseQuoteLine(line, filename, index + 1);
      sourceCount += 1;

      const existing = quotesByText.get(source.quote);
      if (existing) {
        existing.sourceIds.push(source.sourceId);
        continue;
      }

      const quote = {
        id: String(quotes.length + 1).padStart(6, '0'),
        from: source.author,
        quote: source.quote,
      };

      quotes.push(quote);
      quotesByText.set(source.quote, {
        quote: source.quote,
        sourceIds: [source.sourceId],
      });
    }
  }

  if (quotes.length === 0) {
    throw new Error('Quote source files contain no quote records.');
  }

  const duplicateGroups = [...quotesByText.values()].filter(
    (entry) => entry.sourceIds.length > 1,
  );

  return {
    quotes,
    sourceCount,
    duplicateGroups,
    duplicateCount: sourceCount - quotes.length,
  };
}

export function serializeQuoteDataset(dataset) {
  const pretty = `${JSON.stringify(dataset.quotes, null, 2)}\n`;
  const minified = `${JSON.stringify(dataset.quotes)}\n`;
  const logLines = [
    `Total Source Quotes: ${dataset.sourceCount}`,
    `Unique Quotes Saved: ${dataset.quotes.length}`,
    `Duplicates Removed: ${dataset.duplicateCount}`,
    '',
    'Duplicates Found:',
  ];

  for (const group of dataset.duplicateGroups) {
    for (const sourceId of group.sourceIds) {
      logLines.push(`[${sourceId}] ${group.quote}`);
    }
    logLines.push('');
  }

  return {
    'quotes.json': pretty,
    'quotes.min.json': minified,
    'data.log': `${logLines.join('\n').trimEnd()}\n`,
  };
}

function run() {
  const dataset = createQuoteDataset();
  const outputs = serializeQuoteDataset(dataset);
  const checkOnly = process.argv.includes('--check');
  const staleFiles = [];

  for (const filename of OUTPUT_FILES) {
    const outputPath = resolve(DATA_DIR, filename);
    const generated = outputs[filename];

    if (checkOnly) {
      let current;
      try {
        current = readFileSync(outputPath, 'utf8');
      } catch {
        current = null;
      }

      if (current !== generated) staleFiles.push(filename);
      continue;
    }

    writeFileSync(outputPath, generated, 'utf8');
  }

  if (checkOnly && staleFiles.length > 0) {
    console.error(`Generated quote data is out of date: ${staleFiles.join(', ')}`);
    console.error('Run "npm run data:build" and commit the updated files.');
    process.exitCode = 1;
    return;
  }

  const action = checkOnly ? 'Validated' : 'Generated';
  console.log(
    `${action} ${dataset.quotes.length} unique quotes from ${dataset.sourceCount} source records; removed ${dataset.duplicateCount} duplicates.`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) run();
