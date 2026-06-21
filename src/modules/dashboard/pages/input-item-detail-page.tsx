import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Pencil, Box, Package, Hammer, Ruler, ClipboardList, 
  User, Building2, Calendar, FileClock, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  nama_perusahaan?: string;
  jenis_interior: string;
  created_at: string;
}

interface DesainFinal {
  id: number;
  status: string;
  response_time: string | null;
  marketing_response_time: string | null;
}

interface RoomBahanBaku {
  id: number;
  bahan_baku_id: number;
  nama_bahan: string;
}

interface RoomFinishing {
  id: number;
  item_id: number;
  nama_item: string;
  notes: string;
}

interface RoomAksesoris {
  id: number;
  item_id: number;
  nama_item: string;
  qty: number;
  notes: string;
}

interface RoomResponse {
  id: number;
  nama_ruangan: string;
  produk_id: number | null;
  nama_produk: string;
  qty: number;
  panjang: number;
  lebar: number;
  tinggi: number;
  bahan_bakus: RoomBahanBaku[];
  finishing_dalams: RoomFinishing[];
  finishing_luars: RoomFinishing[];
  aksesoris: RoomAksesoris[];
}

interface InputItemPlan {
  id: number;
  desain_final_id: number;
  order_id: number;
  status: 'draft' | 'approved';
  response_time: string | null;
  response_by: string | null;
  marketing_response_time: string | null;
  marketing_response_by: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
  desain_final?: DesainFinal;
  rooms: RoomResponse[];
}

