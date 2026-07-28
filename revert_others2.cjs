const fs = require('fs');

const pathUser = 'src/components/UserProfile.tsx';
if (fs.existsSync(pathUser)) {
  let content = fs.readFileSync(pathUser, 'utf8');

  content = content.replace(
    'className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-8 relative bg-zinc-900/50 p-8 sm:p-10 rounded-2xl border border-white/10 shadow-xl"',
    'className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-8 relative bg-zinc-900 p-8 sm:p-10 rounded-[2rem] border border-white/5 shadow-2xl "'
  );

  content = content.replace(
    /className={`h-24 w-24 shrink-0 overflow-hidden rounded-full bg-black\/40 flex items-center justify-center transition-all duration-500 \${getBorderClass\(isEditing \? editProfileBorder : \(user.profileBorder \|\| 'none'\)\)}`}/g,
    "className={`h-32 w-32 shrink-0 overflow-hidden rounded-full bg-black/40 flex items-center justify-center transition-all duration-500 ${getBorderClass(isEditing ? editProfileBorder : (user.profileBorder || 'none'))}`}"
  );

  content = content.replace(
    'className="flex h-full w-full items-center justify-center text-3xl font-medium text-zinc-400"',
    'className="flex h-full w-full items-center justify-center text-4xl font-light text-zinc-400"'
  );

  content = content.replace(
    'className="space-y-4 max-w-md"',
    'className="space-y-5 max-w-md"'
  );

  content = content.replace(
    /className="w-full bg-zinc-950 border border-white\/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white\/20 transition-all"/g,
    'className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"'
  );

  content = content.replace(
    /className="flex-shrink-0 flex items-center justify-center gap-2 bg-white\/5 hover:bg-white\/10 border border-white\/5 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 focus:outline-none"/g,
    'className="flex-shrink-0 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"'
  );

  content = content.replace(
    '{isUploadingPhoto ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Edit2 size={14} aria-hidden="true" />}',
    '{isUploadingPhoto ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Edit2 size={16} aria-hidden="true" />}'
  );

  content = content.replace(
    /className="flex-1 bg-zinc-950 border border-white\/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white\/20 transition-all"/g,
    'className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"'
  );

  content = content.replace(
    /className="w-full bg-zinc-950 border border-white\/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white\/20 transition-all appearance-none"/g,
    'className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all appearance-none"'
  );

  content = content.replace(
    /className="w-full bg-zinc-950 border border-white\/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white\/20 transition-all resize-none"/g,
    'className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all resize-none"'
  );

  content = content.replace(
    /className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"/g,
    'className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50"'
  );

  content = content.replace(
    '{savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Check size={14} />}\n                  Save',
    '{savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}\n                  Save Changes'
  );

  content = content.replace(
    /className="flex items-center gap-2 bg-white\/5 hover:bg-white\/10 border border-white\/5 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"/g,
    'className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50"'
  );

  content = content.replace(
    '<X size={14} />',
    '<X size={16} />'
  );

  content = content.replace(
    'className="text-2xl font-semibold tracking-tight text-white"',
    'className="text-4xl font-medium tracking-tight text-white"'
  );

  content = content.replace(
    'className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10"',
    'className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10"'
  );

  content = content.replace(
    '<Edit2 size={16} />',
    '<Edit2 size={18} />'
  );

  content = content.replace(
    'className="mt-1 text-sm text-zinc-500"',
    'className="mt-2 text-sm text-zinc-500"'
  );

  content = content.replace(
    'className="mt-3 text-sm text-zinc-300 max-w-2xl leading-relaxed"',
    'className="mt-4 text-sm text-zinc-300 max-w-2xl leading-relaxed font-light"'
  );

  content = content.replace(
    'className="mt-4 flex items-center gap-4 text-sm text-zinc-400"',
    'className="mt-6 flex items-center gap-6 text-sm text-zinc-400"'
  );

  content = content.replace(
    '<span className="flex items-center gap-1.5"><Package size={14} /> {myUploads.length} Uploads</span>\n                <span className="flex items-center gap-1.5"><Heart size={14} /> {myLikes.length} Likes</span>',
    '<span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Package size={14} /> {myUploads.length} Uploads</span>\n                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Heart size={14} /> {myLikes.length} Likes</span>'
  );

  fs.writeFileSync(pathUser, content);
}


const pathAuthor = 'src/components/AuthorProfile.tsx';
if (fs.existsSync(pathAuthor)) {
  let content = fs.readFileSync(pathAuthor, 'utf8');
  content = content.replace(
    'className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-zinc-900/50 p-8 rounded-2xl border border-white/10"',
    'className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-zinc-900/40 p-8 rounded-3xl border border-white/5"'
  );
  content = content.replace(
    /className={`h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-900 flex items-center justify-center \${getBorderClass\(authorBorder\)}`}/g,
    "className={`h-28 w-28 shrink-0 overflow-hidden rounded-full bg-zinc-900 flex items-center justify-center ${getBorderClass(authorBorder)}`}"
  );
  content = content.replace(
    'className="text-2xl font-semibold tracking-tight text-white"',
    'className="text-3xl font-bold tracking-tight text-white"'
  );
  fs.writeFileSync(pathAuthor, content);
}

