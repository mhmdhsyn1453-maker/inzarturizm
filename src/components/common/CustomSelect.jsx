import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  // Position calculation
  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUpward = spaceBelow < 220 && rect.top > 180;

      setDropdownPosition({
        top: shouldOpenUpward ? 'auto' : `${rect.bottom + 6}px`,
        bottom: shouldOpenUpward ? `${window.innerHeight - rect.top + 6}px` : 'auto',
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 160)}px`,
        openUpward: shouldOpenUpward
      });
    }
  };

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (event) => {
      // If scrolling inside the menu itself, don't close
      if (menuRef.current && menuRef.current.contains(event.target)) return;
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((opt) => opt.value === value) || options.find((opt) => opt.id === value);

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-800 border transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'border-emerald-600 ring-4 ring-emerald-500/10 shadow-sm'
            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate text-xs">
            {selectedOption ? selectedOption.label || selectedOption.name : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Floating Menu via Portal - Kartların ve Tabloların Dışına Serbestçe Çıkar */}
      {isOpen && createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            bottom: dropdownPosition.bottom,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 999999
          }}
          className="min-w-[150px] rounded-2xl bg-white p-1.5 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.3)] border border-slate-200/90 max-h-60 overflow-y-auto animate-fade-scale"
        >
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
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
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
        </div>,
        document.body
      )}
    </div>
  );
}
