'use client';

import { CreatorDashboard } from '@/components/CreatorDashboard';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function CreatorRoute() {
  const { addons, openUpload, refetchAddons } = useAppShell();
  const navigate = useAppNavigate(addons);
  return <CreatorDashboard addons={addons} onNavigate={view => navigate(view)} onOpenUpload={openUpload} onAddonsChanged={refetchAddons} />;
}
