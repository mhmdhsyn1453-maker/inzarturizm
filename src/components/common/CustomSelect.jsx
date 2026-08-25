import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seçiniz...',
  className = '',
  icon: Icon = null,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options.find((opt) => opt.id === value);

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 border transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'border-emerald-600 ring-4 ring-emerald-500/10 shadow-sm'
            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon className="h-4 w-4 text-emerald-600 shrink-0" />}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label || selectedOption.name : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white p-1.5 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.18)] border border-slate-200/90 max-h-64 overflow-y-auto animate-fade-scale">
          {options.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 font-medium">Seçenek bulunamadı</div>
          ) : (
            options.map((option) => {
              const optVal = option.value !== undefined ? option.value : option.id;
              const isSelected = optVal === value;

              return (
                <button
                  key={optVal}
                  type="button"
                  onClick={() => {
                    onChange(optVal);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label || option.name}</span>
                    {option.subtitle && (
                      <span className="text-[10px] text-slate-400 font-normal">({option.subtitle})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
