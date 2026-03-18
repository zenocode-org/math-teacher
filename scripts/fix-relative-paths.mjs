#!/usr/bin/env node
/**
 * Post-build script: convert absolute paths to relative for file:// protocol.
 * Run after `astro build` to allow opening dist/index.html directly in browser.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const distDir = join(fileURLToPath(import.meta.url), '../../dist');

function fixPathsInFile(filePath, depth = 0) {
  const prefix = '../'.repeat(depth) || './';
  let content = readFileSync(filePath, 'utf-8');

  // Replace absolute paths with relative for file:// protocol
  content = content
    .replace(/(href|component-url|renderer-url)="\/\.?\//g, `$1="${prefix}`)
    .replace(/href="\/favicon\.svg"/g, `href="${prefix}favicon.svg"`);

  writeFileSync(filePath, content);
}

// Fix root index.html
const indexPath = join(distDir, 'index.html');
fixPathsInFile(indexPath);

console.log('Fixed relative paths for file:// protocol');
