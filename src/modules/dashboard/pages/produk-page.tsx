import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/axios';
import { formatNumberInput, normalizeNumberInput, parseNumberInput } from '@/lib/number';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Plus, Pencil, Eye, Trash2, Package, Settings2, Image as ImageIcon, X, Search } from "lucide-react";
import { toast } from 'sonner';

interface BahanBaku {
  id: number;
  nama_bahan_baku: string;
}

interface ProdukBahanBaku {
  id: number;
  bahan_baku_id: number;
  nama_bahan_baku: string;
  harga_dasar: number;
  harga_jasa: number;
}

interface Produk {
  id: number;
  nama_produk: string;
  harga: number;
  harga_jasa: number;
  images: { id: number; image: string }[];
  bahan_bakus: ProdukBahanBaku[];
}

export default function ProdukPage() {
  const [produks, setProduks] = useState<Produk[]>([]);
  const [bahanBakus, setBahanBakus] = useState<BahanBaku[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [produkSearch, setProdukSearch] = useState('');
  const [filterBahanBakuId, setFilterBahanBakuId] = useState('');
  const [filterHargaMin, setFilterHargaMin] = useState('');
  const [filterHargaMax, setFilterHargaMax] = useState('');
  
  // Modals
  const [isProdukFormOpen, setIsProdukFormOpen] = useState(false);
  const [isBahanBakuListOpen, setIsBahanBakuListOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBahanBakuFormOpen, setIsBahanBakuFormOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  // Selected Data
  const [selectedProduk, setSelectedProduk] = useState<Produk | null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingProdukId, setEditingProdukId] = useState<number | null>(null);
  const [editingBahanBakuId, setEditingBahanBakuId] = useState<number | null>(null);

  // Form States
  const [produkFormData, setProdukFormData] = useState({
    nama_produk: '',
    images: [] as string[],
    bahan_baku: [] as { bahan_baku_id: string; harga_dasar: string; harga_jasa: string }[]
  });
  const [bbName, setBbName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    fetchBahanBakus();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/produk');
      setProduks(res.data.data || []);
    } catch {
      toast.error('Gagal memuat data produk');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBahanBakus = async () => {
    try {
      const res = await api.get('/bahan-baku');
      setBahanBakus(res.data.data || []);
    } catch {
      toast.error('Gagal memuat master bahan baku');
    }
  };

  // HANDLERS
  const handleOpenProdukForm = (produk?: Produk) => {
    if (produk) {
      setEditingProdukId(produk.id);
      setProdukFormData({
        nama_produk: produk.nama_produk,
        images: produk.images?.map(img => img.image) || [],
        bahan_baku: produk.bahan_bakus?.map(bb => ({
          bahan_baku_id: bb.bahan_baku_id.toString(),
          harga_dasar: normalizeNumberInput(String(bb.harga_dasar ?? 0)),
          harga_jasa: normalizeNumberInput(String(bb.harga_jasa ?? 0))
        })) || []
      });
    } else {
      setEditingProdukId(null);
      setProdukFormData({
        nama_produk: '',
        images: [],
        bahan_baku: [{ bahan_baku_id: '', harga_dasar: '', harga_jasa: '' }]
      });
    }
    setIsProdukFormOpen(true);
  };

  const handleProdukSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out rows without selected bahan baku ID before submitting
    const validBahanBaku = produkFormData.bahan_baku
      .filter(bb => bb.bahan_baku_id !== '')
      .map(bb => ({
        bahan_baku_id: parseInt(bb.bahan_baku_id),
        harga_dasar: parseNumberInput(bb.harga_dasar),
        harga_jasa: parseNumberInput(bb.harga_jasa)
      }));

    if (validBahanBaku.length === 0) {
      toast.error('Harap pilih minimal 1 bahan baku/variasi harga');
      return;
    }

    const payload = {
      nama_produk: produkFormData.nama_produk,
      images: produkFormData.images,
      bahan_baku: validBahanBaku
    };

    try {
      if (editingProdukId) {
        await api.put(`/produk/${editingProdukId}`, payload);
        toast.success('Produk diperbarui');
      } else {
        await api.post('/produk', payload);
        toast.success('Produk dibuat');
      }
      setIsProdukFormOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await api.post('/upload', formData);
        const url = res.data?.data?.url;
        if (!url) {
          throw new Error('URL upload tidak ditemukan');
        }
        setProdukFormData(prev => ({ ...prev, images: [...prev.images, url] }));
        successCount += 1;
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Gagal mengunggah gambar';
        toast.error(`${file.name}: ${message}`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} gambar diunggah`);
    }
    // Reset input agar bisa upload file yang sama lagi
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setProdukFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addBahanBakuRow = () => {
    setProdukFormData(prev => ({
      ...prev,
      bahan_baku: [...prev.bahan_baku, { bahan_baku_id: '', harga_dasar: '', harga_jasa: '' }]
    }));
  };

  const removeBahanBakuRow = (index: number) => {
    setProdukFormData(prev => ({
      ...prev,
      bahan_baku: prev.bahan_baku.filter((_, i) => i !== index)
    }));
  };

  const updateBahanBakuRow = (index: number, field: string, value: string) => {
    const newBahanBaku = [...produkFormData.bahan_baku];
    newBahanBaku[index] = { ...newBahanBaku[index], [field]: value };
    setProdukFormData(prev => ({ ...prev, bahan_baku: newBahanBaku }));
  };

  const handleBbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBahanBakuId) {
        await api.put(`/bahan-baku/${editingBahanBakuId}`, { nama_bahan_baku: bbName });
        toast.success('Bahan baku diperbarui');
      } else {
        await api.post('/bahan-baku', { nama_bahan_baku: bbName });
        toast.success('Bahan baku ditambahkan');
      }
      setBbName('');
      setEditingBahanBakuId(null);
      setIsBahanBakuFormOpen(false);
      fetchBahanBakus();
    } catch {
      toast.error('Gagal menyimpan bahan baku');
    }
  };

  const handleDeleteProduk = async (id: number) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      await api.delete(`/produk/${id}`);
      toast.success('Produk dihapus');
      fetchData();
    } catch {
      toast.error('Gagal menghapus produk');
    }
  };

  const handleDeleteBahanBaku = async (id: number) => {
    if (!confirm('Hapus bahan baku ini?')) return;
    try {
      await api.delete(`/bahan-baku/${id}`);
      toast.success('Bahan baku dihapus');
      fetchBahanBakus();
    } catch {
      toast.error('Gagal menghapus bahan baku');
    }
  };

  const getProductPriceRange = (p: Produk) => {
    if (!p.bahan_bakus || p.bahan_bakus.length === 0) {
      return { minTotal: 0, maxTotal: 0, minDasar: 0, maxDasar: 0, minJasa: 0, maxJasa: 0 };
    }
    let minTotal = Infinity;
    let maxTotal = -Infinity;
    let minDasar = Infinity;
    let maxDasar = -Infinity;
    let minJasa = Infinity;
    let maxJasa = -Infinity;

    p.bahan_bakus.forEach(bb => {
      const total = bb.harga_dasar + bb.harga_jasa;
      if (total < minTotal) minTotal = total;
      if (total > maxTotal) maxTotal = total;
      
      if (bb.harga_dasar < minDasar) minDasar = bb.harga_dasar;
      if (bb.harga_dasar > maxDasar) maxDasar = bb.harga_dasar;

      if (bb.harga_jasa < minJasa) minJasa = bb.harga_jasa;
      if (bb.harga_jasa > maxJasa) maxJasa = bb.harga_jasa;
    });

    return { minTotal, maxTotal, minDasar, maxDasar, minJasa, maxJasa };
  };

  const formatProductPrice = (p: Produk) => {
    const { minTotal, maxTotal } = getProductPriceRange(p);
    if (minTotal === 0 && maxTotal === 0) return 'Rp 0';
    if (minTotal === maxTotal) return formatIDR(minTotal);
    return `${formatIDR(minTotal)} - ${formatIDR(maxTotal)}`;
  };

  const formatProductJasa = (p: Produk) => {
    const { minJasa, maxJasa } = getProductPriceRange(p);
    if (minJasa === 0 && maxJasa === 0) return 'Rp 0';
    if (minJasa === maxJasa) return formatIDR(minJasa);
    return `${formatIDR(minJasa)} - ${formatIDR(maxJasa)}`;
  };

  const getFormPriceRange = () => {
    const rows = produkFormData.bahan_baku;
    if (rows.length === 0) {
      return { minTotal: 0, maxTotal: 0, count: 0, cheapest: null, expensive: null };
    }
    let minTotal = Infinity;
    let maxTotal = -Infinity;
    let cheapestName = '';
    let expensiveName = '';

    rows.forEach(row => {
      const dasar = parseNumberInput(row.harga_dasar);
      const jasa = parseNumberInput(row.harga_jasa);
      const total = dasar + jasa;
      const bbObj = bahanBakus.find(b => String(b.id) === String(row.bahan_baku_id));
      const bbName = bbObj ? bbObj.nama_bahan_baku : 'Pilihan Bahan Baku';

      if (total < minTotal) {
        minTotal = total;
        cheapestName = bbName;
      }
      if (total > maxTotal) {
        maxTotal = total;
        expensiveName = bbName;
      }
    });

    return {
      minTotal: minTotal === Infinity ? 0 : minTotal,
      maxTotal: maxTotal === -Infinity ? 0 : maxTotal,
      count: rows.length,
      cheapest: minTotal === Infinity ? null : { name: cheapestName, price: minTotal },
      expensive: maxTotal === -Infinity ? null : { name: expensiveName, price: maxTotal }
    };
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };
  const activeDetailImage = selectedProduk?.images?.[detailImageIndex] || selectedProduk?.images?.[0] || null;
  const activeDetailImageUrl = activeDetailImage?.image
    ? (activeDetailImage.image.startsWith('http')
        ? activeDetailImage.image
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${activeDetailImage.image}`)
    : null;

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setIsImagePreviewOpen(false);
      setImagePreviewUrl(null);
    }
  };

  const handleImagePreviewOpenChange = (open: boolean) => {
    setIsImagePreviewOpen(open);
    if (!open) setImagePreviewUrl(null);
  };

  const handleOpenImagePreview = (url: string) => {
    setImagePreviewUrl(url);
    setIsImagePreviewOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Package className="text-teal-500" size={24} /> Produk
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kelola produk dan komposisi bahan baku</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsBahanBakuListOpen(true)}
            className="h-9 rounded-xl border-gray-200 text-gray-600 font-bold text-[11px] gap-2 hover:bg-gray-50"
          >
            <Settings2 size={14} /> Manage Bahan Baku
          </Button>
          <Button 
            onClick={() => handleOpenProdukForm()}
            className="h-9 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-[11px] gap-2 shadow-lg shadow-teal-100"
          >
            <Plus size={14} /> Tambah Produk
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Produk</h2>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <Input placeholder="Cari produk..." value={produkSearch} onChange={e => setProdukSearch(e.target.value)} className="pl-8 h-8 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterBahanBakuId} onValueChange={v => setFilterBahanBakuId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 w-44 rounded-lg text-[10px] font-bold"><SelectValue placeholder="Semua Bahan Baku" /></SelectTrigger>
              <SelectContent className="rounded-lg max-h-[200px]">
                <SelectItem value="__all__">Semua Bahan Baku</SelectItem>
                {bahanBakus.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.nama_bahan_baku}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input type="number" placeholder="Harga min" value={filterHargaMin} onChange={e => setFilterHargaMin(e.target.value)} className="h-8 w-28 rounded-lg text-[10px] bg-gray-50/50 border-gray-100" />
              <span className="text-[10px] text-gray-400 font-bold">—</span>
              <Input type="number" placeholder="Harga max" value={filterHargaMax} onChange={e => setFilterHargaMax(e.target.value)} className="h-8 w-28 rounded-lg text-[10px] bg-gray-50/50 border-gray-100" />
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-gray-100">
                <TableHead className="w-[80px] text-[10px] font-black uppercase tracking-widest text-gray-400 pl-6">Thumbnail</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nama Produk</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rentang Harga</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Biaya Jasa</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Varian Bahan</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400 pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-gray-400 font-bold">Memuat data...</TableCell>
                </TableRow>
              ) : (() => {
                let filtered = produks;
                if (produkSearch) {
                  filtered = filtered.filter(p => p.nama_produk.toLowerCase().includes(produkSearch.toLowerCase()));
                }
                if (filterBahanBakuId) {
                  filtered = filtered.filter(p => p.bahan_bakus?.some(b => b.bahan_baku_id === Number(filterBahanBakuId)));
                }
                if (filterHargaMin) {
                  filtered = filtered.filter(p => {
                    const { maxTotal } = getProductPriceRange(p);
                    return maxTotal >= Number(filterHargaMin);
                  });
                }
                if (filterHargaMax) {
                  filtered = filtered.filter(p => {
                    const { minTotal } = getProductPriceRange(p);
                    return minTotal <= Number(filterHargaMax);
                  });
                }
                return filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-gray-400 font-bold">Belum ada produk</TableCell>
                </TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-gray-50/50 border-gray-100 transition-colors">
                  <TableCell className="pl-6">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                      {p.images?.[0]?.image ? (
                        <img 
                          src={p.images[0].image.startsWith('http') ? p.images[0].image : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${p.images[0].image}`} 
                          alt={p.nama_produk} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-gray-700">{p.nama_produk}</TableCell>
                  <TableCell className="text-xs font-bold text-teal-600">{formatProductPrice(p)}</TableCell>
                  <TableCell className="text-xs font-medium text-gray-500">{formatProductJasa(p)}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 bg-teal-50 text-teal-600 rounded-full text-[9px] font-black border border-teal-100">
                      {p.bahan_bakus?.length || 0} Varian
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => { setSelectedProduk(p); setDetailImageIndex(0); setIsDetailOpen(true); setIsImagePreviewOpen(false); setImagePreviewUrl(null); }}
                        className="p-1.5 text-gray-400 hover:text-teal-500 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => handleOpenProdukForm(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduk(p.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ));
              })()} 
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL: Tambah/Edit Produk */}
      <Dialog open={isProdukFormOpen} onOpenChange={setIsProdukFormOpen}>
        <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
          <form onSubmit={handleProdukSubmit} className="flex flex-col flex-1 min-h-0">
            <DialogHeader className="p-5 bg-gray-50/80 border-b border-gray-100 flex-shrink-0">
              <DialogTitle className="text-base font-black text-gray-800">{editingProdukId ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {editingProdukId ? 'Update informasi produk dan bahan baku' : 'Tambahkan produk baru beserta bahan baku'}
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Produk</label>
                  <Input 
                    value={produkFormData.nama_produk}
                    onChange={(e) => setProdukFormData({...produkFormData, nama_produk: e.target.value})}
                    placeholder="Contoh: Meja Makan Modern"
                    className="h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-teal-400/10 focus:border-teal-400 transition-all text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Gambar Produk</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {produkFormData.images.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                        <img 
                          src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img}`} 
                          className="w-full h-full object-cover" 
                        />
                        <button 
                          type="button" 
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={18} className="text-white" />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-teal-400 hover:text-teal-500 hover:bg-teal-50 transition-all shadow-sm"
                    >
                      <Plus size={20} className="mb-1" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Upload</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                    />
                  </div>
                </div>
              </div>

              {/* Bahan Baku Dynamic Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Variasi Opsi Bahan Baku & Harga</h3>
                  <Button 
                    type="button" 
                    onClick={addBahanBakuRow}
                    className="h-7 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-[9px] gap-1.5"
                  >
                    <Plus size={10} /> Tambah Pilihan Bahan
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {produkFormData.bahan_baku.map((row, idx) => (
                    <div key={idx} className="flex items-end gap-2 p-2.5 bg-gray-50/50 rounded-xl border border-gray-100 group animate-in slide-in-from-left-2 duration-300">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bahan Baku</label>
                        <Select 
                          value={row.bahan_baku_id} 
                          onValueChange={(v) => updateBahanBakuRow(idx, 'bahan_baku_id', v)}
                        >
                          <SelectTrigger className="h-8 bg-white border-gray-100 rounded-lg text-xs">
                            <SelectValue placeholder="Pilih Bahan Baku" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-gray-100">
                            {bahanBakus.map(bb => (
                              <SelectItem key={bb.id} value={bb.id.toString()} className="text-xs rounded-lg">{bb.nama_bahan_baku}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Harga Dasar</label>
                        <Input 
                          type="text"
                          inputMode="numeric"
                          value={formatNumberInput(row.harga_dasar)}
                          onChange={(e) => updateBahanBakuRow(idx, 'harga_dasar', normalizeNumberInput(e.target.value))}
                          className="h-8 bg-white border-gray-100 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Harga Jasa</label>
                        <Input 
                          type="text"
                          inputMode="numeric"
                          value={formatNumberInput(row.harga_jasa)}
                          onChange={(e) => updateBahanBakuRow(idx, 'harga_jasa', normalizeNumberInput(e.target.value))}
                          className="h-8 bg-white border-gray-100 rounded-lg text-xs"
                        />
                      </div>
                      <div className="w-24 text-right flex flex-col justify-end pb-0.5 h-8">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Total Opsi</span>
                        <span className="text-xs font-black text-teal-600">
                          {formatIDR(parseNumberInput(row.harga_dasar) + parseNumberInput(row.harga_jasa))}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeBahanBakuRow(idx)}
                        className="mb-1 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary of Options */}
              {(() => {
                const summary = getFormPriceRange();
                if (summary.count === 0) return null;
                return (
                  <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-teal-100/50 pb-2">
                      <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">Ringkasan Variasi Opsi</span>
                      <span className="px-2 py-0.5 bg-teal-100/60 text-teal-800 rounded-full text-[9px] font-black">{summary.count} Bahan Baku</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Rentang Harga Produk</span>
                        <span className="text-xs font-black text-teal-600">
                          {summary.minTotal === summary.maxTotal 
                            ? formatIDR(summary.minTotal) 
                            : `${formatIDR(summary.minTotal)} - ${formatIDR(summary.maxTotal)}`
                          }
                        </span>
                      </div>
                      {summary.cheapest && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Harga Terendah</span>
                          <span className="text-xs font-bold text-gray-700">
                            {formatIDR(summary.cheapest.price)} <span className="text-[9px] font-bold text-gray-400">({summary.cheapest.name})</span>
                          </span>
                        </div>
                      )}
                      {summary.expensive && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Harga Tertinggi</span>
                          <span className="text-xs font-bold text-gray-700">
                            {formatIDR(summary.expensive.price)} <span className="text-[9px] font-bold text-gray-400">({summary.expensive.name})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="p-4 bg-gray-50/80 border-t border-gray-100 gap-2 flex-shrink-0">
              <Button type="button" variant="ghost" onClick={() => setIsProdukFormOpen(false)} className="h-9 rounded-xl font-bold text-xs">Batal</Button>
              <Button type="submit" className="h-9 px-8 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-lg shadow-teal-100">Simpan Produk</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Manage Bahan Baku (Table View) */}
      <Dialog open={isBahanBakuListOpen} onOpenChange={setIsBahanBakuListOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-gray-50/80 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-black text-gray-800">Manage Bahan Baku</DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daftar master bahan baku untuk produk</DialogDescription>
              </div>
              <Button 
                onClick={() => { setEditingBahanBakuId(null); setBbName(''); setIsBahanBakuFormOpen(true); }}
                className="h-8 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-[10px] gap-1.5"
              >
                <Plus size={12} /> Tambah Bahan Baku
              </Button>
            </div>
          </DialogHeader>

          <div className="p-0 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-white sticky top-0 z-10 border-b border-gray-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-8">Nama Bahan Baku</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400 pr-8">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bahanBakus.map(bb => (
                  <TableRow key={bb.id} className="hover:bg-gray-50/50 border-gray-50 transition-colors">
                    <TableCell className="pl-8 text-xs font-bold text-gray-700">{bb.nama_bahan_baku}</TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setEditingBahanBakuId(bb.id); setBbName(bb.nama_bahan_baku); setIsBahanBakuFormOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBahanBaku(bb.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Bahan Baku Entry (Simple Name Only) */}
      <Dialog open={isBahanBakuFormOpen} onOpenChange={setIsBahanBakuFormOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 border-none shadow-2xl">
          <form onSubmit={handleBbSubmit} className="space-y-4">
            <div className="space-y-2">
              <DialogTitle className="text-sm font-black text-gray-800">{editingBahanBakuId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</DialogTitle>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Bahan Baku</label>
                <Input 
                  value={bbName}
                  onChange={(e) => setBbName(e.target.value)}
                  placeholder="Contoh: Kayu Jati"
                  className="h-9 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-teal-400/10 focus:border-teal-400 transition-all text-xs"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsBahanBakuFormOpen(false)} className="flex-1 h-9 rounded-xl font-bold text-[11px]">Batal</Button>
              <Button type="submit" className="flex-1 h-9 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-[11px] shadow-lg shadow-teal-100">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Produk Detail */}
      <Dialog open={isDetailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent showCloseButton={false} className="w-[92vw] max-w-[520px] max-h-[85vh] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in duration-300">
          {selectedProduk && (
            <div className="relative flex flex-col max-h-[85vh]">
              {/* Cover Image */}
              <div className="h-40 sm:h-44 w-full bg-gray-100 relative">
                {activeDetailImageUrl ? (
                  <button
                    type="button"
                    onClick={() => handleOpenImagePreview(activeDetailImageUrl)}
                    className="w-full h-full cursor-zoom-in"
                    aria-label="Lihat gambar penuh"
                  >
                    <img 
                      src={activeDetailImageUrl}
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                    <ImageIcon size={48} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-6 left-6 right-6">
                  <h2 className="text-2xl font-black text-white tracking-tight">{selectedProduk.nama_produk}</h2>
                  <p className="text-teal-300 text-xs font-bold uppercase tracking-widest">{formatProductPrice(selectedProduk)}</p>
                </div>
              </div>

              {selectedProduk.images?.length ? (
                <div className="bg-white px-6 py-3 border-b border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Galeri</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedProduk.images.map((img, idx) => (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => setDetailImageIndex(idx)}
                        className={`h-14 w-20 flex-shrink-0 rounded-lg overflow-hidden border bg-gray-50 transition-all ${idx === detailImageIndex ? 'border-teal-400 ring-2 ring-teal-300/60 ring-offset-2 ring-offset-white' : 'border-gray-200'}`}
                      >
                        {img.image ? (
                          <img
                            src={img.image.startsWith('http') ? img.image : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.image}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Content */}
              <div className="p-6 space-y-5 bg-white flex-1 min-h-0 overflow-y-auto">
                {(() => {
                  const { minDasar, maxDasar, minJasa, maxJasa } = getProductPriceRange(selectedProduk);
                  const formatRange = (min: number, max: number) => {
                    if (min === max) return formatIDR(min);
                    return `${formatIDR(min)} - ${formatIDR(max)}`;
                  };
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rentang Harga Dasar</p>
                        <p className="text-xs font-black text-gray-800">{formatRange(minDasar, maxDasar)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rentang Biaya Jasa</p>
                        <p className="text-xs font-black text-gray-800">{formatRange(minJasa, maxJasa)}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Variasi Pilihan Bahan Baku</p>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {selectedProduk.bahan_bakus?.map(bb => (
                      <div key={bb.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-teal-100 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-gray-700">{bb.nama_bahan_baku}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                            Dasar: {formatIDR(bb.harga_dasar)} | Jasa: {formatIDR(bb.harga_jasa)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Harga Varian</span>
                          <span className="text-xs font-black text-teal-600">{formatIDR(bb.harga_dasar + bb.harga_jasa)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setIsDetailOpen(false)} className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-100">
                  Tutup Detail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isImagePreviewOpen} onOpenChange={handleImagePreviewOpenChange}>
        <DialogContent showCloseButton={false} className="max-w-[92vw] max-h-[92vh] p-0 border-none bg-transparent shadow-none">
          {imagePreviewUrl && (
            <div className="relative">
              <img
                src={imagePreviewUrl}
                className="max-h-[92vh] max-w-[92vw] object-contain rounded-xl"
              />
              <button
                type="button"
                onClick={() => setIsImagePreviewOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                aria-label="Tutup gambar"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
