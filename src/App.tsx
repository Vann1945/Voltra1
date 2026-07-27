import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Marketplace } from './components/Marketplace';
import { UserProfile } from './components/UserProfile';
import { UploadModal } from './components/UploadModal';
import { AuthModal } from './components/AuthModal';
import { AddonDetail } from './components/AddonDetail';
import { useAddons } from './hooks/useAddons';
import { motion, AnimatePresence } from 'motion/react';

import { AuthorProfile } from './components/AuthorProfile';
import { AdminPanel } from './components/AdminPanel';

export type ViewState = 'home' | 'profile' | 'admin' | { type: 'addon', id: string } | { type: 'author', id: string };

export const slugify = (text: string) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           
    .replace(/[^\w\-]+/g, '')       
    .replace(/\-\-+/g, '-')         
    .replace(/^-+/, '')             
    .replace(/-+$/, '');            
};

export default function App() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const { addons, loading, userLikes, toggleLike } = useAddons();

  const addonsRef = React.useRef(addons);
  useEffect(() => {
    addonsRef.current = addons;
  }, [addons]);

  // Handle initial URL and back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/profile') {
        setCurrentView('profile');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else if (path.startsWith('/addon/')) {
        const slug = path.split('/')[2];
        // Find addon by slug or ID
        const addon = addonsRef.current.find(a => slugify(a.title) === slug || a.id === slug);
        if (addon) {
          setCurrentView({ type: 'addon', id: addon.id });
        } else {
          setCurrentView('home');
        }
      } else if (path.startsWith('/author/')) {
        const id = path.split('/')[2];
        setCurrentView({ type: 'author', id });
      } else {
        setCurrentView('home');
      }
    };

    // Only run if addons are loaded so we can match slugs
    if (!loading) {
      handlePopState();
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [loading]); // Remove addons from dependency

  // Update URL when view changes
  const handleNavigate = useCallback((view: ViewState) => {
    setCurrentView(view);
    let path = '/';
    if (view === 'profile') path = '/profile';
    else if (view === 'admin') path = '/admin';
    else if (typeof view === 'object' && view.type === 'addon') {
      const addon = addonsRef.current.find(a => a.id === view.id);
      path = `/addon/${addon ? slugify(addon.title) : view.id}`;
    }
    else if (typeof view === 'object' && view.type === 'author') {
      path = `/author/${view.id}`;
    }
    window.history.pushState({}, '', path);
  }, []);

  const handleRequireAuth = useCallback(() => setIsAuthOpen(true), []);

  const getViewKey = (view: ViewState) => {
    if (typeof view === 'string') return view;
    return `${view.type}-${view.id}`;
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-50 font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar 
          onOpenUpload={() => setIsUploadOpen(true)} 
          onOpenAuth={() => setIsAuthOpen(true)} 
          onNavigate={handleNavigate}
          currentView={currentView}
        />
        
        <main className="flex-1 relative">
          <Breadcrumbs currentView={currentView} onNavigate={handleNavigate} addons={addons} />
          <AnimatePresence mode="wait">
          <motion.div
            key={getViewKey(currentView)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            {currentView === 'home' ? (
              <Marketplace 
                addons={addons} 
                loading={loading} 
                userLikes={userLikes} 
                onToggleLike={toggleLike} 
                onRequireAuth={handleRequireAuth}
                onNavigate={handleNavigate}
              />
            ) : currentView === 'profile' ? (
              <UserProfile 
                addons={addons} 
                loading={loading} 
                userLikes={userLikes} 
                onToggleLike={toggleLike} 
                onNavigate={handleNavigate}
              />
            ) : currentView === 'admin' ? (
              <AdminPanel 
                addons={addons} 
                loading={loading} 
                onNavigate={handleNavigate}
              />
            ) : currentView.type === 'author' ? (
              <AuthorProfile
                authorId={currentView.id}
                addons={addons}
                loading={loading}
                userLikes={userLikes}
                onToggleLike={toggleLike}
                onRequireAuth={handleRequireAuth}
                onNavigate={handleNavigate}
              />
            ) : (
              <AddonDetail
                addonId={currentView.id}
                addons={addons}
                userLikes={userLikes}
                onToggleLike={toggleLike}
                onRequireAuth={handleRequireAuth}
                onNavigate={handleNavigate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />
      
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
      </div>
    </div>
  );
}
