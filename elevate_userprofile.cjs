const fs = require('fs');

const pathUser = 'src/components/UserProfile.tsx';
if (fs.existsSync(pathUser)) {
  let content = fs.readFileSync(pathUser, 'utf8');

  // Enhance empty states
  content = content.replace(
    /className="rounded-2xl border border-zinc-800\/50 bg-zinc-900\/20 py-16 text-center"/g,
    'className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-20 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"'
  );
  content = content.replace(
    /className="rounded-2xl border border-zinc-800\/50 bg-zinc-900\/20 py-32 text-center"/g,
    'className="rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-32 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"'
  );
  content = content.replace(
    /className="text-sm font-medium text-white mb-1"/g,
    'className="text-base font-semibold text-white mb-2"'
  );
  content = content.replace(
    /className="text-sm text-zinc-400"/g,
    'className="text-sm text-zinc-400 font-medium tracking-wide"'
  );

  // Enhance report list items
  content = content.replace(
    /className="bg-zinc-900\/50 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"/g,
    'className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/60 transition-colors shadow-sm"'
  );
  
  fs.writeFileSync(pathUser, content);
}
