import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Upload, FileText, Trash2, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
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

interface Moodboard {
  id: number;
  order_id: number;
  status: 'pending' | 'approved' | 'revisi';
  notes: string;
  files: MoodboardFile[];
}

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
}

export default function MoodboardFormPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [replacingFileId, setReplacingFileId] = useState<number | null>(null);



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
        // If not found, let's initialize it
        const initRes = await api.post(`/orders/${orderId}/moodboard/response`);
        setMoodboard(initRes.data.data);
      }
    } catch (err) {
      toast.error('Gagal memuat detail data moodboard');
      navigate('/dashboard/moodboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [orderId]);

  const handleUploadKasar = async (filesToUpload: FileList) => {
    if (!moodboard || !filesToUpload || filesToUpload.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('moodboard_id', moodboard.id.toString());
    for (let i = 0; i < filesToUpload.length; i++) {
      formData.append('moodboard_kasar[]', filesToUpload[i]);
    }

    try {
      await api.post('/moodboards/upload-kasar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('File desain kasar berhasil diunggah');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus file ini?')) return;
    try {
      await api.delete(`/moodboards/files/${fileId}`);
      toast.success('File berhasil dihapus');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus file');
    }
  };

  const handleReplaceFileClick = (fileId: number) => {
    setReplacingFileId(fileId);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingFileId || !moodboard) return;

    setIsUploading(true);
    try {
      // 1. Delete the old file
      await api.delete(`/moodboards/files/${replacingFileId}`);
      
      // 2. Upload the new file
      const formData = new FormData();
      formData.append('moodboard_id', moodboard.id.toString());
      formData.append('moodboard_kasar[]', file);

      await api.post('/moodboards/upload-kasar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('File berhasil diganti');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengganti file');
    } finally {
      setIsUploading(false);
      setReplacingFileId(null);
      if (e.target) e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-semibold text-xs">
        <Loader2 className="w-8 h-8 animate-spin rounded-full text-teal-500 mr-2" />
        Memuat editor moodboard...
      </div>
    );
  }

  if (!order || !moodboard) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <p className="text-gray-500 text-sm font-bold">Data tidak ditemukan</p>
        <Button onClick={() => navigate('/dashboard/moodboard')} className="mt-4 bg-teal-500 text-white">Kembali</Button>
      </div>
    );
  }

  const kasarFiles = moodboard.files?.filter(f => f.file_type === 'kasar') || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-5">
        <button
          onClick={() => navigate('/dashboard/moodboard')}
          className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
        >
          <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Moodboard
        </button>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
            Upload & Edit Desain Kasar: {order.nama_project}
          </h1>
          <span className="font-mono text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-0.5 rounded-full">
            {order.nomor_order}
          </span>
        </div>
        <p className="text-xs text-gray-500 font-medium">
          Customer: <span className="font-bold text-gray-700">{order.nama_customer}</span>
        </p>
      </div>

      {/* Revision notes banner if status is revisi */}
      {moodboard.status === 'revisi' && moodboard.notes && (
        <Card className="border border-red-100 bg-red-50/20 rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5 animate-bounce" size={16} />
            <div className="space-y-1">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">Catatan Revisi dari Client / PM</span>
              <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap">{moodboard.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden input for replacing files */}
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: Upload zone & List (span 2) */}
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <CardTitle className="text-sm font-extrabold text-gray-800">
                Kelola Berkas Desain Kasar
              </CardTitle>
              <CardDescription className="text-[10px] text-gray-500">
                Mendukung SKP, CAD (DWG/DXF), PDF, PNG, JPG, dan format gambar lainnya tanpa batas ukuran.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Upload Zone */}
              <div 
                className="border-2 border-dashed border-gray-100 hover:border-teal-400 rounded-2xl p-8 text-center cursor-pointer transition-colors relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleUploadKasar(e.target.files);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="mx-auto text-teal-500 animate-spin" size={32} />
                    <span className="block font-bold text-xs text-teal-600">Sedang mengunggah berkas...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-gray-300" size={32} />
                    <span className="block font-bold text-xs text-gray-700">Tarik file ke sini atau klik untuk memilih</span>
                    <span className="block text-[9px] text-gray-400">Anda dapat memilih beberapa file sekaligus</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-50 my-6" />

              {/* List of files */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-gray-800">
                    Berkas Terunggah ({kasarFiles.length})
                  </h3>
                  <span className="text-[9px] font-bold text-gray-400">
                    Total: {kasarFiles.length} file
                  </span>
                </div>

                {kasarFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50/30 rounded-xl border border-dashed border-gray-100">
                    Belum ada file desain kasar yang diunggah
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {kasarFiles.map((file, idx) => (
                      <div key={file.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/20 hover:bg-teal-50/5 hover:border-teal-100 transition-all space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-500 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-700 block truncate">Opsi #{idx + 1}: {file.original_name}</span>
                                {file.status === 'revisi' && (
                                  <span className="text-[8px] font-bold bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full shrink-0">BUTUH REVISI</span>
                                )}
                                {file.status === 'approved' && (
                                  <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">SETUJU</span>
                                )}
                                {file.status === 'pending' && (
                                  <span className="text-[8px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full shrink-0">PENDING</span>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5">
                                Diunggah pada: {new Date(file.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Replace File Button */}
                            <button
                              type="button"
                              onClick={() => handleReplaceFileClick(file.id)}
                              disabled={isUploading}
                              className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Ganti File"
                            >
                              <RefreshCw size={14} className={isUploading && replacingFileId === file.id ? 'animate-spin' : ''} />
                            </button>
                            {/* Delete File Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={isUploading}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus File"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {file.status === 'revisi' && file.revisi && (
                          <div className="p-3 rounded-lg bg-red-50/50 border border-red-100/50 text-[11px] text-red-700 leading-relaxed font-medium">
                            <span className="font-extrabold text-[9px] text-red-600 uppercase tracking-wider block mb-0.5">Catatan PM:</span>
                            {file.revisi}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Proyek Summary & Guidelines */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <CardTitle className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                Panduan Desainer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-gray-500 space-y-3 leading-relaxed">
              <p>
                Silakan upload opsi moodboard / sketsa kasar. Format yang didukung adalah format gambar (.jpg, .png) untuk visualisasi langsung, serta file teknis / desain (.skp, .cad, .dwg, .dxf) agar dapat diunduh oleh estimator.
              </p>
              <div className="border-t border-gray-50 my-1" />
              <p className="font-semibold text-gray-600">
                Mengapa harus multiple files?
              </p>
              <p>
                Memberikan opsi desain yang bervariasi membantu client memilih konsep terbaik yang sesuai dengan selera mereka.
              </p>
              <div className="border-t border-gray-50 my-1" />
              <p className="font-semibold text-teal-600">
                Langkah berikutnya:
              </p>
              <p>
                Setelah Anda selesai mengunggah file-file ini, estimator akan mengunggah Rencana Anggaran Biaya (RAB) yang sesuai untuk masing-masing opsi di halaman Estimasi.
              </p>
            </CardContent>
          </Card>

          <Button
            onClick={() => navigate('/dashboard/moodboard')}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-teal-500/10"
          >
            Selesai & Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}
