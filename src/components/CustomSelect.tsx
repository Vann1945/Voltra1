import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption { value: string; label: string; }

interface CustomSelectProps {
  value: string;
  options: (string | CustomSelectOption)[];
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function CustomSelect({ value, options, onChange, placeholder, id, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const normalizedOptions = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const selectedOption = normalizedOptions.find(option => option.value === value);
  const selectedIndex = normalizedOptions.findIndex(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const choose = (option: CustomSelectOption) => {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDropdown();
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, normalizedOptions.length - 1)); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); return; }
    if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); return; }
    if (event.key === 'End') { event.preventDefault(); setActiveIndex(normalizedOptions.length - 1); return; }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const activeOption = normalizedOptions[activeIndex];
      if (activeOption) choose(activeOption);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        onKeyDown={handleTriggerKeyDown}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-parchment-border bg-parchment-raised px-4 py-3 text-left text-sm font-medium text-ink-900 shadow-sm transition-[border-color,box-shadow] hover:border-ink-900/25 focus:outline-none focus-visible:border-terracotta focus-visible:ring-4 focus-visible:ring-terracotta/15"
      >
        <span className="truncate">{selectedOption?.label || placeholder || 'Select option'}</span>
        <ChevronDown size={16} aria-hidden="true" className={`ml-3 shrink-0 text-ink-900/55 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          autoFocus
          onKeyDown={handleListKeyDown}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          className="absolute left-0 right-0 top-full z-[120] mt-2 max-h-64 overflow-y-auto rounded-xl border border-parchment-border bg-parchment-raised p-1 shadow-card-float outline-none"
        >
          {normalizedOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return <button key={option.value} id={`${listboxId}-option-${index}`} type="button" role="option" aria-selected={isSelected} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-terracotta/15 font-bold text-ink-900' : isActive ? 'bg-ink-900/[0.05] text-ink-900' : 'text-ink-900/75 hover:bg-ink-900/[0.04]'}`}><span className="truncate">{option.label}</span>{isSelected && <Check size={15} className="ml-3 shrink-0 text-terracotta-text" />}</button>;
          })}
        </div>
      )}
    </div>
  );
}
