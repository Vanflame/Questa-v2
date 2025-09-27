#!/usr/bin/env node

/**
 * Cache Version Update Script for Questa
 * 
 * This script helps update the cache version across all HTML files
 * when you need to force cache invalidation.
 * 
 * Usage: node update-cache-version.js [new-version]
 * Example: node update-cache-version.js 3
 */

const fs = require('fs');
const path = require('path');

// Get new version from command line or increment current
const newVersion = process.argv[2] || '3';

// Files to update
const filesToUpdate = [
    'index.html',
    'login/index.html',
    'register/index.html',
    'dashboard/index.html',
    'admin/index.html'
];

// Update cache version in cache-buster.js
function updateCacheBusterVersion(version) {
    const cacheBusterPath = 'assets/js/cache-buster.js';
    
    if (fs.existsSync(cacheBusterPath)) {
        let content = fs.readFileSync(cacheBusterPath, 'utf8');
        content = content.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${version}';`);
        fs.writeFileSync(cacheBusterPath, content);
        console.log(`✅ Updated cache-buster.js to version ${version}`);
    } else {
        console.log('❌ cache-buster.js not found');
    }
}

// Update HTML files
function updateHtmlFiles(version) {
    filesToUpdate.forEach(file => {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            
            // Update all ?v=X patterns to new version
            content = content.replace(/\?v=\d+/g, `?v=${version}`);
            
            fs.writeFileSync(file, content);
            console.log(`✅ Updated ${file} to version ${version}`);
        } else {
            console.log(`❌ ${file} not found`);
        }
    });
}

// Main execution
console.log(`🔄 Updating cache version to ${newVersion}...`);

updateCacheBusterVersion(newVersion);
updateHtmlFiles(newVersion);

console.log(`\n🎉 Cache version updated to ${newVersion}!`);
console.log('\nNext steps:');
console.log('1. Test your application to ensure everything loads correctly');
console.log('2. Deploy your changes');
console.log('3. Users will automatically get the new version without cache issues');
