'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from '@/components/icons/animated';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: (string | CustomSelectOption)[];
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder,
  id,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const placeMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuMax = 280;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxH = Math.max(120, Math.min(menuMax, openUp ? spaceAbove - 8 : spaceBelow - 8));
    // Keep menu on screen horizontally
    const width = Math.max(rect.width, 160);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;

    setMenuStyle({
      position: 'fixed',
      left,
      width,
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      zIndex: 100000,
      maxHeight: maxH,
    });
  };

  const openDropdown = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    placeMenu();
    // Reposition after paint in case layout shifts
    const t = window.setTimeout(placeMenu, 0);
    const onScroll = () => placeMenu();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listboxRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    // Use click (not mousedown) so option onClick runs first
    document.addEventListener('click', handlePointer, true);
    return () => document.removeEventListener('click', handlePointer, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const choose = (option: CustomSelectOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) openDropdown();
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(normalizedOptions.length - 1, (i < 0 ? 0 : i) + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      choose(normalizedOptions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const menu =
    isOpen && mounted
      ? createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            style={menuStyle}
            className="overflow-y-auto rounded-xl border border-parchment-border bg-parchment-raised p-1 shadow-card-float outline-none"
          >
            {normalizedOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={(e) => {
                    e.stopPropagation();
                    choose(option);
                  }}
                  className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-terracotta/15 font-bold text-ink-900'
                      : isActive
                        ? 'bg-ink-900/[0.05] text-ink-900'
                        : 'text-ink-900/75 hover:bg-ink-900/[0.04]'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check size={15} className="ml-3 shrink-0 text-terracotta-text" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          isOpen ? setIsOpen(false) : openDropdown();
        }}
        onKeyDown={handleTriggerKeyDown}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-parchment-border bg-parchment-raised px-4 py-3 text-left text-sm font-medium text-ink-900 shadow-sm transition-[border-color,box-shadow] hover:border-ink-900/25 focus:outline-none focus-visible:border-terracotta focus-visible:ring-4 focus-visible:ring-terracotta/15"
      >
        <span className="truncate">{selectedOption?.label || placeholder || 'Select option'}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`ml-3 shrink-0 text-ink-900/55 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
