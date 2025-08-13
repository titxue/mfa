const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 设置背景
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, size, size);

    // 绘制时钟样式
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size / 10;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/3, 0, 2 * Math.PI);
    ctx.stroke();

    // 绘制指针
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2, size/3);
    ctx.stroke();

    // 保存为PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/icon${size}.png`, buffer);
}

// 确保icons目录存在
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// 生成不同尺寸的图标
generateIcon(16);
generateIcon(48);
generateIcon(128); 