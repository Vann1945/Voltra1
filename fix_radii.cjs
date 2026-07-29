const fs = require('fs');

function fixModal(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Change modal outer radius to rounded-[2.5rem]
    content = content.replace(/rounded-2xl border border-zinc-800\/80 bg-zinc-950 shadow-2xl p-6/g, 'rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8');
    
    // Change input inner radius to rounded-2xl (16px) since 40 - 32 (p-8) = 8px? Wait.
    // If padding is 32 (p-8) and outer is 40 (rounded-[2.5rem]), inner should be 8 (rounded-lg).
    // If input is rounded-2xl (16px) and padding is 32 (p-8), outer should be 48px (rounded-[3rem]).
    // Let's make outer rounded-[2.5rem] (40px), p-6 (24px). Then inner is 16px (rounded-2xl).
    content = content.replace(/rounded-2xl border border-zinc-800\/80 bg-zinc-950 shadow-2xl p-6/g, 'rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-2xl p-6');
    content = content.replace(/rounded-\[2rem\] border border-white\/5 bg-zinc-950 p-6 sm:p-8 shadow-2xl/g, 'rounded-[2.5rem] border border-white/5 bg-zinc-950 p-6 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]');

    fs.writeFileSync(file, content);
  }
}

fixModal('src/components/ReportModal.tsx');
fixModal('src/components/UploadModal.tsx');
fixModal('src/components/AdminPanel.tsx'); // Has modals
fixModal('src/components/UserProfile.tsx'); // Has delete modal

