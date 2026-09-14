import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  History, 
  Clock, 
  ShieldCheck, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

const ACTION_META = {
  USER_LOGIN: { label: 'Giriş Yapıldı', color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  USER_LOGOUT: { label: 'Çıkış Yapıldı', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  USER_UPDATED: { label: 'Kullanıcı Güncellendi', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  STAFF_CREATED: { label: 'Personel Tanımlandı', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  ADMIN_CREATED: { label: 'Yönetici Tanımlandı', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold' },
  STAFF_DELETED: { label: 'Personel Silindi', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  STAFF_SUSPENDED: { label: 'Yetki Duraklatıldı', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  STAFF_ACTIVATED: { label: 'Yetki Aktif Edildi', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  PACKAGES_UPDATED: { label: 'Tarifeler Güncellendi', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' },
  CURRENCY_UPDATED: { label: 'Döviz Kurları Güncellendi', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  MONTHS_CONFIG_UPDATED: { label: 'Sezon Ayarları Güncellendi', color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  QUOTE_CREATED: { label: 'Teklif Oluşturuldu', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  QUOTE_REVISED: { label: 'Teklif Düzenlendi', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  QUOTE_APPROVED: { label: 'Teklif Onaylandı (Satış)', color: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-emerald-400 dark:border-emerald-700 font-bold' },
  QUOTE_STATUS_CHANGED: { label: 'Teklif Durumu Değişti', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  QUOTE_DELETED: { label: 'Teklif Silindi', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  ANNOUNCEMENT_CREATED: { label: 'Duyuru Yayınlandı', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  ANNOUNCEMENT_DELETED: { label: 'Duyuru Silindi', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  SYSTEM_RESET: { label: 'Fabrika Ayarlarına Sıfırlandı', color: 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 font-extrabold' }
};

export default function AuditLogView() {
  const { auditLogs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const filteredLogs = auditLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    const trLabel = ACTION_META[log.action]?.label?.toLowerCase() || '';
    return (
      (log.action && log.action.toLowerCase().includes(term)) ||
      trLabel.includes(term) ||
      (log.user && log.user.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  // Reset to first page on filter search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 pb-20">
      {/* Royal Emerald & Pearl Top Banner */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-700/60">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>GÜVENLİK & DENETİM KAYITLARI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Sistem Denetim & Hareket Günlüğü
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
              Fiyat güncellemeleri, personel girişleri, teklif onayları ve yapılan tüm idari hareketler gerçek zamanlı olarak kayıt altına alınır.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-emerald-800/60 px-4 py-2.5 rounded-2xl border border-emerald-700/60 font-mono text-emerald-200 shrink-0">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Toplam Kayıt: <strong>{auditLogs.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="pearl-card rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Hareket Geçmişi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sayfa başına 25 kayıt listelenir. Arama yaparak spesifik işlemlere ulaşabilirsiniz.</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="İşlem, kullanıcı veya detay ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Clock className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-medium">Arama kriterlerine uygun denetim kaydı bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70 dark:bg-slate-800/70">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">İşlem Türü</th>
                    <th className="py-3 px-4">Kullanıcı</th>
                    <th className="py-3 px-4">Açıklama / Detay</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Tarih & Saat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentLogs.map((log) => {
                    const meta = ACTION_META[log.action] || { 
                      label: log.action || 'İşlem', 
                      color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' 
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${meta.color}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75"></span>
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-bold">
                          {log.user}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Toplam <strong>{filteredLogs.length}</strong> kayıttan <strong>{startIndex + 1} - {endIndex}</strong> arası gösteriliyor
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 select-none">
                  {/* First Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                    title="İlk Sayfa"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                    title="Önceki Sayfa"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  </button>

                  {/* Page Indicator */}
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 font-mono text-xs">
                    Sayfa {currentPage} / {totalPages}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                    title="Sonraki Sayfa"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                    title="Son Sayfa"
                  >
                    <ChevronsRight className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
