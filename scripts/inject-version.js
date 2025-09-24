#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

console.log(`Injecting version v${version} into HTML files...`);

// Files to update
const filesToUpdate = [
    'src/renderer/index.html',
    'src/renderer/login.html'
];

filesToUpdate.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace version placeholder with actual version
        content = content.replace(/\{\{VERSION\}\}/g, version);
        
        // Also replace any hardcoded versions in the format v1.x.x
        content = content.replace(/<span id="appVersion">v[\d.]+<\/span>/g, `<span id="appVersion">v${version}</span>`);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${filePath} with version v${version}`);
    } else {
        console.log(`⚠️  File not found: ${filePath}`);
    }
});

console.log('Version injection complete!');
