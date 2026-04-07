require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

// --- Start server process ---
let serverProcess = null;

function startServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }

    console.log('Starting server...');
    serverProcess = spawn('node', ['./dist/main.js'], {
        stdio: 'inherit',
        shell: false,
    });

    serverProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
            console.log(`Server exited with code ${code}. Waiting for changes...`);
        }
    });
}

startServer();

// --- Watch src/dist for changes, ignore dist/ to avoid EBUSY loop ---
const chokidar = require('chokidar');

// Chỉ watch SRC directory, KHÔNG watch dist/ để tránh vòng lặp EBUSY
const watcher = chokidar.watch(srcDir, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,   // bỏ qua scan lần đầu
    awaitWriteFinish: {    // đợi file ghi xong mới trigger
        stabilityThreshold: 300,
        pollInterval: 100,
    },
});

let rebuildTimeout = null;

function scheduleRebuild() {
    // Debounce: tránh rebuild nhiều lần liên tiếp
    if (rebuildTimeout) clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(() => {
        console.log('\nChange detected. Rebuilding...');
        try {
            copyDir(srcDir, distDir);
            console.log('✓ Rebuild complete. Restarting server...');
            startServer();
        } catch (err) {
            console.error('Rebuild failed:', err.message);
        }
    }, 500);
}

watcher.on('change', scheduleRebuild);
watcher.on('add', scheduleRebuild);
watcher.on('unlink', scheduleRebuild);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nStopping...');
    if (serverProcess) serverProcess.kill();
    watcher.close();
    process.exit(0);
});
