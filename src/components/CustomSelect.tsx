import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: (string | CustomSelectOption)[];
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ value, options, onChange, placeholder, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const normalizedOptions: CustomSelectOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
  const selectedOption = normalizedOptions.find(o => o.value === value);
  const selectedIndex = normalizedOptions.findIndex(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const closeDropdown = (refocusTrigger: boolean) => {
    setIsOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  };

  // Dropdown ini sebelumnya tidak punya dukungan keyboard sama sekali —
  // tidak bisa ditutup dengan Escape, tidak ada navigasi panah, dan tanpa
  // role ARIA yang benar (listbox/option) sehingga screen reader tidak tahu
  // ini adalah pemilih dengan daftar pilihan. Semua ditambahkan di bawah.
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDropdown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openDropdown();
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, normalizedOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(normalizedOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = normalizedOptions[activeIndex];
      if (opt) {
        onChange(opt.value);
        closeDropdown(true);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => (isOpen ? closeDropdown(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between rounded-lg bg-parchment-raised px-4 py-2.5 text-sm font-bold text-ink-900 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px focus:outline-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || 'Select option...'}</span>
        <ChevronDown size={14} className={`shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          autoFocus
          onKeyDown={handleListKeyDown}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-56 overflow-y-auto rounded-lg bg-parchment-raised shadow-card outline-none"
        >
          {normalizedOptions.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <button
                key={opt.value}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => { onChange(opt.value); closeDropdown(true); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-bold transition-colors border-b border-parchment-border last:border-b-0 ${
                  isSelected ? 'bg-terracotta text-ink-900' : isActive ? 'bg-ink-900/[0.05] text-ink-900' : 'text-ink-900 hover:bg-terracotta/40'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={13} className="shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
