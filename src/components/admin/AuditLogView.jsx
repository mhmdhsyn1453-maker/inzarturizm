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

export default function AuditLogView() {
  const { auditLogs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const filteredLogs = auditLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(term)) ||
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
      <div className="pearl-card rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Hareket Geçmişi</h3>
            <p className="text-xs text-slate-500">Sayfa başına 25 kayıt listelenir. Arama yaparak spesifik işlemlere ulaşabilirsiniz.</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="İşlem, kullanıcı veya detay ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Arama kriterlerine uygun denetim kaydı bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/70">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">İşlem Türü</th>
                    <th className="py-3 px-4">Kullanıcı</th>
                    <th className="py-3 px-4">Açıklama / Detay</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Tarih & Saat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentLogs.map((log) => {
                    const isApproval = log.action === 'QUOTE_APPROVED';
                    const isLogin = log.action === 'USER_LOGIN';
                    const isPrice = log.action === 'PACKAGES_UPDATED' || log.action === 'CURRENCY_UPDATED';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isApproval
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : isPrice
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isLogin
                              ? 'bg-sky-100 text-sky-900 border border-sky-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-sans font-bold">
                          {log.user}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-sans font-medium leading-relaxed">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-500 font-medium">
                Toplam <strong>{filteredLogs.length}</strong> kayıttan <strong>{startIndex + 1} - {endIndex}</strong> arası gösteriliyor
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 select-none">
                  {/* First Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="İlk Sayfa"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5 text-slate-700" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Önceki Sayfa"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-slate-700" />
                  </button>

                  {/* Page Indicator */}
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-950 font-bold border border-emerald-200 font-mono text-xs">
                    Sayfa {currentPage} / {totalPages}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Sonraki Sayfa"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Son Sayfa"
                  >
                    <ChevronsRight className="h-3.5 w-3.5 text-slate-700" />
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
