import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Clock, 
  Moon, 
  Sparkles 
} from 'lucide-react';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_NAMES_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Format date as DD.MM.YYYY
export function formatDateTR(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

// Calculate nights between two date strings (YYYY-MM-DD)
export function calculateNights(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime <= 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Convert Date object to YYYY-MM-DD string
function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CustomDateRangePicker({
  startDate, // 'YYYY-MM-DD'
  endDate,   // 'YYYY-MM-DD'
  onChange,  // ({ startDate, endDate, nights }) => void
  placeholder = 'Tarih Aralığı Seçiniz',
  disabled = false,
  themeColor = 'emerald' // 'emerald' | 'amber' | 'blue'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, openUpward: false });

  // Internal selection state
  const [tempStart, setTempStart] = useState(startDate || '');
  const [tempEnd, setTempEnd] = useState(endDate || '');
  const [hoverDate, setHoverDate] = useState(null);

  // Calendar View month & year
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() || 0);

  // Calculate popup position relative to trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupHeight = 360;
    const popupWidth = 320;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < popupHeight && rect.top > popupHeight;

    let top = openUpward ? rect.top - popupHeight - 8 : rect.bottom + 8;
    let left = rect.left;

    // Boundary check for right side of window
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }
    if (left < 16) left = 16;

    setPopupPos({ top, left, openUpward });
  };

  // Update position on open, scroll, resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        popupRef.current && !popupRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Synchronize when props change
  useEffect(() => {
    setTempStart(startDate || '');
    setTempEnd(endDate || '');
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate, endDate]);

  // Nights count
  const calculatedNights = useMemo(() => {
    return calculateNights(tempStart, tempEnd);
  }, [tempStart, tempEnd]);

  // Navigate months
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    
    // Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      days.push({
        date: d,
        iso: toIsoDate(d),
        isCurrentMonth: false,
        dayNumber: dayNum
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({
        date: d,
        iso: toIsoDate(d),
        isCurrentMonth: true,
        dayNumber: i
      });
    }

    // Next month filler days to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({
        date: d,
        iso: toIsoDate(d),
        isCurrentMonth: false,
        dayNumber: i
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Handle Day Click
  const handleDayClick = (isoStr) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(isoStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      if (new Date(isoStr) < new Date(tempStart)) {
        setTempStart(isoStr);
      } else {
        setTempEnd(isoStr);
      }
    }
  };

  // Quick Preset Helper
  const handleApplyPreset = (daysCount) => {
    const base = tempStart ? new Date(tempStart) : new Date();
    const end = new Date(base);
    end.setDate(base.getDate() + daysCount);

    const sIso = toIsoDate(base);
    const eIso = toIsoDate(end);
    setTempStart(sIso);
    setTempEnd(eIso);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  };

  // Apply & Close
  const handleApply = (e) => {
    e?.stopPropagation();
    if (!tempStart) return;
    const finalEnd = tempEnd || tempStart;
    const nights = calculateNights(tempStart, finalEnd);
    onChange?.({
      startDate: tempStart,
      endDate: finalEnd,
      nights
    });
    setIsOpen(false);
  };

  // Clear
  const handleClear = (e) => {
    e?.stopPropagation();
    setTempStart('');
    setTempEnd('');
    onChange?.({ startDate: '', endDate: '', nights: 0 });
    setIsOpen(false);
  };

  const isSelectedRange = (isoStr) => {
    if (!tempStart) return false;
    if (tempStart === isoStr || tempEnd === isoStr) return true;
    if (tempStart && tempEnd) {
      return isoStr > tempStart && isoStr < tempEnd;
    }
    if (tempStart && !tempEnd && hoverDate) {
      const min = tempStart < hoverDate ? tempStart : hoverDate;
      const max = tempStart > hoverDate ? tempStart : hoverDate;
      return isoStr >= min && isoStr <= max;
    }
    return false;
  };

  const isStartDay = (isoStr) => tempStart === isoStr;
  const isEndDay = (isoStr) => tempEnd === isoStr || (!tempEnd && hoverDate === isoStr && isoStr > tempStart);

  const activeNights = calculateNights(startDate, endDate);
  const activeDays = activeNights > 0 ? activeNights + 1 : 0;

  const currentPopupNights = calculatedNights || (tempStart && hoverDate ? calculateNights(tempStart, hoverDate) : 0);
  const currentPopupDays = currentPopupNights > 0 ? currentPopupNights + 1 : 0;

  return (
    <div className="relative w-full">
      
      {/* 1. Trigger Input Pill (Clear Date Range Display with X Gün Y Gece) */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          updatePosition();
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white border text-xs font-bold transition-all shadow-3xs cursor-pointer select-none ${
          isOpen
            ? `border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900`
            : `border-slate-300 hover:border-slate-400 text-slate-700`
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <CalendarIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          {startDate && endDate ? (
            <span className="font-bold text-slate-900 text-xs tracking-tight truncate">
              {formatDateTR(startDate)} - {formatDateTR(endDate)}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        {activeNights > 0 && (
          <span className="shrink-0 font-bold text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            {activeDays} Gün {activeNights} Gece
          </span>
        )}
      </button>

      {/* 2. Custom Apple-Style Calendar Popup via Portal (No overflow cut!) */}
      {isOpen && createPortal(
        <div 
          ref={popupRef}
          style={{
            position: 'fixed',
            top: `${popupPos.top}px`,
            left: `${popupPos.left}px`,
            zIndex: 99999
          }}
          className="w-72 sm:w-80 p-4 bg-white/98 rounded-3xl border-2 border-emerald-500/40 shadow-2xl backdrop-blur-2xl animate-scale-in"
        >
          
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="font-black text-xs text-slate-900 font-display">
              {MONTH_NAMES_TR[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAY_NAMES_TR.map(d => (
              <span key={d} className="text-[10px] font-black text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dObj, idx) => {
              const inRange = isSelectedRange(dObj.iso);
              const isStart = isStartDay(dObj.iso);
              const isEnd = isEndDay(dObj.iso);

              let cellStyle = 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700';
              if (!dObj.isCurrentMonth) {
                cellStyle = 'text-slate-300 hover:bg-slate-50';
              }

              if (isStart || isEnd) {
                cellStyle = 'bg-emerald-600 text-white font-black shadow-xs scale-105 z-10';
              } else if (inRange) {
                cellStyle = 'bg-emerald-100 text-emerald-950 font-bold rounded-none';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(dObj.iso)}
                  onMouseEnter={() => !tempEnd && setHoverDate(dObj.iso)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none ${cellStyle}`}
                >
                  {dObj.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Range Summary with X Gün Y Gece Badge & Footer Actions */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
            
            {/* Live X Gün Y Gece Summary Box */}
            {currentPopupNights > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200 flex items-center justify-between text-xs animate-scale-in">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Süreç:</span>
                </span>
                <span className="font-bold text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-300 shadow-3xs">
                  {currentPopupDays} Gün {currentPopupNights} Gece
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium text-slate-600 truncate min-w-0">
                {tempStart && (
                  <div className="truncate font-bold text-slate-800">
                    {formatDateTR(tempStart)}
                    {tempEnd && ` → ${formatDateTR(tempEnd)}`}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Temizle
                </button>
                <button
                  type="button"
                  disabled={!tempStart}
                  onClick={handleApply}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Uygula
                </button>
              </div>
            </div>

          </div>

        </div>,
        document.body
      )}

    </div>
  );
}
