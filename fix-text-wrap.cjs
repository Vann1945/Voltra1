const fs = require('fs');

const files = [
  'src/components/AddonCard.tsx',
  'src/components/UploadModal.tsx',
  'src/components/Navbar.tsx',
  'src/components/Marketplace.tsx',
  'src/components/AddonDetail.tsx',
  'src/components/AuthorProfile.tsx',
  'src/components/AuthModal.tsx',
  'src/components/AdminPanel.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add text-balance to h1, h2, h3, h4 if they don't have it
  content = content.replace(/<(h[1-6])([^>]*)className="([^"]+)"/g, (match, tag, prefix, classNames) => {
      if (classNames.includes('text-balance')) return match;
      return `<${tag}${prefix}className="${classNames} text-balance"`;
  });
  content = content.replace(/<(h[1-6])([^>]*)className=\{`([^`]+)`\}/g, (match, tag, prefix, classNames) => {
      if (classNames.includes('text-balance')) return match;
      return `<${tag}${prefix}className={\`${classNames} text-balance\`}`;
  });

  // Add text-pretty to p tags if they don't have it
  content = content.replace(/<p([^>]*)className="([^"]+)"/g, (match, prefix, classNames) => {
      if (classNames.includes('text-pretty')) return match;
      if (classNames.includes('truncate') || classNames.includes('line-clamp')) return match; // don't add to truncated lines
      return `<p${prefix}className="${classNames} text-pretty"`;
  });
  content = content.replace(/<p([^>]*)className=\{`([^`]+)`\}/g, (match, prefix, classNames) => {
      if (classNames.includes('text-pretty')) return match;
      if (classNames.includes('truncate') || classNames.includes('line-clamp')) return match;
      return `<p${prefix}className={\`${classNames} text-pretty\`}`;
  });
  
  fs.writeFileSync(file, content);
});
