import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Search, Eye, Shield, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Upload, Download, ArrowRight, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderBrief {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  nama_perusahaan?: string;
  jenis_interior: string;
}

interface Tahapan {
  step: number;
  text: string;
  persentase: number;
}

interface Termin {
  id: number;
  kode_tipe: string;
  nama_tipe: string;
  deskripsi: string;
  tahapan: Tahapan[];
}

interface Contract {
  id: number;
  rab_id: number;
  order_id: number;
  termin_id: number;
  lama_kontrak: string;
  status: 'belum_dibuat' | 'draft' | 'deal';
  signed_contract_file?: string;
  response_by?: string;
  response_time?: string;
  order?: OrderBrief;
  termin?: Termin;
}

interface RABContractRow {
  rab_id: number;
  order_id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  grand_total: number;
  status: 'belum_dibuat' | 'draft' | 'deal';
  contract_id?: number;
  contract?: Contract;
}

export default function ContractPage() {
  const [data, setData] = useState<RABContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Settings
  const [config, setConfig] = useState({ response_enabled: false });

  // Master Data Termin
  const [termins, setTermins] = useState<Termin[]>([]);
  const [terminSearch, setTerminSearch] = useState('');

  // Modals state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RABContractRow | null>(null);
  
  // Form Generate state
  const [selectedTermin, setSelectedTermin] = useState<Termin | null>(null);
  const [lamaKontrak, setLamaKontrak] = useState('');
  const [submittingGenerate, setSubmittingGenerate] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submittingUpload, setSubmittingUpload] = useState(false);

  // Actions loading state
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/contracts');
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data kontrak');
    } finally {
      setLoading(false);
    }
  };

  const fetchTermins = async () => {
    try {
      const res = await api.get('/termin');
      setTermins(res.data.data || []);
    } catch (err: any) {
      toast.error('Gagal memuat data master termin');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const s = res.data.data || [];
      setConfig({
        response_enabled: s.find((x: any) => x.key === 'response_enabled')?.value === 'true',
      });
    } catch (err: any) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchTermins();
    fetchSettings();
  }, []);

  const handleResponse = async (rabId: number) => {
    setRespondingId(rabId);
    try {
      const res = await api.post(`/contracts/rab/${rabId}/response`);
      toast.success(res.data.message || 'Respons regular berhasil disimpan');
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal merespons kontrak');
    } finally {
      setRespondingId(null);
    }
  };

  const getReadableDuration = (daysStr: string) => {
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return '';
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    
    if (months > 0) {
      if (remainingDays > 0) {
        return `${months} bulan ${remainingDays} hari`;
      }
      return `${months} bulan`;
    }
    return `${remainingDays} hari`;
  };

  const openGenerateModal = (row: RABContractRow) => {
    setSelectedRow(row);
    setSelectedTermin(null);
    setLamaKontrak('');
    setTerminSearch('');
    setGenerateModalOpen(true);
  };

  const handleGenerate = async () => {
    if (!selectedRow) return;
    if (!selectedTermin) {
      toast.error('Silakan pilih termin pembayaran terlebih dahulu');
      return;
    }
    if (!lamaKontrak.trim()) {
      toast.error('Silakan isi lama pengerjaan kontrak');
      return;
    }

    setSubmittingGenerate(true);
    try {
      const duration = getReadableDuration(lamaKontrak);
      await api.post('/contracts', {
        rab_id: selectedRow.rab_id,
        termin_id: selectedTermin.id,
        lama_kontrak: duration,
      });
      toast.success('Kontrak Draf berhasil dibuat');
      setGenerateModalOpen(false);
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat kontrak');
    } finally {
      setSubmittingGenerate(false);
    }
  };

  const openDetailModal = (row: RABContractRow) => {
    setSelectedRow(row);
    setUploadFile(null);
    setDetailModalOpen(true);
  };

  const handleUploadSigned = async () => {
    if (!selectedRow || !selectedRow.contract_id || !uploadFile) {
      toast.error('Silakan pilih file PDF bertanda tangan terlebih dahulu');
      return;
    }

    setSubmittingUpload(true);
    const formData = new FormData();
    formData.append('signed_contract', uploadFile);

    try {
      await api.post(`/contracts/${selectedRow.contract_id}/upload-signed`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Kontrak bertanda tangan diunggah, status DEAL!');
      setDetailModalOpen(false);
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah dokumen');
    } finally {
      setSubmittingUpload(false);
    }
  };

  const downloadPDF = async (contractId: number) => {
    try {
      const response = await api.get(`/contracts/${contractId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error('Gagal mengunduh PDF Kontrak');
    }
  };

  const formatRupiahVal = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Filter & Search Logic
  const filteredData = data.filter(row => {
    const matchesSearch =
      row.nomor_order.toLowerCase().includes(search.toLowerCase()) ||
      row.nama_project.toLowerCase().includes(search.toLowerCase()) ||
      row.nama_customer.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Filter termins by search input
  const filteredTermins = termins.filter(t => 
    t.nama_tipe.toLowerCase().includes(terminSearch.toLowerCase()) ||
    t.kode_tipe.toLowerCase().includes(terminSearch.toLowerCase())
  );

  // Counters for Metric Cards
  const totalSubmittedRAB = data.length;
  const totalDraft = data.filter(x => x.status === 'draft').length;
  const totalDeal = data.filter(x => x.status === 'deal').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header section with gradient border */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <FileText size={26} className="text-teal-500" /> Kontrak Kerja Interior
          </h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Finance &bull; Dokumen Kesepakatan, Termin Pembayaran & Kontrak Kerja Deal
          </p>
        </div>
        
        {/* Banner rule response */}
        <div className="flex items-center gap-2 bg-teal-50/50 border border-teal-100/50 px-3.5 py-2 rounded-xl text-[10px] font-bold text-teal-800">
          <Shield size={14} className={config.response_enabled ? 'text-emerald-500' : 'text-gray-300'} />
          <span>Designer Response: {config.response_enabled ? 'Wajib (Aktif)' : 'Off (Tidak Wajib)'}</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-0 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-white overflow-hidden border-l-4 border-indigo-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">RAB Disubmit</span>
              <h3 className="text-2xl font-black text-indigo-950">{totalSubmittedRAB} <span className="text-xs font-semibold text-gray-400">RAB</span></h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
              <FileText size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-white overflow-hidden border-l-4 border-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kontrak Draft</span>
              <h3 className="text-2xl font-black text-blue-950">{totalDraft} <span className="text-xs font-semibold text-gray-400">Draft</span></h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-white overflow-hidden border-l-4 border-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kontrak Deal</span>
              <h3 className="text-2xl font-black text-emerald-950">{totalDeal} <span className="text-xs font-semibold text-gray-400">Proyek</span></h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="border-0 shadow-[0_10px_40px_rgba(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Cari order, customer, proyek..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-10 border-gray-100 rounded-xl bg-gray-50/50 text-xs font-medium focus:ring-teal-400/20 focus:border-teal-400"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 text-xs font-bold border border-gray-100 rounded-xl bg-gray-50/50 focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="belum_dibuat">Belum Dibuat</option>
              <option value="draft">Draft Kontrak</option>
              <option value="deal">Deal (Signed)</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/30">
              <TableRow className="border-gray-50">
                <TableHead className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest px-6 py-4">Nomor Order</TableHead>
                <TableHead className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest py-4">Proyek & Client</TableHead>
                <TableHead className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest py-4">Nilai Kontrak</TableHead>
                <TableHead className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest py-4 text-center">Status</TableHead>
                <TableHead className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest py-4 text-right px-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 text-xs font-semibold">
                    <Loader2 className="animate-spin inline mr-2 text-teal-500" size={16} />
                    Memuat data kontrak...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 text-xs font-semibold">
                    <AlertCircle className="inline mr-1.5 text-gray-400" size={16} />
                    Tidak ada kontrak yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map(row => {
                  const hasResponse = row.contract && row.contract.response_time !== null;
                  
                  return (
                    <TableRow 
                      key={row.rab_id} 
                      className={`border-gray-50 hover:bg-gray-50/50 transition-colors ${row.status !== 'belum_dibuat' ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (row.status !== 'belum_dibuat') {
                          openDetailModal(row);
                        }
                      }}
                    >
                      <TableCell className="px-6 py-4 font-bold text-xs text-gray-800">{row.nomor_order}</TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-gray-800 block">{row.nama_project}</span>
                          <span className="text-[10px] font-semibold text-gray-400 block">{row.nama_customer}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-extrabold text-xs text-teal-600">
                        {formatRupiahVal(row.grand_total)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {row.status === 'deal' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            DEAL
                          </span>
                        )}
                        {row.status === 'draft' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            DRAFT KONTRAK
                          </span>
                        )}
                        {row.status === 'belum_dibuat' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                            BELUM DIBUAT
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-right px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {row.status === 'belum_dibuat' && (
                            <>
                              {config.response_enabled && !hasResponse ? (
                                <Button
                                  onClick={() => handleResponse(row.rab_id)}
                                  disabled={respondingId !== null}
                                  size="sm"
                                  className="h-8 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm"
                                >
                                  {respondingId === row.rab_id ? (
                                    <Loader2 className="animate-spin mr-1" size={12} />
                                  ) : (
                                    <Shield size={12} className="mr-1" />
                                  )}
                                  Respons Regular
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => openGenerateModal(row)}
                                  size="sm"
                                  className="h-8 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-600/10"
                                >
                                  <Sparkles size={12} className="mr-1" /> Generate
                                </Button>
                              )}
                            </>
                          )}
                          
                          {row.status !== 'belum_dibuat' && row.contract_id && (
                            <>
                              <Button
                                onClick={() => downloadPDF(row.contract_id!)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 border-gray-100 rounded-lg"
                                title="Lihat/Download PDF Kontrak"
                              >
                                <FileText size={14} />
                              </Button>
                              <Button
                                onClick={() => openDetailModal(row)}
                                size="sm"
                                className="h-8 w-8 p-0 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                                title="Detail Flow & Upload Tanda Tangan"
                              >
                                <Eye size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/20">
              <span className="text-[10px] font-bold text-gray-400">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + pageSize, totalItems)} dari {totalItems} item
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-gray-100 text-gray-500 rounded-md"
                >
                  <ChevronLeft size={14} />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 w-7 p-0 text-[10px] font-bold rounded-md ${
                      currentPage === page ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'border-gray-100 text-gray-500'
                    }`}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-gray-100 text-gray-500 rounded-md"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Generate Kontrak */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border-0 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-50">
            <DialogTitle className="text-base font-extrabold text-gray-800 flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={18} /> Generate Kontrak Baru
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
              Nomor Order: {selectedRow?.nomor_order}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Searchable Dropdown for Termin */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Pilih Termin Pembayaran
              </label>
              
              {/* Internal search inside dropdown */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <Input
                  placeholder="Cari termin..."
                  value={terminSearch}
                  onChange={e => setTerminSearch(e.target.value)}
                  className="pl-8 h-9 border-gray-100 rounded-lg text-xs font-semibold focus:ring-indigo-400/20 focus:border-indigo-400"
                />
              </div>

              {/* Termin list selector container with max height and scrolling */}
              <div className="mt-2 border border-gray-50 rounded-xl max-h-48 overflow-y-auto bg-gray-50/20 p-1.5 space-y-1">
                {filteredTermins.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-[10px] font-bold">
                    Tidak ada termin yang cocok
                  </div>
                ) : (
                  filteredTermins.map(t => {
                    const isSelected = selectedTermin?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTermin(t)}
                        className={`p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'hover:bg-gray-100/70 text-gray-700 bg-white border border-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{t.nama_tipe}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {t.kode_tipe}
                          </span>
                        </div>
                        <div className={`text-[10px] mt-1 font-medium ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                          {t.tahapan?.map(s => `${s.text} (${s.persentase}%)`).join(' • ')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input Lama Kontrak */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Lama Kontrak / Pengerjaan (Hari)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Masukkan jumlah hari pengerjaan (contoh: 45)"
                value={lamaKontrak}
                onChange={e => setLamaKontrak(e.target.value.replace(/\D/g, ''))}
                className="h-10 border-gray-100 rounded-xl text-xs font-semibold focus:ring-indigo-400/20 focus:border-indigo-400"
              />
              {lamaKontrak && (
                <p className="text-[11px] font-extrabold text-teal-600 animate-in fade-in slide-in-from-top-1 duration-200">
                  Konversi: {getReadableDuration(lamaKontrak)}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-end gap-2.5">
            <Button
              onClick={() => setGenerateModalOpen(false)}
              variant="outline"
              size="sm"
              className="h-9 font-bold text-[11px] rounded-xl border-gray-100 text-gray-500"
            >
              Batal
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={submittingGenerate}
              size="sm"
              className="h-9 font-bold text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/10"
            >
              {submittingGenerate ? (
                <>
                  <Loader2 className="animate-spin mr-1.5" size={12} /> Menyimpan...
                </>
              ) : (
                'Simpan & Generate'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Show Detail (Flow / Stepper & Tanda Tangan) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl p-6 bg-white rounded-2xl shadow-xl border-0 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-50">
            <DialogTitle className="text-base font-extrabold text-gray-800 flex items-center gap-2">
              <Eye className="text-teal-500" size={18} /> Detail Progress Kontrak
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
              Nomor Order: {selectedRow?.nomor_order} &bull; Proyek: {selectedRow?.nama_project}
            </DialogDescription>
          </DialogHeader>

          <div className="py-5 space-y-6">
            {/* Visual Stepper / Flow Diagram */}
            <div className="bg-gray-50/40 border border-gray-100 rounded-2xl p-5">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Alur Penyelesaian Kontrak
              </h4>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Step 1 */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/15">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">1. Draft Dibuat</span>
                    <span className="text-[9px] font-medium text-gray-400 block">Kontrak siap diunduh</span>
                  </div>
                </div>

                <div className="hidden md:block text-gray-300">
                  <ArrowRight size={16} />
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    selectedRow?.status === 'deal'
                      ? 'bg-emerald-500 text-white shadow-emerald-500/15'
                      : 'bg-blue-600 text-white shadow-blue-600/15 animate-pulse'
                  }`}>
                    {selectedRow?.status === 'deal' ? '✓' : '2'}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">2. Tanda Tangan</span>
                    <span className="text-[9px] font-medium text-gray-400 block">Client meninjau & TTD</span>
                  </div>
                </div>

                <div className="hidden md:block text-gray-300">
                  <ArrowRight size={16} />
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    selectedRow?.status === 'deal'
                      ? 'bg-emerald-500 text-white shadow-emerald-500/15'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {selectedRow?.status === 'deal' ? '✓' : '3'}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">3. Deal</span>
                    <span className="text-[9px] font-medium text-gray-400 block">Upload TTD & Proyek Deal</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedRow?.contract && (
              <div className="bg-gray-50/40 border border-gray-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Lama Pengerjaan</span>
                  <span className="text-gray-800 font-bold">{selectedRow.contract.lama_kontrak}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Skema Termin</span>
                  <span className="text-gray-800 font-bold">{selectedRow.contract.termin?.nama_tipe || '-'}</span>
                </div>
              </div>
            )}

            {/* Action Area based on status */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/30">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-xs text-indigo-950 block">Unduh Draf Kontrak</span>
                  <span className="text-[10px] font-medium text-indigo-700 block">Cetak draf kontrak perjanjian interior untuk ditandatangani customer</span>
                </div>
                {selectedRow?.contract_id && (
                  <Button
                    onClick={() => downloadPDF(selectedRow.contract_id!)}
                    className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Download size={13} /> Draf Kontrak (PDF)
                  </Button>
                )}
              </div>

              {selectedRow?.status === 'draft' ? (
                <div className="space-y-3 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
                  <div className="space-y-1">
                    <span className="font-extrabold text-xs text-gray-800 block flex items-center gap-1.5">
                      <Upload size={14} className="text-teal-500" /> Unggah Dokumen Bertanda Tangan
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 block">
                      Unggah file PDF hasil scan kontrak kerja sama yang telah ditandatangani oleh client
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer flex-1 border border-gray-100 rounded-xl p-1"
                    />
                    
                    {uploadFile && (
                      <Button
                        onClick={handleUploadSigned}
                        disabled={submittingUpload}
                        className="h-9 text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-sm"
                      >
                        {submittingUpload ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          'Simpan & Deal'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                      ✓
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-emerald-950 block">Kontrak Sudah Deal</span>
                      <span className="text-[10px] font-semibold text-emerald-600 block">Dokumen ditandatangani telah diverifikasi</span>
                    </div>
                  </div>
                  {selectedRow?.contract?.signed_contract_file && (
                    <Button
                      onClick={() => window.open(`${api.defaults.baseURL}${selectedRow.contract?.signed_contract_file}`, '_blank')}
                      variant="outline"
                      className="h-9 text-xs font-bold border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl"
                    >
                      <Download size={13} className="mr-1" /> Unduh Dokumen Deal
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-end">
            <Button
              onClick={() => setDetailModalOpen(false)}
              className="h-9 font-bold text-[11px] rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
