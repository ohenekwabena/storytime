/**
 * Setup verification script
 * Run this to check if your environment is properly configured
 * 
 * Usage: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 StoryTime Setup Verification\n');

const checks = [];

// Check 1: Dependencies installed
console.log('1. Checking dependencies...');
try {
  const packageJson = require('../package.json');
  const requiredDeps = [
    'pixi.js',
    '@pixi/react',
    'framer-motion',
    '@huggingface/inference',
    'next',
    '@supabase/supabase-js',
  ];
  
  const missing = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  );
  
  if (missing.length === 0) {
    console.log('   ✅ All required dependencies installed');
    checks.push(true);
  } else {
    console.log(`   ❌ Missing dependencies: ${missing.join(', ')}`);
    checks.push(false);
  }
} catch (error) {
  console.log('   ❌ Failed to read package.json');
  checks.push(false);
}

// Check 2: Environment file
console.log('\n2. Checking environment configuration...');
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env.local file exists');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'HUGGINGFACE_API_KEY',
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    return !regex.test(envContent);
  });
  
  if (missingVars.length === 0) {
    console.log('   ✅ All required environment variables set');
    checks.push(true);
  } else {
    console.log(`   ⚠️  Missing or empty: ${missingVars.join(', ')}`);
    checks.push(false);
  }
} else {
  console.log('   ❌ .env.local file not found');
  console.log('      Run: cp .env.example .env.local');
  checks.push(false);
}

// Check 3: Migration files
console.log('\n3. Checking database migrations...');
const migrationsPath = path.join(__dirname, '../supabase/migrations');
if (fs.existsSync(migrationsPath)) {
  const files = fs.readdirSync(migrationsPath);
  const sqlFiles = files.filter(f => f.endsWith('.sql'));
  
  if (sqlFiles.length >= 2) {
    console.log(`   ✅ Found ${sqlFiles.length} migration files`);
    sqlFiles.forEach(file => console.log(`      - ${file}`));
    checks.push(true);
  } else {
    console.log('   ⚠️  Expected at least 2 migration files');
    checks.push(false);
  }
} else {
  console.log('   ❌ Migrations directory not found');
  checks.push(false);
}

// Check 4: Key files exist
console.log('\n4. Checking key implementation files...');
const keyFiles = [
  'lib/ai/huggingface.ts',
  'lib/ai/tts.ts',
  'lib/animation/pixi-engine.ts',
  'lib/animation/video-export.ts',
  'app/actions/ai-actions.ts',
  'components/animation/animation-canvas.tsx',
];

let allFilesExist = true;
keyFiles.forEach(file => {
  const filePath = path.join(__dirname, '../', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} not found`);
    allFilesExist = false;
  }
});
checks.push(allFilesExist);

// Check 5: TypeScript types
console.log('\n5. Checking TypeScript configuration...');
const typesPath = path.join(__dirname, '../lib/supabase/database.types.ts');
if (fs.existsSync(typesPath)) {
  console.log('   ✅ Database types file exists');
  checks.push(true);
} else {
  console.log('   ❌ Database types file not found');
  checks.push(false);
}

// Summary
console.log('\n' + '='.repeat(50));
const passed = checks.filter(c => c).length;
const total = checks.length;
console.log(`\n📊 Setup Status: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('\n✅ Your setup is complete!');
  console.log('\nNext steps:');
  console.log('1. Apply database migrations to your Supabase project');
  console.log('2. Get your HuggingFace API key from https://huggingface.co/settings/tokens');
  console.log('3. Run: npm run dev');
  console.log('4. Visit http://localhost:3000');
} else {
  console.log('\n⚠️  Setup incomplete. Please review the errors above.');
  console.log('\nQuick fixes:');
  console.log('- Run: npm install (if dependencies missing)');
  console.log('- Run: cp .env.example .env.local (if .env.local missing)');
  console.log('- Edit .env.local and add your API keys');
  console.log('- See SETUP.md for detailed instructions');
}

console.log('\n' + '='.repeat(50) + '\n');
