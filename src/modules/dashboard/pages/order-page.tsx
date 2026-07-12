import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, ShoppingCart, Users, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  nama_perusahaan: string;
  project_status: string;
  priority_level: string;
  tahapan_proyek: string;
  payment_status: string;
  pic_id: number | null;
  tanggal_masuk_customer?: string | null;
  teams?: { id: number; user_id: number; name: string; role: string }[];
}

const tahapanOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'not_start', label: 'Not Start' },
  { value: 'survey', label: 'Survey' },
  { value: 'moodboard', label: 'Moodboard' },
  { value: 'estimasi', label: 'Estimasi' },
  { value: 'cm_fee', label: 'CM Fee' },
  { value: 'desain_final', label: 'Desain Final' },
  { value: 'input_item', label: 'Input Item' },
  { value: 'rab', label: 'RAB' },
  { value: 'kontrak', label: 'Kontrak' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'survey_ulang', label: 'Survey Ulang' },
  { value: 'gambar_kerja', label: 'Gambar Kerja' },
  { value: 'approval_material', label: 'Approval Material' },
  { value: 'workplan', label: 'Workplan' },
  { value: 'operations', label: 'Operations' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'batal', label: 'Batal' },
];

const tahapanStyles: Record<string, string> = {
  not_start: 'bg-gray-50 text-gray-600 border-gray-200',
  survey: 'bg-amber-50 text-amber-600 border-amber-100',
  moodboard: 'bg-purple-50 text-purple-600 border-purple-100',
  estimasi: 'bg-blue-50 text-blue-700 border-blue-100',
  cm_fee: 'bg-orange-50 text-orange-600 border-orange-100',
  desain_final: 'bg-pink-50 text-pink-600 border-pink-100',
  input_item: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
  rab: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  kontrak: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  invoice: 'bg-lime-50 text-lime-700 border-lime-200',
  survey_ulang: 'bg-amber-50 text-amber-700 border-amber-200',
  gambar_kerja: 'bg-violet-50 text-violet-600 border-violet-100',
  approval_material: 'bg-sky-50 text-sky-600 border-sky-100',
  workplan: 'bg-slate-50 text-slate-600 border-slate-200',
  operations: 'bg-teal-50 text-teal-600 border-teal-100',
  produksi: 'bg-teal-50 text-teal-600 border-teal-100',
  selesai: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  batal: 'bg-red-50 text-red-600 border-red-100',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-blue-50 text-blue-600 border-blue-100',
  medium: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  high: 'bg-red-50 text-red-600 border-red-100',
};

const projectStatusStyles: Record<string, string> = {
  pending: 'bg-gray-50 text-gray-600 border-gray-200',
  in_progress: 'bg-teal-50 text-teal-600 border-teal-100',
  deal: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancel: 'bg-red-50 text-red-600 border-red-100',
};

const paymentStyles: Record<string, string> = {
  not_start: 'bg-gray-50 text-gray-500 border-gray-200',
  cm_fee: 'bg-orange-50 text-orange-600 border-orange-100',
  dp: 'bg-blue-50 text-blue-600 border-blue-100',
  termin: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  lunas: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const projectStatusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'deal', label: 'Deal' },
  { value: 'cancel', label: 'Cancel' },
];

const paymentStatusOptions = [
  { value: 'all', label: 'Semua Payment' },
  { value: 'not_start', label: 'Not Start' },
  { value: 'cm_fee', label: 'CM Fee' },
  { value: 'dp', label: 'DP' },
  { value: 'termin', label: 'Termin' },
  { value: 'lunas', label: 'Lunas' },
];

const jenisLabels: Record<string, string> = {
  residential: 'Residential',
  apartment: 'Apartment',
  office: 'Office',
  retail: 'Retail',
  hospitality: 'Hospitality',
  custom: 'Custom',
};

