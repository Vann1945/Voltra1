'use client';

import { SettingsPage } from '@/components/SettingsPage';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function SettingsRoute() {
  const {
    addons,
    theme,
    layoutMode,
    queueThemeChange,
    setLayoutMode,
    bookmarksLayoutMode,
    setBookmarksLayoutMode,
    profileLayoutMode,
    setProfileLayoutMode,
    language,
    setLanguage,
  } = useAppShell();
  const navigate = useAppNavigate(addons);

  return (
    <SettingsPage
      theme={theme}
      layoutMode={layoutMode}
      onSetTheme={queueThemeChange}
      onSetLayoutMode={setLayoutMode}
      bookmarksLayoutMode={bookmarksLayoutMode}
      onSetBookmarksLayoutMode={setBookmarksLayoutMode}
      profileLayoutMode={profileLayoutMode}
      onSetProfileLayoutMode={setProfileLayoutMode}
      language={language}
      onSetLanguage={setLanguage}
      onNavigate={navigate}
    />
  );
}
