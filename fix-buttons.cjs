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

  content = content.replace(/<button([^>]*)className="([^"]+)"/g, (match, prefix, classNames) => {
      // If it already has focus-visible:outline, skip adding it again
      if (classNames.includes('focus-visible:outline-')) return match;
      
      const hasDisabled = /disabled=/.test(match) || content.substring(content.indexOf(match), content.indexOf('>', content.indexOf(match))).includes('disabled=');
      let scaleClass = hasDisabled ? 'active:not-disabled:scale-[0.96]' : 'active:scale-[0.96]';
      if (classNames.includes('active:scale')) scaleClass = '';
      
      // Clean up old focus-visible:ring if it exists to replace with outline
      let cleanClassNames = classNames.replace(/focus-visible:ring-\S+/g, '').replace(/focus:outline-none/g, '');
      
      return `<button${prefix}className="${cleanClassNames} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 ${scaleClass}".trim().replace(/\s+/g, ' ') + '"`;
  });
  
  // also handle className={`...`}
  content = content.replace(/<button([^>]*)className=\{`([^`]+)`\}/g, (match, prefix, classNames) => {
      if (classNames.includes('focus-visible:outline-')) return match;
      
      const hasDisabled = /disabled=/.test(match) || content.substring(content.indexOf(match), content.indexOf('>', content.indexOf(match))).includes('disabled=');
      let scaleClass = hasDisabled ? 'active:not-disabled:scale-[0.96]' : 'active:scale-[0.96]';
      if (classNames.includes('active:scale')) scaleClass = '';
      
      let cleanClassNames = classNames.replace(/focus-visible:ring-\S+/g, '').replace(/focus:outline-none/g, '');
      
      return `<button${prefix}className={\`${cleanClassNames} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 ${scaleClass}\`.trim().replace(/\\s+/g, ' ')}`;
  });

  fs.writeFileSync(file, content);
});
