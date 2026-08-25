'use client';

import { AdminPanel } from '@/components/AdminPanel';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function AdminRoute() {
  const { addons, loading, refetchAddons } = useAppShell();
  const navigate = useAppNavigate(addons);

  return (
    <AdminPanel
      addons={addons}
      loading={loading}
      onNavigate={navigate}
      onAddonsChanged={refetchAddons}
    />
  );
}
