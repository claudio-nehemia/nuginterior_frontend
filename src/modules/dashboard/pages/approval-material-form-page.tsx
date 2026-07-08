import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, API_BASE_URL } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ArrowLeft, Save, Check, FileDown, Plus, Trash2, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  alamat: string;
  tahapan_proyek: string;
}

interface ApprovalMaterialItem {
  id: number;
  approval_material_id: number;
  category: string;
  source_id: number;
  item_name: string;
  area: string;
  foto: string;
  kode_material: string[];
  brand_spek: string[];
  notes: string;
}

interface ApprovalMaterial {
  id: number;
  order_id: number;
  status: 'pending' | 'completed';
  response_by: string | null;
  order?: Order;
  items: ApprovalMaterialItem[];
}

export default function ApprovalMaterialFormPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isShowMode = searchParams.get('show') === 'true';

  const [am, setAm] = useState<ApprovalMaterial | null>(null);
  const [items, setItems] = useState<ApprovalMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingItemIds, setUploadingItemIds] = useState<Record<number, boolean>>({});

  const getFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/approval-materials/order/${orderId}`);
      const data: ApprovalMaterial = res.data.data;
      setAm(data);
      setItems(data.items || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat detail approval material');
      navigate('/dashboard/approval-material');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  // Form field update handlers
  const handleItemFieldChange = (itemId: number, field: keyof ApprovalMaterialItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Add specs/brand dynamically
  const handleAddBrandSpek = (itemId: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, brand_spek: [...(item.brand_spek || []), ''] };
      }
      return item;
    }));
  };

  const handleBrandSpekChange = (itemId: number, index: number, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const copy = [...item.brand_spek];
        copy[index] = value;
        return { ...item, brand_spek: copy };
      }
      return item;
    }));
  };

  const handleRemoveBrandSpek = (itemId: number, index: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, brand_spek: item.brand_spek.filter((_, idx) => idx !== index) };
      }
      return item;
    }));
  };

  // Add material codes dynamically
  const handleAddKodeMaterial = (itemId: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, kode_material: [...(item.kode_material || []), ''] };
      }
      return item;
    }));
  };

  const handleKodeMaterialChange = (itemId: number, index: number, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const copy = [...item.kode_material];
        copy[index] = value;
        return { ...item, kode_material: copy };
      }
      return item;
    }));
  };

  const handleRemoveKodeMaterial = (itemId: number, index: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, kode_material: item.kode_material.filter((_, idx) => idx !== index) };
      }
      return item;
    }));
  };

  // File upload handler per item
  const handleImageUpload = async (itemId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingItemIds(prev => ({ ...prev, [itemId]: true }));

    try {
      const formData = new FormData();
      formData.append('image', files[0]);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data?.data?.url;
      if (url) {
        handleItemFieldChange(itemId, 'foto', url);
        toast.success('Gambar material berhasil diunggah');
      }
    } catch {
      toast.error('Gagal mengunggah gambar material');
    } finally {
      setUploadingItemIds(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Submit / Save Handlers
  const handleSave = async (status: 'pending' | 'completed') => {
    if (!am) return;

    if (status === 'completed') {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

    try {
      // Map brand_spek and kode_material to filter out empty strings
      const cleanedItems = items.map(item => ({
        id: item.id,
        area: item.area || '',
        foto: item.foto || '',
        notes: item.notes || '',
        kode_material: (item.kode_material || []).filter(c => c.trim() !== ''),
        brand_spek: (item.brand_spek || []).filter(b => b.trim() !== ''),
      }));

      await api.put(`/approval-materials/${am.id}`, {
        status,
        items: cleanedItems,
      });

      toast.success(status === 'completed' ? 'Persetujuan material berhasil diselesaikan' : 'Draft berhasil disimpan');
      
      if (status === 'completed') {
        navigate('/dashboard/approval-material');
      } else {
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan persetujuan material');
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!am) return;
    try {
      const response = await api.get(`/approval-materials/${am.id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `approval_material_${am.order?.nomor_order}.pdf`;
      link.click();
      toast.success('File PDF berhasil didownload');
    } catch {
      toast.error('Gagal mendownload PDF approval material');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-2 text-gray-400">
        <Loader2 className="animate-spin text-teal-500" size={24} />
        <span className="text-xs font-bold">Memuat halaman approval material...</span>
      </div>
    );
  }

  // Filter items by category
  const bahanBaku = items.filter(it => it.category === 'bahan_baku');
  const finishing = items.filter(it => it.category === 'finishing_dalam' || it.category === 'finishing_luar' || it.category === 'finishing');
  const aksesoris = items.filter(it => it.category === 'aksesoris');

  const renderItemRow = (item: ApprovalMaterialItem, idx: number) => {
    const isUploading = !!uploadingItemIds[item.id];
    const brands = item.brand_spek || [];
    const codes = item.kode_material || [];

    return (
      <TableRow key={item.id} className="hover:bg-transparent border-b border-gray-100 last:border-b-0">
        {/* NO */}
        <TableCell className="align-top pt-4 text-xs font-bold text-gray-500 text-center w-12">{idx + 1}</TableCell>

        {/* NAMA ITEM */}
        <TableCell className="align-top pt-4 w-40 pr-3">
          <span className="text-xs font-extrabold text-gray-800 block leading-tight">{item.item_name}</span>
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mt-1">
            {item.category.replace('_', ' ')}
          </span>
        </TableCell>

        {/* FOTO */}
        <TableCell className="align-top pt-2 w-28">
          <div className="relative w-24 h-16 bg-gray-50 border border-dashed border-gray-200 rounded-lg overflow-hidden flex items-center justify-center group">
            {item.foto ? (
              <>
                <img src={getFileUrl(item.foto)} alt={item.item_name} className="w-full h-full object-cover" />
                {!isShowMode && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <label className="cursor-pointer bg-white text-gray-800 text-[8px] font-extrabold px-2 py-1 rounded shadow flex items-center gap-1">
                      <Upload size={8} /> Ubah
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(item.id, e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-0.5 p-1 text-center">
                {isUploading ? (
                  <Loader2 className="animate-spin text-teal-500" size={12} />
                ) : (
                  <ImageIcon className="text-gray-300" size={14} />
                )}
                <span className="text-[8px] text-gray-400 font-semibold">
                  {isUploading ? 'Uploading...' : 'No Photo'}
                </span>
                {!isShowMode && !isUploading && (
                  <label className="cursor-pointer bg-teal-50 text-teal-600 text-[8px] font-bold px-1.5 py-0.5 rounded hover:bg-teal-100 transition-colors">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(item.id, e.target.files)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </TableCell>

        {/* BRAND / SPESIFIKASI */}
        <TableCell className="align-top pt-2 w-48 space-y-1.5 pr-3">
          {brands.map((brand, bIdx) => (
            <div key={bIdx} className="flex items-center gap-1">
              <Input
                placeholder="Contoh: TACO, Huben"
                value={brand}
                disabled={isShowMode}
                onChange={e => handleBrandSpekChange(item.id, bIdx, e.target.value)}
                className="h-7 bg-gray-50/50 border-gray-100 rounded-md text-[11px] px-2 py-0.5"
              />
              {!isShowMode && (
                <button
                  onClick={() => handleRemoveBrandSpek(item.id, bIdx)}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 p-1 rounded shrink-0 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          {brands.length === 0 && (
            <span className="text-[10px] text-gray-400 italic block py-0.5">Belum ada spesifikasi</span>
          )}
          {!isShowMode && (
            <button
              onClick={() => handleAddBrandSpek(item.id)}
              className="text-teal-600 hover:bg-teal-50 hover:text-teal-700 text-[9px] font-bold flex items-center gap-0.5 py-1 px-1.5 rounded transition-all mt-1"
            >
              <Plus size={8} /> Tambah Spek
            </button>
          )}
        </TableCell>

        {/* KODE MATERIAL */}
        <TableCell className="align-top pt-2 w-48 space-y-1.5 pr-3">
          {codes.map((code, cIdx) => (
            <div key={cIdx} className="flex items-center gap-1">
              <Input
                placeholder="Contoh: TH 5027 NT"
                value={code}
                disabled={isShowMode}
                onChange={e => handleKodeMaterialChange(item.id, cIdx, e.target.value)}
                className="h-7 bg-gray-50/50 border-gray-100 rounded-md text-[11px] px-2 py-0.5"
              />
              {!isShowMode && (
                <button
                  onClick={() => handleRemoveKodeMaterial(item.id, cIdx)}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 p-1 rounded shrink-0 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          {codes.length === 0 && (
            <span className="text-[10px] text-gray-400 italic block py-0.5">Belum ada kode</span>
          )}
          {!isShowMode && (
            <button
              onClick={() => handleAddKodeMaterial(item.id)}
              className="text-teal-600 hover:bg-teal-50 hover:text-teal-700 text-[9px] font-bold flex items-center gap-0.5 py-1 px-1.5 rounded transition-all mt-1"
            >
              <Plus size={8} /> Tambah Kode
            </button>
          )}
        </TableCell>

        {/* AREA */}
        <TableCell className="align-top pt-2 w-40 pr-3">
          <Input
            placeholder="Contoh: Seluruh area"
            value={item.area || ''}
            disabled={isShowMode}
            onChange={e => handleItemFieldChange(item.id, 'area', e.target.value)}
            className="h-7 bg-gray-50/50 border-gray-100 rounded-md text-[11px] px-2"
          />
        </TableCell>

        {/* NOTES */}
        <TableCell className="align-top pt-2 w-48">
          <textarea
            placeholder="Catatan material..."
            value={item.notes || ''}
            disabled={isShowMode}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleItemFieldChange(item.id, 'notes', e.target.value)}
            className="w-full h-12 rounded-md border border-gray-100 bg-gray-50/50 text-[11px] p-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none placeholder:text-gray-400"
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <button
            onClick={() => navigate('/dashboard/approval-material')}
            className="flex items-center gap-1 text-[11px] font-extrabold text-teal-500 uppercase tracking-widest hover:text-teal-600 transition-colors mb-1"
          >
            <ArrowLeft size={12} /> Kembali
          </button>
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight">
            {isShowMode ? 'Detail Approval Material' : 'Isi Keterangan Material'}
          </h1>
          {am?.order && (
            <p className="text-xs font-semibold text-gray-500">
              Proyek: <span className="font-extrabold text-teal-600">{am.order.nama_project}</span> | Client: <span className="font-bold text-gray-700">{am.order.nama_customer}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isShowMode && am && (
            <Button
              onClick={handleExportPDF}
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold gap-1 shadow-md shadow-amber-500/20"
            >
              <FileDown size={14} /> Export PDF
            </Button>
          )}

          {!isShowMode && (
            <>
              <Button
                onClick={() => handleSave('pending')}
                disabled={isSaving || isSubmitting}
                variant="outline"
                className="h-9 border-gray-100 hover:bg-gray-50 rounded-xl text-xs font-bold gap-1 transition-all"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin text-teal-500" size={14} />
                ) : (
                  <Save size={14} className="text-gray-400" />
                )}
                Save Draft
              </Button>

              <Button
                onClick={() => handleSave('completed')}
                disabled={isSaving || isSubmitting}
                className="h-9 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold gap-1 shadow-md shadow-teal-500/20"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin text-white" size={14} />
                ) : (
                  <Check size={14} />
                )}
                Selesai & Submit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Categories Form */}
      <div className="space-y-6">
        {/* A. Bahan Baku */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest">A. Bahan Baku</h2>
            <span className="px-2 py-0.5 bg-teal-50 text-teal-600 font-bold text-[9px] rounded-full">
              {bahanBaku.length} Item
            </span>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            {bahanBaku.length > 0 ? (
              <Table>
                <TableHeader className="bg-gray-50/20">
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">No</TableHead>
                    <TableHead className="w-40 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nama Item</TableHead>
                    <TableHead className="w-28 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Foto</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Spesifikasi Brand</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Kode Material</TableHead>
                    <TableHead className="w-40 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Area Penggunaan</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bahanBaku.map((item, idx) => renderItemRow(item, idx))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-xs text-gray-400 italic">Tidak ada item bahan baku dalam perencanaan proyek ini.</p>
            )}
          </CardContent>
        </Card>

        {/* B. Finishing */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest">B. Finishing</h2>
            <span className="px-2 py-0.5 bg-teal-50 text-teal-600 font-bold text-[9px] rounded-full">
              {finishing.length} Item
            </span>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            {finishing.length > 0 ? (
              <Table>
                <TableHeader className="bg-gray-50/20">
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">No</TableHead>
                    <TableHead className="w-40 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nama Item</TableHead>
                    <TableHead className="w-28 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Foto</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Spesifikasi Brand</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Kode Material</TableHead>
                    <TableHead className="w-40 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Area Penggunaan</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishing.map((item, idx) => renderItemRow(item, idx))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-xs text-gray-400 italic">Tidak ada item finishing dalam perencanaan proyek ini.</p>
            )}
          </CardContent>
        </Card>

        {/* C. Aksesoris */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest">C. Aksesoris</h2>
            <span className="px-2 py-0.5 bg-teal-50 text-teal-600 font-bold text-[9px] rounded-full">
              {aksesoris.length} Item
            </span>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            {aksesoris.length > 0 ? (
              <Table>
                <TableHeader className="bg-gray-50/20">
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">No</TableHead>
                    <TableHead className="w-40 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nama Item</TableHead>
                    <TableHead className="w-28 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Foto</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Spesifikasi Brand</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Kode Material</TableHead>
                    <TableHead className="w-40 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Area Penggunaan</TableHead>
                    <TableHead className="w-48 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aksesoris.map((item, idx) => renderItemRow(item, idx))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-xs text-gray-400 italic">Tidak ada item aksesoris dalam perencanaan proyek ini.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
