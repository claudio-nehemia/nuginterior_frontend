import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { ChevronLeft, FileText, Eye, Download, CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MoodboardFile {
  id: number;
  file_path: string;
  file_type: 'kasar' | 'final';
  original_name: string;
  status: 'pending' | 'approved' | 'revisi';
  revisi?: string;
  created_at: string;
}

interface EstimasiFile {
  id: number;
  moodboard_file_id: number;
  file_path: string;
  original_name: string;
}

interface Estimasi {
  id: number;
  files: EstimasiFile[];
}

interface Moodboard {
  id: number;
  order_id: number;
  moodboard_kasar: string;
  status: 'pending' | 'approved' | 'revisi';
  notes: string;
  response_by: string | null;
  files: MoodboardFile[];
  estimasi?: Estimasi;
}

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  telepon_customer: string;
  alamat: string;
}

export default function MoodboardDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Revision Form Modal
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [selectedFileForRevision, setSelectedFileForRevision] = useState<number | null>(null);

  // Accept Confirmation Modal
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{ id: number; label: string } | null>(null);
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const fetchDetails = async () => {
    try {
      const orderRes = await api.get(`/orders/${orderId}`);
      setOrder(orderRes.data.data);

      const mbRes = await api.get(`/moodboards`);
      const allMb: Moodboard[] = mbRes.data.data || [];
      const matchedMb = allMb.find(m => m.order_id === Number(orderId));
      if (matchedMb) {
        setMoodboard(matchedMb);
      } else {
        setMoodboard(null);
      }
    } catch {
      toast.error('Gagal memuat detail data moodboard');
      navigate('/dashboard/moodboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [orderId]);

  const handleAcceptDesain = async () => {
    if (!moodboard || !selectedOption) return;
    setIsSubmittingAccept(true);
    try {
      await api.post(`/moodboards/${moodboard.id}/accept-desain`, {
        moodboard_file_id: selectedOption.id
      });
      toast.success('Pilihan desain kasar dan estimasi berhasil disetujui');
      setAcceptModalOpen(false);
      setSelectedOption(null);
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui desain');
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleReviseDesain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodboard || !selectedFileForRevision || !revisionNotes.trim()) return;
    setIsSubmittingRevision(true);

    try {
      await api.post(`/moodboards/${moodboard.id}/revise`, {
        moodboard_file_id: selectedFileForRevision,
        notes: revisionNotes
      });
      toast.success('Permintaan revisi berhasil dikirim');
      setReviseModalOpen(false);
      setRevisionNotes('');
      setSelectedFileForRevision(null);
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim permintaan revisi');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const getFileUrl = (path: string) => {
    if (!path) return '';
    return `${API_BASE_URL}${path}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-semibold text-xs">
        <Loader2 className="w-8 h-8 animate-spin rounded-full text-teal-500 mr-2" />
        Memuat detail moodboard...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <p className="text-gray-500 text-sm font-bold">Data order tidak ditemukan</p>
        <Button onClick={() => navigate('/dashboard/moodboard')} className="mt-4 bg-teal-500 text-white">Kembali ke Moodboard</Button>
      </div>
    );
  }

  if (!moodboard) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-5">
          <button
            onClick={() => navigate('/dashboard/moodboard')}
            className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
          >
            <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Moodboard
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
              Detail Moodboard: {order.nama_project}
            </h1>
            <span className="font-mono text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-0.5 rounded-full">
              {order.nomor_order}
            </span>
          </div>
        </div>

        <Card className="border-0 shadow-sm rounded-2xl bg-white text-center py-12 px-6">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <CardTitle className="text-base font-extrabold text-gray-700">Moodboard Belum Dimulai</CardTitle>
          <CardDescription className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
            Tahap Moodboard belum direspons oleh desainer atau berkas desain kasar belum diunggah.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const kasarOptions = moodboard.files?.filter(f => f.file_type === 'kasar') || [];
  const estimasiFiles = moodboard.estimasi?.files || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard/moodboard')}
            className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
          >
            <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Moodboard
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
              Konsep Moodboard & Estimasi: {order.nama_project}
            </h1>
            <span className="font-mono text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-0.5 rounded-full">
              {order.nomor_order}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Customer: <span className="font-bold text-gray-700">{order.nama_customer}</span> &bull; Status:{' '}
            <span className={`font-bold uppercase ${
              moodboard.status === 'approved' ? 'text-emerald-500' : moodboard.status === 'revisi' ? 'text-red-500' : 'text-amber-500'
            }`}>{moodboard.status}</span>
          </p>
        </div>

        {/* Global Status Banner */}
        <div className="bg-teal-50/50 border border-teal-100/50 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="text-[11px] leading-relaxed">
            <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Status Alur</span>
            <span className="font-extrabold text-teal-700 block">
              {moodboard.status === 'approved'
                ? 'Desain Kasar Disetujui (Locked)'
                : moodboard.status === 'revisi'
                ? 'Sedang Menunggu Revisi Desain'
                : kasarOptions.length === 0
                ? 'Menunggu Upload Desain Kasar'
                : 'Menunggu Persetujuan Klien'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Opsi-opsi Desain (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-extrabold text-gray-800">
                  Matriks Pilihan Desain Kasar & RAB
                </CardTitle>
                <CardDescription className="text-[10px] text-gray-500">
                  Perbandingan opsi visual kasar dari desainer beserta estimasi biaya (RAB) dari estimator.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {kasarOptions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  Belum ada berkas opsi desain kasar yang diunggah
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {kasarOptions.map((opt, idx) => {
                    const matchingRAB = estimasiFiles.find(ef => ef.moodboard_file_id === opt.id);
                    const isApprovedOption = moodboard.moodboard_kasar === opt.file_path;

                    return (
                      <div
                        key={opt.id}
                        className={`border rounded-2xl overflow-hidden bg-white transition-all flex flex-col justify-between ${
                          isApprovedOption
                            ? 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-md'
                            : moodboard.status === 'approved'
                            ? 'border-gray-100 opacity-60'
                            : 'border-gray-100 hover:shadow-md'
                        }`}
                      >
                        {/* Header Opsi */}
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-gray-800">Opsi Desain #{idx + 1}</span>
                            {opt.status === 'revisi' && (
                              <Badge className="bg-red-500 text-white text-[9px] font-bold">BUTUH REVISI</Badge>
                            )}
                            {opt.status === 'approved' && (
                              <Badge className="bg-emerald-500 text-white text-[9px] font-bold">SETUJU</Badge>
                            )}
                            {opt.status === 'pending' && !isApprovedOption && (
                              <Badge className="bg-amber-500 text-white text-[9px] font-bold">PENDING</Badge>
                            )}
                          </div>
                          {isApprovedOption && (
                            <Badge className="bg-emerald-500 text-white text-[9px] font-black">TERPILIH</Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                          {/* File Desain Kasar */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest block">Visual Desain Kasar</span>
                            <a
                              href={getFileUrl(opt.file_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-teal-50/30 hover:border-teal-100 transition-all text-xs font-bold text-gray-700"
                            >
                              <Eye size={14} className="text-teal-500" />
                              <span className="truncate flex-1">{opt.original_name}</span>
                              <Download size={12} className="text-gray-400" />
                            </a>
                          </div>

                          {/* File RAB */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block">Estimasi Biaya (RAB)</span>
                            {matchingRAB ? (
                              <a
                                href={getFileUrl(matchingRAB.file_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-purple-50/30 hover:border-purple-100 transition-all text-xs font-bold text-gray-700"
                              >
                                <FileText size={14} className="text-purple-500" />
                                <span className="truncate flex-1">{matchingRAB.original_name}</span>
                                <Download size={12} className="text-gray-400" />
                              </a>
                            ) : (
                              <div className="border border-dashed border-purple-100 rounded-xl p-3 text-center bg-purple-50/10">
                                <span className="text-[10px] text-gray-400 block font-medium">Belum ada estimasi RAB</span>
                              </div>
                            )}
                          </div>

                          {opt.status === 'revisi' && opt.revisi && (
                            <div className="mt-3 p-3 rounded-xl bg-red-50/70 border border-red-100 space-y-1">
                              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block">Catatan Revisi PM</span>
                              <p className="text-[11px] text-red-700 font-semibold leading-relaxed break-words">{opt.revisi}</p>
                            </div>
                          )}
                        </div>

                        {/* Footer Action: Approve & Revise */}
                        {moodboard.status !== 'approved' && (
                          <div className="p-4 bg-gray-50/30 border-t border-gray-50 flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => {
                                setSelectedFileForRevision(opt.id);
                                setReviseModalOpen(true);
                              }}
                              className="font-extrabold text-[10px] h-7 px-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md transition-all"
                            >
                              Ajukan Revisi
                            </Button>
                            <Button
                              disabled={!matchingRAB}
                              onClick={() => {
                                setSelectedOption({ id: opt.id, label: `Opsi Desain #${idx + 1}` });
                                setAcceptModalOpen(true);
                              }}
                              className={`font-extrabold text-[10px] h-7 px-3.5 rounded-md shadow-sm transition-all ${
                                matchingRAB
                                  ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Setujui Opsi Ini
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Info Project & Revision requests */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <CardTitle className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                Detail Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-gray-600 space-y-3">
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Nama Klien</span>
                <span className="font-bold text-gray-800">{order.nama_customer}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Nomor Telepon</span>
                <span className="font-semibold">{order.telepon_customer || '-'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Alamat Proyek</span>
                <span className="font-semibold block leading-relaxed">{order.alamat || '-'}</span>
              </div>
            </CardContent>
          </Card>



          {/* Locked accepted design summary if approved */}
          {moodboard.status === 'approved' && (
            <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden border-t-4 border-t-emerald-500">
              <CardContent className="p-5 flex items-start gap-3">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-emerald-800 text-xs block">Tahap Moodboard Disetujui!</span>
                  <p className="text-[10px] text-emerald-600 leading-relaxed">
                    Pilihan visual desain kasar terpilih telah dikunci dan disepakati. Proyek siap untuk dilanjutkan ke tahap berikutnya.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* DIALOG MODAL: Accept Desain */}
      <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800">Setujui Opsi Desain & Estimasi</DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Dengan menyetujui opsi ini, Anda menyepakati konsep dasar visual kasar beserta estimasi biaya (RAB) yang dilampirkan. Status akan dikunci dan dilanjutkan ke billing commitment fee.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setAcceptModalOpen(false)}
              disabled={isSubmittingAccept}
              className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              onClick={handleAcceptDesain}
              disabled={isSubmittingAccept}
              className="rounded-xl font-bold h-9 text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              {isSubmittingAccept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Setujui & Kunci'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL: Revise Desain */}
      <Dialog open={reviseModalOpen} onOpenChange={setReviseModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[420px]">
          <form onSubmit={handleReviseDesain}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-800">Ajukan Catatan Revisi</DialogTitle>
              <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
                Tuliskan umpan balik atau instruksi revisi secara mendetail agar desainer dapat melakukan perbaikan konsep dengan tepat.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">
              <textarea
                placeholder="Tuliskan catatan revisi di sini..."
                value={revisionNotes}
                onChange={e => setRevisionNotes(e.target.value)}
                required
                rows={4}
                className="w-full rounded-xl border border-gray-200 p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingRevision}
                onClick={() => setReviseModalOpen(false)}
                className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRevision}
                className="rounded-xl font-bold h-9 text-xs bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
              >
                {isSubmittingRevision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="flex items-center gap-1"><Send size={11} /> Kirim Catatan</span>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
