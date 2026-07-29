const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Add active:scale-[0.96] to buttons that have hover:scale-105 or similar
  content = content.replace(/hover:scale-105(?!\s+active:scale-\[0\.96\])/g, 'hover:scale-105 active:scale-[0.96]');
  
  // Replace hover:scale-110 with hover:scale-110 active:scale-[0.96] where appropriate
  content = content.replace(/hover:scale-110(?!\s+active:scale-\[0\.96\])/g, 'hover:scale-110 active:scale-[0.96]');
  
  // We should add it to all primary interactive buttons that don't have it.
  // The ones with px-4 py-2 or px-6 py-3 and text-white/bg-*.
  // Let's just do a simple replacement for buttons that have bg-something and px- py-.
  // It's safer to just let the script add active:scale-[0.96] where we see transition-colors or transition-[...]
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
    count++;
  }
}
console.log(`Updated ${count} files.`);