const formatLabel = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function OrderPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [activeTahapan, setActiveTahapan] = useState('all');
  const [activePriority, setActivePriority] = useState('all');
  const [activeJenis, setActiveJenis] = useState('all');
  const [activeProjectStatus, setActiveProjectStatus] = useState('all');
  const [activePaymentStatus, setActivePaymentStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const response = await api.get('/orders/export/pdf', {
        params: {
          search,
          status: activeProjectStatus,
          tahapan_proyek: activeTahapan,
          payment_status: activePaymentStatus,
          priority_level: activePriority,
          jenis_interior: activeJenis,
          start_date: startDate,
          end_date: endDate,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Order_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF Laporan Order berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh PDF Laporan Order');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const response = await api.get('/orders/export/excel', {
        params: {
          search,
          status: activeProjectStatus,
          tahapan_proyek: activeTahapan,
          payment_status: activePaymentStatus,
          priority_level: activePriority,
          jenis_interior: activeJenis,
          start_date: startDate,
          end_date: endDate,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Order_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel Laporan Order berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh Excel Laporan Order');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/orders', { params: { search: search || undefined } });
      setOrders(res.data.data || []);
    } catch {
      toast.error('Gagal memuat data order');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchOrders(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Filter Tahapan
      if (activeTahapan !== 'all' && o.tahapan_proyek !== activeTahapan) return false;
      
      // 2. Filter Priority
      if (activePriority !== 'all' && o.priority_level !== activePriority) return false;
      
      // 3. Filter Jenis Interior
      if (activeJenis !== 'all' && o.jenis_interior !== activeJenis) return false;
      
      // 4. Filter Status Proyek
      if (activeProjectStatus !== 'all' && o.project_status !== activeProjectStatus) return false;

      // 5. Filter Payment Status
      if (activePaymentStatus !== 'all' && o.payment_status !== activePaymentStatus) return false;

      // 6. Filter Date Range (tanggal_masuk_customer)
      if (startDate || endDate) {
        if (!o.tanggal_masuk_customer) return false;
        try {
          const orderDate = new Date(o.tanggal_masuk_customer).toISOString().split('T')[0];
          if (startDate && orderDate < startDate) return false;
          if (endDate && orderDate > endDate) return false;
        } catch {
          return false;
        }
      }
      
      return true;
    });
  }, [orders, activeTahapan, activePriority, activeJenis, activeProjectStatus, activePaymentStatus, startDate, endDate]);



  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/orders/${deleteId}`);
      toast.success('Order berhasil dihapus');
      setDeleteId(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <ShoppingCart size={18} className="text-teal-500" /> Order
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola order proyek interior</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel */}
          <Button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            variant="outline"
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-700 h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {isExportingExcel ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Export Excel
          </Button>

          {/* Export PDF */}
          <Button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            variant="outline"
            className="border-rose-200 text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {isExportingPDF ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Export PDF
          </Button>

          {/* Tambah Order */}
          <Button
            onClick={() => navigate('/dashboard/order/create')}
            className="bg-teal-400 hover:bg-teal-500 text-white font-bold px-4 h-9 rounded-lg text-xs shadow-[0_8px_20px_-4px_rgba(52,211,153,0.5)] transition-all flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={2.5} />
            Tambah Order
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-4 border-b border-gray-50 bg-gray-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Order</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <Input
                placeholder="Cari order..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 bg-white border-gray-150 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 pt-1">
            {/* Filter Tahapan */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tahapan Proyek</label>
              <Select value={activeTahapan} onValueChange={setActiveTahapan}>
                <SelectTrigger className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700">
                  <SelectValue placeholder="Pilih Tahapan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {tahapanOptions.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs font-medium">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Priority */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Priority</label>
              <Select value={activePriority} onValueChange={setActivePriority}>
                <SelectTrigger className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700">
                  <SelectValue placeholder="Pilih Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-medium">Semua Priority</SelectItem>
                  <SelectItem value="low" className="text-xs font-medium">Low</SelectItem>
                  <SelectItem value="medium" className="text-xs font-medium">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs font-medium">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Jenis Interior */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Jenis Interior</label>
              <Select value={activeJenis} onValueChange={setActiveJenis}>
                <SelectTrigger className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700">
                  <SelectValue placeholder="Pilih Jenis" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-medium">Semua Jenis</SelectItem>
                  {Object.entries(jenisLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="text-xs font-medium">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status Proyek */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Proyek</label>
              <Select value={activeProjectStatus} onValueChange={setActiveProjectStatus}>
                <SelectTrigger className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {projectStatusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Payment Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Payment Status</label>
              <Select value={activePaymentStatus} onValueChange={setActivePaymentStatus}>
                <SelectTrigger className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700">
                  <SelectValue placeholder="Pilih Payment" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {paymentStatusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Tanggal Awal */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Awal</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700 w-full"
              />
            </div>

            {/* Filter Tanggal Akhir */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Akhir</label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 bg-white border-gray-150 rounded-xl text-xs font-bold text-gray-700 w-full"
                />
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }} 
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded bg-gray-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-50 hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">No. Order</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Project</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Jenis</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Tim</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Priority</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Tahapan</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Payment</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-400 text-xs">Loading data...</TableCell></TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-400 text-xs">Tidak ada order</TableCell></TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate('/dashboard/order/' + order.id + '/edit')}>
                      <TableCell className="font-mono text-[10px] font-bold text-teal-600 px-6 py-3 whitespace-nowrap">{order.nomor_order}</TableCell>
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-gray-700">{order.nama_project}</div>
                        <div className="text-[10px] text-gray-400">{order.nama_customer}</div>
                        {order.nama_perusahaan && <div className="text-[10px] text-gray-400">{order.nama_perusahaan}</div>}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-50 text-gray-600 border border-gray-100">
                          {jenisLabels[order.jenis_interior] || order.jenis_interior}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Users size={12} />
                          <span className="font-bold">{order.teams?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border ${priorityStyles[order.priority_level] || ''}`}>
                          {formatLabel(order.priority_level)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border ${tahapanStyles[order.tahapan_proyek] || ''}`}>
                          {formatLabel(order.tahapan_proyek)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border ${projectStatusStyles[order.project_status] || ''}`}>
                          {formatLabel(order.project_status)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border ${paymentStyles[order.payment_status] || ''}`}>
                          {formatLabel(order.payment_status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right px-6 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/dashboard/order/${order.id}/edit`)} className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-md transition-colors">
                            <Pencil size={14} strokeWidth={2} />
                          </button>
                          <button onClick={() => setDeleteId(order.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[360px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus Order</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Apakah Anda yakin ingin menghapus order ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-lg font-bold h-9 text-xs bg-red-400 hover:bg-red-500 text-white shadow-lg shadow-red-400/30">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
