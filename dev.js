const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const srcDir = './src/dist';
const distDir = './dist';

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
        } else if (file.endsWith('.js') || file.endsWith('.json')) {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

// Initial copy
console.log('Building...');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
copyDir(srcDir, distDir);
console.log('✓ Build complete');

// Watch mode
const chokidar = require('chokidar');
const watcher = chokidar.watch(srcDir, { ignored: /node_modules/ });

let isBuilding = false;

function rebuild() {
    if (isBuilding) return;
    isBuilding = true;
    console.log('Rebuilding...');
    copyDir(srcDir, distDir);
    console.log('✓ Rebuild complete');
    isBuilding = false;
}

watcher.on('change', rebuild);
watcher.on('add', rebuild);

// Start server
console.log('Starting server...');
exec('node ./dist/main.js', (error, stdout, stderr) => {
    if (error) console.error(`error: ${error.message}`);
    if (stderr) console.error(`stderr: ${stderr}`);
    if (stdout) console.log(stdout);
});
