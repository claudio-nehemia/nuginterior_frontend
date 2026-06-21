import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Ruler } from 'lucide-react';
import { toast } from 'sonner';

interface JenisPengukuran {
  id: number;
  nama_pengukuran: string;
  created_at: string;
}

export default function JenisPengukuranPage() {
  const [data, setData] = useState<JenisPengukuran[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nama_pengukuran: '' });

  const fetchJenisPengukuran = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/jenis-pengukuran');
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat jenis pengukuran');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJenisPengukuran();
  }, []);

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return data;
    return data.filter((item) => item.nama_pengukuran.toLowerCase().includes(keyword));
  }, [data, search]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nama_pengukuran: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: JenisPengukuran) => {
    setEditingId(item.id);
    setFormData({ nama_pengukuran: item.nama_pengukuran });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (id: number) => {
    setEditingId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pengukuran) return;

    try {
      if (editingId) {
        await api.put(`/jenis-pengukuran/${editingId}`, formData);
        toast.success('Jenis pengukuran berhasil diperbarui');
      } else {
        await api.post('/jenis-pengukuran', formData);
        toast.success('Jenis pengukuran berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchJenisPengukuran();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jenis pengukuran');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await api.delete(`/jenis-pengukuran/${editingId}`);
      toast.success('Jenis pengukuran berhasil dihapus');
      setIsDeleteOpen(false);
      fetchJenisPengukuran();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus jenis pengukuran');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Ruler size={18} className="text-teal-500" /> Jenis Pengukuran
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola jenis satuan pengukuran produk</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-teal-400 hover:bg-teal-500 text-white font-bold px-4 h-9 rounded-lg text-xs shadow-[0_8px_20px_-4px_rgba(52,211,153,0.5)] transition-all"
        >
          <Plus size={14} strokeWidth={2.5} className="mr-1.5" />
          Tambah Jenis Pengukuran
        </Button>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Jenis Pengukuran</h2>
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Cari jenis pengukuran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3 w-1/2">Nama Pengukuran</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Tanggal Dibuat</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs">Loading data...</TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs">Tidak ada data jenis pengukuran</TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
                    <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">{item.nama_pengukuran}</TableCell>
                    <TableCell className="text-xs font-medium text-gray-500 py-3">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                    </TableCell>
                    <TableCell className="text-right px-6 py-3">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-md transition-colors"
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl p-6 border-0 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold tracking-tight text-gray-800">
              {editingId ? 'Edit Jenis Pengukuran' : 'Tambah Jenis Pengukuran'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              {editingId ? 'Ubah informasi jenis pengukuran ini' : 'Tambahkan jenis pengukuran baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-1.5 mb-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Pengukuran</label>
              <Input
                value={formData.nama_pengukuran}
                onChange={(e) => setFormData({ nama_pengukuran: e.target.value })}
                placeholder="Contoh: Meter Persegi (m²)"
                className="h-9 bg-white border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium"
                required
              />
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
                className="rounded-lg font-bold h-9 text-xs bg-teal-400 hover:bg-teal-500 text-white shadow-lg shadow-teal-400/30"
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
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus Jenis Pengukuran</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Apakah Anda yakin ingin menghapus jenis pengukuran ini? Tindakan ini tidak dapat dibatalkan.
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
