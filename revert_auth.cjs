const fs = require('fs');
const path = 'src/components/AuthCard.tsx';

if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Revert structural styling while keeping text minimal
  content = content.replace(
    'className="w-full max-w-[320px]"',
    'className="w-full max-w-[420px]"'
  );
  
  content = content.replace(
    'className="bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl"',
    'className="bg-zinc-900/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden"'
  );

  content = content.replace(
    'className="mb-6 text-center"',
    'className="mb-10 text-center relative z-10"'
  );

  content = content.replace(
    'className="w-full bg-white hover:bg-zinc-200 text-black text-sm font-medium rounded-xl py-2 flex items-center justify-center transition-colors disabled:opacity-50"',
    'className="w-full bg-white hover:bg-zinc-200 hover:scale-105 active:scale-95 text-black text-sm font-bold rounded-full py-4 flex items-center justify-center transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"'
  );
  
  content = content.replace(
    'className="w-full bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-xl py-2 flex items-center justify-center transition-colors disabled:opacity-50"',
    'className="w-full bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 text-sm font-bold rounded-full py-4 flex items-center justify-center transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"'
  );

  content = content.replace(
    'className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-white text-sm font-medium rounded-xl py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"',
    'className="w-full bg-zinc-950/80 hover:bg-zinc-900 border border-white/5 text-white text-sm font-bold rounded-full py-4 flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"'
  );

  content = content.replace(
    /className={cn\([\s\S]*?"w-full bg-zinc-900 border rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"[\s\S]*?\)/g,
    `className={cn(
                        "w-full bg-zinc-950/80 border rounded-full py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-zinc-900 transition-all disabled:opacity-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
                        nameError ? "border-red-500/50 focus:border-red-500" : "border-transparent"
                      )}`
  );

  content = content.replace(
    /className={cn\([\s\S]*?"w-full bg-zinc-900 border rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"[\s\S]*?\)/g,
    `className={cn(
                    "w-full bg-zinc-950/80 border rounded-full py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-zinc-900 transition-all disabled:opacity-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
                    emailError ? "border-red-500/50 focus:border-red-500" : "border-transparent"
                  )}`
  );

  content = content.replace(
    /className={cn\([\s\S]*?"w-full bg-zinc-900 border rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"[\s\S]*?\)/g,
    `className={cn(
                        "w-full bg-zinc-950/80 border rounded-full py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-zinc-900 transition-all disabled:opacity-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
                        passwordError ? "border-red-500/50 focus:border-red-500" : "border-transparent"
                      )}`
  );

  content = content.replace(
    'className="space-y-4"',
    'className="space-y-5 relative z-10"'
  );
  
  content = content.replace(
    'className="space-y-1 overflow-hidden"',
    'className="space-y-2 overflow-hidden"'
  );

  content = content.replace(
    /className="absolute left-3 top-1\/2 -translate-y-1\/2 text-zinc-500 pointer-events-none"/g,
    'className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"'
  );

  content = content.replace(
    /size={14}/g,
    'size={18}'
  );
  
  content = content.replace(
    'className="my-4 flex items-center gap-2"',
    'className="my-8 flex items-center gap-4 relative z-10"'
  );

  content = content.replace(
    'className="text-[10px] text-zinc-600 uppercase font-medium"',
    'className="text-xs text-zinc-600 uppercase font-bold tracking-widest"'
  );
  
  content = content.replace(
    'className="mt-4 text-center text-xs text-zinc-500"',
    'className="mt-6 text-center text-sm font-medium text-zinc-500"'
  );

  content = content.replace(
    'className="hover:text-white transition-colors"',
    'className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded px-2 py-1"'
  );

  fs.writeFileSync(path, content);
}
