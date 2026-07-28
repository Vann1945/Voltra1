const fs = require('fs');
let content = fs.readFileSync('src/components/AuthCard.tsx', 'utf8');

// Fix email input error class
content = content.replace(
  'nameError ? "border-red-500/50 focus:border-red-500" : "border-transparent"\n                      )}}\n                  placeholder="Email"',
  'emailError ? "border-red-500/50 focus:border-red-500" : "border-transparent"\n                      )\n                  }\n                  placeholder="Email"'
);

// Fix password input error class
content = content.replace(
  'nameError ? "border-red-500/50 focus:border-red-500" : "border-transparent"\n                      )}}\n                      placeholder="Password"',
  'passwordError ? "border-red-500/50 focus:border-red-500" : "border-transparent"\n                      )\n                      }\n                      placeholder="Password"'
);

// Fix name input extra brace
content = content.replace(
  'nameError ? "border-red-500/50 focus:border-red-500" : "border-transparent"\n                      )}}\n                      placeholder="Name"',
  'nameError ? "border-red-500/50 focus:border-red-500" : "border-transparent"\n                      )\n                      }\n                      placeholder="Name"'
);

fs.writeFileSync('src/components/AuthCard.tsx', content);
