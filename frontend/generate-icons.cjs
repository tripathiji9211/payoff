const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, size, size);

    // Lightning Bolt (Cyan)
    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    
    // Scale points to size
    const s = size / 100;
    ctx.moveTo(60 * s, 10 * s);
    ctx.lineTo(25 * s, 60 * s);
    ctx.lineTo(45 * s, 60 * s);
    ctx.lineTo(40 * s, 90 * s);
    ctx.lineTo(75 * s, 40 * s);
    ctx.lineTo(55 * s, 40 * s);
    ctx.closePath();
    ctx.fill();

    // Glow
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 15 * s;
    ctx.fill();

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, `icon-${size}x${size}.png`), buffer);
    console.log(`Generated icon-${size}x${size}.png`);
}

sizes.forEach(generateIcon);
