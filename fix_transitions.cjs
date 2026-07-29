const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace active:scale-95 with active:scale-[0.96]
  content = content.replace(/active:scale-95/g, 'active:scale-[0.96]');

  // Replace transition-all with more specific transitions where we can guess
  // Often buttons have scale, background-color, colors, opacity
  content = content.replace(/transition-all/g, 'transition-[transform,background-color,border-color,color,opacity,box-shadow]');

  // In AddonCard: group-hover:-translate-y-1, border, shadow
  // The generic replacement above covers most. Let's simplify and make them shorter.
  // Actually, we can just replace 'transition-all' with 'transition-[transform,colors,opacity,shadow]' but Tailwind might not parse that natively if 'colors' isn't a native property.
  // Actually, transition-[transform,background-color,border-color,color,opacity,box-shadow] is valid.
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
