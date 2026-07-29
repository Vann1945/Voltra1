const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  content = content.replace(/border-white\/5/g, function(match, offset, string) {
    // If it's on an image or near an image, we can replace it?
    // Actually, just changing all `border-white/5` on `FadeImage` calls to `border-transparent` or just removing it.
    return match;
  });
  
  // Let's just remove border-white/5 if it's right next to a FadeImage...
  // Too complex. Let's just run sed to replace `border border-white/5` with nothing on FadeImage lines.
}
