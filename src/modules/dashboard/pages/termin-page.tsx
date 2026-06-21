import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Wallet, X, Search } from 'lucide-react';
import { toast } from 'sonner';

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

const stepColors = [
  'bg-teal-400',
  'bg-emerald-300',
  'bg-amber-300',
  'bg-rose-300',
  'bg-sky-300',
];

const normalizePercentInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
};

const parsePercent = (value: string) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const generateNextKode = (items: Termin[]) => {
  const numbers = items
    .map((t) => {
      const match = t.kode_tipe.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => Number.isFinite(n));
  const max = numbers.length ? Math.max(...numbers) : 0;
  const next = max + 1;
  return `TRM-${String(next).padStart(3, '0')}`;
};

export default function TerminPage() {
  const [data, setData] = useState<Termin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    kode_tipe: '',
    nama_tipe: '',
    deskripsi: '',
    tahapan: [{ text: '', persentase: '' }],
  });

  const fetchTermins = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/termin');
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat termin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTermins();
  }, []);

  const totalPersentase = useMemo(() => {
    return formData.tahapan.reduce((sum, row) => sum + parsePercent(row.persentase), 0);
  }, [formData.tahapan]);

  const isTotalValid = Math.abs(totalPersentase - 100) < 0.01;

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      kode_tipe: generateNextKode(data),
      nama_tipe: '',
      deskripsi: '',
      tahapan: [{ text: '', persentase: '' }],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (termin: Termin) => {
    setEditingId(termin.id);
    setFormData({
      kode_tipe: termin.kode_tipe,
      nama_tipe: termin.nama_tipe,
      deskripsi: termin.deskripsi || '',
      tahapan: termin.tahapan.map((t) => ({
        text: t.text,
        persentase: String(t.persentase ?? 0),
      })),
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (id: number) => {
    setEditingId(id);
    setIsDeleteOpen(true);
  };

  const addTahapanRow = () => {
    setFormData((prev) => ({
      ...prev,
      tahapan: [...prev.tahapan, { text: '', persentase: '' }],
    }));
  };

  const removeTahapanRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tahapan: prev.tahapan.filter((_, i) => i !== index),
    }));
  };

  const updateTahapanRow = (index: number, field: 'text' | 'persentase', value: string) => {
    const next = [...formData.tahapan];
    next[index] = { ...next[index], [field]: value };
    setFormData((prev) => ({ ...prev, tahapan: next }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      kode_tipe: formData.kode_tipe || generateNextKode(data),
      nama_tipe: formData.nama_tipe,
      deskripsi: formData.deskripsi,
      tahapan: formData.tahapan.map((row, idx) => ({
        step: idx + 1,
        text: row.text,
        persentase: parsePercent(row.persentase),
      })),
    };

    try {
      if (editingId) {
        await api.put(`/termin/${editingId}`, payload);
        toast.success('Termin berhasil diperbarui');
      } else {
        await api.post('/termin', payload);
        toast.success('Termin berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchTermins();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan termin');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await api.delete(`/termin/${editingId}`);
      toast.success('Termin berhasil dihapus');
      setIsDeleteOpen(false);
      fetchTermins();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus termin');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Wallet size={18} className="text-teal-500" /> Termin
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola template pembayaran bertahap</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-teal-400 hover:bg-teal-500 text-white font-bold px-4 h-9 rounded-lg text-xs shadow-[0_8px_20px_-4px_rgba(52,211,153,0.5)] transition-all"
        >
          <Plus size={14} strokeWidth={2.5} className="mr-1.5" />
          Tambah Termin
        </Button>
      </div>

      <div className="relative w-full md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <Input
          placeholder="Cari termin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 bg-white border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400 shadow-sm"
        />
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <CardContent className="p-8 text-center text-xs text-gray-400">Loading data...</CardContent>
        </Card>
      ) : data.filter(t => !search || t.nama_tipe.toLowerCase().includes(search.toLowerCase()) || t.kode_tipe.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <CardContent className="p-8 text-center text-xs text-gray-400">Belum ada data termin</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.filter(t => !search || t.nama_tipe.toLowerCase().includes(search.toLowerCase()) || t.kode_tipe.toLowerCase().includes(search.toLowerCase())).map((termin) => (
            <Card key={termin.id} className="border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-800">{termin.nama_tipe}</h3>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        {termin.kode_tipe}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{termin.deskripsi || 'Pembayaran bertahap'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(termin)}
                      className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-md transition-colors"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(termin.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden flex">
                    {termin.tahapan.map((t, idx) => (
                      <div
                        key={`${termin.id}-bar-${idx}`}
                        className={`${stepColors[idx % stepColors.length]} h-full`}
                        style={{ width: `${t.persentase}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {termin.tahapan.length} tahapan
                  </span>
                </div>

                <div className="space-y-2">
                  {termin.tahapan.map((t, idx) => (
                    <div key={`${termin.id}-step-${idx}`} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-700">{t.text}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest">Tahap {idx + 1}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                        {t.persentase}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-[720px] max-h-[90vh] rounded-2xl p-6 border-0 shadow-2xl overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold tracking-tight text-gray-800">
              {editingId ? 'Edit Termin' : 'Tambah Termin'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              {editingId ? 'Update informasi termin pembayaran' : 'Buat template pembayaran bertahap'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kode Tipe</label>
                <Input
                  value={formData.kode_tipe}
                  readOnly
                  placeholder="Contoh: TRM-003"
                  className="h-9 bg-gray-50 border-gray-200 rounded-lg text-sm text-gray-600 font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Tipe</label>
                <Input
                  value={formData.nama_tipe}
                  onChange={(e) => setFormData({ ...formData, nama_tipe: e.target.value })}
                  placeholder="Contoh: Termin 4 Tahap"
                  className="h-9 bg-white border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Deskripsi</label>
              <textarea
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Deskripsi singkat template termin ini"
                className="w-full min-h-[72px] rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tahapan Pembayaran</p>
                <Button
                  type="button"
                  onClick={addTahapanRow}
                  className="h-7 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-[9px] gap-1.5"
                >
                  <Plus size={10} /> Tambah Tahapan
                </Button>
              </div>
              <div className="space-y-2">
                {formData.tahapan.map((row, idx) => (
                  <div key={idx} className="flex items-end gap-2 p-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Nama Tahapan</label>
                      <Input
                        value={row.text}
                        onChange={(e) => updateTahapanRow(idx, 'text', e.target.value)}
                        placeholder="Contoh: DP, Progress, Pelunasan"
                        className="h-8 bg-white border-gray-100 rounded-lg text-xs"
                        required
                      />
                    </div>
                    <div className="w-[140px] space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Persentase (%)</label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={row.persentase}
                        onChange={(e) => updateTahapanRow(idx, 'persentase', normalizePercentInput(e.target.value))}
                        placeholder="0"
                        className="h-8 bg-white border-gray-100 rounded-lg text-xs"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTahapanRow(idx)}
                      className="mb-1 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-teal-600/70 uppercase">
                <span>Total Persentase:</span>
                <span>{totalPersentase.toFixed(0)}%</span>
              </div>
              {!isTotalValid && (
                <p className="text-[10px] text-red-500 font-bold">Total persentase harus tepat 100% untuk dapat disimpan.</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!isTotalValid}
                className="rounded-lg font-bold h-9 text-xs bg-teal-400 hover:bg-teal-500 text-white shadow-lg shadow-teal-400/30 disabled:opacity-60"
              >
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[360px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus Termin</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Apakah Anda yakin ingin menghapus termin ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg font-bold h-9 text-xs bg-red-400 hover:bg-red-500 text-white shadow-lg shadow-red-400/30"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
