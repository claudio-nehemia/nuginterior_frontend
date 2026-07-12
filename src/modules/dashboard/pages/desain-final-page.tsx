import { useEffect, useState } from 'react';
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

import { Search, Sparkles, Eye, Pencil, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: number;
  user_id: number;
  name?: string;
  email?: string;
  role?: string;
}

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  tanggal_masuk_customer?: string | null;
  telepon_customer: string;
  email_customer: string;
  alamat: string;
  tahapan_proyek: string;
  payment_status: string;
  teams?: TeamMember[];
}

interface CommitmentFee {
  id: number;
  payment_status: string;
}

interface Moodboard {
  id: number;
  order_id: number;
  order?: Order;
  commitment_fee?: CommitmentFee;
}

interface DesainFinalFile {
  id: number;
  file_path: string;
  original_name: string;
  status: string;
  revisi: string;
}

interface DesainFinal {
  id: number;
  order_id: number;
  status: 'pending' | 'uploaded' | 'revision' | 'accepted';
  response_by: string | null;
  response_time: string | null;
  marketing_response_by: string | null;
  marketing_response_time: string | null;
  files?: DesainFinalFile[];
}

const jenisOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'custom', label: 'Custom' },
];

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

const formatResponseTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\./g, ':');
  } catch {
    return '';
  }
};

