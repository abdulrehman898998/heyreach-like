#!/usr/bin/env node

/**
 * Domain Checker - Check which domains are working
 */

import https from 'https';

const domains = [
  '4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev',
  '024329d0-778d-4771-8bfc-70b78cc4617d.picard.prod.repl.dev'
];

async function checkDomain(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      resolve({
        domain,
        status: res.statusCode,
        working: res.statusCode < 400
      });
    });

    req.on('error', (err) => {
      resolve({
        domain,
        status: 'ERROR',
        working: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        domain,
        status: 'TIMEOUT',
        working: false
      });
    });

    req.end();
  });
}

console.log('🔍 Checking domain availability...\n');

for (const domain of domains) {
  const result = await checkDomain(domain);
  const status = result.working ? '✅ WORKING' : '❌ NOT WORKING';
  console.log(`${status} - https://${domain}`);
  if (result.status !== 'ERROR' && result.status !== 'TIMEOUT') {
    console.log(`   Status: ${result.status}`);
  }
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  console.log('');
}