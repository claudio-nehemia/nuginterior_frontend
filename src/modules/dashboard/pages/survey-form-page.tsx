import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, API_BASE_URL } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, ClipboardCheck, Upload, X, Plus, Calendar, MapPin, User, Tag, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceInput } from '@/components/voice-input';

interface UserItem {
  id: number;
  name: string;
  role?: { nama_role: string };
}

interface JenisPengukuran {
  id: number;
  nama_pengukuran: string;
}

interface PengukuranForm {
  jenis_pengukuran_id: number | null;
  nama_pengukuran: string;
  nama_custom: string;
  checked: boolean;
  notes: string;
  panjang: number;
  lebar: number;
  tinggi: number;
  has_lebar: boolean;
  has_tinggi: boolean;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'dijadwalkan', label: 'Dijadwalkan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'batal', label: 'Batal' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  dijadwalkan: 'bg-blue-50 text-blue-600 border-blue-100',
  selesai: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  batal: 'bg-red-50 text-red-400 border-red-100',
};

/** Simple info row used inside the info card */
function InfoRow({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-teal-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        {badge ?? (
          <p className="text-xs font-semibold text-gray-700 truncate">{value || '-'}</p>
        )}
      </div>
    </div>
  );
}

export default function SurveyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<{
    nama_project: string;
    nama_customer: string;
    nama_perusahaan: string;
    alamat: string;
    jenis_interior?: string;
  } | null>(null);

  const [form, setForm] = useState({
    order_id: '',
    tanggal_survey: '',
    lokasi: '',
    catatan: '',
    status: 'pending',
    surveyor_id: '',
  });

  const [layoutFiles, setLayoutFiles] = useState<string[]>([]);
  const [fotoLokasi, setFotoLokasi] = useState<string[]>([]);
  const [momFiles, setMomFiles] = useState<string[]>([]);

  const [pengukuranItems, setPengukuranItems] = useState<PengukuranForm[]>([]);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customModalName, setCustomModalName] = useState('');
  const customModalInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingLayout, setIsUploadingLayout] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingMom, setIsUploadingMom] = useState(false);

  const getFileUrl = (path: string) => {
    if (!path) return '';
    return `${API_BASE_URL}${path}`;
  };

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data || [])).catch(() => {});
    api.get('/auth/me').then(r => setCurrentUser(r.data.data)).catch(() => {});

    if (!isEdit) {
      api.get('/jenis-pengukuran').then(r => {
        const list: JenisPengukuran[] = r.data.data || [];
        setPengukuranItems(list.map(j => ({
          jenis_pengukuran_id: j.id,
          nama_pengukuran: j.nama_pengukuran,
          nama_custom: '',
          checked: false,
          notes: '',
          panjang: 0,
          lebar: 0,
          tinggi: 0,
          has_lebar: false,
          has_tinggi: false,
        })));
      }).catch(() => {});
    } else {
      api.get(`/surveys/${id}`).then(r => {
        const d = r.data.data;
        setForm({
          order_id: String(d.order_id),
          tanggal_survey: d.tanggal_survey?.split('T')[0] || '',
          lokasi: d.lokasi || '',
          catatan: d.catatan || '',
          status: d.status || 'pending',
          surveyor_id: d.surveyor_id ? String(d.surveyor_id) : '',
        });

        if (d.order) {
          setSelectedOrderInfo({
            nama_project: d.order.nama_project,
            nama_customer: d.order.nama_customer,
            nama_perusahaan: d.order.nama_perusahaan,
            alamat: d.order.alamat || '',
            jenis_interior: d.order.jenis_interior || '',
          });
        }

        if (d.layout_files) {
          try {
            const parsed = typeof d.layout_files === 'string' ? JSON.parse(d.layout_files) : d.layout_files;
            if (Array.isArray(parsed)) setLayoutFiles(parsed);
          } catch { setLayoutFiles([]); }
        }
        if (d.foto_lokasi) {
          try {
            const parsed = typeof d.foto_lokasi === 'string' ? JSON.parse(d.foto_lokasi) : d.foto_lokasi;
            if (Array.isArray(parsed)) setFotoLokasi(parsed);
          } catch { setFotoLokasi([]); }
        }
        if (d.mom_files) {
          try {
            const parsed = typeof d.mom_files === 'string' ? JSON.parse(d.mom_files) : d.mom_files;
            if (Array.isArray(parsed)) setMomFiles(parsed);
          } catch { setMomFiles([]); }
        } else if (d.mom_file) {
          setMomFiles([d.mom_file]);
        }

        api.get('/jenis-pengukuran').then(jpRes => {
          const jList: JenisPengukuran[] = jpRes.data.data || [];
          const dbPengukuran = d.pengukuran || [];

          const masterItems = jList.map(j => {
            const match = dbPengukuran.find((p: any) => p.jenis_pengukuran_id === j.id);
            return {
              jenis_pengukuran_id: j.id,
              nama_pengukuran: j.nama_pengukuran,
              nama_custom: '',
              checked: match ? match.checked : false,
              notes: match ? match.notes || '' : '',
              panjang: match ? match.panjang || 0 : 0,
              lebar: match ? match.lebar || 0 : 0,
              tinggi: match ? match.tinggi || 0 : 0,
              has_lebar: match ? match.has_lebar : false,
              has_tinggi: match ? match.has_tinggi : false,
            };
          });

          const customItems = dbPengukuran
            .filter((p: any) => !p.jenis_pengukuran_id)
            .map((c: any) => ({
              jenis_pengukuran_id: null,
              nama_pengukuran: c.nama_custom || c.nama_pengukuran || 'Kustom',
              nama_custom: c.nama_custom || c.nama_pengukuran || 'Kustom',
              checked: c.checked,
              notes: c.notes || '',
              panjang: c.panjang || 0,
              lebar: c.lebar || 0,
              tinggi: c.tinggi || 0,
              has_lebar: c.has_lebar,
              has_tinggi: c.has_tinggi,
            }));

          setPengukuranItems([...masterItems, ...customItems]);
        }).catch(() => {});
      }).catch(() => toast.error('Gagal memuat data survey'));
    }
  }, [id, isEdit]);

  const handleFileUpload = async (files: FileList | null, type: 'layout' | 'photo' | 'mom') => {
    if (!files || files.length === 0) return;
    if (type === 'layout') setIsUploadingLayout(true);
    if (type === 'photo') setIsUploadingPhoto(true);
    if (type === 'mom') setIsUploadingMom(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const url = res.data?.data?.url;
        if (url) urls.push(url);
      }
      if (type === 'layout') { setLayoutFiles(p => [...p, ...urls]); toast.success(`${files.length} file layout berhasil diunggah`); }
      else if (type === 'photo') { setFotoLokasi(p => [...p, ...urls]); toast.success(`${files.length} foto lokasi berhasil diunggah`); }
      else if (type === 'mom') { setMomFiles(p => [...p, ...urls]); toast.success(`${files.length} berkas MoM berhasil diunggah`); }
    } catch {
      toast.error('Gagal mengunggah file. Pastikan server aktif.');
    } finally {
      setIsUploadingLayout(false);
      setIsUploadingPhoto(false);
      setIsUploadingMom(false);
    }
  };

  const handleAddCustomItem = () => {
    const name = customModalName.trim();
    if (!name) { toast.error('Nama jenis pengukuran kustom tidak boleh kosong'); return; }
    if (pengukuranItems.some(item => item.nama_pengukuran.toLowerCase() === name.toLowerCase())) {
      toast.error('Jenis pengukuran ini sudah ada dalam checklist'); return;
    }
    setPengukuranItems(prev => [...prev, {
      jenis_pengukuran_id: null,
      nama_pengukuran: name, nama_custom: name,
      checked: true, notes: '',
      panjang: 0, lebar: 0, tinggi: 0,
      has_lebar: false, has_tinggi: false,
    }]);
    setCustomModalName('');
    setCustomModalOpen(false);
    toast.success('Pengukuran kustom ditambahkan');
  };

  const handleRemoveCustomItem = (index: number) => {
    setPengukuranItems(prev => prev.filter((_, idx) => idx !== index));
    toast.info('Pengukuran kustom dihapus');
  };

  const toggleChecked = (index: number, checked: boolean) =>
    setPengukuranItems(prev => prev.map((item, idx) => idx === index ? { ...item, checked } : item));

  const updateNotes = (index: number, notes: string) =>
    setPengukuranItems(prev => prev.map((item, idx) => idx === index ? { ...item, notes } : item));

  const updateDimension = (index: number, field: 'panjang' | 'lebar' | 'tinggi', val: number) =>
    setPengukuranItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));

  const toggleDimension = (index: number, field: 'lebar' | 'tinggi') =>
    setPengukuranItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const key = field === 'lebar' ? 'has_lebar' : 'has_tinggi';
      return { ...item, [key]: !item[key], [field]: item[key] ? 0 : item[field] };
    }));

  const getSurveyorName = () => {
    if (form.surveyor_id) {
      const u = users.find(x => String(x.id) === form.surveyor_id);
      if (u) return u.name;
    }
    return currentUser?.name || '–';
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.order_id) { toast.error('Silakan pilih order terlebih dahulu'); return; }
    setIsSaving(true);
    const payload = {
      order_id: Number(form.order_id),
      tanggal_survey: form.tanggal_survey || null,
      lokasi: selectedOrderInfo?.alamat || form.lokasi,
      catatan: form.catatan,
      status: form.status,
      surveyor_id: form.surveyor_id ? Number(form.surveyor_id) : (currentUser?.id || null),
      layout_files: layoutFiles,
      foto_lokasi: fotoLokasi,
      mom_file: momFiles.length > 0 ? momFiles[0] : '',
      mom_files: momFiles,
      pengukuran: pengukuranItems.map(p => ({
        jenis_pengukuran_id: p.jenis_pengukuran_id,
        nama_custom: p.nama_custom,
        checked: p.checked,
        notes: p.notes,
        panjang: Number(p.panjang) || 0,
        lebar: Number(p.lebar) || 0,
        tinggi: Number(p.tinggi) || 0,
        has_lebar: p.has_lebar,
        has_tinggi: p.has_tinggi,
      })),
    };
    try {
      if (isEdit) {
        await api.put(`/surveys/${id}`, payload);
        toast.success('Survey berhasil disimpan');
      } else {
        await api.post('/surveys', payload);
        toast.success('Survey berhasil dibuat');
      }
      navigate('/dashboard/survey');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan survey');
    } finally {
      setIsSaving(false);
    }
  };

  // ── File card renderer (shared) ──────────────────────────────────────────
  const renderFileList = (
    files: string[],
    onRemove: (idx: number) => void,
  ) =>
    files.length > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {files.map((url, idx) => {
          const name = url.substring(url.lastIndexOf('/') + 1);
          const isImg = /\.(jpg|jpeg|png|webp)$/i.test(url);
          return (
            <div key={idx} className="relative border border-gray-100 rounded-xl p-2.5 bg-white flex items-center gap-3 shadow-[0_2px_8px_rgb(0,0,0,0.01)] hover:border-teal-200 transition-colors">
              {isImg ? (
                <img src={getFileUrl(url)} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-teal-50 text-teal-600 flex items-center justify-center rounded-lg border border-teal-100 font-extrabold text-[10px] uppercase shrink-0">
                  {name.split('.').pop() || 'FILE'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-700 truncate">{name}</p>
                <a href={getFileUrl(url)} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-teal-500 hover:underline">
                  Lihat / Unduh
                </a>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    );

  const UploadZone = ({ uploading, onChange, accept }: { uploading: boolean; onChange: (f: FileList | null) => void; accept: string }) => (
    <div className="border-2 border-dashed border-teal-100 rounded-2xl p-6 bg-teal-50/5 hover:bg-teal-50/10 transition-colors flex flex-col items-center justify-center relative cursor-pointer group">
      <input type="file" multiple accept={accept} onChange={e => onChange(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
      <div className="flex flex-col items-center gap-1.5 text-center">
        {uploading ? (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-teal-600">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="text-teal-400 group-hover:text-teal-500 group-hover:scale-110 transition-transform" size={24} />
            <p className="text-xs font-bold text-gray-700">Tarik berkas atau klik untuk mengupload</p>
            <p className="text-[10px] text-gray-400">{accept.split(',').join(', ')}</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard/survey')}
          className="p-2 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck size={18} className="text-teal-500" />
            {isEdit ? 'Input Data Survey' : 'Tambah Survey'}
          </h1>
          <p className="text-xs font-medium text-gray-500">
            {isEdit ? 'Lengkapi layout files, foto lokasi, MoM dan pengukuran detail' : 'Buat jadwal survey baru'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── INFORMASI SURVEY — display only ───────────────────────────── */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Informasi Survey</h2>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Detail order yang terkait dengan survey ini</p>
            </div>
            {/* Status badge — editable via select */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger className={`h-7 px-2.5 rounded-full text-[10px] font-bold border ${statusColors[form.status]} bg-transparent focus:ring-0 gap-1 w-auto`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  {statusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-semibold">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="px-6 py-2 divide-y divide-gray-50">
            <InfoRow
              icon={FolderOpen}
              label="Order / Project"
              value={
                selectedOrderInfo
                  ? `${selectedOrderInfo.nama_project} · ${selectedOrderInfo.nama_customer} (${selectedOrderInfo.nama_perusahaan})`
                  : '–'
              }
            />
            <InfoRow
              icon={Tag}
              label="Service Type"
              value={selectedOrderInfo?.jenis_interior || '–'}
            />
            <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={13} className="text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tanggal Survey</p>
                <Input
                  type="date"
                  value={form.tanggal_survey}
                  onChange={e => setForm(prev => ({ ...prev, tanggal_survey: e.target.value }))}
                  className="h-8 text-xs font-semibold text-gray-700 bg-white/50 border-gray-100 rounded-lg focus:ring-teal-400/20 focus:border-teal-400 transition-all w-full max-w-[200px]"
                />
              </div>
            </div>
            <InfoRow
              icon={User}
              label="Surveyor"
              value={getSurveyorName()}
            />
            <InfoRow
              icon={MapPin}
              label="Lokasi"
              value={selectedOrderInfo?.alamat || form.lokasi || '–'}
            />
          </CardContent>

          {/* Notes — the only editable field in this card */}
          <div className="px-6 pb-6 pt-4 border-t border-gray-50 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Feedback / Notes
              </label>
              <VoiceInput
                onTranscript={(text) => setForm(prev => ({ ...prev, catatan: prev.catatan ? `${prev.catatan} ${text}` : text }))}
              />
            </div>
            <textarea
              value={form.catatan}
              onChange={e => setForm(prev => ({ ...prev, catatan: e.target.value }))}
              placeholder="Masukkan feedback atau catatan khusus dari hasil survey lokasi..."
              className="w-full min-h-[72px] p-3 bg-gray-50/50 border border-teal-100 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium resize-none outline-none transition-colors"
            />
          </div>
        </Card>

        {/* ── LAYOUT FILES ───────────────────────────────────────────────── */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Layout Files</h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Unggah denah layout (PDF, JPG, PNG, CAD, SKP)</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <UploadZone
              uploading={isUploadingLayout}
              onChange={f => handleFileUpload(f, 'layout')}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.skp"
            />
            {renderFileList(layoutFiles, idx => setLayoutFiles(p => p.filter((_, i) => i !== idx)))}
          </CardContent>
        </Card>

        {/* ── FOTO LOKASI ────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Foto Lokasi</h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Unggah foto kondisi lokasi proyek saat survey</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <UploadZone
              uploading={isUploadingPhoto}
              onChange={f => handleFileUpload(f, 'photo')}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.skp"
            />
            {renderFileList(fotoLokasi, idx => setFotoLokasi(p => p.filter((_, i) => i !== idx)))}
          </CardContent>
        </Card>

        {/* ── MINUTES OF MEETING ─────────────────────────────────────────── */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Minutes of Meeting (MoM)</h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Unggah catatan hasil diskusi meeting survey (PDF, DOC, DOCX)</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <UploadZone
              uploading={isUploadingMom}
              onChange={f => handleFileUpload(f, 'mom')}
              accept=".pdf,.doc,.docx"
            />
            {renderFileList(momFiles, idx => setMomFiles(p => p.filter((_, i) => i !== idx)))}
          </CardContent>
        </Card>

        {/* ── CHECKLIST & DIMENSIONS ─────────────────────────────────────── */}
        {/* ── CUSTOM MEASUREMENT MODAL ──────────────────────────────────── */}
        <Dialog open={customModalOpen} onOpenChange={open => { setCustomModalOpen(open); if (!open) setCustomModalName(''); }}>
          <DialogContent
            showCloseButton={false}
            className="max-w-sm rounded-2xl border-0 shadow-2xl p-0 overflow-hidden"
          >
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-50">
              <DialogTitle className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Plus size={14} className="text-teal-500" />
                </div>
                Tambah Jenis Pengukuran Kustom
              </DialogTitle>
              <p className="text-[10px] font-medium text-gray-400 mt-1">
                Nama yang dimasukkan hanya berlaku untuk survey ini dan tidak masuk ke master data.
              </p>
            </DialogHeader>

            <div className="px-6 py-5 space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                Nama Jenis Pengukuran <span className="text-red-400">*</span>
              </label>
              <Input
                ref={customModalInputRef}
                autoFocus
                placeholder="contoh: Void Tangga, Plafon Ruang Tamu..."
                value={customModalName}
                onChange={e => setCustomModalName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomItem(); } }}
                className="h-10 bg-gray-50 border-gray-200 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400 font-medium"
              />
              {customModalName.trim() && pengukuranItems.some(i => i.nama_pengukuran.toLowerCase() === customModalName.trim().toLowerCase()) && (
                <p className="text-[10px] font-semibold text-red-500 flex items-center gap-1">
                  ⚠ Jenis pengukuran ini sudah ada di checklist
                </p>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t border-gray-50 bg-white flex-row justify-end gap-2 rounded-b-2xl -mx-0 -mb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCustomModalOpen(false); setCustomModalName(''); }}
                className="h-9 rounded-xl font-bold text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customModalName.trim()}
                className="h-9 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 px-5 disabled:opacity-40"
              >
                <Plus size={12} /> Tambahkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <div className="px-6 py-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Jenis Pengukuran & Ukuran</h2>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Pilih jenis pengukuran yang diuji, lalu masukkan detail ukurannya</p>
            </div>
            <Button
              type="button"
              onClick={() => { setCustomModalName(''); setCustomModalOpen(true); }}
              className="h-8 px-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-[10px] gap-1.5 shadow-sm shadow-teal-500/10 shrink-0"
            >
              <Plus size={11} /> Tambah Kustom
            </Button>
          </div>
          <CardContent className="p-6 space-y-3">
            {pengukuranItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Tidak ada jenis pengukuran</p>
            ) : (
              pengukuranItems.map((item, idx) => {
                const isChecked = item.checked;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${isChecked ? 'border-teal-200 bg-teal-50/20 shadow-sm' : 'border-gray-100 bg-gray-50/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`chk-${idx}`}
                          checked={isChecked}
                          onCheckedChange={(v) => toggleChecked(idx, !!v)}
                        />
                        <label htmlFor={`chk-${idx}`} className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                          {item.nama_pengukuran}
                          {item.jenis_pengukuran_id === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 ml-2 font-black uppercase tracking-wider">
                              Custom
                            </span>
                          )}
                        </label>
                      </div>
                      {item.jenis_pengukuran_id === null && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomItem(idx)}
                          className="text-gray-400 hover:text-red-500 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    {isChecked && (
                      <div className="pl-7 space-y-3 animate-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Panjang (cm / m) *</label>
                            <Input
                              type="number"
                              step="any"
                              value={item.panjang || ''}
                              onChange={(e) => updateDimension(idx, 'panjang', parseFloat(e.target.value) || 0)}
                              placeholder="Masukkan panjang"
                              className="h-8 text-xs bg-white border-gray-200 rounded-lg font-medium"
                              required
                            />
                          </div>
                          {item.has_lebar && (
                            <div className="space-y-1 animate-in zoom-in-95 duration-200">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Lebar (cm / m)</label>
                              <div className="relative">
                                <Input
                                  type="number" step="any"
                                  value={item.lebar || ''}
                                  onChange={(e) => updateDimension(idx, 'lebar', parseFloat(e.target.value) || 0)}
                                  placeholder="Masukkan lebar"
                                  className="h-8 text-xs bg-white border-gray-200 rounded-lg font-medium pr-7"
                                />
                                <button type="button" onClick={() => toggleDimension(idx, 'lebar')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 font-extrabold text-sm">&times;</button>
                              </div>
                            </div>
                          )}
                          {item.has_tinggi && (
                            <div className="space-y-1 animate-in zoom-in-95 duration-200">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tinggi (cm / m)</label>
                              <div className="relative">
                                <Input
                                  type="number" step="any"
                                  value={item.tinggi || ''}
                                  onChange={(e) => updateDimension(idx, 'tinggi', parseFloat(e.target.value) || 0)}
                                  placeholder="Masukkan tinggi"
                                  className="h-8 text-xs bg-white border-gray-200 rounded-lg font-medium pr-7"
                                />
                                <button type="button" onClick={() => toggleDimension(idx, 'tinggi')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 font-extrabold text-sm">&times;</button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!item.has_lebar && (
                            <Button type="button" variant="outline" onClick={() => toggleDimension(idx, 'lebar')} className="h-7 px-2.5 rounded-lg text-[10px] font-bold border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-600 transition-colors">+ Lebar</Button>
                          )}
                          {!item.has_tinggi && (
                            <Button type="button" variant="outline" onClick={() => toggleDimension(idx, 'tinggi')} className="h-7 px-2.5 rounded-lg text-[10px] font-bold border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-600 transition-colors">+ Tinggi</Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Catatan Pengukuran / Notes</label>
                            <VoiceInput
                              onTranscript={(text) => updateNotes(idx, item.notes ? `${item.notes} ${text}` : text)}
                              className="h-6 w-6 rounded-lg p-0"
                            />
                          </div>
                          <Input
                            placeholder="Contoh: void dekat tangga, dll..."
                            value={item.notes || ''}
                            onChange={(e) => updateNotes(idx, e.target.value)}
                            className="h-8 text-xs bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/survey')}
            className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-lg font-bold h-9 text-xs bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 px-6"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  );
}