export default function DesainFinalPage() {
  const navigate = useNavigate();
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [desainFinals, setDesainFinals] = useState<DesainFinal[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [responseFilter, setResponseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true, marketing_response_enabled: true });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mbRes, dfRes, settingsRes] = await Promise.all([
        api.get('/moodboards'),
        api.get('/desain-finals'),
        api.get('/settings')
      ]);

      setMoodboards(mbRes.data.data || []);
      setDesainFinals(dfRes.data.data || []);

      const s: { key: string; value: string }[] = settingsRes.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
        marketing_response_enabled: s.find(x => x.key === 'marketing_response_enabled')?.value === 'true',
      });
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter moodboards that have paid commitment fee
  const activeMoodboards = moodboards.filter(m => m.commitment_fee && m.commitment_fee.payment_status === 'completed' && m.order);

  const serviceTypeOptions = (() => {
    const baseMap = new Map(jenisOptions.map(o => [o.value, o.label]));
    const fromData = activeMoodboards
      .map(m => m.order?.jenis_interior)
      .filter(Boolean) as string[];
    const extraValues = Array.from(new Set(fromData.filter(v => !baseMap.has(v)))).sort();
    return [
      ...jenisOptions,
      ...extraValues.map(v => ({ value: v, label: toTitleCase(v) })),
    ];
  })();

  const getDesainFinalForOrder = (orderId: number) => {
    return desainFinals.find(d => d.order_id === orderId);
  };

  const filteredItems = activeMoodboards.filter(m => {
    const project = m.order?.nama_project?.toLowerCase() || '';
    const customer = m.order?.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      m.order?.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const df = getDesainFinalForOrder(m.order!.id);
    const statusKey = df?.status || 'pending';
    const matchesStatus = statusFilter === 'all' || statusKey === statusFilter;

    const responseKey = df?.response_by ? 'done' : 'waiting';
    const matchesResponse = responseFilter === 'all' || responseKey === responseFilter;

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = m.order?.tanggal_masuk_customer;
      if (!orderDate) {
        matchesDate = false;
      } else {
        try {
          const isoDate = new Date(orderDate).toISOString().split('T')[0];
          if (startDate && isoDate < startDate) matchesDate = false;
          if (endDate && isoDate > endDate) matchesDate = false;
        } catch {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesServiceType && matchesStatus && matchesResponse && matchesDate;
  });

  const handleResponse = async (orderId: number) => {
    try {
      await api.post(`/desain-finals/${orderId}/response`);
      toast.success('Response desain final berhasil dicatat');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melakukan response');
    }
  };

  const handleCreateRedirect = async (orderId: number, existingDf?: DesainFinal) => {
    if (!existingDf || !existingDf.response_by) {
      // If response_enabled is false, we can initialize it automatically on click
      try {
        await api.post(`/desain-finals/${orderId}/response`);
        navigate(`/dashboard/desain-final/${orderId}/create`);
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || 'Gagal menginisialisasi desain final';
        toast.error(errMsg);
      }
    } else {
      navigate(`/dashboard/desain-final/${orderId}/create`);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Sparkles size={18} className="text-teal-500 animate-pulse" /> Desain Final
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola visual final blueprint proyek yang disetujui klien</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Proyek Selesai Commitment Fee</h2>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <Input
                placeholder="Cari project atau client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Service Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Service Type</label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Service" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua Service</SelectItem>
                  {serviceTypeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Desain Final */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Desain Final</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua Status</SelectItem>
                  <SelectItem value="pending" className="text-xs font-medium">Pending</SelectItem>
                  <SelectItem value="uploaded" className="text-xs font-medium">Uploaded</SelectItem>
                  <SelectItem value="revision" className="text-xs font-medium">Revision</SelectItem>
                  <SelectItem value="accepted" className="text-xs font-medium">Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Response */}
            {config.response_enabled && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Response</label>
                <Select value={responseFilter} onValueChange={setResponseFilter}>
                  <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                    <SelectValue placeholder="Semua Response" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                    <SelectItem value="all" className="text-xs font-medium">Semua Response</SelectItem>
                    <SelectItem value="waiting" className="text-xs font-medium">Menunggu</SelectItem>
                    <SelectItem value="done" className="text-xs font-medium">Sudah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tanggal Order Awal */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Order Awal</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600"
              />
            </div>

            {/* Tanggal Order Akhir */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Order Akhir</label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600"
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
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Project & Client</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status Desain Final</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Designer Assigned</TableHead>
                {(config.response_enabled || config.marketing_response_enabled) && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Response Status</TableHead>
                )}
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 5 : 4} className="text-center py-12 text-gray-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-teal-500" />
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 5 : 4} className="text-center py-12 text-gray-400 text-xs">Tidak ada proyek yang selesai commitment fee</TableCell>
                </TableRow>
              ) : (
                filteredItems.map(m => {
                  const order = m.order!;
                  const df = getDesainFinalForOrder(order.id);
                  
                  // Compute visual status
                  let statusLabel = 'pending';
                  let badgeStyle = 'bg-amber-50 text-amber-600 border-amber-200';
                  
                  if (df) {
                    if (df.status === 'accepted') {
                      statusLabel = 'accepted';
                      badgeStyle = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                    } else if (df.status === 'revision') {
                      statusLabel = 'revision';
                      badgeStyle = 'bg-red-50 text-red-600 border-red-200';
                    } else if (df.status === 'uploaded') {
                      statusLabel = 'uploaded';
                      badgeStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                    }
                  }

                  // Find Designer
                  const teams = order.teams || [];
                  const designer = teams.find(t => t.role?.toLowerCase() === 'desainer' || t.role?.toLowerCase() === 'designer');

                  // Check response status
                  const isAwaitingResponse = config.response_enabled && (!df || !df.response_by);

                  return (
                    <TableRow 
                      key={m.id} 
                      className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        if (df && df.files && df.files.length > 0) {
                          navigate(`/dashboard/desain-final/${order.id}`);
                        } else if (!isAwaitingResponse) {
                          navigate(`/dashboard/desain-final/${order.id}/create`);
                        }
                      }}
                    >
                      {/* Project & Client */}
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-gray-800 block">{order.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold block">{order.nama_customer} &bull; {order.nomor_order}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                          {statusLabel.toUpperCase()}
                        </span>
                      </TableCell>

                      {/* Designer Assigned */}
                      <TableCell className="py-4">
                        {designer ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-[9px] font-bold">
                              {designer.name ? designer.name[0].toUpperCase() : 'D'}
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{designer.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-medium">-</span>
                        )}
                      </TableCell>

                      {/* Response Status */}
                      {(config.response_enabled || config.marketing_response_enabled) && (
                        <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5">
                            {/* Designer Response */}
                            {config.response_enabled && (
                              df?.response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                  <Check size={11} className="stroke-[3]" /> {df.response_by.split('@')[0]} • {formatResponseTime(df.response_time)}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleResponse(order.id)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 transition-colors"
                                >
                                  Response Desainer
                                </button>
                              )
                            )}

                            {/* Marketing Response */}
                            {config.marketing_response_enabled && (
                              df?.marketing_response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                  <Check size={11} className="stroke-[3]" /> {df.marketing_response_by.split('@')[0]} • {formatResponseTime(df.marketing_response_time)}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 font-semibold italic block">
                                  Belum disetujui Marketing
                                </span>
                              )
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Actions */}
                      <TableCell className="text-right px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Show Detail Button if final design exists */}
                          {df && df.files && df.files.length > 0 && (
                            <button
                              onClick={() => navigate(`/dashboard/desain-final/${order.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Detail Desain Final"
                            >
                              <Eye size={14} />
                            </button>
                          )}

                          {/* Create/Edit Button */}
                          {isAwaitingResponse ? (
                            <span className="text-gray-400 text-[10px] font-semibold italic flex items-center gap-1">
                              <AlertCircle size={10} /> Awaiting Response
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleCreateRedirect(order.id, df)}
                              size="sm"
                              className={`h-8 font-extrabold text-[10px] px-3.5 rounded-lg transition-all ${
                                df && df.files && df.files.length > 0
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10'
                              }`}
                            >
                              {df && df.files && df.files.length > 0 ? (
                                <>
                                  <Pencil size={11} className="mr-1" /> Edit Desain
                                </>
                              ) : (
                                <>
                                  <Plus size={11} className="mr-1" /> Upload Desain
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
