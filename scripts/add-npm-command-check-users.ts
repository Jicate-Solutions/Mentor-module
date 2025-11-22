/**
 * Quick script to add npm command for checking missing users
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const packagePath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

// Add new command
pkg.scripts['check:users'] = 'npx tsx scripts/check-missing-users.ts';

writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✅ Added npm command: npm run check:users');
process.exit(0);
