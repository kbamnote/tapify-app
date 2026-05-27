const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const files = fs.readdirSync(assetsDir);

let count = 0;
files.forEach(file => {
    // The pattern matches "_D__Print%20World_tapify_tapify-frontend_templates_template-XX-whatever.html.png"
    const match = file.match(/template-(\d+)-.*\.html\.png$/);
    if (match) {
        const oldPath = path.join(assetsDir, file);
        const newName = `template_${match[1]}.png`;
        const newPath = path.join(assetsDir, newName);
        
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: ${file} -> ${newName}`);
        count++;
    }
});

console.log(`Successfully renamed ${count} template images.`);
