const fs = require('fs');

const pathMarket = 'src/components/Marketplace.tsx';
if (fs.existsSync(pathMarket)) {
  let content = fs.readFileSync(pathMarket, 'utf8');

  // Enhance empty states
  content = content.replace(
    /className="rounded-3xl border border-zinc-800\/50 bg-zinc-900\/20 py-32 text-center"/g,
    'className="rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-32 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"'
  );
  
  content = content.replace(
    /className="mt-2 text-sm font-semibold text-white"/g,
    'className="mt-2 text-base font-bold text-white tracking-wide"'
  );
  
  content = content.replace(
    /className="mt-1 text-sm text-zinc-400"/g,
    'className="mt-1 text-sm text-zinc-400 font-medium"'
  );

  fs.writeFileSync(pathMarket, content);
}