export default function InputItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string | null) => void }>();

  const [plan, setPlan] = useState<InputItemPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);

  useEffect(() => {
    if (plan && plan.order) {
      setPageTitle(plan.order.nama_project);
    }
    return () => {
      setPageTitle(null);
    };
  }, [plan, setPageTitle]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/input-items/${id}`);
      setPlan(res.data.data);
      setActiveRoomIdx(0);
    } catch {
      toast.error('Gagal memuat detail rencana item');
      navigate('/dashboard/input-item');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500 font-semibold text-xs animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin rounded-full text-teal-500 mb-3" />
        Memuat detail rencana item...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16 max-w-md mx-auto space-y-4">
        <AlertCircle className="mx-auto text-red-500" size={40} />
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold text-gray-800">Rencana Tidak Ditemukan</h2>
          <p className="text-xs text-gray-400">Data rencana item ini mungkin sudah dihapus atau tautan tidak valid.</p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/input-item')} 
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs h-9 rounded-xl"
        >
          Kembali ke Rencana
        </Button>
      </div>
    );
  }

  const activeRoom = plan.rooms[activeRoomIdx];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard/input-item')}
            className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors mb-1.5 self-start"
          >
            <ChevronLeft size={12} strokeWidth={2.5} /> Kembali ke Rencana
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
              <ClipboardList size={22} className="text-teal-500" /> Detail Rincian Item
            </h1>
            <span className="font-mono text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-0.5 rounded-full">
              {plan.order?.nomor_order}
            </span>
            {plan.status === 'approved' ? (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                SELESAI
              </span>
            ) : (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-amber-50 text-amber-600 border-amber-200">
                DRAFT
              </span>
            )}
          </div>
          {plan.order && (
            <p className="text-xs text-gray-500 font-medium">
              Project: <span className="font-bold text-gray-800">{plan.order.nama_project}</span> &bull; Client:{' '}
              <span className="font-bold text-gray-700">{plan.order.nama_customer}</span>
            </p>
          )}
        </div>

        <Button
          onClick={() => navigate(`/dashboard/input-item/${plan.id}/edit`)}
          className="h-9 font-extrabold text-xs px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10 flex items-center gap-1.5 self-start md:self-auto"
        >
          <Pencil size={14} /> Edit Rincian Item
        </Button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (span 4): Project Info and Room Switcher */}
        <div className="lg:col-span-4 space-y-6">
          {/* Project Details Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/40 border-b border-gray-50 px-5 py-4">
              <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest">Informasi Project</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Building2 size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Project Name</span>
                  <span className="font-bold text-gray-800">{plan.order?.nama_project}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <User size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer</span>
                  <span className="font-semibold text-gray-700">
                    {plan.order?.nama_customer}
                    {plan.order?.nama_perusahaan && ` (${plan.order.nama_perusahaan})`}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Package size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tipe Interior</span>
                  <span className="font-semibold text-gray-700 uppercase">{plan.order?.jenis_interior}</span>
                </div>
              </div>

              <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Dibuat: {formatDate(plan.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium -mt-2">
                <div className="flex items-center gap-1">
                  <FileClock size={12} />
                  <span>Update: {formatDate(plan.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Switcher Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/40 border-b border-gray-50 px-5 py-4">
              <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest">Daftar Ruangan ({plan.rooms.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              {plan.rooms.map((room, idx) => {
                const isActive = idx === activeRoomIdx;
                return (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoomIdx(idx)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 flex items-center justify-between border ${
                      isActive 
                        ? 'bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/25 scale-[1.01]' 
                        : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50/70 hover:translate-x-0.5'
                    }`}
                  >
                    <div className="space-y-0.5 truncate flex-1 pr-2">
                      <span className="font-extrabold text-xs block">{room.nama_ruangan}</span>
                      <span className={`text-[10px] block truncate font-medium ${isActive ? 'text-teal-50' : 'text-gray-400'}`}>
                        {room.nama_produk || 'Produk belum dipilih'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {room.qty} Pcs
                      </span>
                      <ArrowRight size={12} className={isActive ? 'opacity-100 translate-x-0.5 transition-transform' : 'opacity-30'} />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (span 8): Detailed Room View */}
        <div className="lg:col-span-8">
          {activeRoom ? (
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden border-t-4 border-t-teal-500">
              {/* Active Room Title */}
              <CardHeader className="bg-gray-50/30 border-b border-gray-50 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-gray-800 tracking-tight">{activeRoom.nama_ruangan}</h2>
                  <p className="text-xs text-teal-600 font-bold flex items-center gap-1">
                    <Package size={13} /> {activeRoom.nama_produk || 'Produk belum dipilih'}
                  </p>
                </div>
                <div className="bg-teal-50 border border-teal-100 text-teal-600 rounded-2xl px-4 py-1.5 text-center shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider block leading-none mb-0.5">Total Quantity</span>
                  <span className="font-extrabold text-sm leading-none">{activeRoom.qty} Unit</span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                
                {/* Metric Dimensions */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                    <Ruler size={13} className="text-teal-500" /> Dimensi & Ukuran Ruang
                  </span>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50/50 border border-gray-100 p-3.5 rounded-2xl text-center space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Panjang</span>
                      <span className="font-extrabold text-base text-gray-800 block">
                        {activeRoom.panjang ? `${activeRoom.panjang} m` : '-'}
                      </span>
                    </div>
                    <div className="bg-gray-50/50 border border-gray-100 p-3.5 rounded-2xl text-center space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Lebar</span>
                      <span className="font-extrabold text-base text-gray-800 block">
                        {activeRoom.lebar ? `${activeRoom.lebar} m` : '-'}
                      </span>
                    </div>
                    <div className="bg-gray-50/50 border border-gray-100 p-3.5 rounded-2xl text-center space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Tinggi</span>
                      <span className="font-extrabold text-base text-gray-800 block">
                        {activeRoom.tinggi ? `${activeRoom.tinggi} m` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selected Raw Materials (Bahan Baku) */}
                <div className="space-y-2.5 pt-2 border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                    <Hammer size={13} className="text-teal-500" /> Bahan Baku Terpilih
                  </span>
                  {activeRoom.bahan_bakus.length === 0 ? (
                    <div className="text-xs text-gray-400 italic bg-gray-50/30 py-3 px-4 rounded-xl border border-dashed border-gray-100">
                      Tidak ada bahan baku spesifik yang dipilih untuk produk ini.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {activeRoom.bahan_bakus.map(bb => (
                        <div 
                          key={bb.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-teal-100 bg-teal-50/30 text-teal-700 text-xs font-bold shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                          {bb.nama_bahan || `Bahan Baku ID ${bb.bahan_baku_id}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Finishings Detail Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                  
                  {/* Finishing Dalam */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                      <Hammer size={13} className="text-teal-500" /> Finishing Dalam
                    </span>
                    
                    <div className="space-y-2.5">
                      {activeRoom.finishing_dalams.map(fd => (
                        <div key={fd.id} className="p-3.5 bg-gray-50/40 border border-gray-100 rounded-2xl space-y-1">
                          <span className="text-xs font-extrabold text-gray-800 block">
                            {fd.nama_item || fd.nama_item || `Item ID ${fd.item_id}`}
                          </span>
                          <p className="text-[10px] text-gray-500 leading-relaxed italic">
                            Catatan: {fd.notes || 'Tidak ada catatan spesifikasi'}
                          </p>
                        </div>
                      ))}
                      {activeRoom.finishing_dalams.length === 0 && (
                        <div className="text-center py-6 border border-dashed border-gray-100 rounded-2xl text-[10px] text-gray-400 italic">
                          Belum ada finishing dalam yang dipilih
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Finishing Luar */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                      <Hammer size={13} className="text-purple-500" /> Finishing Luar
                    </span>
                    
                    <div className="space-y-2.5">
                      {activeRoom.finishing_luars.map(fl => (
                        <div key={fl.id} className="p-3.5 bg-gray-50/40 border border-gray-100 rounded-2xl space-y-1">
                          <span className="text-xs font-extrabold text-gray-800 block">
                            {fl.nama_item || fl.nama_item || `Item ID ${fl.item_id}`}
                          </span>
                          <p className="text-[10px] text-gray-500 leading-relaxed italic">
                            Catatan: {fl.notes || 'Tidak ada catatan spesifikasi'}
                          </p>
                        </div>
                      ))}
                      {activeRoom.finishing_luars.length === 0 && (
                        <div className="text-center py-6 border border-dashed border-gray-100 rounded-2xl text-[10px] text-gray-400 italic">
                          Belum ada finishing luar yang dipilih
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Accessories (Aksesoris) Section */}
                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                    <Box size={13} className="text-blue-500" /> Aksesoris Tambahan
                  </span>

                  <div className="space-y-2.5">
                    {activeRoom.aksesoris.map(ak => (
                      <div 
                        key={ak.id} 
                        className="p-4 bg-gray-50/40 border border-gray-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-gray-800 block">
                            {ak.nama_item || ak.nama_item || `Item ID ${ak.item_id}`}
                          </span>
                          <p className="text-[10px] text-gray-500 italic">
                            Catatan: {ak.notes || 'Tidak ada catatan'}
                          </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 text-blue-600 rounded-xl px-3.5 py-1 text-center shrink-0 flex items-center gap-1 self-start sm:self-auto">
                          <span className="text-[9px] font-black uppercase tracking-wider">Qty:</span>
                          <span className="font-extrabold text-xs">{ak.qty} Unit</span>
                        </div>
                      </div>
                    ))}
                    {activeRoom.aksesoris.length === 0 && (
                      <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl text-[10px] text-gray-400 italic">
                        Tidak ada aksesoris tambahan yang dimasukkan
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 text-gray-400 text-xs italic bg-white rounded-2xl border border-gray-100 shadow-sm">
              Tidak ada data ruangan yang tersedia. Silakan hubungi desainer atau admin.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
