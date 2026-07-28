const fs = require('fs');

const path = 'src/components/AddonDetail.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');

  // Fix Author Details
  content = content.replace(
    'className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"',
    'className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 sm:text-6xl"'
  );
  
  content = content.replace(
    'className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer group/author focus:outline-none rounded-lg pr-2"',
    'className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer group/author focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg pr-2"'
  );
  
  content = content.replace(
    /className={`h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 flex items-center justify-center transition-all group-hover\/author:border-white\/30 border border-white\/5 \${getBorderClass\(authorBorder\)}`}/g,
    "className={`h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all group-hover/author:border-white/30 border border-white/5 ${getBorderClass(authorBorder)}`}"
  );

  content = content.replace(
    'className="text-sm font-medium text-zinc-300 group-hover/author:text-white"',
    'className="text-sm font-bold text-zinc-300 group-hover/author:text-white"'
  );

  content = content.replace(
    'className="font-medium text-sm text-zinc-300 group-hover/author:text-white transition-colors"',
    'className="font-bold text-sm text-zinc-300 group-hover/author:text-white transition-colors tracking-wide"'
  );

  content = content.replace(
    'className="flex items-center gap-1.5 text-zinc-300 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5"',
    'className="flex items-center gap-1.5 text-zinc-200 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)]"'
  );

  content = content.replace(
    'className="fill-amber-400 text-amber-400"',
    'className="fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]"'
  );

  content = content.replace(
    'className="font-medium text-sm text-zinc-200"',
    'className="font-bold text-sm text-zinc-200"'
  );

  content = content.replace(
    'className="text-zinc-500 text-xs"',
    'className="text-zinc-500 font-medium text-xs"'
  );

  content = content.replace(
    'className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 bg-zinc-800/50 border border-white/5 px-3 py-1.5 rounded-full"',
    'className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-full shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]"'
  );

  content = content.replace(
    'className="flex items-center gap-2 rounded-xl bg-zinc-800/50 px-4 py-3 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none"',
    'className="flex items-center gap-2 rounded-full border border-transparent bg-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] px-4 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"'
  );
  
  content = content.replace(
    /className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors focus:outline-none \${isLiked \? 'text-rose-500 bg-rose-500\/10' : 'text-zinc-400 bg-zinc-800\/50 hover:bg-zinc-800 hover:text-white'}`}/g,
    "className={`flex items-center gap-2 rounded-full border border-transparent px-5 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${isLiked ? 'text-rose-500 bg-rose-500/10 shadow-[inset_0_1px_4px_rgba(0,0,0,0.2)]' : 'text-zinc-400 bg-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] hover:bg-zinc-800 hover:text-zinc-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]'}`}"
  );
  
  content = content.replace(
    /className={`relative overflow-hidden flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-medium transition-colors focus:outline-none \${downloadSuccess \? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-zinc-200'}`}/g,
    "className={`relative overflow-hidden flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${downloadSuccess ? 'bg-emerald-500 text-black shadow-[0_4px_12px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.5)]' : 'bg-zinc-100 text-black shadow-[0_4px_16px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] hover:bg-white hover:shadow-[0_6px_24px_rgba(255,255,255,0.3)]'}`}"
  );

  content = content.replace(
    'className="space-y-6"',
    'className="space-y-8"'
  );

  content = content.replace(
    'className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6"',
    'className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-3xl p-8 "'
  );

  content = content.replace(
    'className="text-lg font-medium text-white mb-4 flex items-center gap-2"',
    'className="text-xl font-bold text-white mb-4 flex items-center gap-3"'
  );

  content = content.replace(
    'className="text-zinc-400"',
    'className="text-white" strokeWidth={2.5}'
  );

  content = content.replace(
    'className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl"',
    'className="inline-flex items-center gap-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-all px-4 py-2 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"'
  );

  content = content.replace(
    'className="text-lg font-medium text-white mb-6 flex items-center gap-2"',
    'className="text-xl font-bold text-white mb-6 flex items-center gap-3"'
  );

  content = content.replace(
    'className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2"',
    'className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-2"'
  );

  content = content.replace(
    'className="text-sm text-zinc-300"',
    'className="text-sm text-zinc-300 font-medium"'
  );

  content = content.replace(
    'className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3"',
    'className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-4"'
  );

  content = content.replace(
    'className="inline-flex items-center rounded-lg bg-zinc-900/50 border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400"',
    'className="inline-flex items-center rounded-full bg-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-transparent px-4 py-2 text-xs font-bold text-zinc-400"'
  );

  content = content.replace(
    'className="text-3xl font-semibold tracking-tight text-white mb-10 flex items-center gap-3"',
    'className="text-4xl font-extrabold tracking-tighter text-white mb-10 flex items-center gap-4"'
  );

  content = content.replace(
    '<MessageSquare className="text-white" size={28} /> Reviews',
    '<MessageSquare className="text-white" size={32} strokeWidth={2.5} /> Reviews'
  );

  content = content.replace(
    'className="mb-12 rounded-2xl border border-white/10 bg-zinc-900/50 p-8 sm:p-10 shadow-xl"',
    'className="mb-12 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8 sm:p-12 "'
  );

  content = content.replace(
    'className="text-xl font-semibold text-white mb-6"',
    'className="text-2xl font-bold text-white mb-8 tracking-wide"'
  );

  content = content.replace(
    'className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3"',
    'className="block text-sm font-extrabold text-zinc-500 uppercase tracking-widest mb-4"'
  );
  
  content = content.replace(
    /className={star <= newReviewRating \? 'fill-amber-400 text-amber-400' : 'text-zinc-800'}/g,
    "className={star <= newReviewRating ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-zinc-800'}"
  );

  content = content.replace(
    'className="block w-full rounded-xl border border-white/10 bg-zinc-950/80 px-5 py-4 text-white placeholder-zinc-500 focus:border-white/20 focus:bg-zinc-900 focus:outline-none transition-colors resize-none text-sm"',
    'className="block w-full rounded-2xl border border-transparent bg-zinc-950/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] px-6 py-5 text-white placeholder-zinc-600 focus:border-white/20 focus:bg-zinc-900 focus:outline-none transition-all resize-none font-medium"'
  );

  content = content.replace(
    'className="rounded-xl bg-white px-8 py-3 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors focus:outline-none"',
    'className="rounded-full bg-white px-10 py-4 text-sm font-extrabold text-black hover:bg-zinc-200 disabled:opacity-50 transition-all hover:scale-105 hover:shadow-[0_4px_16px_rgba(255,255,255,0.2)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"'
  );

  content = content.replace(
    'className="md:col-span-2 rounded-2xl border border-white/10 bg-zinc-900/50 py-20 text-center shadow-xl"',
    'className="md:col-span-2 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] py-20 text-center "'
  );

  content = content.replace(
    'className="mx-auto mb-4 text-zinc-600"',
    'className="mx-auto mb-6 text-zinc-600"'
  );

  content = content.replace(
    'className="text-zinc-400 font-medium text-base"',
    'className="text-zinc-400 font-bold tracking-wide text-lg"'
  );

  content = content.replace(
    'className="group rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition-colors hover:bg-zinc-900 flex flex-col h-full shadow-md"',
    'className="group rounded-[2.5rem] border border-white/5 bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8 transition-all hover:bg-zinc-800 flex flex-col h-full"'
  );

  content = content.replace(
    /className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full \${authorColor} font-bold transition-all`}/g,
    "className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${authorColor} font-extrabold shadow-[inset_0_1px_4px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.3)] transition-all`}"
  );

  content = content.replace(
    'className="text-base font-semibold text-white"',
    'className="text-lg font-bold text-white tracking-tight"'
  );

  content = content.replace(
    'className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mt-0.5"',
    'className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mt-1"'
  );

  content = content.replace(
    'className="mb-4 flex items-center gap-1.5 bg-zinc-950/50 w-fit px-3 py-1.5 rounded-full"',
    'className="mb-6 flex items-center gap-1.5 bg-zinc-950/50 w-fit px-3 py-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"'
  );

  content = content.replace(
    /className={i < review.rating \? 'fill-amber-400 text-amber-400' : 'text-zinc-800'}/g,
    "className={i < review.rating ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : 'text-zinc-800'}"
  );

  content = content.replace(
    'className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm flex-grow"',
    'className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-medium text-sm flex-grow"'
  );

  fs.writeFileSync(path, content);
}
