const fs = require('fs');
const path = require('path');

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

// Clean dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}

// Copy files
copyDir(srcDir, distDir);

console.log('✓ Build complete: src/ copied to dist/');
