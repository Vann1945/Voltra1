const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(
  "hmr: process.env.DISABLE_HMR !== 'true',\n    },\n  };\n});",
  "hmr: process.env.DISABLE_HMR !== 'true',\n    },\n    build: {\n      rollupOptions: {\n        output: {\n          manualChunks(id) {\n            if (id.includes('node_modules')) {\n              if (id.includes('firebase')) return 'firebase';\n              if (id.includes('react')) return 'vendor';\n              if (id.includes('lucide-react')) return 'icons';\n              if (id.includes('motion')) return 'animation';\n              return 'deps';\n            }\n          }\n        }\n      }\n    }\n  };\n});"
);
fs.writeFileSync('vite.config.ts', content);
