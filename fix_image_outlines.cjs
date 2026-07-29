const fs = require('fs');

let content = fs.readFileSync('src/components/FadeImage.tsx', 'utf8');

// We can append `border border-white/10` to the image's classes, but only if it doesn't already have a border
content = content.replace(
  /"transition-opacity duration-700 ease-in-out",/,
  '"transition-opacity duration-700 ease-in-out border border-white/10",'
);
fs.writeFileSync('src/components/FadeImage.tsx', content);

