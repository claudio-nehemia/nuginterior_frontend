import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { 
  ChevronLeft, Upload, Trash2, AlertCircle, Loader2, 
  Check, FileImage, MessageSquare, ShieldAlert
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
}

interface Survey {
  id: number;
  order_id: number;
  survey_ulang_team_ids?: any;
}

interface GambarKerjaFile {
  id: number;
  file_path: string;
  original_name: string;
  status: 'pending' | 'revisi' | 'approved';
  revisi?: string;
  created_at: string;
}

interface GambarKerja {
  id: number;
  order_id: number;
  status: 'pending' | 'uploaded' | 'revisi' | 'approved';
  revisi_general?: string;
  files: GambarKerjaFile[];
}

export default function GambarKerjaDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentUser = useAuthStore(state => state.user);

  const [order, setOrder] = useState<Order | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [gambarKerja, setGambarKerja] = useState<GambarKerja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Revision per file dialog states
  const [reviseFileDialogOpen, setReviseFileDialogOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [fileRevisionNotes, setFileRevisionNotes] = useState('');

  // General revision states
  const [reviseGeneralDialogOpen, setReviseGeneralDialogOpen] = useState(false);
  const [generalRevisionNotes, setGeneralRevisionNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const getFileUrl = (path: string) => {
    if (!path) return '';
    return `${API_BASE_URL}${path}`;
  };

  const fetchDetails = async () => {
    try {
      // Load order details
      const orderRes = await api.get(`/orders/${orderId}`);
      setOrder(orderRes.data.data);

      // Load survey details to check survey ulang team
      const surveyRes = await api.get('/surveys');
      const allSurveys: Survey[] = surveyRes.data.data || [];
      const matchedSurvey = allSurveys.find(s => s.order_id === Number(orderId));
      if (matchedSurvey) {
        setSurvey(matchedSurvey);
      }

      // Load working drawing details
      const gkRes = await api.get(`/gambar-kerja`);
      const allGk: GambarKerja[] = gkRes.data.data || [];
      const matchedGk = allGk.find(g => g.order_id === Number(orderId));
      if (matchedGk) {
        setGambarKerja(matchedGk);
      } else {
        // Auto initialize if not found
        const initRes = await api.post(`/gambar-kerja/${orderId}/response`);
        setGambarKerja(initRes.data.data);
      }
    } catch {
      toast.error('Gagal memuat detail data gambar kerja');
      navigate('/dashboard/gambar-kerja');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [orderId]);

  // Check upload permission
  const canUpload = (() => {
    if (!currentUser) return false;
    // Anyone with moodboard.update (Admin, Owner, Super Admin, etc.) can upload
    if (currentUser.permissions?.includes('moodboard.update')) return true;

    // Fallback: check if user is in survey ulang team
    if (!survey || !survey.survey_ulang_team_ids) return false;
    try {
      const teamIDs = typeof survey.survey_ulang_team_ids === 'string'
        ? JSON.parse(survey.survey_ulang_team_ids)
        : survey.survey_ulang_team_ids;
      return Array.isArray(teamIDs) && teamIDs.includes(currentUser.id);
    } catch {
      return false;
    }
  })();

  // Check review/approve permission
  const canApprove = (() => {
    if (!currentUser) return false;
    return currentUser.permissions?.includes('moodboard.update');
  })();

  const handleUploadFiles = async (filesToUpload: FileList | null) => {
    if (!gambarKerja || !filesToUpload || filesToUpload.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('order_id', orderId || '');
    for (let i = 0; i < filesToUpload.length; i++) {
      formData.append('gambar_kerja[]', filesToUpload[i]);
    }

    try {
      await api.post('/gambar-kerja/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Berkas gambar kerja berhasil diunggah');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah berkas');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus gambar kerja ini?')) return;
    try {
      await api.delete(`/gambar-kerja/files/${fileId}`);
      toast.success('Gambar berhasil dihapus');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus gambar');
    }
  };

  const openReviseFileDialog = (fileId: number) => {
    setSelectedFileId(fileId);
    setFileRevisionNotes('');
    setReviseFileDialogOpen(true);
  };

  const handleSaveFileRevision = async () => {
    if (!selectedFileId || !fileRevisionNotes.trim()) return;
    setIsActionLoading(true);
    try {
      await api.post(`/gambar-kerja/files/${selectedFileId}/revise`, {
        file_id: selectedFileId,
        notes: fileRevisionNotes
      });
      // also trigger overall revision status
      if (gambarKerja) {
        await api.post(`/gambar-kerja/${gambarKerja.id}/revise-general`, {
          notes: `Terdapat revisi pada gambar kerja: ${fileRevisionNotes}`
        });
      }
      toast.success('Catatan revisi berkas berhasil disimpan');
      setReviseFileDialogOpen(false);
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan revisi');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveAll = async () => {
    if (!gambarKerja) return;
    if (!window.confirm('Apakah Anda yakin menyetujui seluruh Gambar Kerja ini?')) return;
    setIsActionLoading(true);
    try {
      await api.post(`/gambar-kerja/${gambarKerja.id}/approve`);
      toast.success('Seluruh gambar kerja berhasil disetujui');
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui gambar kerja');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveGeneralRevision = async () => {
    if (!gambarKerja || !generalRevisionNotes.trim()) return;
    setIsActionLoading(true);
    try {
      await api.post(`/gambar-kerja/${gambarKerja.id}/revise-general`, {
        notes: generalRevisionNotes
      });
      toast.success('Revisi general berhasil dikirim');
      setReviseGeneralDialogOpen(false);
      await fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim revisi general');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-semibold text-xs">
        <Loader2 className="w-8 h-8 animate-spin rounded-full text-teal-500 mr-2" />
        Memuat editor gambar kerja...
      </div>
    );
  }

  if (!order || !gambarKerja) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <p className="text-gray-500 text-sm font-bold">Data tidak ditemukan</p>
        <Button onClick={() => navigate('/dashboard/gambar-kerja')} className="mt-4 bg-teal-500 text-white">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-5">
        <button
          onClick={() => navigate('/dashboard/gambar-kerja')}
          className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
        >
          <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Daftar
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
                Review & Upload Gambar Kerja: {order.nama_project}
              </h1>
              <span className="font-mono text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-0.5 rounded-full">
                {order.nomor_order}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Customer: <span className="font-bold text-gray-700">{order.nama_customer}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {canApprove && (
              <>
                <Button
                  onClick={() => {
                    setGeneralRevisionNotes('');
                    setReviseGeneralDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-9 text-xs rounded-xl"
                  disabled={isActionLoading || gambarKerja.status === 'approved'}
                >
                  <MessageSquare size={13} className="mr-1" /> General Revisi
                </Button>
                <Button
                  onClick={handleApproveAll}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                  disabled={isActionLoading || gambarKerja.status === 'approved'}
                >
                  <Check size={13} className="mr-1" /> Approve Gambar Kerja
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* General revision notes banner if status is revisi */}
      {gambarKerja.status === 'revisi' && gambarKerja.revisi_general && (
        <Card className="border border-red-100 bg-red-50/20 rounded-2xl overflow-hidden shadow-none">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5 animate-bounce" size={16} />
            <div className="space-y-1">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">Catatan General Revisi</span>
              <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap">{gambarKerja.revisi_general}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Area (Span 1) */}
        <div className="space-y-4">
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-800 tracking-tight flex items-center gap-1.5">
                <Upload size={14} className="text-teal-500" /> Area Upload Gambar
              </h3>
              
              {canUpload ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-100 rounded-2xl p-6 bg-teal-50/5 hover:bg-teal-50/10 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={e => handleUploadFiles(e.target.files)}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                      <p className="text-[10px] font-bold text-teal-600 mt-1">Mengunggah file...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="text-teal-400 group-hover:scale-115 transition-transform" size={24} />
                      <p className="text-xs font-bold text-gray-700">Pilih berkas gambar kerja</p>
                      <p className="text-[9px] text-gray-400">Dapat mengunggah banyak opsi cetakan gambar sekaligus</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5 text-gray-500 text-xs">
                  <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-semibold">
                    Akses upload dinonaktifkan. Hanya tim survey ulang Drafter, Desainer, PM terpilih, atau Super Admin yang dapat menambahkan gambar kerja.
                  </p>
                </div>
              )}

              <div className="border-t border-gray-50 pt-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">Status Gambar Kerja:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    gambarKerja.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    gambarKerja.status === 'revisi' ? 'bg-red-50 text-red-600 border border-red-100' :
                    gambarKerja.status === 'uploaded' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    {gambarKerja.status === 'uploaded' ? 'Menunggu Review' : gambarKerja.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">Total Gambar:</span>
                  <span className="text-gray-700 font-bold">{gambarKerja.files?.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Files Area (Span 2) */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-800 tracking-tight flex items-center gap-1.5">
                <FileImage size={14} className="text-teal-500" /> Hasil Berkas Gambar Kerja
              </h3>

              {!gambarKerja.files || gambarKerja.files.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic text-xs font-medium border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                  Belum ada berkas gambar kerja diunggah.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gambarKerja.files.map(file => (
                    <div 
                      key={file.id} 
                      className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col group/item hover:border-teal-200 transition-colors"
                    >
                      <a 
                        href={getFileUrl(file.file_path)}
                        target="_blank" 
                        rel="noreferrer"
                        className="relative aspect-video w-full bg-gray-50 overflow-hidden block"
                      >
                        <img 
                          src={getFileUrl(file.file_path)} 
                          alt={file.original_name} 
                          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                          Buka Gambar
                        </div>
                      </a>

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-700 truncate" title={file.original_name}>
                            {file.original_name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              file.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                              file.status === 'revisi' ? 'bg-red-50 text-red-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {file.status}
                            </span>
                          </div>
                        </div>

                        {file.status === 'revisi' && file.revisi && (
                          <div className="p-2.5 rounded-xl bg-red-50/30 border border-red-100 text-[10px] font-semibold text-red-700 leading-relaxed">
                            <span className="font-extrabold block text-[8px] uppercase tracking-wider text-red-500 mb-0.5">Catatan Revisi:</span>
                            {file.revisi}
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-gray-50 pt-2 gap-2 mt-auto">
                          {canApprove ? (
                            <Button
                              onClick={() => openReviseFileDialog(file.id)}
                              variant="outline"
                              className="h-7 px-2.5 text-[10px] font-bold border-red-100 text-red-600 hover:bg-red-50 rounded-lg"
                              disabled={isActionLoading || gambarKerja.status === 'approved'}
                            >
                              Beri Catatan Revisi
                            </Button>
                          ) : (
                            <div />
                          )}

                          {canUpload && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── MODAL: CATATAN REVISI FILE ────────────────────────────────── */}
      <Dialog open={reviseFileDialogOpen} onOpenChange={setReviseFileDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-gray-800">Beri Masukan Revisi Gambar</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <textarea
              placeholder="Jelaskan bagian mana dari gambar ini yang perlu direvisi/diperbaiki..."
              value={fileRevisionNotes}
              onChange={e => setFileRevisionNotes(e.target.value)}
              className="w-full min-h-[100px] p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-teal-400/20 text-gray-700 font-medium resize-none outline-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviseFileDialogOpen(false)}
              className="h-9 rounded-xl font-bold text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveFileRevision}
              disabled={isActionLoading || !fileRevisionNotes.trim()}
              className="h-9 rounded-xl font-bold text-xs bg-red-500 hover:bg-red-600 text-white px-4"
            >
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: REVISI GENERAL ─────────────────────────────────────── */}
      <Dialog open={reviseGeneralDialogOpen} onOpenChange={setReviseGeneralDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-gray-800">Kirim Catatan Revisi General</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <textarea
              placeholder="Tuliskan instruksi revisi umum untuk seluruh Gambar Kerja ini..."
              value={generalRevisionNotes}
              onChange={e => setGeneralRevisionNotes(e.target.value)}
              className="w-full min-h-[120px] p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-teal-400/20 text-gray-700 font-medium resize-none outline-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviseGeneralDialogOpen(false)}
              className="h-9 rounded-xl font-bold text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveGeneralRevision}
              disabled={isActionLoading || !generalRevisionNotes.trim()}
              className="h-9 rounded-xl font-bold text-xs bg-red-500 hover:bg-red-600 text-white px-4"
            >
              Kirim Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
