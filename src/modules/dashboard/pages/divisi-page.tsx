import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from 'sonner';

interface Divisi {
  id: number;
  nama_divisi: string;
  created_at: string;
}

export default function DivisiPage() {
  const [data, setData] = useState<Divisi[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nama_divisi: '' });

  const fetchDivisi = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/divisi');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err: any) {
      toast.error('Gagal memuat data divisi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisi();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nama_divisi: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (divisi: Divisi) => {
    setEditingId(divisi.id);
    setFormData({ nama_divisi: divisi.nama_divisi });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (id: number) => {
    setEditingId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_divisi) return;

    try {
      if (editingId) {
        await api.put(`/divisi/${editingId}`, formData);
        toast.success('Divisi berhasil diperbarui');
      } else {
        await api.post('/divisi', formData);
        toast.success('Divisi berhasil ditambahkan');
      }
      setIsFormOpen(false);
      fetchDivisi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await api.delete(`/divisi/${editingId}`);
      toast.success('Divisi berhasil dihapus');
      setIsDeleteOpen(false);
      fetchDivisi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus divisi');
    }
  };

  const filteredData = data.filter(d => 
    d.nama_divisi.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight">Divisi</h1>
          <p className="text-xs font-medium text-gray-500">Kelola data divisi perusahaan</p>
        </div>
        <Button 
          onClick={handleOpenCreate}
          className="bg-teal-400 hover:bg-teal-500 text-white font-bold px-4 h-9 rounded-lg text-xs shadow-[0_8px_20px_-4px_rgba(52,211,153,0.5)] transition-all"
        >
          <Plus size={14} strokeWidth={2.5} className="mr-1.5" />
          Tambah Divisi
        </Button>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Divisi</h2>
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input 
              placeholder="Cari divisi..." 
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
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3 w-1/2">Nama Divisi</TableHead>
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
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs">Tidak ada data divisi</TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
                    <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">{item.nama_divisi}</TableCell>
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

      {/* Modal Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl p-6 border-0 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold tracking-tight text-gray-800">
              {editingId ? 'Edit Divisi' : 'Tambah Divisi'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              {editingId ? 'Ubah informasi divisi ini' : 'Tambahkan divisi baru ke sistem'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-1.5 mb-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Divisi</label>
              <Input
                value={formData.nama_divisi}
                onChange={(e) => setFormData({ nama_divisi: e.target.value })}
                placeholder="Masukkan nama divisi"
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

      {/* Alert Delete */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[360px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus Divisi</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Apakah Anda yakin ingin menghapus divisi ini? Tindakan ini tidak dapat dibatalkan.
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
