const fs = require('fs');

const files = {
  'src/components/Navbar.tsx': [
    [
      `import { Upload, LogIn, LogOut, Zap, Shield } from 'lucide-react';`,
      `import { Upload, LogIn, LogOut, Zap, User as UserIcon, Shield } from 'lucide-react';`
    ],
    [
      `      case 'gold': return 'ring-1 ring-yellow-500/50';
      case 'neon': return 'ring-1 ring-cyan-500/50';
      case 'fire': return 'ring-1 ring-rose-500/50';
      case 'void': return 'ring-1 ring-purple-500/50';`,
      `      case 'gold': return 'ring-1 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      case 'neon': return 'ring-1 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'fire': return 'ring-1 ring-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
      case 'void': return 'ring-1 ring-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]';`
    ],
    [
      `    <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main Navigation">
        <button 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-2 group focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 rounded-md transition-opacity hover:opacity-80"
          aria-label="Voltra Home"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-black">
            <Zap size={14} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white hidden sm:block">
            Voltra
          </span>
        </button>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                aria-label="Publish Add-on"
              >
                <Upload size={14} aria-hidden="true" />
                <span className="hidden sm:inline-block">Publish</span>
              </button>
              
              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1.5 rounded-md text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                  aria-label="Admin Panel"
                >
                  <Shield size={14} aria-hidden="true" />
                  <span className="hidden sm:inline-block">Admin</span>
                </button>
              )}
              
              <button
                onClick={() => onNavigate(currentView === 'home' ? 'profile' : 'home')}
                className="flex items-center gap-2 rounded-md hover:bg-white/5 px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                aria-label={currentView === 'home' ? 'Go to Profile' : 'Go to Home'}
              >
                {user.photoURL ? (
                  <div className={\`h-6 w-6 rounded-full overflow-hidden bg-zinc-800 \${getBorderClass(user.profileBorder)}\`}>
                    <FadeImage src={user.photoURL} alt={\`\${user.displayName}'s avatar\`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={\`h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-medium \${getBorderClass(user.profileBorder)}\`} aria-hidden="true">
                    {user.displayName.charAt(0)}
                  </div>
                )}
              </button>

              <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true"></div>

              <button
                onClick={logout}
                className="rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
              aria-label="Sign In"
            >
              <LogIn size={14} aria-hidden="true" />
              <span>Sign In</span>
            </button>
          )}`,
      `    <header className="sticky top-0 z-40 w-full bg-zinc-950/70 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" aria-hidden="true" />
      <nav className="relative mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main Navigation">
        <button 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-xl px-2 py-1.5 -ml-2 transition-all hover:bg-white/5"
          aria-label="Voltra Home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-400 text-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105">
            <Zap size={20} strokeWidth={2.5} className="fill-black/30" aria-hidden="true" />
          </div>
          {/* <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400">
            Voltra
          </span> */}
        </button>

        <div className="flex items-center gap-3 sm:gap-5">
          {user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_2px_10px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] transition-all hover:scale-105 hover:bg-zinc-100 hover:shadow-[0_4px_20px_rgba(255,255,255,0.3)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Publish Add-on"
              >
                <Upload size={18} aria-hidden="true" strokeWidth={2.5} />
                <span className="hidden sm:inline-block">Publish</span>
              </button>
              
              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.5)] transition-all hover:bg-zinc-800 hover:border-white/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="Admin Panel"
                >
                  <Shield size={18} aria-hidden="true" />
                  <span className="hidden sm:inline-block">Admin</span>
                </button>
              )}
              
              <button
                onClick={() => onNavigate(currentView === 'home' ? 'profile' : 'home')}
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-zinc-900/80 py-1.5 pl-1.5 pr-5 text-sm font-bold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.5)] transition-all hover:bg-zinc-800 hover:text-white hover:border-white/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label={currentView === 'home' ? 'Go to Profile' : 'Go to Home'}
              >
                {user.photoURL ? (
                  <div className={\`h-8 w-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shadow-inner \${getBorderClass(user.profileBorder)}\`}>
                    <FadeImage src={user.photoURL} alt={\`\${user.displayName}'s avatar\`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={\`h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold border border-white/10 shadow-inner \${getBorderClass(user.profileBorder)}\`} aria-hidden="true">
                    {user.displayName.charAt(0)}
                  </div>
                )}
                <span className="hidden sm:inline-block ml-0.5">{currentView === 'home' ? 'Profile' : 'Home'}</span>
              </button>

              <div className="h-8 w-[1px] bg-white/10 hidden sm:block mx-1 shadow-[1px_0_0_rgba(0,0,0,0.5)]" aria-hidden="true"></div>

              <button
                onClick={logout}
                className="rounded-full p-2.5 text-zinc-400 border border-transparent transition-all hover:bg-zinc-900/80 hover:text-white hover:border-white/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.5)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={20} aria-hidden="true" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black shadow-[0_2px_10px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] transition-all hover:scale-105 hover:bg-zinc-100 hover:shadow-[0_4px_20px_rgba(255,255,255,0.3)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Sign In"
            >
              <LogIn size={18} aria-hidden="true" strokeWidth={2.5} />
              <span>Sign In</span>
            </button>
          )}`
    ]
  ]
};

for (const [path, replacements] of Object.entries(files)) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
      if (content.includes(search)) {
        content = content.replace(search, replace);
      } else {
        console.error(`Could not find search string in ${path}`);
      }
    }
    fs.writeFileSync(path, content);
  }
}
