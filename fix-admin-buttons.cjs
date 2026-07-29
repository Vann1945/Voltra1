const fs = require('fs');

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// We can just use a simple regex replacing <button ... className="xyz"> 
// Note that some buttons are multi-line.
// Let's match `<button` up to `className="...`
content = content.replace(/<button([^>]*)className="([^"]+)"/g, (match, prefix, classNames) => {
    // If it already has active:scale, skip
    if (classNames.includes('active:scale')) return match;
    
    // Check if it has disabled prop (might be in prefix or suffix, but we can just use `active:not-disabled:scale-[0.96]`)
    // Actually, `active:scale-[0.96]` is fine, but not-disabled is safer.
    const hasDisabled = /disabled=/.test(match) || content.substring(content.indexOf(match), content.indexOf('>', content.indexOf(match))).includes('disabled=');
    const scaleClass = hasDisabled ? 'active:not-disabled:scale-[0.96]' : 'active:scale-[0.96]';
    
    return `<button${prefix}className="${classNames} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 ${scaleClass}"`;
});

fs.writeFileSync('src/components/AdminPanel.tsx', content);
