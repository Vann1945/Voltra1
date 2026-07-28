const fs = require('fs');

const pathAuthor = 'src/components/AuthorProfile.tsx';
if (fs.existsSync(pathAuthor)) {
  let content = fs.readFileSync(pathAuthor, 'utf8');

  // Enhance empty states
  content = content.replace(
    /className="rounded-2xl border border-zinc-800\/50 bg-zinc-900\/20 py-32 text-center"/g,
    'className="rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-32 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"'
  );
  
  content = content.replace(
    /className="text-sm text-zinc-400"/g,
    'className="text-sm text-zinc-400 font-medium tracking-wide"'
  );
  
  fs.writeFileSync(pathAuthor, content);
}
