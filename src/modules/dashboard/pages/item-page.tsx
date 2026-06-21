import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import { formatNumberInput, normalizeNumberInput, parseNumberInput } from '@/lib/number';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Box } from 'lucide-react';
import { toast } from 'sonner';

interface Item {
  id: number;
  nama_item: string;
  jenis_item: 'finishing_dalam' | 'finishing_luar' | 'aksesoris';
  harga: number;
}

type JenisFilter = 'all' | Item['jenis_item'];

const jenisOptions: { value: JenisFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'finishing_dalam', label: 'Finishing Dalam' },
  { value: 'finishing_luar', label: 'Finishing Luar' },
  { value: 'aksesoris', label: 'Aksesoris' },
];

const jenisStyles: Record<Item['jenis_item'], string> = {
  finishing_dalam: 'bg-teal-50 text-teal-600 border-teal-100',
  finishing_luar: 'bg-amber-50 text-amber-600 border-amber-100',
  aksesoris: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const formatIDR = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export default function ItemPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeJenis, setActiveJenis] = useState<JenisFilter>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nama_item: '',
    jenis_item: 'finishing_dalam' as Item['jenis_item'],
    harga: '',
  });

  const fetchItems = async (jenis: JenisFilter) => {
    setIsLoading(true);
    try {
      const params = jenis === 'all' ? undefined : { jenis };
      const res = await api.get('/items', { params });
      setItems(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data item');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(activeJenis);
  }, [activeJenis]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => item.nama_item.toLowerCase().includes(keyword));
  }, [items, search]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nama_item: '', jenis_item: 'finishing_dalam', harga: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({
      nama_item: item.nama_item,
      jenis_item: item.jenis_item,
      harga: normalizeNumberInput(String(item.harga ?? 0)),
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (id: number) => {
    setEditingId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nama_item: formData.nama_item,
      jenis_item: formData.jenis_item,
      harga: parseNumberInput(formData.harga),
    };

    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
        toast.success('Item berhasil diperbarui');
      } else {
        await api.post('/items', payload);
        toast.success('Item berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchItems(activeJenis);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan item');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await api.delete(`/items/${editingId}`);
      toast.success('Item berhasil dihapus');
      setIsDeleteOpen(false);
      fetchItems(activeJenis);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus item');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Box size={18} className="text-teal-500" /> Item
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola item finishing dalam, finishing luar, dan aksesoris</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-teal-400 hover:bg-teal-500 text-white font-bold px-4 h-9 rounded-lg text-xs shadow-[0_8px_20px_-4px_rgba(52,211,153,0.5)] transition-all"
        >
          <Plus size={14} strokeWidth={2.5} className="mr-1.5" />
          Tambah Item
        </Button>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-gray-50">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Item</h2>
            <div className="flex flex-wrap gap-2">
              {jenisOptions.map((jenis) => {
                const isActive = activeJenis === jenis.value;
                return (
                  <button
                    key={jenis.value}
                    type="button"
                    onClick={() => setActiveJenis(jenis.value)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                      isActive
                        ? 'bg-teal-50 text-teal-600 border-teal-100'
                        : 'bg-white text-gray-500 border-gray-100 hover:text-teal-600 hover:border-teal-100'
                    }`}
                  >
                    {jenis.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Cari item..."
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
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Nama Item</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Jenis</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Harga</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-400 text-xs">Loading data...</TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-400 text-xs">Tidak ada item</TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
                    <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">{item.nama_item}</TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border ${jenisStyles[item.jenis_item]}`}>
                        {jenisOptions.find((j) => j.value === item.jenis_item)?.label || item.jenis_item}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-gray-700 py-3">{formatIDR(item.harga)}</TableCell>
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
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 border-0 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold tracking-tight text-gray-800">
              {editingId ? 'Edit Item' : 'Tambah Item'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              {editingId ? 'Update informasi item' : 'Tambahkan item baru ke sistem'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-1.5 mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Item</label>
              <Input
                value={formData.nama_item}
                onChange={(e) => setFormData({ ...formData, nama_item: e.target.value })}
                placeholder="Masukkan nama item"
                className="h-9 bg-white border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium"
                required
              />
            </div>
            <div className="space-y-1.5 mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jenis</label>
              <Select
                value={formData.jenis_item}
                onValueChange={(v) => setFormData({ ...formData, jenis_item: v as Item['jenis_item'] })}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {jenisOptions.filter((j) => j.value !== 'all').map((jenis) => (
                    <SelectItem key={jenis.value} value={jenis.value}>
                      {jenis.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 mb-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Harga</label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberInput(formData.harga)}
                onChange={(e) => setFormData({ ...formData, harga: normalizeNumberInput(e.target.value) })}
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
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus Item</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.
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
