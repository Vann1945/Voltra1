import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { ViewState } from '../App';
import { Addon } from '../types';

interface BreadcrumbsProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  addons: Addon[];
}

export function Breadcrumbs({ currentView, onNavigate, addons }: BreadcrumbsProps) {
  if (currentView === 'home') return null;

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Home', view: 'home' as ViewState, icon: <Home size={12} className="mr-1.5" /> }
    ];

    if (currentView === 'profile') {
      items.push({ label: 'Profile', view: 'profile', icon: null });
    } else if (currentView === 'admin') {
      items.push({ label: 'Admin', view: 'admin', icon: null });
    } else if (typeof currentView === 'object' && currentView.type === 'author') {
      const addon = addons.find(a => a.authorId === currentView.id);
      const authorName = addon ? addon.authorName : 'Author';
      items.push({ label: authorName, view: currentView, icon: null });
    } else if (typeof currentView === 'object' && currentView.type === 'addon') {
      const addon = addons.find(a => a.id === currentView.id);
      const addonTitle = addon ? addon.title : 'Add-on';
      items.push({ label: addonTitle, view: currentView, icon: null });
    }

    return items;
  };

  const items = getBreadcrumbItems();

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-2" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-[11px] sm:text-xs font-medium text-zinc-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {index > 0 && <ChevronRight size={14} className="mx-1 text-zinc-600" />}
              {isLast ? (
                <span className="flex items-center text-zinc-200" aria-current="page">
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => onNavigate(item.view)}
                  className="flex items-center hover:text-white transition-colors focus:outline-none"
                >
                  {item.icon}
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
