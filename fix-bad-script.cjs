const fs = require('fs');

const files = [
  'src/components/UploadModal.tsx',
  'src/components/Navbar.tsx',
  'src/components/Marketplace.tsx',
  'src/components/AddonDetail.tsx',
  'src/components/AuthorProfile.tsx',
  'src/components/AuthModal.tsx',
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Fix literal template bug
  content = content.replace(/\.trim\(\)\.replace\(\/s\+\/g, ' '\) \+ '"/g, '');
  content = content.replace(/\.trim\(\)\.replace\(\/\\s\+\/g, ' '\)/g, '');
  
  // also handle the className={`...`} which got literally `.trim().replace(/\s+/g, ' ')` appended
  // Let's just do a blanket regex to remove .trim().replace(/s+/g, ' ') + '" and `.trim().replace(/\s+/g, ' ')
  
  fs.writeFileSync(file, content);
});
