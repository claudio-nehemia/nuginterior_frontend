import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  ArrowLeft, Download, Upload, Loader2, CheckCircle2, AlertCircle, Clock, Calendar, Eye, Receipt, Coins
} from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: number;
  contract_id: number;
  order_id: number;
  step: number;
  keterangan: string;
  persentase: number;
  amount: number;
  deadline?: string;
  status: string; // 'belum_bayar', 'terbayar'
  payment_proof?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

interface ContractInvoiceDetail {
  contract_id: number;
  order_id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  termin_id?: number;
  status_pembayaran: string;
  invoice_response_by?: string;
  invoice_response_time?: string;
  invoices: Invoice[];
}

export default function InvoiceDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ContractInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ deadline_enabled: false });
  const [localDeadlines, setLocalDeadlines] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (detail?.invoices) {
      const map: {[key: number]: string} = {};
      detail.invoices.forEach(inv => {
        map[inv.id] = inv.deadline ? inv.deadline.substring(0, 10) : '';
      });
      setLocalDeadlines(map);
    }
  }, [detail]);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // View proof modal state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  // Inline action loading states
  const [updatingDeadlineId, setUpdatingDeadlineId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateInvoices = async () => {
    if (!contractId) return;
    setGenerating(true);
    try {
      const res = await api.post(`/invoices/contract/${contractId}/generate`);
      toast.success(res.data.message || 'Invoice termin berhasil diterbitkan');
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan invoice');
    } finally {
      setGenerating(false);
    }
  };

  const fetchDetail = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const res = await api.get(`/invoices/contract/${contractId}`);
      setDetail(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat detail tagihan');
      navigate('/dashboard/invoice');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const s = res.data.data || [];
      setConfig({
        deadline_enabled: s.find((x: any) => x.key === 'invoice_deadline_enabled')?.value === 'true',
      });
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchSettings();
  }, [contractId]);

  const handleUpdateDeadline = async (invoiceId: number, dateStr: string) => {
    if (!dateStr) return;
    setUpdatingDeadlineId(invoiceId);
    try {
      await api.put(`/invoices/${invoiceId}/deadline`, { deadline: dateStr });
      toast.success('Deadline berhasil diperbarui');
      // Refresh detail data
      const res = await api.get(`/invoices/contract/${contractId}`);
      setDetail(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui deadline');
    } finally {
      setUpdatingDeadlineId(null);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoice.keterangan.replace(/\s+/g, '_')}_${invoice.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF Invoice berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh PDF Invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const openUploadModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  const handleUploadPayment = async () => {
    if (!selectedInvoice || !uploadFile) {
      toast.error('Silakan pilih file bukti pembayaran terlebih dahulu');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('payment_proof', uploadFile);

    try {
      const res = await api.post(`/invoices/${selectedInvoice.id}/payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Bukti pembayaran berhasil diunggah');
      setUploadModalOpen(false);
      // Refresh detail data
      const refreshRes = await api.get(`/invoices/contract/${contractId}`);
      setDetail(refreshRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah bukti pembayaran');
    } finally {
      setUploading(false);
    }
  };

  const getInvoiceNumber = (inv: Invoice) => {
    const d = new Date(inv.created_at);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const idStr = String(inv.id).padStart(4, '0');
    return `INV/NUG/${year}/${month}/${idStr}`;
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const checkIsOverdue = (invoice: Invoice) => {
    if (invoice.status === 'terbayar' || !invoice.deadline) return false;
    const dl = new Date(invoice.deadline);
    dl.setHours(23, 59, 59, 999);
    return dl < new Date();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/invoice')}
          className="h-9 w-9 p-0 rounded-xl border-gray-100 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            Detail Tagihan Kontrak
          </h1>
          <p className="text-xs font-medium text-gray-500">
            {detail?.nomor_order} &bull; {detail?.nama_project}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-60 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
          <Loader2 className="animate-spin text-teal-500" size={24} />
          Memuat rincian tagihan...
        </div>
      ) : !detail ? (
        <div className="h-60 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
          <AlertCircle size={24} className="text-red-400" />
          Rincian tagihan tidak ditemukan.
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-br from-white to-gray-50/30">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Nomor Order</span>
                <p className="text-xs font-bold text-gray-800">{detail.nomor_order}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Nama Project</span>
                <p className="text-xs font-bold text-gray-800">{detail.nama_project}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Klien</span>
                <p className="text-xs font-bold text-gray-800">{detail.nama_customer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Progress Pembayaran</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                    <div
                      className="h-full bg-teal-400 rounded-full transition-all duration-500"
                      style={{
                        width: detail.status_pembayaran.includes('100%')
                          ? '100%'
                          : detail.status_pembayaran === 'Belum Bayar'
                          ? '0%'
                          : detail.status_pembayaran.match(/\d+/)
                          ? `${detail.status_pembayaran.match(/\d+/)?.[0]}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full shrink-0">
                    {detail.status_pembayaran}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Invoices Table */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-800 tracking-tight flex items-center gap-1.5">
                <Receipt size={14} className="text-teal-500" /> Daftar Tahapan Pembayaran (Invoices)
              </h2>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="border-gray-50 hover:bg-transparent">
                      <TableHead className="font-bold text-gray-600 text-xs py-4 pl-6">No. Invoice</TableHead>
                      <TableHead className="font-bold text-gray-600 text-xs py-4">Termin Tahapan</TableHead>
                      <TableHead className="font-bold text-gray-600 text-xs py-4 text-center">Persentase</TableHead>
                      <TableHead className="font-bold text-gray-600 text-xs py-4 text-right">Jumlah Tagihan</TableHead>
                      {config.deadline_enabled && (
                        <TableHead className="font-bold text-gray-600 text-xs py-4">Deadline</TableHead>
                      )}
                      <TableHead className="font-bold text-gray-600 text-xs py-4">Status</TableHead>
                      <TableHead className="font-bold text-gray-600 text-xs py-4 text-center pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={config.deadline_enabled ? 7 : 6} className="h-60 text-center">
                          <div className="flex flex-col items-center justify-center gap-3 text-gray-450 text-xs">
                            <Receipt size={32} className="text-gray-300" />
                            <div className="space-y-1">
                              <p className="font-bold text-gray-700">Belum ada invoice yang diterbitkan</p>
                              <p className="text-[10px] text-gray-400">Pengaturan penerbitan otomatis dinonaktifkan. Anda harus menerbitkannya secara manual.</p>
                            </div>
                            <Button
                              disabled={generating}
                              onClick={handleGenerateInvoices}
                              className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-500/10 transition-all mt-1"
                            >
                              {generating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Coins size={14} />
                              )}
                              Terbitkan Seluruh Invoice Termin
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      detail.invoices.map((inv) => {
                        const isPaid = inv.status === 'terbayar';
                        const isOverdue = checkIsOverdue(inv);

                        return (
                          <TableRow key={inv.id} className="border-gray-50 hover:bg-gray-50/30 transition-colors group">
                            <TableCell className="font-bold text-gray-800 text-xs py-4.5 pl-6">
                              {getInvoiceNumber(inv)}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-700 text-xs py-4.5">
                              {inv.keterangan}
                            </TableCell>
                            <TableCell className="font-bold text-teal-600 text-xs py-4.5 text-center">
                              {inv.persentase}%
                            </TableCell>
                            <TableCell className="font-bold text-gray-800 text-xs py-4.5 text-right">
                              {formatRupiah(inv.amount)}
                            </TableCell>
                            {config.deadline_enabled && (
                              <TableCell className="py-4.5">
                                {isPaid ? (
                                  <span className="text-gray-500 font-medium text-xs flex items-center gap-1">
                                    <Calendar size={12} className="text-gray-400" />
                                    {formatDate(inv.deadline)}
                                  </span>
                                ) : (
                                  <div className="relative flex items-center gap-1.5 max-w-[150px]">
                                    <input
                                      type="date"
                                      disabled={updatingDeadlineId === inv.id}
                                      value={localDeadlines[inv.id] || ''}
                                      onChange={(e) => {
                                        setLocalDeadlines(prev => ({ ...prev, [inv.id]: e.target.value }));
                                      }}
                                      onBlur={() => {
                                        const val = localDeadlines[inv.id] || '';
                                        const originalVal = inv.deadline ? inv.deadline.substring(0, 10) : '';
                                        const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(val);
                                        if (isValidDate && val !== originalVal) {
                                          handleUpdateDeadline(inv.id, val);
                                        } else if (!isValidDate && val !== originalVal) {
                                          setLocalDeadlines(prev => ({ ...prev, [inv.id]: originalVal }));
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      className="w-full text-xs font-semibold text-gray-700 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:border-teal-400 focus:outline-none px-2 py-1 transition-all"
                                    />
                                    {updatingDeadlineId === inv.id && (
                                      <Loader2 size={12} className="animate-spin text-teal-500 absolute right-2" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="py-4.5">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                                  <CheckCircle2 size={10} /> Terbayar
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 shadow-sm">
                                  <AlertCircle size={10} /> Telat
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-100">
                                  <Clock size={10} /> Belum Bayar
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-4.5 text-center pr-6">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Download PDF button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={downloadingId === inv.id}
                                  onClick={() => handleDownloadPDF(inv)}
                                  className="h-8 w-8 p-0 rounded-lg border-teal-100 text-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-colors shadow-sm"
                                  title="Unduh Invoice PDF"
                                >
                                  {downloadingId === inv.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Download size={12} />
                                  )}
                                </Button>

                                {/* View Proof or Upload proof button */}
                                {isPaid ? (
                                  inv.payment_proof && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setProofUrl(
                                          inv.payment_proof?.startsWith('http')
                                            ? inv.payment_proof
                                            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${inv.payment_proof}`
                                        );
                                        setProofModalOpen(true);
                                      }}
                                      className="h-8 rounded-lg border-gray-100 text-gray-500 hover:bg-gray-50 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                                      title="Lihat bukti pembayaran"
                                    >
                                      <Eye size={12} /> Bukti
                                    </Button>
                                  )
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => openUploadModal(inv)}
                                    className="h-8 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-md shadow-teal-500/10"
                                  >
                                    <Upload size={12} /> Upload
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Upload Payment Proof Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl p-6 bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-50">
            <DialogTitle className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <Upload size={16} className="text-teal-500" /> Upload Bukti Pembayaran
            </DialogTitle>
            <DialogDescription className="text-[10px] font-medium text-gray-400 mt-1">
              Unggah file gambar atau PDF bukti transfer untuk pembayaran termin {selectedInvoice?.keterangan}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-gray-50/50 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Detail Tagihan</span>
              <div className="flex justify-between items-center text-xs font-bold text-gray-700 pt-1">
                <span>Tahapan: {selectedInvoice?.keterangan} ({selectedInvoice?.persentase}%)</span>
                <span className="text-teal-600">{selectedInvoice && formatRupiah(selectedInvoice.amount)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pilih File Bukti Transfer</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs font-semibold text-gray-600 bg-gray-50/30 rounded-xl border border-dashed border-gray-200 hover:bg-gray-50/60 p-4 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-extrabold file:bg-teal-50 file:text-teal-600 hover:file:bg-teal-100/80 file:cursor-pointer cursor-pointer transition-all"
              />
              <span className="text-[9px] text-gray-400 leading-normal block">
                Format file didukung: JPG, JPEG, PNG, PDF. Maksimum file 5MB.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-50 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => setUploadModalOpen(false)}
              className="border-gray-100 rounded-xl text-xs font-bold h-9 px-4 text-gray-500 hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={uploading || !uploadFile}
              onClick={handleUploadPayment}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-md shadow-teal-500/10 flex items-center gap-1.5"
            >
              {uploading && <Loader2 size={12} className="animate-spin" />}
              Kirim Bukti
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Proof Image/PDF Modal */}
      <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl border-0 shadow-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-50">
            <DialogTitle className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <Eye size={16} className="text-teal-500" /> Bukti Pembayaran
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 flex justify-center items-center">
            {proofUrl ? (
              proofUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${api.defaults.baseURL?.replace('/api', '')}${proofUrl}`}
                  className="w-full h-[60vh] border border-gray-100 rounded-xl"
                  title="Bukti PDF"
                />
              ) : (
                <img
                  src={`${api.defaults.baseURL?.replace('/api', '')}${proofUrl}`}
                  alt="Bukti Transfer"
                  className="max-w-full max-h-[60vh] rounded-xl object-contain border border-gray-100 shadow-inner"
                />
              )
            ) : (
              <span className="text-xs text-gray-400">Bukti pembayaran tidak ditemukan.</span>
            )}
          </div>

          <div className="pt-2 border-t border-gray-50 flex justify-end">
            <Button
              type="button"
              onClick={() => setProofModalOpen(false)}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-md"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
