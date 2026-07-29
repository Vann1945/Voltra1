const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  content = content.replace(/ease: "easeInOut"/g, 'ease: "easeOut"');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
  }
}
