'use client';

import StreakApp from '@/StreakApp';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function StreakRoute() {
  const { addons, theme } = useAppShell();
  const navigate = useAppNavigate(addons);
  return <StreakApp theme={theme} onNavigate={navigate} />;
}
