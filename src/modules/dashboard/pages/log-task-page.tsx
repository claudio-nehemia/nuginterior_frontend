import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Search, Clock, AlertTriangle, CheckCircle, RefreshCw, Calendar, User, Play, CheckCircle2, ChevronLeft, ChevronRight, Wrench
} from "lucide-react";
import { toast } from 'sonner';

interface LogTask {
  id: number;
  order_id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  stage: string;
  stage_label: string;
  created_at: string;
  touched_at: string | null;
  touched_by: string;
  completed_at: string | null;
  completed_by: string;
  deadline_days: number;
  deadline_time: string;
  is_late: boolean;
  late_days: number;
  duration_to_touch: string;
  duration_to_complete: string;
}

interface FlatProductStage {
  id: string;
  order_id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  pic_name: string;
  room_name: string;
  product_spec: string;
  active_stage_name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'completed' | 'ongoing';
  completed_at: string | null;
  completed_by: string | null;
  progress: number;
  days_left: number;
  is_late: boolean;
  late_days: number;
}

export default function LogTaskPage() {
  const [activeView, setActiveView] = useState<'order-stages' | 'workplan-stages'>('order-stages');
  
  // Tab 1 States (Order Stages)
  const [logs, setLogs] = useState<LogTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [latenessFilter, setLatenessFilter] = useState('all');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Tab 2 States (Workplan Stages)
  const [workplans, setWorkplans] = useState<any[]>([]);
  const [isWpLoading, setIsWpLoading] = useState(false);
  const [wpSearch, setWpSearch] = useState('');
  const [wpStatusFilter, setWpStatusFilter] = useState('all'); // all, ongoing, completed, late
  const [wpCurrentPage, setWpCurrentPage] = useState(1);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/log-tasks');
      if (response.data?.success) {
        setLogs(response.data.data || []);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      toast.error('Gagal memuat log task proyek');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkplans = async () => {
    setIsWpLoading(true);
    try {
      const response = await api.get('/workplans');
      if (response.data?.success) {
        const allWp: any[] = response.data.data || [];
        // Only submitted/complete workplans
        setWorkplans(allWp.filter(wp => wp.status === 'lengkap'));
      } else {
        setWorkplans([]);
      }
    } catch {
      toast.error('Gagal memuat data progress project management');
      setWorkplans([]);
    } finally {
      setIsWpLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (activeView === 'workplan-stages' && workplans.length === 0) {
      fetchWorkplans();
    }
  }, [activeView]);

  const handleRefresh = () => {
    if (activeView === 'order-stages') {
      fetchLogs();
    } else {
      fetchWorkplans();
    }
  };

  // Stage options for order logs filter
  const uniqueStages = Array.from(new Set(logs.map(l => JSON.stringify({ code: l.stage, label: l.stage_label }))))
    .map(s => JSON.parse(s))
    .sort((a, b) => a.label.localeCompare(b.label));

  // --- Filtering & Paginations ---
  
  // Tab 1 Filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.nama_project.toLowerCase().includes(search.toLowerCase()) ||
      log.nomor_order.toLowerCase().includes(search.toLowerCase()) ||
      log.nama_customer.toLowerCase().includes(search.toLowerCase()) ||
      log.stage_label.toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === 'all' || log.stage === selectedStage;
    const matchesLateness = 
      latenessFilter === 'all' || 
      (latenessFilter === 'late' && log.is_late) ||
      (latenessFilter === 'ontime' && !log.is_late);
    const matchesCompletion = 
      completionFilter === 'all' ||
      (completionFilter === 'ongoing' && !log.completed_at) ||
      (completionFilter === 'completed' && log.completed_at);

    return matchesSearch && matchesStage && matchesLateness && matchesCompletion;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Tab 2 Flat Stages list
  const getFlatProductStages = (): FlatProductStage[] => {
    const list: FlatProductStage[] = [];

    workplans.forEach(wp => {
      const order = wp.order;
      if (!order) return;

      const stages = wp.stages || [];
      const stagesByProduct: Record<number, any[]> = {};
      stages.forEach((stg: any) => {
        if (!stagesByProduct[stg.input_item_room_id]) {
          stagesByProduct[stg.input_item_room_id] = [];
        }
        stagesByProduct[stg.input_item_room_id].push(stg);
      });

      Object.entries(stagesByProduct).forEach(([prodIdStr, prodStages]) => {
        const prodId = Number(prodIdStr);
        const sortedStages = [...prodStages].sort(
          (a, b) => (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0)
        );

        if (sortedStages.length === 0) return;

        const firstStage = sortedStages[0];
        const roomName = firstStage.room_name;
        const productSpec = `${firstStage.product_name} (${firstStage.product_dims})`;

        const totalWeight = sortedStages.reduce((sum, s) => sum + s.percentage, 0);
        const completedWeight = sortedStages
          .filter(s => s.status === 'completed')
          .reduce((sum, s) => sum + s.percentage, 0);
        const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

        const activeIdx = sortedStages.findIndex(s => s.status !== 'completed');
        const isActiveFound = activeIdx !== -1;
        const activeStage = isActiveFound ? sortedStages[activeIdx] : sortedStages[sortedStages.length - 1];

        let isLate = false;
        let lateDays = 0;
        let daysLeft = 0;

        const status = isActiveFound ? 'ongoing' : 'completed';
        const activeStageName = isActiveFound ? (activeStage.stage_master?.name || 'Produksi') : 'Selesai';
        const startDate = isActiveFound ? activeStage.start_date : null;
        const endDate = isActiveFound ? activeStage.end_date : null;

        if (isActiveFound && activeStage.end_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const deadline = new Date(activeStage.end_date);
          deadline.setHours(0, 0, 0, 0);

          if (today > deadline) {
            isLate = true;
            const diffTime = Math.abs(today.getTime() - deadline.getTime());
            lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          } else {
            const diffTime = Math.abs(deadline.getTime() - today.getTime());
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }

        list.push({
          id: `${wp.id}-${prodId}`,
          order_id: wp.order_id,
          nomor_order: order.nomor_order,
          nama_project: order.nama_project,
          nama_customer: order.nama_customer,
          pic_name: order.pic_name || 'Belum Ditunjuk',
          room_name: roomName,
          product_spec: productSpec,
          active_stage_name: activeStageName,
          start_date: startDate,
          end_date: endDate,
          status,
          completed_at: !isActiveFound ? activeStage.completed_at : null,
          completed_by: !isActiveFound ? activeStage.completed_by : null,
          progress,
          days_left: daysLeft,
          is_late: isLate,
          late_days: lateDays
        });
      });
    });

    return list;
  };

  const flatWpStages = getFlatProductStages();

  const filteredWpStages = flatWpStages.filter(item => {
    const matchesSearch = 
      item.nama_project.toLowerCase().includes(wpSearch.toLowerCase()) ||
      item.nomor_order.toLowerCase().includes(wpSearch.toLowerCase()) ||
      item.nama_customer.toLowerCase().includes(wpSearch.toLowerCase()) ||
      item.room_name.toLowerCase().includes(wpSearch.toLowerCase()) ||
      item.product_spec.toLowerCase().includes(wpSearch.toLowerCase()) ||
      item.active_stage_name.toLowerCase().includes(wpSearch.toLowerCase()) ||
      item.pic_name.toLowerCase().includes(wpSearch.toLowerCase());

    const matchesStatus = 
      wpStatusFilter === 'all' ||
      (wpStatusFilter === 'ongoing' && item.status === 'ongoing' && !item.is_late) ||
      (wpStatusFilter === 'completed' && item.status === 'completed') ||
      (wpStatusFilter === 'late' && item.status === 'ongoing' && item.is_late);

    return matchesSearch && matchesStatus;
  });

  const wpTotalPages = Math.ceil(filteredWpStages.length / itemsPerPage);
  const currentWpStages = filteredWpStages.slice((wpCurrentPage - 1) * itemsPerPage, wpCurrentPage * itemsPerPage);

  // Formatting Helpers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '-');
  };

  const formatDateSimple = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'survey': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'moodboard': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'estimasi': return 'bg-violet-50 text-violet-600 border-violet-100';
      case 'cm_fee': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'desain_final': return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100';
      case 'input_item': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'rab': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'kontrak': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'invoice': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'survey_ulang': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'gambar_kerja': return 'bg-pink-50 text-pink-600 border-pink-100';
      case 'approval_material': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'workplan': return 'bg-slate-50 text-slate-600 border-slate-100';
      case 'operations': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'selesai': return 'bg-green-50 text-green-600 border-green-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  // Tab 1 Stats
  const totalCount = logs.length;
  const lateCount = logs.filter(l => l.is_late).length;
  const ongoingCount = logs.filter(l => !l.completed_at).length;
  const completedCount = logs.filter(l => l.completed_at).length;

  // Tab 2 Stats
  const wpTotalCount = flatWpStages.length;
  const wpActiveCount = flatWpStages.filter(i => i.status === 'ongoing').length;
  const wpCompletedCount = flatWpStages.filter(i => i.status === 'completed').length;
  const wpLateCount = flatWpStages.filter(i => i.status === 'ongoing' && i.is_late).length;
  const wpAvgProgress = flatWpStages.length > 0 
    ? Math.round(flatWpStages.reduce((sum, item) => sum + item.progress, 0) / flatWpStages.length) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Clock size={18} className="text-teal-500" /> Log Task & Progress
          </h1>
          <p className="text-xs font-medium text-gray-500">
            {activeView === 'order-stages' 
              ? 'Pantau waktu respon dan pengerjaan tahapan proyek utama dari survey hingga selesai'
              : 'Pantau status pengerjaan, penanggung jawab (PIC), dan deadline tahapan produksi lapangan (workplan)'
            }
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isWpLoading}
          className="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-teal-500 hover:bg-teal-50/50 shadow-sm transition-all duration-300 disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw size={14} className={(isLoading || isWpLoading) ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveView('order-stages')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeView === 'order-stages'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={13} />
          Log Tahapan Proyek
        </button>
        <button
          onClick={() => setActiveView('workplan-stages')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeView === 'workplan-stages'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wrench size={13} />
          Progres Produksi Lapangan
        </button>
      </div>

      {activeView === 'order-stages' ? (
        <>
          {/* Tab 1 Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Transisi</p>
                  <h3 className="text-lg font-extrabold text-gray-850 mt-0.5">{totalCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 animate-pulse">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tahap Terlambat</p>
                  <h3 className="text-lg font-extrabold text-red-500 mt-0.5">{lateCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <Play size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sedang Berjalan</p>
                  <h3 className="text-lg font-extrabold text-blue-600 mt-0.5">{ongoingCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tahap Selesai</p>
                  <h3 className="text-lg font-extrabold text-emerald-600 mt-0.5">{completedCount}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab 1 Table */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-gray-50 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">Data Log Aktivitas Proyek</h2>
                
                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <Input 
                    placeholder="Cari project, order, customer..." 
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-9 bg-gray-50/50 border-gray-150 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Filter dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tahapan:</span>
                  <select
                    value={selectedStage}
                    onChange={(e) => {
                      setSelectedStage(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-semibold text-gray-650"
                  >
                    <option value="all">Semua Tahapan</option>
                    {uniqueStages.map(stg => (
                      <option key={stg.code} value={stg.code}>{stg.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Waktu:</span>
                  <select
                    value={latenessFilter}
                    onChange={(e) => {
                      setLatenessFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-semibold text-gray-650"
                  >
                    <option value="all">Semua Status</option>
                    <option value="late">Terlambat (Late)</option>
                    <option value="ontime">Tepat Waktu / Aman</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pengerjaan:</span>
                  <select
                    value={completionFilter}
                    onChange={(e) => {
                      setCompletionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-semibold text-gray-650"
                  >
                    <option value="all">Semua Progres</option>
                    <option value="ongoing">Sedang Berjalan (Ongoing)</option>
                    <option value="completed">Sudah Selesai (Completed)</option>
                  </select>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-50 bg-gray-50/20 hover:bg-transparent">
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3.5 text-left">Project & Order</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Tahapan</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Mulai / Deadline</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Respon Awal (Touch)</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Penyelesaian (Complete)</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-center px-6 py-3.5">Status Akhir</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={14} className="animate-spin text-teal-500" />
                            <span>Sedang memuat data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : currentLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs font-semibold">
                          Tidak ditemukan log task yang cocok dengan kriteria filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentLogs.map((log) => {
                        const stageBadge = getStageBadgeColor(log.stage);
                        return (
                          <TableRow key={log.id} className="border-gray-50/50 hover:bg-gray-50/30 transition-colors group">
                            {/* Project Info */}
                            <TableCell className="px-6 py-4">
                              <div className="space-y-1">
                                <span className="font-extrabold text-xs text-gray-800 tracking-tight block">
                                  {log.nama_project}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-teal-50 hover:bg-teal-50 text-teal-600 border border-teal-100 font-bold px-1.5 h-4.5 rounded text-[9px] tracking-wide">
                                    {log.nomor_order}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {log.nama_customer}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Stage */}
                            <TableCell className="py-4">
                              <Badge className={`${stageBadge} border font-bold px-2 py-0.5 rounded-full text-[9px] tracking-wide`}>
                                {log.stage_label}
                              </Badge>
                            </TableCell>

                            {/* Start & Deadline */}
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                                  <Play size={10} className="text-blue-500 shrink-0" />
                                  <span>{formatDate(log.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-600">
                                  <Calendar size={10} className="text-teal-500 shrink-0" />
                                  <span>{formatDate(log.deadline_time)}</span>
                                  <span className="text-[9px] text-gray-400 font-medium font-mono">({log.deadline_days}h)</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Touch Info */}
                            <TableCell className="py-4">
                              {log.touched_at ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded px-1 py-0.2 max-w-[120px] truncate flex items-center gap-1" title={log.touched_by}>
                                      <User size={9} className="text-gray-400" />
                                      {log.touched_by.split('@')[0]}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium">
                                      {formatDate(log.touched_at)}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-semibold italic">
                                    Respon: <span className="text-gray-600 font-bold not-italic">{log.duration_to_touch}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] font-medium text-gray-400 italic">Belum disentuh</span>
                              )}
                            </TableCell>

                            {/* Completion Info */}
                            <TableCell className="py-4">
                              {log.completed_at ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded px-1 py-0.2 max-w-[120px] truncate flex items-center gap-1" title={log.completed_by}>
                                      <User size={9} className="text-gray-400" />
                                      {log.completed_by.split('@')[0]}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium">
                                      {formatDate(log.completed_at)}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-semibold italic">
                                    Durasi: <span className="text-gray-600 font-bold not-italic">{log.duration_to_complete}</span>
                                  </div>
                                </div>
                              ) : (
                                <Badge className="bg-blue-50/50 hover:bg-blue-50/50 text-blue-500 border border-blue-100/50 font-bold px-1.5 py-0.2 rounded text-[8px] uppercase tracking-widest animate-pulse">
                                  In Progress
                                </Badge>
                              )}
                            </TableCell>

                            {/* Lateness Status */}
                            <TableCell className="px-6 py-4 text-center">
                              {log.is_late ? (
                                <div className="inline-flex flex-col items-center gap-0.5">
                                  <Badge className="bg-red-50 hover:bg-red-50 text-red-600 border border-red-100 font-extrabold px-2 py-0.5 rounded-full text-[9px] tracking-wide gap-1">
                                    <AlertTriangle size={10} strokeWidth={2.5} />
                                    Late
                                  </Badge>
                                  <span className="text-[9px] text-red-500 font-bold font-mono">
                                    +{log.late_days} hari
                                  </span>
                                </div>
                              ) : (
                                <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold px-2 py-0.5 rounded-full text-[9px] tracking-wide gap-1">
                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                  On Time
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50">
                  <span className="text-xs font-semibold text-gray-400">
                    Menampilkan <span className="text-gray-700">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-gray-700">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari <span className="text-gray-700">{filteredLogs.length}</span> data
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-100 text-gray-500 hover:text-teal-500 hover:bg-teal-50/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10'
                            : 'border border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-150 text-gray-500 hover:text-teal-500 hover:bg-teal-50/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Tab 2 Stats (Workplan Progress) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Wrench size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Item Ruangan</p>
                  <h3 className="text-base font-extrabold text-gray-800 mt-0.5">{wpTotalCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 animate-pulse">
                  <Play size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pengerjaan Aktif</p>
                  <h3 className="text-base font-extrabold text-blue-600 mt-0.5">{wpActiveCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Terlambat (Late)</p>
                  <h3 className="text-base font-extrabold text-red-500 mt-0.5">{wpLateCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center shrink-0">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Selesai Produksi</p>
                  <h3 className="text-base font-extrabold text-emerald-600 mt-0.5">{wpCompletedCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rata-Rata Progres</p>
                  <h3 className="text-base font-extrabold text-amber-600 mt-0.5">{wpAvgProgress}%</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab 2 Table */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-gray-50 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">Status Pengerjaan Lapangan (Produksi Room)</h2>
                
                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <Input 
                    placeholder="Cari project, ruangan, PIC, tahapan..." 
                    value={wpSearch}
                    onChange={(e) => {
                      setWpSearch(e.target.value);
                      setWpCurrentPage(1);
                    }}
                    className="pl-9 h-9 bg-gray-50/50 border-gray-150 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Status filter dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filter Status:</span>
                <select
                  value={wpStatusFilter}
                  onChange={(e) => {
                    setWpStatusFilter(e.target.value);
                    setWpCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-semibold text-gray-650"
                >
                  <option value="all">Semua Status</option>
                  <option value="ongoing">Sedang Berjalan (Ongoing)</option>
                  <option value="completed">Selesai Produksi (Completed)</option>
                  <option value="late">Terlambat (Late)</option>
                </select>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-50 bg-gray-50/20 hover:bg-transparent">
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3.5 text-left">Project & Ruangan</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Item / Produk</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Tahapan Aktif (Next)</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">PIC / Penanggung Jawab</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3.5 text-left">Mulai / Deadline</th>
                      <th className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-center px-6 py-3.5">Status Produksi</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isWpLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={14} className="animate-spin text-teal-500" />
                            <span>Sedang memuat data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : currentWpStages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs font-semibold">
                          Tidak ditemukan progress pengerjaan ruangan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentWpStages.map((item) => {
                        return (
                          <TableRow key={item.id} className="border-gray-50/50 hover:bg-gray-50/30 transition-colors group">
                            {/* Project & Room */}
                            <TableCell className="px-6 py-4">
                              <div className="space-y-1">
                                <span className="font-extrabold text-xs text-gray-800 tracking-tight block">
                                  {item.nama_project}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className="bg-teal-50 text-teal-600 border border-teal-100 font-bold px-1.5 h-4.5 rounded text-[9px]">
                                    {item.nomor_order}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-gray-600 bg-gray-55/30 rounded px-1.5 py-0.2">
                                    {item.room_name}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Product Spec */}
                            <TableCell className="py-4">
                              <div className="text-xs font-semibold text-gray-700 max-w-[200px] truncate" title={item.product_spec}>
                                {item.product_spec}
                              </div>
                              <div className="text-[9px] text-gray-400 font-medium">
                                Klien: {item.nama_customer}
                              </div>
                            </TableCell>

                            {/* Active Next Stage */}
                            <TableCell className="py-4">
                              <div className="space-y-1.5">
                                <Badge className={`bg-teal-50 text-teal-700 border border-teal-100/50 font-bold px-2 py-0.5 rounded-full text-[9px] tracking-wide`}>
                                  {item.active_stage_name}
                                </Badge>
                                <div className="w-28 flex items-center gap-2">
                                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${item.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-bold text-gray-500 shrink-0">{item.progress}%</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* PIC */}
                            <TableCell className="py-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.8 rounded-lg bg-teal-50/50 border border-teal-100/50 text-teal-700 text-[10px] font-bold">
                                <User size={10} className="text-teal-500" />
                                {item.pic_name}
                              </span>
                            </TableCell>

                            {/* Start Date & Deadline */}
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                                  <Play size={10} className="text-blue-500 shrink-0" />
                                  <span>{formatDateSimple(item.start_date)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-650">
                                  <Calendar size={10} className="text-teal-500 shrink-0" />
                                  <span>{formatDateSimple(item.end_date)}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Status Production */}
                            <TableCell className="px-6 py-4 text-center">
                              {item.status === 'completed' ? (
                                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold px-2 py-0.5 rounded-full text-[9px] gap-1">
                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                  Selesai
                                </Badge>
                              ) : item.is_late ? (
                                <div className="inline-flex flex-col items-center gap-0.5">
                                  <Badge className="bg-red-50 text-red-600 border border-red-100 font-extrabold px-2 py-0.5 rounded-full text-[9px] gap-1">
                                    <AlertTriangle size={10} strokeWidth={2.5} />
                                    Late
                                  </Badge>
                                  <span className="text-[9px] text-red-500 font-bold font-mono">
                                    +{item.late_days} hari
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center gap-0.5">
                                  <Badge className="bg-blue-50 text-blue-600 border border-blue-100 font-extrabold px-2 py-0.5 rounded-full text-[9px] gap-1">
                                    <Play size={10} strokeWidth={2.5} />
                                    Berjalan
                                  </Badge>
                                  <span className="text-[9px] text-gray-400 font-medium">
                                    {item.days_left > 0 ? `${item.days_left} hari sisa` : 'Hari ini'}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Tab 2 Pagination */}
              {wpTotalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50">
                  <span className="text-xs font-semibold text-gray-405">
                    Menampilkan <span className="text-gray-700">{((wpCurrentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-gray-700">{Math.min(wpCurrentPage * itemsPerPage, filteredWpStages.length)}</span> dari <span className="text-gray-700">{filteredWpStages.length}</span> data
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setWpCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={wpCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-100 text-gray-500 hover:text-teal-500 hover:bg-teal-50/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: wpTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setWpCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          wpCurrentPage === page
                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10'
                            : 'border border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setWpCurrentPage(prev => Math.min(prev + 1, wpTotalPages))}
                      disabled={wpCurrentPage === wpTotalPages}
                      className="p-1.5 rounded-lg border border-gray-100 text-gray-500 hover:text-teal-500 hover:bg-teal-50/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
