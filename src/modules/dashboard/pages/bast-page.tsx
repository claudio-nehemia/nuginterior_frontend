import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, CheckCircle2, Upload, X, Loader2, FileText,
  AlertTriangle, Download, BadgeCheck, Lock, ShieldCheck,
  ImageIcon, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  alamat: string;
}

interface Workplan {
  id: number;
  order_id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  order?: Order;
  stages?: { id: number; status: string }[];
  bast_photo: string;
  bast_generated_at: string | null;
  bast_generated_by: string;
  is_fully_paid: boolean;
}

export default function BastPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [workplan, setWorkplan] = useState<Workplan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bastPhoto, setBastPhoto] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const backendHost = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : '';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/workplans/order/${orderId}`);
      const wp: Workplan = res.data.data;
      setWorkplan(wp);
      if (wp.bast_photo) setBastPhoto(wp.bast_photo);
    } catch {
      toast.error('Gagal memuat data proyek');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchData();
  }, [orderId]);

  const allStagesCompleted = () => {
    if (!workplan?.stages || workplan.stages.length === 0) return false;
    return workplan.stages.every(s => s.status === 'completed');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data?.url) {
        setBastPhoto(res.data.data.url);
        toast.success('Foto BAST berhasil diunggah');
      }
    } catch {
      toast.error('Gagal mengunggah foto');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmitBast = async () => {
    if (!workplan) return;
    if (!bastPhoto) {
      toast.error('Wajib mengunggah foto BAST terlebih dahulu');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post(`/workplans/${workplan.id}/bast`, {
        bast_photo: bastPhoto,
      });
      setWorkplan(res.data.data);
      toast.success('Data BAST berhasil disimpan');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan BAST');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!workplan) return;
    setIsGenerating(true);
    try {
      const res = await api.get(`/workplans/${workplan.id}/bast/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BAST_${workplan.order?.nomor_order || workplan.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF BAST berhasil diunduh');
    } catch (err: any) {
      // Try to parse blob error message
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Gagal men-generate PDF BAST');
        } catch {
          toast.error('Gagal men-generate PDF BAST');
        }
      } else {
        toast.error(err.response?.data?.message || 'Gagal men-generate PDF BAST');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-sm text-muted-foreground">Memuat data BAST...</span>
      </div>
    );
  }

  if (!workplan || !workplan.order) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-red-600">Data Tidak Ditemukan</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const order = workplan.order;
  const stagesCompleted = allStagesCompleted();
  const bastAlreadySaved = !!workplan.bast_generated_at;
  const canGenerate = workplan.is_fully_paid && bastAlreadySaved && bastPhoto;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-teal-100/50 pb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/dashboard/project-management/${orderId}`)}
          className="border-teal-200 text-teal-700 hover:bg-teal-50 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-teal-900 dark:text-teal-100 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            Berita Acara Serah Terima (BAST)
          </h1>
          <p className="text-xs text-muted-foreground">
            {order.nama_project} — {order.nomor_order} | Customer: {order.nama_customer}
          </p>
        </div>
      </div>

      {/* Stage completion check */}
      {!stagesCompleted && (
        <Card className="p-4 border-amber-200 dark:border-amber-900 bg-amber-50/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">
                Belum Semua Tahapan Selesai
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                BAST hanya dapat diproses setelah seluruh tahapan pengerjaan berstatus <strong>Completed</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment check */}
      {stagesCompleted && !workplan.is_fully_paid && (
        <Card className="p-4 border-rose-200 dark:border-rose-900 bg-rose-50/20">
          <div className="flex items-start gap-3">
            <Lock className="text-rose-500 h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">
                Pembayaran Belum Lunas
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate PDF BAST akan ter-unlock setelah <strong>semua termin invoice</strong> berstatus lunas.
                Silakan selesaikan pembayaran terlebih dahulu di menu <strong>Invoice</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* All paid banner */}
      {workplan.is_fully_paid && (
        <Card className="p-4 border-emerald-200 dark:border-emerald-900 bg-emerald-50/20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-500 h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
              Semua termin pembayaran telah lunas. Generate BAST tersedia!
            </p>
          </div>
        </Card>
      )}

      {/* Already generated banner */}
      {bastAlreadySaved && (
        <Card className="p-4 border-teal-200 dark:border-teal-900 bg-teal-50/20">
          <div className="flex items-start gap-3">
            <BadgeCheck className="text-teal-500 h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-teal-800 dark:text-teal-300">BAST Sudah Disimpan</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disimpan oleh <strong>{workplan.bast_generated_by}</strong> pada{' '}
                <strong>
                  {workplan.bast_generated_at
                    ? new Date(workplan.bast_generated_at).toLocaleString('id-ID')
                    : '-'}
                </strong>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Info Card */}
        <Card className="p-5 border-teal-100 dark:border-teal-900 bg-teal-50/10 space-y-4">
          <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide border-b border-teal-100 dark:border-teal-900 pb-2">
            Informasi Proyek
          </h3>
          <div className="space-y-2.5 text-xs">
            {[
              ['Nama Proyek', order.nama_project],
              ['Nomor Order', order.nomor_order],
              ['Jenis Interior', order.jenis_interior],
              ['Customer', order.nama_customer],
              ['Alamat', order.alamat],
              [
                'Tanggal Proyek',
                `${workplan.start_date ? new Date(workplan.start_date).toLocaleDateString('id-ID') : '-'} s/d ${workplan.end_date ? new Date(workplan.end_date).toLocaleDateString('id-ID') : '-'}`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{label}:</span>
                <span className="font-semibold text-right text-teal-900 dark:text-teal-100">{value}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-teal-100 dark:border-teal-900">
            <div className="flex items-center gap-2">
              {stagesCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className={`text-xs font-semibold ${stagesCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {stagesCompleted ? 'Semua tahapan selesai' : 'Belum semua tahapan selesai'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {workplan.is_fully_paid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Lock className="h-4 w-4 text-rose-500" />
              )}
              <span className={`text-xs font-semibold ${workplan.is_fully_paid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {workplan.is_fully_paid ? 'Pembayaran lunas' : 'Pembayaran belum lunas'}
              </span>
            </div>
          </div>
        </Card>

        {/* Photo Upload Card */}
        <Card className="p-5 border-teal-100 dark:border-teal-900 space-y-4">
          <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide border-b border-teal-100 dark:border-teal-900 pb-2">
            Foto BAST
          </h3>

          {bastPhoto ? (
            <div className="relative group rounded-xl overflow-hidden border border-teal-200 dark:border-teal-800 shadow-sm">
              <img
                src={bastPhoto.startsWith('http') ? bastPhoto : `${backendHost}${bastPhoto}`}
                alt="Foto BAST"
                className="w-full h-52 object-cover"
              />
              <button
                onClick={() => setBastPhoto('')}
                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                title="Hapus foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Foto BAST diunggah
                </span>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-52 border-2 border-dashed border-teal-200 dark:border-teal-700 rounded-xl cursor-pointer hover:bg-teal-50/30 transition-colors group">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
                  <span className="mt-2 text-xs text-muted-foreground">Mengunggah...</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-teal-300 group-hover:text-teal-500 transition-colors" />
                  <span className="mt-2 text-sm font-semibold text-teal-700 dark:text-teal-300">Klik untuk upload foto BAST</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — maks. 5 MB</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />
            </label>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            Upload foto dokumentasi serah terima proyek. Foto ini akan menjadi bukti resmi bahwa pekerjaan telah diserah-terimakan kepada customer.
          </p>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="p-5 border-teal-100 dark:border-teal-900 bg-teal-50/10">
        <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide mb-4">
          Aksi BAST
        </h3>
        <div className="flex flex-wrap gap-3">
          {/* Save BAST data */}
          <Button
            onClick={handleSubmitBast}
            disabled={isSubmitting || !bastPhoto || !stagesCompleted}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center gap-2 px-5 h-10 disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
            ) : (
              <><FileText className="h-4 w-4" /> Simpan Data BAST</>
            )}
          </Button>

          {/* Generate PDF */}
          <div className="relative">
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating || !canGenerate}
              className={`font-semibold text-sm flex items-center gap-2 px-5 h-10 transition-all ${
                canGenerate
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              title={
                !bastAlreadySaved
                  ? 'Simpan data BAST terlebih dahulu'
                  : !workplan.is_fully_paid
                  ? 'Pembayaran belum lunas'
                  : 'Generate PDF BAST'
              }
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <>
                  {!workplan.is_fully_paid ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  Generate PDF BAST
                </>
              )}
            </Button>
            {!workplan.is_fully_paid && (
              <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full shadow">
                LOCKED
              </span>
            )}
          </div>
        </div>

        {/* Info text */}
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          {!stagesCompleted && (
            <p className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              Simpan BAST membutuhkan semua tahapan proyek selesai.
            </p>
          )}
          {!bastAlreadySaved && stagesCompleted && (
            <p className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              Upload foto & simpan data BAST sebelum dapat generate PDF.
            </p>
          )}
          {!workplan.is_fully_paid && (
            <p className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              PDF BAST terkunci sampai semua termin invoice dilunasi.
            </p>
          )}
        </div>
      </Card>

      {/* What's in PDF section */}
      <Card className="p-5 border-teal-100 dark:border-teal-900">
        <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide mb-3">
          Isi PDF BAST yang akan di-generate
        </h3>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {[
            'Kop surat dengan logo dan identitas perusahaan',
            'Judul: Berita Acara Serah Terima Pekerjaan',
            'Informasi Pihak Pertama (Nuginterior) dan Pihak Kedua (Customer)',
            'Pernyataan serah terima lengkap dengan nama proyek dan nomor order',
            'Kolom tanda tangan kedua belah pihak',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
