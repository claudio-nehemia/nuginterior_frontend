import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ArrowLeft, Save, Check, FileSpreadsheet, Plus, Trash2, Calendar, ClipboardList, Info, ChevronDown, Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/modules/auth/store/auth.store';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  alamat: string;
  tahapan_proyek: string;
  pic_name?: string;
  product_count?: number;
}

interface WorkplanStageMaster {
  id: number;
  code: string;
  name: string;
  percentage: number;
  sort_order: number;
}

interface WorkplanStage {
  id: number;
  workplan_id: number;
  input_item_room_id: number;
  stage_master_id: number;
  percentage: number;
  start_date: string | null; // format YYYY-MM-DD
  end_date: string | null;   // format YYYY-MM-DD
  notes: string;
  room_name: string;
  product_name: string;
  product_dims: string;
  stage_master?: WorkplanStageMaster;
}

interface Workplan {
  id: number;
  order_id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  response_by: string | null;
  response_time: string | null;
  order?: Order;
  stages: WorkplanStage[];
  extension_status?: string;
  extension_notes?: string;
  extension_days?: number;
}

export default function WorkplanFormPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isShowMode = searchParams.get('show') === 'true';

  const [wp, setWp] = useState<Workplan | null>(null);

  // User authentication context
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role?.nama_role === 'Super Admin' || user?.role?.nama_role === 'Admin';

  // Timeline Extension Modal State
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionNotes, setExtensionNotes] = useState('');
  const [extensionDays, setExtensionDays] = useState<number>(1);
  const [stages, setStages] = useState<WorkplanStage[]>([]);
  const [stageMasters, setStageMasters] = useState<WorkplanStageMaster[]>([]);
  const [policy, setPolicy] = useState('split_equally');
  
  // Overall dates
  const [projStartDate, setProjStartDate] = useState('');
  const [projEndDate, setProjEndDate] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

  // Room-level timeline helper UI states
  const [timelineHelperOpen, setTimelineHelperOpen] = useState<Record<string, boolean>>({});
  const [roomHelperDates, setRoomHelperDates] = useState<Record<string, Record<number, { startDate: string, endDate: string }>>>({});

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch settings to get redistribution policy
      try {
        const resSettings = await api.get('/settings');
        const policySetting = resSettings.data.data?.find((s: any) => s.key === 'workplan_stage_deletion_policy');
        if (policySetting) {
          setPolicy(policySetting.value);
        }
      } catch (err) {
        console.warn('Failed to load settings policy, using split_equally', err);
      }

      // 2. Fetch full stage master templates from Settings
      try {
        const resMasters = await api.get('/settings/workplan-stages');
        const masters: WorkplanStageMaster[] = resMasters.data.data || [];
        setStageMasters(masters.sort((a, b) => a.sort_order - b.sort_order));
      } catch (err) {
        console.warn('Failed to load stage master templates from settings', err);
      }

      // 3. Fetch workplan details
      const res = await api.get(`/workplans/order/${orderId}`);
      const data: Workplan = res.data.data;
      setWp(data);
      setStages(data.stages || []);
      
      setProjStartDate(data.start_date ? data.start_date.split('T')[0] : '');
      setProjEndDate(data.end_date ? data.end_date.split('T')[0] : '');

      // Expand all rooms by default
      const rooms: Record<string, boolean> = {};
      data.stages.forEach(s => {
        rooms[s.room_name] = true;
      });
      setExpandedRooms(rooms);

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat detail workplan');
      navigate('/dashboard/workplan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  // Calculations
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const dynamicProjDuration = calculateDuration(projStartDate, projEndDate);

  // Group stages by Room and Product
  const groupedRooms: Record<string, Record<number, {
    inputItemRoomId: number;
    productName: string;
    productDims: string;
    stages: WorkplanStage[];
  }>> = {};

  stages.forEach(stg => {
    if (!groupedRooms[stg.room_name]) {
      groupedRooms[stg.room_name] = {};
    }
    if (!groupedRooms[stg.room_name][stg.input_item_room_id]) {
      groupedRooms[stg.room_name][stg.input_item_room_id] = {
        inputItemRoomId: stg.input_item_room_id,
        productName: stg.product_name,
        productDims: stg.product_dims,
        stages: []
      };
    }
    groupedRooms[stg.room_name][stg.input_item_room_id].stages.push(stg);
  });

  // Sort stages inside each product by stage_master sort_order
  Object.keys(groupedRooms).forEach(roomName => {
    Object.keys(groupedRooms[roomName]).forEach(roomId => {
      groupedRooms[roomName][Number(roomId)].stages.sort((a, b) => {
        return (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0);
      });
    });
  });

  // Stage changes handlers
  const handleStageFieldChange = (roomId: number, stageMasterId: number, field: keyof WorkplanStage, value: any) => {
    setStages(prev => {
      let updated = prev.map(s => {
        if (s.input_item_room_id === roomId && s.stage_master_id === stageMasterId) {
          return { ...s, [field]: value };
        }
        return s;
      });

      // Auto-cascade: when end_date changes, set the next stage's start_date
      if (field === 'end_date' && value) {
        const productStages = updated
          .filter(s => s.input_item_room_id === roomId)
          .sort((a, b) => (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0));

        const currentIndex = productStages.findIndex(s => s.stage_master_id === stageMasterId);
        if (currentIndex !== -1 && currentIndex < productStages.length - 1) {
          const nextStage = productStages[currentIndex + 1];
          updated = updated.map(s => {
            if (s.input_item_room_id === roomId && s.stage_master_id === nextStage.stage_master_id) {
              return { ...s, start_date: value };
            }
            return s;
          });
        }
      }

      return updated;
    });
  };

  // Stage redistribution calculation logic
  const calculateStagePercentages = (
    activeStageMasterIds: number[],
    allMasters: WorkplanStageMaster[],
    currentPolicy: string
  ): Record<number, number> => {
    const percentages: Record<number, number> = {};

    activeStageMasterIds.forEach(id => {
      const master = allMasters.find(m => m.id === id);
      percentages[id] = master ? master.percentage : 0;
    });

    if (activeStageMasterIds.length === 0) return percentages;

    const skippedStages = allMasters.filter(m => !activeStageMasterIds.includes(m.id));

    skippedStages.forEach(skipped => {
      const skippedPct = skipped.percentage;
      if (skippedPct <= 0) return;

      if (currentPolicy === 'split_equally') {
        const share = skippedPct / activeStageMasterIds.length;
        activeStageMasterIds.forEach(id => {
          percentages[id] = (percentages[id] || 0) + share;
        });
      } else if (currentPolicy === 'transfer_to_next') {
        const idx = allMasters.findIndex(m => m.id === skipped.id);
        let targetId: number | null = null;
        for (let i = idx + 1; i < allMasters.length; i++) {
          if (activeStageMasterIds.includes(allMasters[i].id)) {
            targetId = allMasters[i].id;
            break;
          }
        }
        if (targetId === null) {
          for (let i = idx - 1; i >= 0; i--) {
            if (activeStageMasterIds.includes(allMasters[i].id)) {
              targetId = allMasters[i].id;
              break;
            }
          }
        }
        if (targetId !== null) {
          percentages[targetId] = (percentages[targetId] || 0) + skippedPct;
        }
      } else if (currentPolicy === 'transfer_to_previous') {
        const idx = allMasters.findIndex(m => m.id === skipped.id);
        let targetId: number | null = null;
        for (let i = idx - 1; i >= 0; i--) {
          if (activeStageMasterIds.includes(allMasters[i].id)) {
            targetId = allMasters[i].id;
            break;
          }
        }
        if (targetId === null) {
          for (let i = idx + 1; i < allMasters.length; i++) {
            if (activeStageMasterIds.includes(allMasters[i].id)) {
              targetId = allMasters[i].id;
              break;
            }
          }
        }
        if (targetId !== null) {
          percentages[targetId] = (percentages[targetId] || 0) + skippedPct;
        }
      }
    });

    activeStageMasterIds.forEach(id => {
      percentages[id] = Math.round(percentages[id] * 100) / 100;
    });

    return percentages;
  };

  const applyRedistribution = (
    allStages: WorkplanStage[],
    roomId: number,
    currentPolicy: string,
    allMasters: WorkplanStageMaster[]
  ) => {
    const productStages = allStages.filter(s => s.input_item_room_id === roomId);
    if (productStages.length === 0) return allStages;

    const activeMasterIds = productStages.map(s => s.stage_master_id);
    const recalculated = calculateStagePercentages(activeMasterIds, allMasters, currentPolicy);

    return allStages.map(s => {
      if (s.input_item_room_id === roomId) {
        return {
          ...s,
          percentage: recalculated[s.stage_master_id] || 0
        };
      }
      return s;
    });
  };

  // Delete stage handler (red x)
  const handleDeleteStage = (roomId: number, stageMasterId: number) => {
    setStages(prev => {
      const remaining = prev.filter(s => !(s.input_item_room_id === roomId && s.stage_master_id === stageMasterId));
      return applyRedistribution(remaining, roomId, policy, stageMasters);
    });
    toast.success('Tahapan berhasil dilewati');
  };

  // Re-add stage handler
  const handleAddStage = (roomId: number, roomName: string, productName: string, productDims: string, master: WorkplanStageMaster) => {
    const exists = stages.some(s => s.input_item_room_id === roomId && s.stage_master_id === master.id);
    if (exists) return;

    const newStage: WorkplanStage = {
      id: 0,
      workplan_id: wp?.id || 0,
      input_item_room_id: roomId,
      stage_master_id: master.id,
      percentage: master.percentage,
      start_date: null,
      end_date: null,
      notes: '',
      room_name: roomName,
      product_name: productName,
      product_dims: productDims,
      stage_master: master
    };

    setStages(prev => {
      const updated = [...prev, newStage];
      return applyRedistribution(updated, roomId, policy, stageMasters);
    });
    toast.success(`Berhasil menambahkan kembali tahapan ${master.name}`);
  };

  // Room helper change handlers
  const handleRoomHelperDateChange = (roomName: string, stageMasterId: number, field: 'startDate' | 'endDate', value: string) => {
    setRoomHelperDates(prev => {
      const updated = {
        ...prev,
        [roomName]: {
          ...(prev[roomName] || {}),
          [stageMasterId]: {
            ...(prev[roomName]?.[stageMasterId] || { startDate: '', endDate: '' }),
            [field]: value
          }
        }
      };

      // Auto-cascade: when endDate changes, set next stage master's startDate
      if (field === 'endDate' && value) {
        const sortedMasters = [...stageMasters].sort((a, b) => a.sort_order - b.sort_order);
        const currentIndex = sortedMasters.findIndex(m => m.id === stageMasterId);
        if (currentIndex !== -1 && currentIndex < sortedMasters.length - 1) {
          const nextMaster = sortedMasters[currentIndex + 1];
          updated[roomName] = {
            ...updated[roomName],
            [nextMaster.id]: {
              ...(updated[roomName]?.[nextMaster.id] || { startDate: '', endDate: '' }),
              startDate: value
            }
          };
        }
      }

      return updated;
    });
  };

  const handleClearRoomStageHelper = (roomName: string, stageMasterId: number) => {
    setRoomHelperDates(prev => ({
      ...prev,
      [roomName]: {
        ...(prev[roomName] || {}),
        [stageMasterId]: { startDate: '', endDate: '' }
      }
    }));
  };

  const handleApplyRoomStage = (roomName: string, stageMasterId: number) => {
    const dates = roomHelperDates[roomName]?.[stageMasterId];
    if (!dates || (!dates.startDate && !dates.endDate)) {
      toast.error('Harap isi tanggal mulai atau selesai terlebih dahulu');
      return;
    }
    setStages(prev => prev.map(s => {
      if (s.room_name === roomName && s.stage_master_id === stageMasterId) {
        return {
          ...s,
          start_date: dates.startDate || null,
          end_date: dates.endDate || null
        };
      }
      return s;
    }));
    toast.success('Tanggal untuk tahapan ini berhasil diterapkan');
  };

  const handleApplyAllRoomStages = (roomName: string) => {
    const helperMap = roomHelperDates[roomName];
    if (!helperMap || Object.keys(helperMap).length === 0) {
      toast.error('Harap isi minimal satu tanggal tahapan terlebih dahulu');
      return;
    }
    setStages(prev => prev.map(s => {
      if (s.room_name === roomName) {
        const dates = helperMap[s.stage_master_id];
        if (dates && (dates.startDate || dates.endDate)) {
          return {
            ...s,
            start_date: dates.startDate || s.start_date,
            end_date: dates.endDate || s.end_date
          };
        }
      }
      return s;
    }));
    toast.success('Semua timeline berhasil diterapkan ke semua produk di ruangan');
  };

  // Submit & Save Handlers
  const handleSave = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      const confirmSubmit = window.confirm('Apakah Anda yakin ingin mengirim workplan ini? Setelah dikirim, data workplan akan dikunci dan tahapan proyek akan berlanjut ke Produksi.');
      if (!confirmSubmit) return;
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

    try {
      // Map stages back to request format
      const payloadStages = stages.map(s => ({
        input_item_room_id: s.input_item_room_id,
        stage_master_id: s.stage_master_id,
        percentage: s.percentage,
        start_date: s.start_date ? s.start_date.split('T')[0] : null,
        end_date: s.end_date ? s.end_date.split('T')[0] : null,
        notes: s.notes
      }));

      const payload = {
        status,
        start_date: projStartDate || null,
        end_date: projEndDate || null,
        stages: payloadStages
      };

      await api.put(`/workplans/${wp?.id}`, payload);
      toast.success(status === 'submitted' ? 'Workplan berhasil disubmit dan dikunci' : 'Draft workplan berhasil disimpan');
      
      if (status === 'submitted') {
        navigate('/dashboard/workplan');
      } else {
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan workplan');
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  // Timeline Extension request & decision handlers
  const handleRequestExtension = async () => {
    if (!extensionNotes) {
      toast.error('Alasan perpanjangan harus diisi');
      return;
    }
    if (extensionDays <= 0) {
      toast.error('Jumlah hari perpanjangan minimal 1 hari');
      return;
    }

    try {
      const res = await api.post(`/workplans/${wp?.id}/request-extension`, {
        notes: extensionNotes,
        days: extensionDays
      });
      setWp(res.data.data);
      setIsExtensionModalOpen(false);
      setExtensionNotes('');
      setExtensionDays(1);
      toast.success('Pengajuan perpanjangan timeline berhasil dikirim');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengajukan perpanjangan');
    }
  };

  const handleExtensionDecision = async (action: 'approve' | 'reject') => {
    try {
      const res = await api.post(`/workplans/${wp?.id}/handle-extension`, {
        action
      });
      setWp(res.data.data);
      toast.success(action === 'approve' ? 'Perpanjangan timeline disetujui, workplan di-unlock!' : 'Perpanjangan timeline ditolak');
      if (action === 'approve') {
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan keputusan');
    }
  };

  const handleExportExcel = async () => {
    if (!wp) return;
    try {
      const response = await api.get(`/workplans/${wp.id}/excel`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Workplan_${wp.order?.nomor_order}.xlsx`;
      link.click();
      toast.success('Excel berhasil didownload');
    } catch {
      toast.error('Gagal mendownload Excel');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="animate-spin text-teal-500" size={30} />
        <span className="text-sm font-extrabold">Memuat detail workplan proyek...</span>
      </div>
    );
  }

  const order = wp?.order;
  const isReadOnly = isShowMode || wp?.status === 'submitted';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/dashboard/workplan')}
            variant="outline"
            className="h-9 w-9 p-0 border-gray-100 hover:bg-gray-50 rounded-xl"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
              <ClipboardList size={18} className="text-teal-500" /> 
              {isReadOnly ? 'Detail Workplan Proyek' : 'Kelola Workplan Proyek'}
            </h1>
            <p className="text-xs font-semibold text-gray-400">
              Project: <span className="text-gray-600 font-bold">{order?.nama_project}</span> | Client: <span className="text-gray-600 font-bold">{order?.nama_customer}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {wp && wp.id > 0 && (
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="h-9 border-gray-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 rounded-xl text-xs font-extrabold gap-1.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
            >
              <FileSpreadsheet size={14} /> Export Excel
            </Button>
          )}

          {/* Extension Request Actions */}
          {wp && wp.status === 'submitted' && (
            <>
              {(wp.extension_status === 'none' || wp.extension_status === 'rejected' || !wp.extension_status) ? (
                <Button 
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="h-9 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  <Calendar size={14} /> Ajukan Perpanjangan Timeline
                </Button>
              ) : wp.extension_status === 'pending' ? (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-1">
                  <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 px-2">
                    Pending Perpanjangan ({wp.extension_days} hari)
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <Button 
                        size="sm" 
                        onClick={() => handleExtensionDecision('approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 h-7 text-[10px] font-extrabold rounded-lg animate-pulse"
                      >
                        Terima
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleExtensionDecision('reject')}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 h-7 text-[10px] font-extrabold rounded-lg"
                      >
                        Tolak
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}

          {wp && wp.extension_status === 'approved' && wp.status === 'submitted' && (
            <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-1.5">
              Perpanjangan Disetujui ({wp.extension_days} hari)
            </span>
          )}

          {!isReadOnly && (
            <>
              <Button
                onClick={() => handleSave('draft')}
                disabled={isSaving || isSubmitting}
                variant="outline"
                className="h-9 border-gray-100 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100 rounded-xl text-xs font-extrabold gap-1.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Simpan Draft
              </Button>

              <Button
                onClick={() => handleSave('submitted')}
                disabled={isSaving || isSubmitting}
                className="h-9 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-extrabold gap-1.5 shadow-md shadow-teal-500/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Kirim Workplan
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Unlocked Draft Workplan Alert */}
      {wp && wp.status === 'draft' && wp.extension_status === 'approved' && (
        <Card className="p-4 border-amber-200 dark:border-amber-900 bg-amber-50/20 shadow-sm rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 h-5 w-5 shrink-0 animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Workplan Timeline sedang di-unlock (Draft)</h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Pengajuan perpanjangan timeline disetujui. Silakan perbarui jadwal pengerjaan produk Anda di bawah ini dan klik <strong>Kirim Workplan</strong> kembali agar pengerjaan progress dapat dilanjutkan.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Overview Metadata Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-teal-500" /> Detail Target Proyek
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Mulai Proyek</label>
                <Input
                  type="date"
                  value={projStartDate}
                  onChange={e => setProjStartDate(e.target.value)}
                  disabled={isReadOnly}
                  className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Selesai Proyek</label>
                <Input
                  type="date"
                  value={projEndDate}
                  onChange={e => setProjEndDate(e.target.value)}
                  disabled={isReadOnly}
                  className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs focus:ring-teal-400/20 focus:border-teal-400 font-semibold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duration box */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-teal-50 border-l-4 border-teal-500 overflow-hidden flex flex-col justify-center p-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Durasi Proyek</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-teal-900 tracking-tight">{dynamicProjDuration || wp?.duration_days || 0}</span>
              <span className="text-sm font-bold text-teal-700">Hari Kerja</span>
            </div>
            <p className="text-[10px] text-teal-600 font-medium leading-relaxed mt-1 flex items-center gap-1">
              <Info size={10} />
              Dihitung berdasarkan selang kalender target mulai dan selesai proyek.
            </p>
          </div>
        </Card>
      </div>

      {/* List Ruangan & Accordions */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Timeline Detail Per Ruangan & Produk</h3>
        {Object.keys(groupedRooms).length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-bold bg-white rounded-2xl border border-dashed border-gray-100">
            Tidak ada produk yang siap dikonfigurasi timeline workplan.
          </div>
        ) : (
          Object.keys(groupedRooms).map((roomName, idx) => {
            const isExpanded = expandedRooms[roomName] !== false;
            const roomProducts = groupedRooms[roomName];
            const isHelperOpen = !!timelineHelperOpen[roomName];

            return (
              <div key={roomName} className="border border-teal-100/40 bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all mb-4">
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedRooms(prev => ({ ...prev, [roomName]: !isExpanded }))}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50/40 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 bg-teal-500 text-white rounded-xl flex items-center justify-center font-bold text-xs tracking-tight shadow-md shadow-teal-500/10">
                      1.{idx + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-gray-800 tracking-tight">{roomName}</span>
                      <span className="text-[10px] text-gray-400 font-bold block">{Object.keys(roomProducts).length} produk - {Object.keys(roomProducts).length} unit</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineHelperOpen(prev => ({ ...prev, [roomName]: !isHelperOpen }));
                        }}
                        className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold px-3 py-1 flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)] mr-4"
                      >
                        <Calendar size={12} /> Atur Timeline Ruangan
                      </Button>
                    )}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-teal-500' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* Propagation Date Helper Banner */}
                    {!isReadOnly && isHelperOpen && (
                      <div className="p-5 border border-teal-100 bg-teal-50/15 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.01)] mb-6 space-y-4">
                        <div className="flex items-center gap-2 text-teal-800 font-extrabold text-xs mb-1">
                          <Calendar className="text-teal-500" size={14} />
                          Timeline per Tahapan (akan auto-fill ke semua produk di ruangan ini)
                        </div>
                        <div className="space-y-2.5">
                          {stageMasters.map(master => {
                            const helperVal = roomHelperDates[roomName]?.[master.id] || { startDate: '', endDate: '' };
                            return (
                              <div key={master.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-teal-50/30 last:border-b-0 gap-3">
                                <span className="w-40 text-xs font-bold text-teal-900">{master.name}</span>
                                <div className="flex items-center gap-2 flex-1 max-w-md">
                                  <Input
                                    type="date"
                                    value={helperVal.startDate}
                                    onChange={e => handleRoomHelperDateChange(roomName, master.id, 'startDate', e.target.value)}
                                    className="h-8 bg-white border border-teal-100/60 rounded-lg text-xs w-full sm:w-36 font-semibold"
                                  />
                                  <span className="text-teal-400 text-xs font-bold">→</span>
                                  <Input
                                    type="date"
                                    value={helperVal.endDate}
                                    onChange={e => handleRoomHelperDateChange(roomName, master.id, 'endDate', e.target.value)}
                                    className="h-8 bg-white border border-teal-100/60 rounded-lg text-xs w-full sm:w-36 font-semibold"
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => handleClearRoomStageHelper(roomName, master.id)}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors px-1"
                                  >
                                    Clear
                                  </button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApplyRoomStage(roomName, master.id)}
                                    className="h-7 bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-100/60 rounded-lg text-[10px] font-extrabold px-3.5 transition-colors"
                                  >
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          onClick={() => handleApplyAllRoomStages(roomName)}
                          className="h-10 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs rounded-xl w-full flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10 mt-4"
                        >
                          Apply Semua Timeline ke Produk
                        </Button>
                      </div>
                    )}

                    {/* Products Checklist Group */}
                    <div className="space-y-6">
                      {Object.values(roomProducts).map(product => {
                        // Find stages master templates that have been skipped/deleted for this product
                        const activeStageMasterIds = product.stages.map(s => s.stage_master_id);
                        const deletedStages = stageMasters.filter(m => !activeStageMasterIds.includes(m.id));

                        return (
                          <div key={product.inputItemRoomId} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/10">
                            {/* Product Header */}
                            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                              <div className="space-y-0.5">
                                <span className="text-xs font-extrabold text-gray-800 tracking-tight">{product.productName}</span>
                                <span className="text-[10px] text-gray-400 font-bold block">{product.productDims}</span>
                              </div>

                              {/* Re-add stages if any deleted */}
                              {!isReadOnly && deletedStages.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tambah Kembali Tahapan:</label>
                                  <div className="flex flex-wrap gap-1">
                                    {deletedStages.map(m => (
                                      <button
                                        key={m.id}
                                        onClick={() => handleAddStage(product.inputItemRoomId, roomName, product.productName, product.productDims, m)}
                                        className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-[9px] font-bold text-teal-600 rounded-full border border-teal-100 transition-colors"
                                      >
                                        <Plus size={8} /> {m.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Product Stages Table Grid */}
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader className="bg-white">
                                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                    <TableHead className="w-[180px] text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2 pl-4">Nama Tahapan</TableHead>
                                    <TableHead className="w-[160px] text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2">Tanggal Mulai</TableHead>
                                    <TableHead className="w-[160px] text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2">Tanggal Selesai</TableHead>
                                    <TableHead className="w-[100px] text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2 text-center">Durasi</TableHead>
                                    <TableHead className="text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2">Catatan / Keterangan</TableHead>
                                    {!isReadOnly && (
                                      <TableHead className="w-[50px] text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2 text-center pr-4">Aksi</TableHead>
                                    )}
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white">
                                  {product.stages.map(stage => {
                                    const start = stage.start_date ? stage.start_date.split('T')[0] : '';
                                    const end = stage.end_date ? stage.end_date.split('T')[0] : '';
                                    const dur = calculateDuration(start, end);

                                    return (
                                      <TableRow key={stage.stage_master_id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/20">
                                        <TableCell className="font-extrabold text-xs text-gray-700 py-3 pl-4 flex items-center gap-1.5 flex-wrap">
                                          <span>{stage.stage_master?.name}</span>
                                          <span className="text-[9px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded-full shrink-0">
                                            {stage.percentage}%
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <Input
                                            type="date"
                                            value={start}
                                            onChange={e => handleStageFieldChange(product.inputItemRoomId, stage.stage_master_id, 'start_date', e.target.value)}
                                            disabled={isReadOnly}
                                            className="h-8 bg-gray-50/40 border-gray-100 rounded-lg text-xs font-semibold"
                                          />
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <Input
                                            type="date"
                                            value={end}
                                            onChange={e => handleStageFieldChange(product.inputItemRoomId, stage.stage_master_id, 'end_date', e.target.value)}
                                            disabled={isReadOnly}
                                            className="h-8 bg-gray-50/40 border-gray-100 rounded-lg text-xs font-semibold"
                                          />
                                        </TableCell>
                                        <TableCell className="py-2 text-center text-xs font-bold text-gray-500">
                                          {dur > 0 ? `${dur} hari` : '-'}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <Input
                                            placeholder="Notes..."
                                            value={stage.notes}
                                            onChange={e => handleStageFieldChange(product.inputItemRoomId, stage.stage_master_id, 'notes', e.target.value)}
                                            disabled={isReadOnly}
                                            className="h-8 bg-gray-50/40 border-gray-100 rounded-lg text-xs"
                                          />
                                        </TableCell>
                                        {!isReadOnly && (
                                          <TableCell className="py-2 text-center pr-4">
                                            <button
                                              onClick={() => handleDeleteStage(product.inputItemRoomId, stage.stage_master_id)}
                                              title="Lewati tahapan ini"
                                              className="p-1.5 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Timeline Extension Request Modal */}
      {isExtensionModalOpen && wp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b dark:border-zinc-850 flex justify-between items-center bg-amber-50/30">
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-100 text-sm">Ajukan Perpanjangan Timeline</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Proyek: <span className="font-semibold text-teal-700 dark:text-teal-400">{order?.nama_project}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsExtensionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Jumlah Hari Perpanjangan (Hari)</label>
                <input
                  type="number"
                  min={1}
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-zinc-950 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Alasan Perpanjangan</label>
                <textarea
                  value={extensionNotes}
                  onChange={(e) => setExtensionNotes(e.target.value)}
                  placeholder="Tulis alasan perpanjangan timeline secara detail..."
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[100px] bg-white dark:bg-zinc-950 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="p-5 border-t dark:border-zinc-850 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExtensionModalOpen(false)}
                className="text-xs border-zinc-200 text-zinc-700 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-100"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleRequestExtension}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow"
              >
                Kirim Pengajuan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
