const fs = require('fs');

function fixReportModal(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /className="relative w-full max-w-md overflow-hidden rounded-\[2rem\] border border-white\/10 bg-zinc-950 shadow-2xl"/g,
    'className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-2"'
  );
  // Actually wait, ReportModal might not have padding on the outer container, it might have it inside.
  // Let's check where the padding is.
  fs.writeFileSync(file, content);
}
fixReportModal('src/components/ReportModal.tsx');
