import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ChevronLeft, Plus, Trash2, Search, Box, Hammer, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
}

interface DesainFinal {
  id: number;
  order_id: number;
  status: string;
}

interface ProdukBahanBaku {
  bahan_baku_id: number;
  nama_bahan_baku: string;
}

interface Product {
  id: number;
  nama_produk: string;
  bahan_bakus?: ProdukBahanBaku[];
}

interface MasterItem {
  id: number;
  nama_item: string;
  jenis_item: string;
}

interface RoomState {
  key: string; // unique key for UI rendering
  nama_ruangan: string;
  produk_id: string;
  qty: number | string;
  panjang: string;
  lebar: string;
  tinggi: string;
  selected_bahan_bakus: number[]; // bahan_baku_id list
  finishing_dalams: { item_id: number; nama: string; notes: string }[];
  finishing_luars: { item_id: number; nama: string; notes: string }[];
  aksesoris: { item_id: number; nama: string; qty: number | string; notes: string }[];
}

export default function InputItemFormPage() {
  const { desainFinalId, id } = useParams<{ desainFinalId?: string; id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string | null) => void }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [desainFinal, setDesainFinal] = useState<DesainFinal | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setPageTitle(isEditMode ? `Edit Rincian - ${order.nama_project}` : `Buat Rincian - ${order.nama_project}`);
    }
    return () => {
      setPageTitle(null);
    };
  }, [order, isEditMode, setPageTitle]);

  // Form state
  const [rooms, setRooms] = useState<RoomState[]>([]);

  // Item Search Dialog state
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoomIndex, setActiveRoomIndex] = useState<number | null>(null);
  const [activeItemType, setActiveItemType] = useState<'dalam' | 'luar' | 'aksesoris' | null>(null);

  const fetchMasterData = async () => {
    try {
      const [prodRes, itemsRes] = await Promise.all([
        api.get('/produk'),
        api.get('/items'),
      ]);
      setProducts(prodRes.data.data || []);
      setMasterItems(itemsRes.data.data || []);
    } catch {
      toast.error('Gagal memuat master data produk & item');
    }
  };

  const loadFormData = async () => {
    setIsLoading(true);
    await fetchMasterData();

    try {
      if (isEditMode) {
        // Edit Mode: fetch the input item plan
        const planRes = await api.get(`/input-items/${id}`);
        const planData = planRes.data.data;
        
        // Fetch order details
        const orderRes = await api.get(`/orders/${planData.order_id}`);
        setOrder(orderRes.data.data);

        // Fetch desain final
        const dfRes = await api.get('/desain-finals');
        const matchedDf = (dfRes.data.data || []).find((d: any) => d.id === planData.desain_final_id);
        setDesainFinal(matchedDf);

        // Map rooms to state
        const mappedRooms: RoomState[] = planData.rooms.map((r: any, idx: number) => ({
          key: `room_${idx}_${Date.now()}`,
          nama_ruangan: r.nama_ruangan,
          produk_id: r.produk_id ? String(r.produk_id) : '',
          qty: r.qty,
          panjang: String(r.panjang),
          lebar: String(r.lebar),
          tinggi: String(r.tinggi),
          selected_bahan_bakus: r.bahan_bakus.map((bb: any) => bb.bahan_baku_id),
          finishing_dalams: r.finishing_dalams.map((f: any) => ({
            item_id: f.item_id,
            nama: f.nama_item || '',
            notes: f.notes,
          })),
          finishing_luars: r.finishing_luars.map((f: any) => ({
            item_id: f.item_id,
            nama: f.nama_item || '',
            notes: f.notes,
          })),
          aksesoris: r.aksesoris.map((a: any) => ({
            item_id: a.item_id,
            nama: a.nama_item || '',
            qty: a.qty,
            notes: a.notes,
          })),
        }));
        setRooms(mappedRooms);
      } else {
        // Create Mode: fetch matching desain final
        const dfRes = await api.get('/desain-finals');
        const matchedDf = (dfRes.data.data || []).find((d: any) => d.id === Number(desainFinalId));
        
        if (!matchedDf) {
          toast.error('Desain final tidak ditemukan');
          navigate('/dashboard/input-item');
          return;
        }

        setDesainFinal(matchedDf);

        const orderRes = await api.get(`/orders/${matchedDf.order_id}`);
        setOrder(orderRes.data.data);

        // Initialize with one empty room
        setRooms([createEmptyRoom()]);
      }
    } catch (err) {
      toast.error('Gagal menginisialisasi form rincian item');
      navigate('/dashboard/input-item');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFormData();
  }, [desainFinalId, id]);

  const createEmptyRoom = (): RoomState => ({
    key: `room_${Math.random()}_${Date.now()}`,
    nama_ruangan: '',
    produk_id: '',
    qty: 1,
    panjang: '0',
    lebar: '0',
    tinggi: '0',
    selected_bahan_bakus: [],
    finishing_dalams: [],
    finishing_luars: [],
    aksesoris: [],
  });

  const handleAddRoom = () => {
    setRooms(prev => [...prev, createEmptyRoom()]);
    toast.success('Ruangan ditambahkan');
  };

  const handleRemoveRoom = (index: number) => {
    if (rooms.length === 1) {
      toast.error('Harap isi minimal 1 ruangan');
      return;
    }
    setRooms(prev => prev.filter((_, i) => i !== index));
  };

  const updateRoomField = (index: number, field: keyof RoomState, value: any) => {
    setRooms(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleProductChange = (index: number, val: string) => {
    const selectedProd = products.find(p => String(p.id) === val);
    
    // Default to select all raw material variants of the product initially
    const defaultBbs = selectedProd?.bahan_bakus?.map(bb => bb.bahan_baku_id) || [];

    setRooms(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        produk_id: val,
        selected_bahan_bakus: defaultBbs
      };
      return copy;
    });
  };

  const handleBahanBakuToggle = (roomIndex: number, bbId: number) => {
    setRooms(prev => {
      const copy = [...prev];
      const room = copy[roomIndex];
      const exists = room.selected_bahan_bakus.includes(bbId);
      
      const newBbs = exists
        ? room.selected_bahan_bakus.filter(id => id !== bbId)
        : [...room.selected_bahan_bakus, bbId];
        
      // Safely clone the room object immutably to trigger a React state re-render
      copy[roomIndex] = {
        ...room,
        selected_bahan_bakus: newBbs
      };
      return copy;
    });
  };

  // Open Item Search dialog for specific category
  const openItemSearch = (roomIdx: number, type: 'dalam' | 'luar' | 'aksesoris') => {
    setActiveRoomIndex(roomIdx);
    setActiveItemType(type);
    setSearchQuery('');
    setSearchDialogOpen(true);
  };

  const handleAddItemSelection = (item: MasterItem) => {
    if (activeRoomIndex === null || !activeItemType) return;

    setRooms(prev => {
      const copy = [...prev];
      const room = copy[activeRoomIndex];

      if (activeItemType === 'dalam') {
        const exists = room.finishing_dalams.some(f => f.item_id === item.id);
        if (!exists) {
          room.finishing_dalams = [...room.finishing_dalams, { item_id: item.id, nama: item.nama_item, notes: '' }];
        }
      } else if (activeItemType === 'luar') {
        const exists = room.finishing_luars.some(f => f.item_id === item.id);
        if (!exists) {
          room.finishing_luars = [...room.finishing_luars, { item_id: item.id, nama: item.nama_item, notes: '' }];
        }
      } else if (activeItemType === 'aksesoris') {
        const exists = room.aksesoris.some(a => a.item_id === item.id);
        if (!exists) {
          room.aksesoris = [...room.aksesoris, { item_id: item.id, nama: item.nama_item, qty: 1, notes: '' }];
        }
      }

      return copy;
    });

    setSearchDialogOpen(false);
  };

  const handleRemoveSubItem = (roomIndex: number, type: 'dalam' | 'luar' | 'aksesoris', subIndex: number) => {
    setRooms(prev => {
      const copy = [...prev];
      const room = copy[roomIndex];
      if (type === 'dalam') {
        room.finishing_dalams = room.finishing_dalams.filter((_, i) => i !== subIndex);
      } else if (type === 'luar') {
        room.finishing_luars = room.finishing_luars.filter((_, i) => i !== subIndex);
      } else if (type === 'aksesoris') {
        room.aksesoris = room.aksesoris.filter((_, i) => i !== subIndex);
      }
      return copy;
    });
  };

  const updateSubItemField = (
    roomIndex: number,
    type: 'dalam' | 'luar' | 'aksesoris',
    subIndex: number,
    field: string,
    val: any
  ) => {
    setRooms(prev => {
      const copy = [...prev];
      const room = copy[roomIndex];
      if (type === 'dalam') {
        room.finishing_dalams[subIndex] = { ...room.finishing_dalams[subIndex], [field]: val };
      } else if (type === 'luar') {
        room.finishing_luars[subIndex] = { ...room.finishing_luars[subIndex], [field]: val };
      } else if (type === 'aksesoris') {
        room.aksesoris[subIndex] = { ...room.aksesoris[subIndex], [field]: val };
      }
      return copy;
    });
  };

  const handleSave = async (status: 'draft' | 'approved') => {
    // Validation
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (!room.nama_ruangan.trim()) {
        toast.error(`Nama ruangan ke-${i + 1} tidak boleh kosong`);
        return;
      }
      
      if (status === 'approved') {
        if (!room.produk_id) {
          toast.error(`Pilih produk untuk ruangan: ${room.nama_ruangan}`);
          return;
        }
        if (Number(room.qty) <= 0) {
          toast.error(`Quantity untuk ruangan ${room.nama_ruangan} harus lebih dari 0`);
          return;
        }
        if (parseFloat(room.panjang) <= 0 || parseFloat(room.lebar) <= 0 || parseFloat(room.tinggi) <= 0) {
          toast.error(`Dimensi panjang, lebar, dan tinggi untuk ruangan ${room.nama_ruangan} harus diisi (lebih dari 0)`);
          return;
        }

        // Validate that a raw material is selected if the product has raw material options
        const selectedProd = products.find(p => String(p.id) === room.produk_id);
        const hasBahanBaku = selectedProd?.bahan_bakus && selectedProd.bahan_bakus.length > 0;
        if (hasBahanBaku && room.selected_bahan_bakus.length === 0) {
          toast.error(`Pilih minimal salah satu bahan baku untuk ruangan: ${room.nama_ruangan}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    const payload = {
      desain_final_id: desainFinal?.id,
      order_id: order?.id,
      status: status,
      rooms: rooms.map(r => ({
        nama_ruangan: r.nama_ruangan,
        produk_id: r.produk_id ? parseInt(r.produk_id) : null,
        qty: Number(r.qty) || 0,
        panjang: parseFloat(r.panjang) || 0,
        lebar: parseFloat(r.lebar) || 0,
        tinggi: parseFloat(r.tinggi) || 0,
        bahan_bakus: r.selected_bahan_bakus,
        finishing_dalams: r.finishing_dalams.map(fd => ({ item_id: fd.item_id, notes: fd.notes })),
        finishing_luars: r.finishing_luars.map(fl => ({ item_id: fl.item_id, notes: fl.notes })),
        aksesoris: r.aksesoris.map(ak => ({ item_id: ak.item_id, qty: Number(ak.qty), notes: ak.notes })),
      })),
    };

    try {
      if (isEditMode) {
        await api.put(`/input-items/${id}`, { status: payload.status, rooms: payload.rooms });
        toast.success(status === 'approved' ? 'Rincian item berhasil disetujui (Approved)' : 'Rincian item berhasil diperbarui (Draft)');
      } else {
        await api.post('/input-items', payload);
        toast.success(status === 'approved' ? 'Rincian item berhasil disetujui (Approved)' : 'Rincian item berhasil disimpan (Draft)');
      }
      navigate('/dashboard/input-item');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan rincian item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter master items for selection modal
  const filteredMasterItems = masterItems.filter(item => {
    const matchesSearch = item.nama_item.toLowerCase().includes(searchQuery.toLowerCase());
    
    let targetJenis = '';
    if (activeItemType === 'dalam') targetJenis = 'finishing_dalam';
    else if (activeItemType === 'luar') targetJenis = 'finishing_luar';
    else if (activeItemType === 'aksesoris') targetJenis = 'aksesoris';

    return matchesSearch && item.jenis_item === targetJenis;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-semibold text-xs animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin rounded-full text-teal-500 mr-2" />
        Memuat form data rincian item...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-5">
        <button
          onClick={() => navigate('/dashboard/input-item')}
          className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
        >
          <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Rencana
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
              {isEditMode ? 'Edit Rincian Item' : 'Buat Rincian Item'}
            </h1>
            {order && (
              <p className="text-xs text-gray-500 font-medium mt-1">
                Project: <span className="font-bold text-gray-800">{order.nama_project}</span> &bull; Client:{' '}
                <span className="font-bold text-gray-700">{order.nama_customer}</span> &bull; Order ID:{' '}
                <span className="font-mono bg-teal-50 text-teal-600 px-2 py-0.5 rounded border border-teal-100/50 font-bold">{order.nomor_order}</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={handleAddRoom}
            className="h-9 font-extrabold text-xs px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10 flex items-center gap-1.5"
          >
            <Plus size={14} /> Tambah Ruangan
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {rooms.map((room, roomIdx) => {
          const selectedProductObj = products.find(p => String(p.id) === room.produk_id);
          const availableBahanBakus = selectedProductObj?.bahan_bakus || [];

          return (
            <div key={room.key} className="space-y-4">
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden border-l-4 border-l-teal-500/40">
                <CardHeader className="bg-gray-50/40 border-b border-gray-50 flex flex-row items-center justify-between px-6 py-4">
                  <div className="flex-1 max-w-sm">
                    <Input
                      placeholder="Nama Ruangan (cth: Ruang Tamu)"
                      value={room.nama_ruangan}
                      onChange={e => updateRoomField(roomIdx, 'nama_ruangan', e.target.value)}
                      className="h-9 bg-white border-gray-200/80 rounded-xl text-xs font-bold focus:ring-teal-400/20"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(roomIdx)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Hapus Ruangan"
                  >
                    <Trash2 size={16} />
                  </button>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  {/* Product Select, Qty, and Dimensions */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Select Product */}
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Produk</label>
                      <Select value={room.produk_id} onValueChange={val => handleProductChange(roomIdx, val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-semibold text-gray-700">
                          <SelectValue placeholder="Pilih Produk Master" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl text-xs">
                          {products.map(p => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-xs font-medium">{p.nama_produk}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Quantity</label>
                      <Input
                        type="number"
                        min={0}
                        value={room.qty}
                        onChange={e => {
                          const val = e.target.value;
                          updateRoomField(roomIdx, 'qty', val === '' ? '' : (parseInt(val) || 0));
                        }}
                        className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Dimensions (Length, Width, Height) */}
                    <div className="md:col-span-6 grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Panjang (m)</label>
                        <Input
                          type="number"
                          step="any"
                          value={room.panjang}
                          onChange={e => updateRoomField(roomIdx, 'panjang', e.target.value)}
                          className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Lebar (m)</label>
                        <Input
                          type="number"
                          step="any"
                          value={room.lebar}
                          onChange={e => updateRoomField(roomIdx, 'lebar', e.target.value)}
                          className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Tinggi (m)</label>
                        <Input
                          type="number"
                          step="any"
                          value={room.tinggi}
                          onChange={e => updateRoomField(roomIdx, 'tinggi', e.target.value)}
                          className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bahan Baku Checkbox List */}
                  {room.produk_id && (
                    <div className="space-y-2 bg-gray-50/40 p-4 rounded-xl border border-gray-100/60">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Opsi Bahan Baku Produk</span>
                      {availableBahanBakus.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">Produk terpilih tidak memiliki variasi bahan baku master</p>
                      ) : (
                        <div className="flex flex-wrap gap-3 mt-1">
                          {availableBahanBakus.map(bb => {
                            const isChecked = room.selected_bahan_bakus.includes(bb.bahan_baku_id);
                            return (
                              <button
                                key={bb.bahan_baku_id}
                                type="button"
                                onClick={() => handleBahanBakuToggle(roomIdx, bb.bahan_baku_id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-teal-50/60 border-teal-400 text-teal-700 shadow-sm shadow-teal-500/5'
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
                                    : 'border-gray-300 bg-white'
                                }`}>
                                  {isChecked && <Check size={10} strokeWidth={3.5} />}
                                </div>
                                {bb.nama_bahan_baku}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-item categories (Finishing Dalam, Finishing Luar, Aksesoris) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-gray-50">
                    {/* Finishing Dalam */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Hammer size={12} className="text-teal-500" /> Finishing Dalam
                        </span>
                        <Button
                          type="button"
                          onClick={() => openItemSearch(roomIdx, 'dalam')}
                          variant="ghost"
                          className="h-6 text-[9px] font-bold text-teal-500 hover:text-teal-600 hover:bg-teal-50 p-1.5 rounded-md"
                        >
                          + Tambah
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {room.finishing_dalams.map((fd, fdIdx) => (
                          <div key={fd.item_id} className="p-3 bg-gray-50/50 border border-gray-100 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-700 truncate">{fd.nama}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubItem(roomIdx, 'dalam', fdIdx)}
                                className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                            <Input
                              placeholder="Catatan / spesifikasi..."
                              value={fd.notes}
                              onChange={e => updateSubItemField(roomIdx, 'dalam', fdIdx, 'notes', e.target.value)}
                              className="h-7 bg-white border-gray-100 rounded-lg text-[10px] font-medium"
                            />
                          </div>
                        ))}
                        {room.finishing_dalams.length === 0 && (
                          <div className="text-center py-4 border border-dashed border-gray-100 rounded-xl text-[10px] text-gray-400 italic">
                            Belum ada finishing dalam
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Finishing Luar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Hammer size={12} className="text-purple-500" /> Finishing Luar
                        </span>
                        <Button
                          type="button"
                          onClick={() => openItemSearch(roomIdx, 'luar')}
                          variant="ghost"
                          className="h-6 text-[9px] font-bold text-purple-500 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded-md"
                        >
                          + Tambah
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {room.finishing_luars.map((fl, flIdx) => (
                          <div key={fl.item_id} className="p-3 bg-gray-50/50 border border-gray-100 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-700 truncate">{fl.nama}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubItem(roomIdx, 'luar', flIdx)}
                                className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                            <Input
                              placeholder="Catatan / spesifikasi..."
                              value={fl.notes}
                              onChange={e => updateSubItemField(roomIdx, 'luar', flIdx, 'notes', e.target.value)}
                              className="h-7 bg-white border-gray-100 rounded-lg text-[10px] font-medium"
                            />
                          </div>
                        ))}
                        {room.finishing_luars.length === 0 && (
                          <div className="text-center py-4 border border-dashed border-gray-100 rounded-xl text-[10px] text-gray-400 italic">
                            Belum ada finishing luar
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Aksesoris */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Box size={12} className="text-blue-500" /> Aksesoris
                        </span>
                        <Button
                          type="button"
                          onClick={() => openItemSearch(roomIdx, 'aksesoris')}
                          variant="ghost"
                          className="h-6 text-[9px] font-bold text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md"
                        >
                          + Tambah
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {room.aksesoris.map((ak, akIdx) => (
                          <div key={ak.item_id} className="p-3 bg-gray-50/50 border border-gray-100 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-700 truncate">{ak.nama}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubItem(roomIdx, 'aksesoris', akIdx)}
                                className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-1">
                                <Input
                                  type="number"
                                  min={1}
                                  value={ak.qty}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateSubItemField(roomIdx, 'aksesoris', akIdx, 'qty', val === '' ? '' : (parseInt(val) || 1));
                                  }}
                                  className="h-7 bg-white border-gray-100 rounded-lg text-[10px] font-bold text-center px-1"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  placeholder="Notes..."
                                  value={ak.notes}
                                  onChange={e => updateSubItemField(roomIdx, 'aksesoris', akIdx, 'notes', e.target.value)}
                                  className="h-7 bg-white border-gray-100 rounded-lg text-[10px] font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {room.aksesoris.length === 0 && (
                          <div className="text-center py-4 border border-dashed border-gray-100 rounded-xl text-[10px] text-gray-400 italic">
                            Belum ada aksesoris
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UX Quick Add Room Button below each Card */}
              <div className="flex justify-center pt-1 pb-4">
                <Button
                  type="button"
                  onClick={handleAddRoom}
                  variant="outline"
                  className="h-8 text-[10px] font-black uppercase tracking-wider text-teal-600 border-dashed border-teal-200 hover:bg-teal-50/50 hover:border-teal-300 rounded-xl px-4 flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus size={11} /> Tambah Ruangan Baru
                </Button>
              </div>
            </div>
          );
        })}

        {/* Footer actions with separate Draft and Approve buttons */}
        <div className="flex gap-3 justify-end pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard/input-item')}
            disabled={isSubmitting}
            className="h-10 rounded-xl font-bold text-xs px-6 border border-gray-100 bg-white hover:bg-gray-50"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSubmitting}
            className="h-10 rounded-xl font-bold text-xs px-6 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/10"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan sebagai Draft'}
          </Button>
          <Button
            type="button"
            onClick={() => handleSave('approved')}
            disabled={isSubmitting}
            className="h-10 rounded-xl font-extrabold text-xs px-8 bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan & Approve'}
          </Button>
        </div>
      </div>

      {/* SEARCH SELECT DIALOG MODAL */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-[440px] rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-gray-800 flex items-center gap-1">
              <Search size={16} className="text-teal-500" />
              Pilih Item Master
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Cari dan tambahkan item untuk ruangan terpilih
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Cari item..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-semibold focus:ring-teal-400/20"
              autoFocus
            />
          </div>

          <div className="max-h-[260px] overflow-y-auto divide-y divide-gray-50 pr-1">
            {filteredMasterItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAddItemSelection(item)}
                className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-teal-50/30 hover:text-teal-600 transition-all text-xs font-bold text-gray-700 flex items-center justify-between"
              >
                <span>{item.nama_item}</span>
                <span className="text-[9px] bg-gray-100 text-gray-400 group-hover:bg-teal-100 group-hover:text-teal-600 px-2 py-0.5 rounded-full font-black">
                  {item.jenis_item.replace('_', ' ').toUpperCase()}
                </span>
              </button>
            ))}
            {filteredMasterItems.length === 0 && (
              <p className="text-center py-6 text-xs text-gray-400 italic">Item tidak ditemukan</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