const pathCard = 'src/components/AddonCard.tsx';
if (fs.existsSync(pathCard)) {
  let content = fs.readFileSync(pathCard, 'utf8');
  content = content.replace(
    'className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 transition-all hover:border-white/20 focus:outline-none"',
    'className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] bg-zinc-900 border border-white/5 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shadow-lg hover:shadow-2xl"'
  );
  content = content.replace(
    'className="relative flex flex-col h-full w-full overflow-hidden rounded-[calc(1rem-1px)]"',
    'className="relative flex flex-col h-full w-full overflow-hidden rounded-[calc(24px-1px)]"'
  );
  fs.writeFileSync(pathCard, content);
}


const pathMarket = 'src/components/Marketplace.tsx';
if (fs.existsSync(pathMarket)) {
  let content = fs.readFileSync(pathMarket, 'utf8');
  content = content.replace(
    'className="relative overflow-hidden bg-zinc-950 pt-24 pb-16"',
    'className="relative overflow-hidden bg-zinc-950 pt-28 pb-20 border-b border-white/5"'
  );
  content = content.replace(
    'className="mb-12"',
    'className="mb-10"'
  );
  content = content.replace(
    'className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4"',
    'className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6"'
  );
  content = content.replace(
    'Discover Add-ons',
    'Minecraft Add-ons'
  );
  content = content.replace(
    'className="text-zinc-400 text-base max-w-2xl mx-auto"',
    'className="text-zinc-400 text-lg max-w-2xl mx-auto font-medium tracking-wide"'
  );
  content = content.replace(
    'className="relative flex flex-col gap-4 w-full sm:w-[680px] lg:w-[840px] text-left"',
    'className="relative flex flex-col gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[24px] p-4 sm:p-5 w-full sm:w-[680px] lg:w-[840px] text-left"'
  );
  content = content.replace(
    '<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} aria-hidden="true" />',
    '<Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} aria-hidden="true" strokeWidth={2} />'
  );
  content = content.replace(
    'className="w-full rounded-xl bg-zinc-900/50 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 border border-white/10 focus:border-white/20 focus:bg-zinc-900 focus:outline-none transition-colors h-12"',
    'className="w-full rounded-2xl bg-zinc-950 py-4 pl-12 pr-4 text-sm font-medium text-white placeholder-zinc-500 border border-white/5 focus:border-white/20 focus:bg-zinc-900 focus:outline-none transition-all h-[56px]"'
  );
  content = content.replace(
    'className="flex w-full lg:w-auto items-center gap-2"',
    'className="flex w-full lg:w-auto items-center gap-3"'
  );
  content = content.replace(
    'className="hidden sm:flex items-center gap-1 bg-zinc-900/50 rounded-xl p-1 h-12 border border-white/10"',
    'className="hidden sm:flex items-center gap-1 bg-zinc-950 rounded-2xl p-1 h-[56px] border border-white/5"'
  );
  content = content.replace(
    /className={`h-full px-4 rounded-lg text-sm font-medium transition-colors focus:outline-none \${sortBy === 'newest' \? 'bg-white\/10 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white\/5'}`}/g,
    "className={`h-full px-5 rounded-xl text-sm font-medium transition-all focus:outline-none ${sortBy === 'newest' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}"
  );
  content = content.replace(
    /className={`h-full px-4 rounded-lg text-sm font-medium transition-colors focus:outline-none \${sortBy === 'most_liked' \? 'bg-white\/10 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white\/5'}`}/g,
    "className={`h-full px-5 rounded-xl text-sm font-medium transition-all focus:outline-none ${sortBy === 'most_liked' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}"
  );
  content = content.replace(
    /className={`flex flex-1 lg:flex-none items-center justify-center transition-colors h-12 px-5 gap-2 rounded-xl border focus:outline-none \${showFilters \|\| selectedCategory !== 'All' \|\| tagFilter \|\| authorFilter \|\| dateRange !== 'all' \? 'border-white\/20 bg-white\/10 text-white' : 'border-white\/10 bg-zinc-900\/50 text-zinc-400 hover:bg-white\/5 hover:text-white'}`}/g,
    "className={`flex flex-1 lg:flex-none items-center justify-center transition-all duration-300 h-[56px] px-6 gap-2 rounded-2xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${showFilters || selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all' ? 'border-white/20 bg-zinc-800 text-white shadow-md' : 'border-white/5 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}"
  );
  content = content.replace(
    '<SlidersHorizontal size={16} aria-hidden="true" />',
    '<SlidersHorizontal size={18} strokeWidth={2} aria-hidden="true" />'
  );
  content = content.replace(
    '<span className="font-medium text-sm">Filters</span>',
    '<span className="font-medium text-sm tracking-wide">Filters</span>'
  );
  content = content.replace(
    'className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-white/5 mt-4"',
    'className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-white/5 mt-2"'
  );
  content = content.replace(
    /className="w-full rounded-lg border border-white\/10 bg-zinc-900\/50 py-2 pl-3 pr-8 text-sm text-white focus:border-white\/20 focus:outline-none transition-colors appearance-none"/g,
    'className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors appearance-none"'
  );
  content = content.replace(
    'className="w-full rounded-lg border border-white/10 bg-zinc-900/50 py-2 px-3 text-sm text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"',
    'className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"'
  );
  content = content.replace(
    'className="relative rounded-2xl ring-1 ring-white/10 hover:ring-white/20 transition-all"',
    'className="relative rounded-[2rem] ring-1 ring-white/10 hover:ring-white/20 transition-all"'
  );
  fs.writeFileSync(pathMarket, content);
}
