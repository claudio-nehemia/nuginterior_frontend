import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { ChevronLeft, FileText, Upload, Download, Eye, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MoodboardFile {
  id: number;
  file_path: string;
  file_type: 'kasar' | 'final';
  original_name: string;
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
  estimated_cost: string;
  response_by: string | null;
  files: EstimasiFile[];
}

interface Moodboard {
  id: number;
  order_id: number;
  status: 'pending' | 'approved' | 'revisi';
  response_by: string | null;
  files: MoodboardFile[];
  estimasi?: Estimasi;
}

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
}

export default function EstimasiDetailPage() {
  const { moodboardId } = useParams<{ moodboardId: string }>();
  const navigate = useNavigate();
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const [order, setOrder] = useState<Order | null>(null);
  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<number | null>(null); // tracks file id being uploaded

  const fetchDetails = async () => {
    try {
      const mbRes = await api.get('/moodboards');
      const allMb: Moodboard[] = mbRes.data.data || [];
      let matchedMb = allMb.find(m => m.id === Number(moodboardId));

      if (matchedMb) {
        if (!matchedMb.estimasi) {
          await api.post(`/moodboards/${matchedMb.id}/estimasi/response`);
          const updatedMbRes = await api.get('/moodboards');
          const updatedAllMb: Moodboard[] = updatedMbRes.data.data || [];
          matchedMb = updatedAllMb.find(m => m.id === Number(moodboardId)) || matchedMb;
        }
        setMoodboard(matchedMb);
        // Fetch order details
        const orderRes = await api.get(`/orders/${matchedMb.order_id}`);
        setOrder(orderRes.data.data);
      } else {
        toast.error('Data estimasi tidak ditemukan');
        navigate('/dashboard/estimasi');
      }
    } catch {
      toast.error('Gagal memuat detail estimasi');
      navigate('/dashboard/estimasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [moodboardId]);

  const handleUploadRAB = async (moodboardFileId: number, file: File) => {
    if (!moodboard?.estimasi) return;
    setIsUploading(moodboardFileId);

    const formData = new FormData();
    formData.append('estimasi_id', moodboard.estimasi.id.toString());
    formData.append('moodboard_file_id', moodboardFileId.toString());
    formData.append('estimated_cost', file);

    try {
      await api.post('/estimasi/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Berkas RAB berhasil diunggah');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah berkas RAB');
    } finally {
      setIsUploading(null);
    }
  };

  const triggerFileInput = (fileId: number) => {
    fileInputRefs.current[fileId]?.click();
  };

  const getFileUrl = (path: string) => {
    if (!path) return '';
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/api$/, '');
    return `${base}${path}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-semibold text-xs">
        <Loader2 className="w-8 h-8 animate-spin rounded-full text-teal-500 mr-2" />
        Memuat detail estimasi...
      </div>
    );
  }

  if (!moodboard || !order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <p className="text-gray-500 text-sm font-bold">Data tidak ditemukan</p>
        <Button onClick={() => navigate('/dashboard/estimasi')} className="mt-4 bg-teal-500 text-white">Kembali</Button>
      </div>
    );
  }

  const kasarOptions = moodboard.files?.filter(f => f.file_type === 'kasar') || [];
  const estimasiFiles = moodboard.estimasi?.files || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard/estimasi')}
            className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
          >
            <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Estimasi
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
              Input RAB: {order.nama_project}
            </h1>
            <span className="font-mono text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-0.5 rounded-full">
              {order.nomor_order}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Customer: <span className="font-bold text-gray-700">{order.nama_customer}</span> &bull; Status Moodboard:{' '}
            <span className={`font-bold uppercase ${
              moodboard.status === 'approved' ? 'text-emerald-500' : moodboard.status === 'revisi' ? 'text-red-500' : 'text-amber-500'
            }`}>{moodboard.status}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Main workspace (span 2) */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-gray-50">
                <CardTitle className="text-sm font-extrabold text-gray-800">
                  Matriks Desain & Spreadsheet RAB
                </CardTitle>
                <CardDescription className="text-[10px] text-gray-500">
                  Setiap opsi desain kasar visual desainer harus diunggah file RAB Excel yang bersangkutan.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {kasarOptions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs italic">
                    Desainer belum mengunggah opsi desain kasar
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {kasarOptions.map((opt, idx) => {
                      const matchingRAB = estimasiFiles.find(ef => ef.moodboard_file_id === opt.id);
                      const isApproved = moodboard.status === 'approved';

                      return (
                        <div key={opt.id} className="border border-gray-100 hover:border-teal-100 rounded-2xl p-5 bg-gray-50/10 hover:bg-teal-50/5 hover:shadow-sm transition-all flex flex-col md:flex-row gap-5 items-start justify-between">
                          
                          {/* Design Info */}
                          <div className="space-y-3 w-full md:w-1/2">
                            <div>
                              <span className="font-extrabold text-xs text-teal-600 block mb-1">Opsi Desain #{idx + 1}</span>
                              <span className="text-[10px] text-gray-400 block font-semibold truncate">{opt.original_name}</span>
                            </div>
                            <a
                              href={getFileUrl(opt.file_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-100 bg-white hover:bg-teal-50/20 hover:border-teal-100 text-[10px] font-bold text-gray-700 transition-colors"
                            >
                              <Eye size={12} className="text-teal-500" />
                              Buka Gambar Desain
                            </a>
                          </div>

                          {/* RAB Upload Info */}
                          <div className="space-y-3 w-full md:w-1/2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5">
                            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block">Rencana Anggaran Biaya (RAB)</span>
                            
                            {/* Hidden file input */}
                            <input
                              type="file"
                              ref={el => { fileInputRefs.current[opt.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadRAB(opt.id, file);
                              }}
                              className="hidden"
                            />

                            {matchingRAB ? (
                              <div className="space-y-2">
                                <a
                                  href={getFileUrl(matchingRAB.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-white hover:bg-purple-50/30 hover:border-purple-100 transition-all text-xs font-bold text-gray-700"
                                >
                                  <FileText size={14} className="text-purple-500 shrink-0" />
                                  <span className="truncate flex-1">{matchingRAB.original_name}</span>
                                  <Download size={12} className="text-gray-400 shrink-0" />
                                </a>
                                {!isApproved && (
                                  <button
                                    onClick={() => triggerFileInput(opt.id)}
                                    disabled={isUploading !== null}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-700 underline"
                                  >
                                    <RefreshCw size={10} className={isUploading === opt.id ? 'animate-spin' : ''} />
                                    Ganti Berkas RAB
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[10px] text-gray-400 font-medium">Berkas RAB belum diunggah</p>
                                {!isApproved && (
                                  <Button
                                    onClick={() => triggerFileInput(opt.id)}
                                    disabled={isUploading !== null}
                                    size="sm"
                                    className="bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-[10px] h-7 px-3.5 rounded-lg flex items-center gap-1"
                                  >
                                    {isUploading === opt.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Upload size={10} /> Upload Berkas RAB
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Guidelines */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-gray-50">
                <CardTitle className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                  Panduan Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-xs text-gray-500 space-y-3 leading-relaxed">
                <p>
                  Sebagai estimator, tugas Anda adalah menghitung dan mengunggah rencana anggaran biaya (RAB) yang sesuai untuk masing-masing opsi konsep visual desainer di sebelah kiri.
                </p>
                <div className="border-t border-gray-50 my-1" />
                <p>
                  Anda dapat mengunggah berkas format apapun (Excel, PDF, gambar, dll.). Nama file akan langsung terdaftar di sistem.
                </p>
                <div className="border-t border-gray-50 my-1" />
                <p className="font-semibold text-teal-600">
                  Persetujuan Klien:
                </p>
                <p>
                  Setelah semua RAB terunggah lengkap, Project Manager atau Klien dapat melihat perbandingan visual beserta RAB-nya secara berdampingan untuk memilih opsi terbaik.
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={() => navigate('/dashboard/estimasi')}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-teal-500/10"
            >
              Simpan & Selesai
            </Button>
          </div>
        </div>

    </div>
  );
}
