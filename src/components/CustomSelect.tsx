import React, { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: CustomSelectOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
  const selectedOption = normalizedOptions.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
 className="flex w-full items-center justify-between rounded-lg bg-paper px-4 py-2.5 text-sm font-bold text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px focus:outline-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || 'Select option...'}</span>
        <ChevronDown size={14} className={`shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
 <div className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-56 overflow-y-auto rounded-lg bg-paper shadow-card">
          {normalizedOptions.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-bold transition-colors border-b border-ink/10 last:border-b-0 ${
                  isSelected ? 'bg-accent text-ink' : 'text-ink hover:bg-accent/40'
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
