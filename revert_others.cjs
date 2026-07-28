const fs = require('fs');

const files = {
  'src/components/UploadModal.tsx': [
    [
      `className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl flex flex-col overflow-hidden sm:rounded-3xl bg-zinc-950 shadow-xl sm:border border-white/10"`,
      `className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl flex flex-col overflow-hidden sm:rounded-[2rem] bg-zinc-950 shadow-2xl border-x border-t sm:border border-white/5"`
    ]
  ]
};

for (const [path, replacements] of Object.entries(files)) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
      if (typeof search === 'string') {
        if (content.includes(search)) {
          content = content.replace(search, replace);
        } else {
          console.error(`Could not find search string in ${path}:`, search);
        }
      } else {
        content = content.replace(search, replace);
      }
    }
    fs.writeFileSync(path, content);
  }
}
