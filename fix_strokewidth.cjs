const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/strokeWidth={2\.5}/g, 'strokeWidth={2}');
  content = content.replace(/strokeWidth={1\.5}/g, 'strokeWidth={2}');
  fs.writeFileSync(file, content);
}
