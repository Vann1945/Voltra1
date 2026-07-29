const fs = require('fs');

function fixModalExit(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/exit={{ y: '100%', opacity: 0, scale: 0\.95 }}/g, "exit={{ y: 20, opacity: 0, scale: 0.95 }}");
    content = content.replace(/initial={{ y: '100%', opacity: 0, scale: 0\.95 }}/g, "initial={{ y: 20, opacity: 0, scale: 0.95 }}");
    content = content.replace(/exit={{ y: 20, opacity: 0 }}/g, "exit={{ y: 10, opacity: 0 }}");
    content = content.replace(/initial={{ y: 20, opacity: 0 }}/g, "initial={{ y: 10, opacity: 0 }}");
    fs.writeFileSync(file, content);
  }
}

fixModalExit('src/components/UploadModal.tsx');
fixModalExit('src/components/ReportModal.tsx');
fixModalExit('src/components/AdminPanel.tsx');

