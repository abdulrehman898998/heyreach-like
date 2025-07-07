#!/usr/bin/env node

/**
 * Domain Update Script
 * Updates all domain references to new production URL
 */

import fs from 'fs';
import path from 'path';

const OLD_DOMAIN = '024329d0-778d-4771-8bfc-70b78cc4617d.picard.prod.repl.dev';
const NEW_DOMAIN = '4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev';

const filesToUpdate = [
  'WEBHOOK_SETUP_STATUS.md',
  'META_DEVELOPER_SETUP.md', 
  'GOOGLE_SETUP.md',
  'SYSTEM_REVIEW.md'
];

console.log('🔧 Updating domain references...');

filesToUpdate.forEach(fileName => {
  if (fs.existsSync(fileName)) {
    let content = fs.readFileSync(fileName, 'utf8');
    const originalContent = content;
    
    // Replace all occurrences
    content = content.replaceAll(OLD_DOMAIN, NEW_DOMAIN);
    
    if (content !== originalContent) {
      fs.writeFileSync(fileName, content);
      const count = (originalContent.match(new RegExp(OLD_DOMAIN, 'g')) || []).length;
      console.log(`✅ Updated ${fileName} (${count} replacements)`);
    } else {
      console.log(`⚪ ${fileName} - no changes needed`);
    }
  } else {
    console.log(`❌ ${fileName} - file not found`);
  }
});

console.log('✅ Domain update complete!');
console.log(`Old: ${OLD_DOMAIN}`);
console.log(`New: ${NEW_DOMAIN}`);