const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace text-left with text-start
  content = content.replace(/\btext-left\b/g, 'text-start');
  // Replace text-right with text-end
  content = content.replace(/\btext-right\b/g, 'text-end');
  
  // Replace spacing utilities
  content = content.replace(/\bml-([0-9\.]+)\b/g, 'ms-$1');
  content = content.replace(/\b-ml-([0-9\.]+)\b/g, '-ms-$1');
  content = content.replace(/\bmr-([0-9\.]+)\b/g, 'me-$1');
  content = content.replace(/\b-mr-([0-9\.]+)\b/g, '-me-$1');
  content = content.replace(/\bpl-([0-9\.]+)\b/g, 'ps-$1');
  content = content.replace(/\bpr-([0-9\.]+)\b/g, 'pe-$1');

  // Replace border logical properties if there's any
  content = content.replace(/\bborder-l-([a-zA-Z0-9\/]+)\b/g, 'border-s-$1');
  content = content.replace(/\bborder-r-([a-zA-Z0-9\/]+)\b/g, 'border-e-$1');
  
  content = content.replace(/\bborder-l\b/g, 'border-s');
  content = content.replace(/\bborder-r\b/g, 'border-e');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
