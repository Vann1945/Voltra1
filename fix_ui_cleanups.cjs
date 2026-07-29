const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Cleanup long transitions
  content = content.replace(/transition-\[transform,background-color,border-color,color,opacity,box-shadow\]/g, 'transition');
  content = content.replace(/transition-opacity transition-transform/g, 'transition');

  // Fix exit animations to be subtle (y: -12 or y: 12 instead of 20 or 100%)
  // Modals use y: 20 -> y: 12
  content = content.replace(/y: 20/g, 'y: 12');
  content = content.replace(/y: -20/g, 'y: -12');
  content = content.replace(/y: 10/g, 'y: 12');
  content = content.replace(/y: -10/g, 'y: -12');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
