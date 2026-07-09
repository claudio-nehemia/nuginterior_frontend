import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, ArrowRight, CheckCircle2, User, 
  Upload, X, Loader2, FolderOpen, Calendar, FileText, Edit, AlertTriangle,
  Download, Bug, Wrench, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { VoiceInput } from '@/components/voice-input';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  alamat: string;
  pic_name?: string;
  lama_kontrak?: string;
}

interface WorkplanStage {
  id: number;
  workplan_id: number;
  input_item_room_id: number;
  stage_master_id: number;
  percentage: number;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  photos: string; // comma-separated
  room_name: string;
  product_name: string;
  product_dims: string;
  qty: number;
  stage_master?: {
    id: number;
    code: string;
    name: string;
    percentage: number;
    sort_order: number;
  };
}

interface WorkplanDefect {
  id: number;
  workplan_stage_id: number;
  description: string;
  photos: string;
  status: string; // reported | fix_submitted | accepted | rejected
  fix_description: string;
  fix_photos: string;
  reported_by: string;
  fixed_by: string;
  reviewed_by: string;
  review_notes: string;
  reported_at: string | null;
  fixed_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  room_name?: string;
  product_name?: string;
  stage_name?: string;
}

interface Workplan {
  id: number;
  order_id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  order?: Order;
  stages?: WorkplanStage[];
  extension_status?: string;
  extension_notes?: string;
  extension_days?: number;
}

export default function ProjectProgressPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workplan, setWorkplan] = useState<Workplan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // User authentication context
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role?.nama_role === 'Super Admin' || user?.role?.nama_role === 'Admin';
  const canManageDefect = ['Super Admin', 'Project Manager', 'Supervisor'].includes(user?.role?.nama_role || '');
  
  // Active view: progress | defects
  const [activeView, setActiveView] = useState<'progress' | 'defects'>('progress');

  // AI Project Health Audit state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiHealthReport, setAiHealthReport] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Generate AI Project Health Analysis
  const handleGenerateAiHealth = async () => {
    setIsAiLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}/ai-health`);
      setAiHealthReport(res.data?.data?.health_report || '');
      setIsAiModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat audit kesehatan proyek AI. Pastikan OpenAI API Key sudah diatur.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Room and Product selection state
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Gallery active stage
  const [selectedStageForGallery, setSelectedStageForGallery] = useState<WorkplanStage | null>(null);

  // Modal stage completion state
  const [activeStageToComplete, setActiveStageToComplete] = useState<WorkplanStage | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingStage, setIsSubmittingStage] = useState(false);
  const [stageCompletionNotes, setStageCompletionNotes] = useState('');

  // "Catatan Pengerjaan Progress" Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesModalProductId, setNotesModalProductId] = useState<number | null>(null);

  // Timeline Extension Modal State
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionNotes, setExtensionNotes] = useState('');
  const [extensionDays, setExtensionDays] = useState<number>(1);

  // Defect Management State
  const [defects, setDefects] = useState<WorkplanDefect[]>([]);
  const [isReportDefectModalOpen, setIsReportDefectModalOpen] = useState(false);
  const [defectTargetStage, setDefectTargetStage] = useState<WorkplanStage | null>(null);
  const [defectDescription, setDefectDescription] = useState('');
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);
  const [activeDefectForFix, setActiveDefectForFix] = useState<WorkplanDefect | null>(null);
  const [fixDescription, setFixDescription] = useState('');
  const [fixPhotos, setFixPhotos] = useState<string[]>([]);
  const [isSubmittingFix, setIsSubmittingFix] = useState(false);
  const [isUploadingDefectPhoto, setIsUploadingDefectPhoto] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  // Resolve backend root (strip /api) to prevent broken uploads images
  const backendHost = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : '';

  const fetchWorkplanDetails = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/workplans/order/${orderId}`);
      const wp: Workplan = response.data.data;
      setWorkplan(wp);
      
      // Auto-select first room and product if not set
      if (wp.stages && wp.stages.length > 0) {
        const rooms = Array.from(new Set(wp.stages.map(s => s.room_name)));
        if (rooms.length > 0) {
          const firstRoom = rooms[0];
          setSelectedRoomName(firstRoom);

          const roomStages = wp.stages.filter(s => s.room_name === firstRoom);
          const productsInRoom = Array.from(
            new Map(roomStages.map(s => [s.input_item_room_id, s])).values()
          );
          if (productsInRoom.length > 0) {
            setSelectedProductId(productsInRoom[0].input_item_room_id);
          }
        }
      }

      // Fetch defects for this workplan
      if (wp.id) {
        try {
          const defectRes = await api.get(`/workplans/${wp.id}/defects`);
          setDefects(defectRes.data.data || []);
        } catch {
          // silently ignore defect fetch errors
        }
      }
    } catch {
      toast.error('Gagal memuat detail progress proyek');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: get active defect for a given stage ID
  const getStageActiveDefect = (stageId: number): WorkplanDefect | null => {
    return defects.find(d => d.workplan_stage_id === stageId && (d.status === 'reported' || d.status === 'fix_submitted')) || null;
  };

  // Defect photo upload
  const handleDefectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'defect' | 'fix') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingDefectPhoto(true);
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data?.data?.url) uploadedUrls.push(res.data.data.url);
      }
      if (target === 'defect') setDefectPhotos(prev => [...prev, ...uploadedUrls]);
      else setFixPhotos(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} foto berhasil diunggah`);
    } catch {
      toast.error('Gagal mengunggah foto');
    } finally {
      setIsUploadingDefectPhoto(false);
      e.target.value = '';
    }
  };

  // Submit defect report
  const handleReportDefectSubmit = async () => {
    if (!defectTargetStage || !defectDescription.trim()) {
      toast.error('Keterangan defect wajib diisi');
      return;
    }
    setIsSubmittingDefect(true);
    try {
      await api.post(`/workplans/stages/${defectTargetStage.id}/defects`, {
        description: defectDescription,
        photos: defectPhotos,
      });
      toast.success('Laporan defect berhasil dikirim!');
      setIsReportDefectModalOpen(false);
      setDefectTargetStage(null);
      setDefectDescription('');
      setDefectPhotos([]);
      fetchWorkplanDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim laporan defect');
    } finally {
      setIsSubmittingDefect(false);
    }
  };

  // Submit defect fix
  const handleSubmitFix = async () => {
    if (!activeDefectForFix || !fixDescription.trim()) {
      toast.error('Keterangan perbaikan wajib diisi');
      return;
    }
    setIsSubmittingFix(true);
    try {
      await api.put(`/workplans/defects/${activeDefectForFix.id}/fix`, {
        fix_description: fixDescription,
        fix_photos: fixPhotos,
      });
      toast.success('Laporan perbaikan berhasil dikirim!');
      setActiveDefectForFix(null);
      setFixDescription('');
      setFixPhotos([]);
      fetchWorkplanDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim perbaikan defect');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Review defect (admin only)
  const handleReviewDefect = async (defectId: number, action: 'accept' | 'reject') => {
    try {
      await api.put(`/workplans/defects/${defectId}/review`, {
        action,
        review_notes: reviewNotes,
      });
      toast.success(action === 'accept' ? 'Defect diterima — tahapan di-unlock!' : 'Defect ditolak, perlu upload ulang perbaikan');
      setReviewNotes('');
      fetchWorkplanDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereview defect');
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchWorkplanDetails();
    }
  }, [orderId]);

  // Set default gallery active stage when product changes
  useEffect(() => {
    if (selectedProductId && workplan?.stages) {
      const productStages = workplan.stages
        .filter(s => s.input_item_room_id === selectedProductId)
        .sort((a, b) => (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0));
      
      const completed = productStages.filter(s => s.status === 'completed');
      if (completed.length > 0) {
        setSelectedStageForGallery(completed[completed.length - 1]); // Show latest completed stage by default
      } else {
        setSelectedStageForGallery(null);
      }
    } else {
      setSelectedStageForGallery(null);
    }
  }, [selectedProductId, workplan]);

  // Handle changing room
  const handleRoomChange = (roomName: string) => {
    setSelectedRoomName(roomName);
    if (workplan?.stages) {
      const roomStages = workplan.stages.filter(s => s.room_name === roomName);
      const productsInRoom = Array.from(
        new Map(roomStages.map(s => [s.input_item_room_id, s])).values()
      );
      if (productsInRoom.length > 0) {
        setSelectedProductId(productsInRoom[0].input_item_room_id);
      } else {
        setSelectedProductId(null);
      }
    }
  };

  // Upload proof photos
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);

        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data?.data?.url) {
          uploadedUrls.push(res.data.data.url);
        }
      }
      setUploadedPhotos(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} foto berhasil diunggah`);
    } catch {
      toast.error('Gagal mengunggah beberapa foto');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const removeUploadedPhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Submit stage completion
  const handleCompleteStageSubmit = async () => {
    if (!activeStageToComplete) return;
    if (uploadedPhotos.length === 0) {
      toast.error('Harap unggah minimal 1 foto bukti');
      return;
    }

    setIsSubmittingStage(true);
    try {
      await api.post(`/workplans/stages/${activeStageToComplete.id}/complete`, {
        photos: uploadedPhotos,
        notes: stageCompletionNotes
      });
      toast.success('Tahapan berhasil diselesaikan!');
      setActiveStageToComplete(null);
      setUploadedPhotos([]);
      setStageCompletionNotes('');
      // Reload details to update UI progress
      fetchWorkplanDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyelesaikan tahapan');
    } finally {
      setIsSubmittingStage(false);
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
      const res = await api.post(`/workplans/${workplan?.id}/request-extension`, {
        notes: extensionNotes,
        days: extensionDays
      });
      setWorkplan(res.data.data);
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
      const res = await api.post(`/workplans/${workplan?.id}/handle-extension`, {
        action
      });
      setWorkplan(res.data.data);
      toast.success(action === 'approve' ? 'Perpanjangan timeline disetujui, workplan di-unlock!' : 'Perpanjangan timeline ditolak');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan keputusan');
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (!workplan) return;
    try {
      const response = await api.get(`/workplans/${workplan.id}/progress/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Progress_Report_${order.nomor_order}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF Progress Report berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh PDF Progress Report');
    }
  };

  const handleExportExcel = async () => {
    if (!workplan) return;
    try {
      const response = await api.get(`/workplans/${workplan.id}/progress/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Progress_Report_${order.nomor_order}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel Progress Report berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh Excel Progress Report');
    }
  };

  // Get all unique products in this workplan
  const getAllProducts = () => {
    if (!workplan?.stages) return [];
    const seen = new Set();
    const list: { id: number; productName: string; roomName: string }[] = [];
    workplan.stages.forEach(stage => {
      if (!seen.has(stage.input_item_room_id)) {
        seen.add(stage.input_item_room_id);
        list.push({
          id: stage.input_item_room_id,
          productName: stage.product_name,
          roomName: stage.room_name
        });
      }
    });
    return list;
  };

  // Overdue stage checks
  const isStageOverdue = (stage: WorkplanStage) => {
    if (stage.status === 'completed') return false;
    if (!stage.end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(stage.end_date);
    endDate.setHours(0, 0, 0, 0);
    return today > endDate;
  };

  // Find all overdue stages across all products in the workplan
  const getOverdueStages = () => {
    if (!workplan?.stages) return [];
    return workplan.stages.filter(isStageOverdue);
  };

  // Helper: Progress Calculations
  const getProductProgress = (productId: number): number => {
    if (!workplan?.stages) return 0;
    const stages = workplan.stages.filter(s => s.input_item_room_id === productId);
    if (stages.length === 0) return 0;

    const totalWeight = stages.reduce((sum, s) => sum + s.percentage, 0);
    const completedWeight = stages
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.percentage, 0);

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  const getRoomProgress = (roomName: string): number => {
    if (!workplan?.stages) return 0;
    const roomStages = workplan.stages.filter(s => s.room_name === roomName);
    if (roomStages.length === 0) return 0;

    // Distinct product IDs in this room
    const productIds = Array.from(new Set(roomStages.map(s => s.input_item_room_id)));
    if (productIds.length === 0) return 0;

    const totalProductProgress = productIds.reduce((sum, id) => sum + getProductProgress(id), 0);
    return Math.round(totalProductProgress / productIds.length);
  };

  const getTotalProjectProgress = (): number => {
    if (!workplan?.stages || workplan.stages.length === 0) return 0;
    
    // Distinct product IDs
    const productIds = Array.from(new Set(workplan.stages.map(s => s.input_item_room_id)));
    if (productIds.length === 0) return 0;

    const totalProductProgress = productIds.reduce((sum, id) => sum + getProductProgress(id), 0);
    return Math.round(totalProductProgress / productIds.length);
  };

  const calculateDurationDays = (startStr: string | null, endStr: string | null): string => {
    if (!startStr || !endStr) return '-';
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return `${diffDays} hari`;
    } catch {
      return '-';
    }
  };

  const formatDims = (dimsStr: string | null | undefined): string => {
    if (!dimsStr) return '-';
    const formatted = dimsStr.replace(/[xX]/g, ' × ');
    if (formatted.toLowerCase().includes('cm')) {
      return formatted;
    }
    return `${formatted} cm`;
  };

  if (isLoading && !workplan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-sm text-muted-foreground">Memuat detail progress...</span>
      </div>
    );
  }

  if (!workplan) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-red-600">Proyek Tidak Ditemukan</h2>
        <Button onClick={() => navigate('/dashboard/project-management')} className="mt-4">
          Kembali ke Project Management
        </Button>
      </div>
    );
  }

  const order = workplan.order!;
  const stages = workplan.stages || [];
  
  // Extract distinct rooms
  const rooms = Array.from(new Set(stages.map(s => s.room_name)));

  // Extract products in currently selected room
  const productsInSelectedRoom = Array.from(
    new Map(
      stages
        .filter(s => s.room_name === selectedRoomName)
        .map(s => [s.input_item_room_id, s])
    ).values()
  );

  // Get stages of the selected product, sorted by sort_order
  const selectedProductStages = stages
    .filter(s => s.input_item_room_id === selectedProductId)
    .sort((a, b) => (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0));

  // Get active product details
  const activeProduct = selectedProductStages.length > 0 ? selectedProductStages[0] : null;

  // Determine which stage is the active next stage (the first stage that is not completed)
  const firstPendingIndex = selectedProductStages.findIndex(s => s.status !== 'completed');
  const activeNextStage = firstPendingIndex !== -1 ? selectedProductStages[firstPendingIndex] : null;

  // Count progress stats for active stage
  const completedStagesCount = selectedProductStages.filter(s => s.status === 'completed').length;
  const totalStagesCount = selectedProductStages.length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-100/50 pb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/dashboard/project-management')}
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-teal-900 dark:text-teal-100">
              Progress Proyek: {order.nama_project}
            </h1>
            <p className="text-xs text-muted-foreground">
              Order: {order.nomor_order} • Customer: {order.nama_customer}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Notes Modal Trigger */}
          <Button 
            onClick={() => {
              const list = getAllProducts();
              if (list.length > 0) {
                setNotesModalProductId(list[0].id);
              }
              setIsNotesModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
          >
            <FileText className="h-4 w-4" /> Catatan Pengerjaan Progress
          </Button>

          {/* Export PDF Button */}
          <Button 
            onClick={handleExportPDF}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg animate-fade-in"
          >
            <Download className="h-4 w-4" /> Export PDF
          </Button>

          {/* Export Excel Button */}
          <Button 
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg animate-fade-in"
          >
            <Download className="h-4 w-4" /> Export Excel
          </Button>

          {/* Extension Request Actions */}
          {(workplan.status === 'submitted' || workplan.status === 'lengkap') && (
            <>
              {(!workplan.extension_status || workplan.extension_status === 'none' || workplan.extension_status === 'rejected' || workplan.extension_status === '') ? (
                <Button 
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
                >
                  <Calendar className="h-4 w-4" /> Ajukan Perpanjangan Timeline
                </Button>
              ) : workplan.extension_status === 'pending' ? (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-1.5">
                  <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 px-1">
                    Pending Perpanjangan ({workplan.extension_days} hari)
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        onClick={() => handleExtensionDecision('approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 h-6 text-[10px] rounded animate-pulse"
                      >
                        Terima
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleExtensionDecision('reject')}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 h-6 text-[10px] rounded"
                      >
                        Tolak
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}

          {(workplan.status === 'draft' || workplan.status === 'sebagian') && (
            <Button 
              onClick={() => navigate(`/dashboard/workplan/${order.id}`)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
            >
              <Edit className="h-4 w-4" /> Edit Timeline Workplan
            </Button>
          )}

          {workplan.extension_status === 'approved' && (workplan.status === 'submitted' || workplan.status === 'lengkap') && (
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg px-2.5 py-1">
              Perpanjangan Disetujui ({workplan.extension_days} hari)
            </span>
          )}

          {/* Defect Management Switch Tab */}
          <button
            onClick={() => setActiveView(activeView === 'progress' ? 'defects' : 'progress')}
            className={`relative flex items-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs border transition-all ${
              activeView === 'defects'
                ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                : 'bg-white dark:bg-zinc-900 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800 hover:bg-orange-50'
            }`}
          >
            <Bug className="h-4 w-4" />
            Manajemen Defect
            {defects.filter(d => d.status === 'reported' || d.status === 'fix_submitted').length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow">
                {defects.filter(d => d.status === 'reported' || d.status === 'fix_submitted').length}
              </span>
            )}
          </button>

          {/* BAST Button — shown when all stages completed */}
          {stages.length > 0 && stages.every(s => s.status === 'completed') && (
            <Button
              onClick={() => navigate(`/dashboard/bast/${orderId}`)}
              className="relative bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg shadow-md animate-pulse"
            >
              <ClipboardCheck className="h-4 w-4" />
              Proses BAST
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-emerald-400 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow">
                ✓
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Unlocked Draft Workplan Alert */}
      {(workplan.status === 'draft' || workplan.status === 'sebagian') && (
        <Card className="p-4 border-amber-200 dark:border-amber-900 bg-amber-50/20 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Workplan Timeline sedang di-unlock (Draft)</h4>
              <p className="text-xs text-muted-foreground">
                Pengajuan perpanjangan timeline disetujui. Silakan perbarui jadwal pengerjaan produk Anda dan kirim/submit kembali agar pengerjaan progress dapat dilanjutkan.
              </p>
              <Button 
                onClick={() => navigate(`/dashboard/workplan/${order.id}`)}
                className="mt-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 h-8 py-1 px-3 rounded-lg"
              >
                <Edit className="h-3.5 w-3.5" /> Edit & Submit Timeline
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Late Stage Warning Alert */}
      {getOverdueStages().length > 0 && (
        <Card className="p-4 border-rose-200 dark:border-rose-900 bg-rose-50/20 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-rose-600 dark:text-rose-400 mt-0.5 h-5 w-5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Peringatan: Terdapat tahapan pengerjaan yang terlambat!</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {getOverdueStages().map((stage) => (
                  <span key={stage.id} className="px-2.5 py-1 bg-rose-100/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded border border-rose-200/40 font-semibold">
                    [{stage.room_name}] {stage.product_name} - {stage.stage_master?.name} (Deadline: {stage.end_date ? new Date(stage.end_date).toLocaleDateString('id-ID') : '-'})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Defect Reported Alert */}
      {defects.filter(d => d.status === 'reported').length > 0 && (
        <Card className="p-4 border-orange-200 dark:border-orange-900 bg-orange-50/20 shadow-sm">
          <div className="flex items-start gap-3">
            <Bug className="text-orange-600 dark:text-orange-400 mt-0.5 h-5 w-5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400">Laporan Defect Masuk!</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {defects.filter(d => d.status === 'reported').map((d) => (
                  <span key={d.id} className="px-2.5 py-1 bg-orange-100/50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 rounded border border-orange-200/40 font-semibold">
                    [{d.room_name}] {d.product_name} - {d.stage_name}: {d.description.slice(0, 50)}{d.description.length > 50 ? '...' : ''}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => setActiveView('defects')}
                className="mt-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-7 px-3 flex items-center gap-1.5"
              >
                <Bug className="h-3.5 w-3.5" /> Lihat Defect
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Defect Fix Submitted Alert (for admin review) */}
      {defects.filter(d => d.status === 'fix_submitted').length > 0 && (
        <Card className="p-4 border-purple-200 dark:border-purple-900 bg-purple-50/20 shadow-sm">
          <div className="flex items-start gap-3">
            <Wrench className="text-purple-600 dark:text-purple-400 mt-0.5 h-5 w-5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-bold text-purple-800 dark:text-purple-400">Perbaikan Defect Menunggu Persetujuan</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {defects.filter(d => d.status === 'fix_submitted').map((d) => (
                  <span key={d.id} className="px-2.5 py-1 bg-purple-100/50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded border border-purple-200/40 font-semibold">
                    [{d.room_name}] {d.product_name} - {d.stage_name} (menunggu ACC)
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => setActiveView('defects')}
                className="mt-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-7 px-3 flex items-center gap-1.5"
              >
                <Wrench className="h-3.5 w-3.5" /> Review Perbaikan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* AI Project Health Audit Section */}
      <Card className="p-4 border-teal-100 dark:border-teal-900 bg-teal-50/10 shadow-sm">
        {!aiHealthReport ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="text-teal-600 dark:text-teal-400 mt-0.5 h-5 w-5" />
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-teal-900 dark:text-teal-100">AI Project Health Audit</h4>
                <p className="text-xs text-muted-foreground">
                  Gunakan AI Nuginterior untuk menganalisis kesehatan keuangan, timeline, dan risiko pengerjaan proyek ini.
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerateAiHealth}
              disabled={isAiLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg self-end sm:self-auto shrink-0"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menganalisis...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Jalankan Audit AI
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-teal-100/50 pb-3">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="text-teal-600 dark:text-teal-405 h-5 w-5" />
                <div>
                  <h4 className="text-sm font-bold text-teal-900 dark:text-teal-100">AI Project Health Audit</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Dianalisis menggunakan model AI Nuginterior
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Status Kesehatan:</span>
                {aiHealthReport.toUpperCase().includes('CRITICAL') && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-350 dark:border-rose-900 animate-pulse">
                    CRITICAL
                  </span>
                )}
                {aiHealthReport.toUpperCase().includes('WARNING') && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/40 dark:text-amber-355 dark:border-amber-900">
                    WARNING
                  </span>
                )}
                {!aiHealthReport.toUpperCase().includes('CRITICAL') && !aiHealthReport.toUpperCase().includes('WARNING') && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-355 dark:border-emerald-900">
                    HEALTHY
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 flex-1">
                Laporan analisis kesehatan dan keuangan proyek Nuginterior telah dibuat oleh asisten AI.
              </p>
              <div className="flex gap-2 self-end sm:self-auto shrink-0">
                <Button
                  variant="outline"
                  onClick={handleGenerateAiHealth}
                  disabled={isAiLoading}
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 text-xs py-2 px-3 rounded-lg h-9 font-semibold"
                >
                  {isAiLoading ? 'Menganalisis Ulang...' : 'Audit Ulang'}
                </Button>
                <Button
                  onClick={() => setIsAiModalOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs py-2 px-3 rounded-lg h-9 font-semibold"
                >
                  Lihat Laporan Lengkap
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {activeView === 'progress' && (
        <>
          {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
        {/* Project Info */}
        <Card className="p-4 md:col-span-4 w-full border-teal-100 dark:border-teal-900 bg-teal-50/20 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-semibold text-teal-800 dark:text-teal-400 border-b border-teal-100 dark:border-teal-900 pb-1.5 text-sm uppercase tracking-wide">Informasi Proyek</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PIC / PM Survey Ulang:</span>
                <span className="font-semibold text-teal-900 dark:text-teal-100">{order.pic_name || 'Belum Ditunjuk'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lama Kontrak:</span>
                <span className="font-semibold text-teal-900 dark:text-teal-100">{order.lama_kontrak || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal Proyek:</span>
                <span className="font-semibold text-teal-900 dark:text-teal-100">
                  {workplan.start_date ? new Date(workplan.start_date).toLocaleDateString('id-ID') : '-'} s/d {workplan.end_date ? new Date(workplan.end_date).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Durasi:</span>
                <span className="font-semibold text-teal-900 dark:text-teal-100">{workplan.duration_days} Hari</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Circular Project Progress */}
        <Card className="p-4 md:col-span-4 w-full border-teal-100 dark:border-teal-900 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-28 h-28">
            {/* Simple SVG circle loader style */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
              <circle
                cx="56"
                cy="56"
                r="48"
                className="text-teal-100 dark:text-teal-950/40"
                strokeWidth="6"
                fill="transparent"
                stroke="currentColor"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                className="text-teal-500"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="301.6"
                strokeDashoffset={301.6 - (301.6 * getTotalProjectProgress()) / 100}
                strokeLinecap="round"
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className="text-xl font-extrabold text-teal-900 dark:text-teal-100 leading-none">
                {getTotalProjectProgress()}%
              </span>
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 leading-none text-center">
                Total Progress
              </span>
            </div>
          </div>
        </Card>

        {/* Rooms Progress Summary */}
        <Card className="p-4 md:col-span-4 w-full border-teal-100 dark:border-teal-900 flex flex-col justify-between">
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            <h3 className="font-semibold text-teal-800 dark:text-teal-400 text-sm border-b border-teal-100 dark:border-teal-900 pb-1 uppercase tracking-wide">Progress Ruangan</h3>
            <div className="space-y-2">
              {rooms.map(room => {
                const progress = getRoomProgress(room);
                return (
                  <div key={room} className="text-xs space-y-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-teal-950 dark:text-teal-300">{room}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-teal-50 dark:bg-teal-950/50 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Room & Product Navigation */}
        <div className="lg:col-span-4 w-full space-y-4">
          {/* Room Selector */}
          <Card className="p-4 border-teal-100 dark:border-teal-900 space-y-3">
            <h3 className="font-semibold text-teal-800 dark:text-teal-400 text-sm flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4" /> Pilih Ruangan
            </h3>
            <div className="flex flex-col gap-1.5">
              {rooms.map((room) => {
                const isSelected = room === selectedRoomName;
                const progress = getRoomProgress(room);
                return (
                  <button
                    key={room}
                    onClick={() => handleRoomChange(room)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white hover:bg-teal-50/50 border-teal-100 text-teal-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    <span>{room}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-teal-800/60 text-white' : 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'}`}>
                      {progress}%
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Product Selector */}
          {selectedRoomName && (
            <Card className="p-4 border-teal-100 dark:border-teal-900 space-y-3">
              <h3 className="font-semibold text-teal-800 dark:text-teal-400 text-sm">
                Produk di {selectedRoomName}
              </h3>
              <div className="flex flex-col gap-2">
                {productsInSelectedRoom.map((p) => {
                  const isSelected = p.input_item_room_id === selectedProductId;
                  const progress = getProductProgress(p.input_item_room_id);
                  return (
                    <button
                      key={p.input_item_room_id}
                      onClick={() => setSelectedProductId(p.input_item_room_id)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-all border flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-teal-50/80 border-teal-400 text-teal-900 dark:bg-teal-950/20 dark:border-teal-700'
                          : 'bg-white hover:bg-teal-50/30 border-teal-100 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex justify-between w-full font-semibold">
                        <span className="truncate">{p.product_name}</span>
                        <span className="text-teal-600 dark:text-teal-400">{progress}%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Dimensi: {formatDims(p.product_dims)}</span>
                      <div className="w-full bg-teal-100 dark:bg-teal-950/50 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Detailed Product Progress (Pasted Image 3 Layout) */}
        <div className="lg:col-span-8 w-full min-w-0">
          {selectedProductId && activeProduct ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full min-w-0">
              
              {/* Left Side: Product Info, Progress, and Bukti Tahapan (8 columns) */}
              <div className="md:col-span-7 w-full min-w-0 space-y-4">
                
                {/* Product Info & Header Card */}
                <Card className="p-5 border-teal-100 dark:border-teal-900/60 space-y-4 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-teal-500" />
                      <h2 className="text-lg font-bold text-teal-950 dark:text-teal-100">{activeProduct.product_name}</h2>
                    </div>
                    {/* Render global deadline if set */}
                    {workplan.end_date && (
                      <div className="inline-flex text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/40">
                        Deadline: {new Date(workplan.end_date).toLocaleDateString('id-ID')}
                      </div>
                    )}
                  </div>

                  {/* Qty & Dimensi Info pills */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1.5 bg-teal-50/50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 rounded-lg border border-teal-100/40 dark:border-teal-900/30 font-semibold">
                      Qty: {activeProduct.qty}
                    </span>
                    <span className="px-3 py-1.5 bg-teal-50/50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 rounded-lg border border-teal-100/40 dark:border-teal-900/30 font-semibold">
                      Dimensi: {formatDims(activeProduct.product_dims)}
                    </span>
                  </div>
                </Card>

                {/* Progress & Kontribusi Card */}
                <Card className="p-5 border-teal-100 dark:border-teal-900/60 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">Progress & Kontribusi</h3>
                  <div className="p-4 bg-teal-50/20 border border-teal-100/40 dark:border-teal-900/30 rounded-xl space-y-2.5">
                    <p className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 tracking-wider">
                      Kontribusi ke Progress Item
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-teal-100 dark:bg-teal-950/50 h-3.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${getProductProgress(selectedProductId)}%` }}
                        />
                      </div>
                      <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        {getProductProgress(selectedProductId)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Maks: 100.0%</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Tercapai: {getProductProgress(selectedProductId)}% / 100%
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Bukti Tahapan Card */}
                <Card className="p-5 border-teal-100 dark:border-teal-900/60 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">Bukti Tahapan (Klik untuk lihat):</h3>
                  
                  {/* Badges for completed stages */}
                  <div className="flex flex-wrap gap-2">
                    {selectedProductStages
                      .filter(s => s.status === 'completed')
                      .map((stage) => {
                        const isSelected = selectedStageForGallery?.id === stage.id;
                        const photoCount = stage.photos ? stage.photos.split(',').length : 0;
                        
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => setSelectedStageForGallery(stage)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : 'bg-teal-50/55 text-teal-800 border-teal-100 dark:bg-teal-950/30 dark:border-teal-900/50 dark:text-teal-300 hover:bg-teal-100/40'
                            }`}
                          >
                            <span className="text-[10px]">✔</span>
                            {stage.stage_master?.name} ({photoCount})
                          </button>
                        );
                      })}
                    {selectedProductStages.filter(s => s.status === 'completed').length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Belum ada tahapan yang diselesaikan</span>
                    )}
                  </div>

                  {/* Photo Gallery preview for the selected badge */}
                  {selectedStageForGallery ? (
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border dark:border-zinc-800 rounded-xl space-y-3">
                      <div className="flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground border-b dark:border-zinc-800 pb-2">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> Oleh: {selectedStageForGallery.completed_by}</span>
                        <span>Selesai: {selectedStageForGallery.completed_at ? new Date(selectedStageForGallery.completed_at).toLocaleDateString('id-ID') : '-'}</span>
                      </div>
                      
                      {selectedStageForGallery.photos ? (
                        <div className="grid grid-cols-4 gap-2">
                          {selectedStageForGallery.photos.split(',').map((url, imgIdx) => (
                            <a 
                              key={imgIdx} 
                              href={`${backendHost}${url}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="aspect-square rounded-lg border dark:border-zinc-800 overflow-hidden relative bg-zinc-100 dark:bg-zinc-850 hover:border-teal-400 group"
                            >
                              <img 
                                src={`${backendHost}${url}`} 
                                alt="Bukti tahapan" 
                                className="object-cover w-full h-full group-hover:scale-105 transition-all"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Tidak ada foto bukti terlampir.</p>
                      )}

                      {selectedStageForGallery.notes && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic bg-white dark:bg-zinc-900/40 p-2.5 rounded border border-teal-50/50 mt-1">
                          Catatan: "{selectedStageForGallery.notes}"
                        </p>
                      )}
                    </div>
                  ) : null}
                </Card>
              </div>

              {/* Right Side: Update Tahapan & Jadwal Tahapan (5 columns) */}
              <div className="md:col-span-5 w-full min-w-0 space-y-4">
                
                {/* Update Tahapan Card */}
                <Card className="p-5 border-teal-100 dark:border-teal-900/60 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">Update Tahapan</h3>
                  
                  <div className="p-4 bg-teal-50/20 border border-teal-100/40 dark:border-teal-900/30 rounded-xl space-y-3.5">
                    {activeNextStage ? (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Tahap Saat Ini</span>
                          <span className="font-extrabold text-teal-700 dark:text-teal-400">
                            {completedStagesCount + 1} / {totalStagesCount}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-base font-extrabold text-teal-950 dark:text-teal-100">
                            {activeNextStage.stage_master?.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Bobot tahapan: {activeNextStage.percentage}%
                          </p>
                        </div>

                        <Button
                          onClick={() => {
                            setActiveStageToComplete(activeNextStage);
                            setUploadedPhotos([]);
                            setStageCompletionNotes('');
                          }}
                          disabled={getStageActiveDefect(activeNextStage.id) !== null}
                          className="w-full py-5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-650"
                        >
                          Next Stage <ArrowRight className="h-4.5 w-4.5" />
                        </Button>

                        {getStageActiveDefect(activeNextStage.id) && (
                          <div className="p-3 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg text-xs text-orange-800 dark:text-orange-300 space-y-1">
                            <div className="font-bold flex items-center gap-1">
                              <Bug className="h-3.5 w-3.5 text-orange-650" /> Defect Aktif
                            </div>
                            <p className="italic">"{getStageActiveDefect(activeNextStage.id)?.description}"</p>
                            <div className="text-[10px] font-semibold">
                              Status: {getStageActiveDefect(activeNextStage.id)?.status === 'reported' ? 'Dilaporkan' : 'Perbaikan Dikirim'}
                            </div>
                          </div>
                        )}

                        {canManageDefect && !getStageActiveDefect(activeNextStage.id) && (
                          <Button
                            type="button"
                            onClick={() => {
                              setDefectTargetStage(activeNextStage);
                              setDefectDescription('');
                              setDefectPhotos([]);
                              setIsReportDefectModalOpen(true);
                            }}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
                          >
                            <Bug className="h-4 w-4" /> Laporkan Cacat (Defect)
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <div className="mx-auto w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm">✓</div>
                        <h4 className="text-sm font-bold text-teal-950 dark:text-teal-100">Semua Tahapan Selesai</h4>
                        <p className="text-[10px] text-muted-foreground">Produk ini telah diselesaikan sepenuhnya.</p>
                        <Button disabled className="w-full mt-2 py-5 bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 font-extrabold text-sm rounded-xl">
                          Selesai
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Jadwal Tahapan Card */}
                <Card className="p-5 border-teal-100 dark:border-teal-900/60 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">Jadwal Tahapan:</h3>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedProductStages.map((stage) => {
                      const isDone = stage.status === 'completed';
                      const isOverdue = isStageOverdue(stage);
                      return (
                        <div key={stage.id} className="flex items-start gap-2.5 text-xs">
                          {/* Dot indicator */}
                          <span className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                            isDone 
                              ? 'bg-emerald-500' 
                              : isOverdue 
                                ? 'bg-rose-500 animate-pulse' 
                                : 'bg-zinc-300 dark:bg-zinc-700'
                          }`} />
                          
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${
                                isDone 
                                  ? 'text-emerald-700 dark:text-emerald-400' 
                                  : isOverdue 
                                    ? 'text-rose-700 dark:text-rose-400 font-bold' 
                                    : 'text-zinc-700 dark:text-zinc-300'
                              }`}>
                                {stage.stage_master?.name}
                              </span>
                              {isOverdue && (
                                <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-100">
                                  Terlambat!
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>
                                {stage.start_date ? new Date(stage.start_date).toLocaleDateString('id-ID') : '-'} - {stage.end_date ? new Date(stage.end_date).toLocaleDateString('id-ID') : '-'}
                              </span>
                              <span className="font-medium">
                                ({calculateDurationDays(stage.start_date, stage.end_date)})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

            </div>
          ) : (
            <Card className="p-10 text-center text-muted-foreground border-teal-100 dark:border-teal-900">
              Silakan pilih produk untuk melihat detail progress tahapan.
            </Card>
          )}
        </div>
      </div>
    </>
  )}

  {activeView === 'defects' && (
    <Card className="p-6 border-orange-100 dark:border-orange-900 space-y-6">
      <div className="flex items-center justify-between border-b dark:border-zinc-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-orange-950 dark:text-orange-400 flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-655" /> Daftar Laporan Cacat (Defect)
          </h2>
          <p className="text-xs text-muted-foreground">
            Daftar defect yang dilaporkan pada pengerjaan proyek ini.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveView('progress')}
          className="border-orange-200 text-orange-755 dark:text-orange-400 hover:bg-orange-50 text-xs"
        >
          Kembali ke Progress
        </Button>
      </div>

      {defects.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground italic text-sm">
          Tidak ada laporan defect pada proyek ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defects.map((defect) => {
            const isReported = defect.status === 'reported';
            const isFixSubmitted = defect.status === 'fix_submitted';
            const isAccepted = defect.status === 'accepted';
            const isRejected = defect.status === 'rejected';

            let statusColor = 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900';
            let statusLabel = 'Dilaporkan';
            if (isFixSubmitted) {
              statusColor = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900';
              statusLabel = 'Perbaikan Dikirim';
            } else if (isAccepted) {
              statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
              statusLabel = 'Diterima (Selesai)';
            } else if (isRejected) {
              statusColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
              statusLabel = 'Ditolak';
            }

            return (
              <Card key={defect.id} className="p-5 border dark:border-zinc-850 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Header info */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-1.5">
                        [{defect.room_name}] {defect.product_name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold">
                        Tahapan: {defect.stage_name}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {defect.reported_at ? new Date(defect.reported_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg text-xs space-y-2 border dark:border-zinc-800">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-300">Deskripsi Cacat:</div>
                    <p className="text-zinc-650 dark:text-zinc-450 italic">"{defect.description}"</p>
                    <div className="text-[10px] text-muted-foreground">Dilaporkan oleh: {defect.reported_by}</div>
                    
                    {/* Defect Photos */}
                    {defect.photos && (
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {defect.photos.split(',').map((p, idx) => (
                          <a key={idx} href={`${backendHost}${p}`} target="_blank" rel="noreferrer" className="aspect-square rounded border overflow-hidden bg-zinc-150 dark:bg-zinc-800 hover:border-orange-500">
                            <img src={`${backendHost}${p}`} className="object-cover w-full h-full" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fix Information (if submitted / accepted / rejected) */}
                  {(defect.fix_description || defect.fix_photos) && (
                    <div className="p-3 bg-purple-50/40 dark:bg-purple-950/10 rounded-lg text-xs space-y-2 border border-purple-100/50 dark:border-purple-900/20">
                      <div className="font-semibold text-purple-900 dark:text-purple-300">Informasi Perbaikan:</div>
                      <p className="text-zinc-650 dark:text-zinc-455 italic">"{defect.fix_description}"</p>
                      <div className="text-[10px] text-muted-foreground">Diperbaiki oleh: {defect.fixed_by} {defect.fixed_at ? `pada ${new Date(defect.fixed_at).toLocaleDateString('id-ID')}` : ''}</div>
                      
                      {/* Fix Photos */}
                      {defect.fix_photos && (
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {defect.fix_photos.split(',').map((p, idx) => (
                            <a key={idx} href={`${backendHost}${p}`} target="_blank" rel="noreferrer" className="aspect-square rounded border overflow-hidden bg-zinc-150 dark:bg-zinc-800 hover:border-purple-500">
                              <img src={`${backendHost}${p}`} className="object-cover w-full h-full" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review details */}
                  {defect.reviewed_by && (
                    <div className="p-3 bg-zinc-55 dark:bg-zinc-900/30 rounded-lg text-xs space-y-1 border dark:border-zinc-850">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-300">
                        Review Keputusan: {isAccepted ? <span className="text-emerald-600 font-bold">Disetujui</span> : <span className="text-rose-600 font-bold">Ditolak</span>}
                      </div>
                      {defect.review_notes && <p className="text-zinc-600 dark:text-zinc-400">Catatan: "{defect.review_notes}"</p>}
                      <div className="text-[10px] text-muted-foreground">Direview oleh: {defect.reviewed_by}</div>
                    </div>
                  )}
                </div>

                {/* Action forms/buttons */}
                <div className="pt-3 border-t dark:border-zinc-800">
                  {/* Submit Fix Form (Worker/PM/Supervisor role) */}
                  {canManageDefect && (isReported || isRejected) && (
                    <div>
                      {activeDefectForFix?.id === defect.id ? (
                        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border dark:border-zinc-800">
                          <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Form Laporan Perbaikan</div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground">Foto Perbaikan (Wajib minimal 1)</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {fixPhotos.map((url, idx) => (
                                <div key={idx} className="aspect-square rounded border overflow-hidden relative group bg-zinc-100 dark:bg-zinc-800">
                                  <img src={`${backendHost}${url}`} className="object-cover w-full h-full" />
                                  <button
                                    type="button"
                                    onClick={() => setFixPhotos(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                              
                              <label className="aspect-square rounded border-2 border-dashed border-zinc-350 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                                <input 
                                  type="file" 
                                  multiple 
                                  accept="image/*"
                                  onChange={(e) => handleDefectPhotoUpload(e, 'fix')} 
                                  className="hidden" 
                                  disabled={isUploadingDefectPhoto}
                                />
                                {isUploadingDefectPhoto ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-teal-605" />
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 text-zinc-500" />
                                    <span className="text-[9px] text-muted-foreground mt-0.5">Upload</span>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-semibold text-muted-foreground">Keterangan Perbaikan</label>
                              <VoiceInput
                                onTranscript={(text) => setFixDescription((prev) => prev ? `${prev} ${text}` : text)}
                              />
                            </div>
                            <textarea
                              value={fixDescription}
                              onChange={(e) => setFixDescription(e.target.value)}
                              placeholder="Tulis keterangan perbaikan di sini..."
                              className="w-full text-xs p-2 border rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-zinc-950 dark:border-zinc-800 min-h-[50px]"
                            />
                          </div>

                          <div className="flex justify-end gap-2 text-xs pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveDefectForFix(null);
                                setFixDescription('');
                                setFixPhotos([]);
                              }}
                              className="h-8 text-[11px]"
                            >
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSubmitFix}
                              disabled={isSubmittingFix || fixPhotos.length === 0 || !fixDescription.trim()}
                              className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-[11px] flex items-center gap-1"
                            >
                              {isSubmittingFix ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Kirim Perbaikan'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveDefectForFix(defect);
                            setFixDescription('');
                            setFixPhotos([]);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs w-full py-2 flex items-center justify-center gap-1 rounded-lg"
                        >
                          <Wrench className="h-3.5 w-3.5" /> Kirim Bukti Perbaikan
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Review Actions (Admin/PM/Supervisor role) */}
                  {canManageDefect && isFixSubmitted && (
                    <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border dark:border-zinc-800">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-zinc-705 dark:text-zinc-350">Review Laporan Perbaikan</div>
                        <VoiceInput
                          onTranscript={(text) => setReviewNotes((prev) => prev ? `${prev} ${text}` : text)}
                        />
                      </div>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Catatan review (misal: alasan tolak)..."
                        className="w-full text-xs p-2 border rounded focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-zinc-950 dark:border-zinc-800 min-h-[50px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReviewDefect(defect.id, 'reject')}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs flex-1"
                        >
                          Tolak Perbaikan
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReviewDefect(defect.id, 'accept')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex-1"
                        >
                          ACC (Setujui)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  )}

      {/* Completion Modal Triggered by Click */}
      {activeStageToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b dark:border-zinc-850 flex justify-between items-center bg-teal-50/20">
              <div>
                <h3 className="font-bold text-teal-950 dark:text-teal-100 text-sm">Selesaikan Tahapan Proyek</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tahapan: <span className="font-semibold text-teal-700 dark:text-teal-400">{activeStageToComplete.stage_master?.name}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  if (!isSubmittingStage && !isUploading) {
                    setActiveStageToComplete(null);
                    setUploadedPhotos([]);
                  }
                }}
                disabled={isSubmittingStage || isUploading}
                className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Photo Upload Zone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-teal-900 dark:text-teal-400">Upload Foto Bukti (Wajib minimal 1)</label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {/* Photo previews */}
                  {uploadedPhotos.map((url, index) => (
                    <div key={index} className="aspect-square rounded-lg border border-teal-100 overflow-hidden relative group bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
                      <img 
                        src={`${backendHost}${url}`} 
                        alt="Preview" 
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadedPhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Upload trigger button */}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-teal-200 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50/20 hover:border-teal-400 transition-all">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                      disabled={isUploading || isSubmittingStage}
                    />
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        <span className="text-[10px] text-muted-foreground mt-1 text-center font-medium">Unggah</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-teal-900 dark:text-teal-400">Catatan Progress (Opsional)</label>
                  <VoiceInput
                    onTranscript={(text) => setStageCompletionNotes((prev) => prev ? `${prev} ${text}` : text)}
                  />
                </div>
                <textarea
                  value={stageCompletionNotes}
                  onChange={(e) => setStageCompletionNotes(e.target.value)}
                  placeholder="Tulis catatan pengerjaan tahapan di sini..."
                  disabled={isSubmittingStage}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[70px] bg-white dark:bg-zinc-950 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="p-5 border-t dark:border-zinc-850 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveStageToComplete(null);
                  setUploadedPhotos([]);
                }}
                disabled={isSubmittingStage || isUploading}
                className="text-xs border-zinc-200 text-zinc-700 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-100"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleCompleteStageSubmit}
                disabled={isSubmittingStage || isUploading || uploadedPhotos.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow flex items-center gap-1.5"
              >
                {isSubmittingStage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Selesaikan Tahapan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Catatan Pengerjaan Progress Modal */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b dark:border-zinc-850 flex justify-between items-center bg-teal-50/20">
              <div>
                <h3 className="font-bold text-teal-950 dark:text-teal-100 text-sm">Catatan Pengerjaan Progress</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Proyek: <span className="font-semibold text-teal-700 dark:text-teal-400">{order.nama_project}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsNotesModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Product Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-teal-900 dark:text-teal-400 uppercase tracking-wider">PILIH PRODUK (SWITCH)</label>
                <select
                  value={notesModalProductId || ''}
                  onChange={(e) => setNotesModalProductId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-zinc-950 dark:border-zinc-800"
                >
                  {getAllProducts().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.roomName})
                    </option>
                  ))}
                </select>
              </div>

              {/* GALERI FOTO PROGRESS (BERDERET) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-900 dark:text-teal-400 uppercase tracking-wider">GALERI FOTO PROGRESS (BERDERET)</label>
                <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin">
                  {stages
                    .filter(s => s.input_item_room_id === notesModalProductId && s.status === 'completed')
                    .sort((a, b) => (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0))
                    .map((stg) => {
                      const firstPhoto = stg.photos ? stg.photos.split(',')[0] : '';
                      return (
                        <div key={stg.id} className="flex-shrink-0 w-24 bg-zinc-50 dark:bg-zinc-800/40 border dark:border-zinc-800 rounded-lg p-2 flex flex-col items-center justify-between gap-1.5 text-center shadow-sm">
                          <div className="w-16 h-16 rounded overflow-hidden border bg-zinc-100 dark:bg-zinc-900">
                            {firstPhoto ? (
                              <img src={`${backendHost}${firstPhoto}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground italic">No image</div>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate w-full">{stg.stage_master?.name}</span>
                        </div>
                      );
                    })}
                  {stages.filter(s => s.input_item_room_id === notesModalProductId && s.status === 'completed').length === 0 && (
                    <div className="text-xs text-muted-foreground italic py-3">Belum ada galeri foto progress untuk produk ini</div>
                  )}
                </div>
              </div>

              {/* TIMELINE CATATAN & BUKTI */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-teal-900 dark:text-teal-400 uppercase tracking-wider">TIMELINE CATATAN & BUKTI</label>
                <div className="relative border-l border-teal-200 dark:border-teal-900/60 ml-3 pl-5 space-y-4 pt-2">
                  {stages
                    .filter(s => s.input_item_room_id === notesModalProductId && s.status === 'completed')
                    .sort((a, b) => (a.stage_master?.sort_order || 0) - (b.stage_master?.sort_order || 0))
                    .map((stg) => (
                      <div key={stg.id} className="relative space-y-1">
                        {/* Dot indicator */}
                        <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-teal-500 border-2 border-white dark:border-zinc-900 shadow-sm" />
                        
                        <div className="flex justify-between items-start text-xs border-b dark:border-zinc-850 pb-1.5">
                          <span className="font-bold text-teal-950 dark:text-teal-300">{stg.stage_master?.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {stg.completed_at ? new Date(stg.completed_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Oleh: {stg.completed_by}</p>
                        
                        <div className="flex justify-between items-start gap-4 pt-1">
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 italic flex-1 bg-zinc-50/50 dark:bg-zinc-900/10 p-2 rounded border border-zinc-100/40">
                            {stg.notes ? `"${stg.notes}"` : 'Tidak ada catatan tertulis'}
                          </p>
                          {stg.photos && (
                            <div className="flex-shrink-0 flex gap-1 items-center">
                              {stg.photos.split(',').slice(0, 2).map((ph, idx) => (
                                <a key={idx} href={`${backendHost}${ph}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded overflow-hidden border hover:border-teal-500">
                                  <img src={`${backendHost}${ph}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                              {stg.photos.split(',').length > 2 && (
                                <span className="text-[10px] font-bold text-teal-600 px-1">+{stg.photos.split(',').length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {stages.filter(s => s.input_item_room_id === notesModalProductId && s.status === 'completed').length === 0 && (
                    <div className="text-xs text-muted-foreground italic">Belum ada tahapan progress yang diselesaikan</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t dark:border-zinc-850 flex justify-end bg-zinc-50 dark:bg-zinc-900">
              <Button
                onClick={() => setIsNotesModalOpen(false)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Extension Request Modal */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b dark:border-zinc-850 flex justify-between items-center bg-amber-50/30">
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-100 text-sm">Ajukan Perpanjangan Timeline</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Proyek: <span className="font-semibold text-teal-700 dark:text-teal-400">{order.nama_project}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsExtensionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
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
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Alasan Perpanjangan</label>
                  <VoiceInput
                    onTranscript={(text) => setExtensionNotes((prev) => prev ? `${prev} ${text}` : text)}
                  />
                </div>
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

      {/* Report Defect Modal */}
      {isReportDefectModalOpen && defectTargetStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b dark:border-zinc-850 flex justify-between items-center bg-orange-50/20">
              <div>
                <h3 className="font-bold text-orange-950 dark:text-orange-100 text-sm">Laporkan Cacat (Defect)</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tahapan: <span className="font-semibold text-orange-700 dark:text-orange-400">{defectTargetStage.stage_master?.name}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  if (!isSubmittingDefect && !isUploadingDefectPhoto) {
                    setIsReportDefectModalOpen(false);
                    setDefectTargetStage(null);
                    setDefectDescription('');
                    setDefectPhotos([]);
                  }
                }}
                disabled={isSubmittingDefect || isUploadingDefectPhoto}
                className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Photo Upload Zone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-orange-900 dark:text-orange-400">Upload Foto Bukti Cacat (Opsional, Bisa Multiple)</label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {/* Photo previews */}
                  {defectPhotos.map((url, index) => (
                    <div key={index} className="aspect-square rounded-lg border border-orange-100 overflow-hidden relative group bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
                      <img 
                        src={`${backendHost}${url}`} 
                        alt="Preview" 
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => setDefectPhotos(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Upload trigger button */}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-orange-200 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50/20 hover:border-orange-400 transition-all">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => handleDefectPhotoUpload(e, 'defect')} 
                      className="hidden" 
                      disabled={isUploadingDefectPhoto || isSubmittingDefect}
                    />
                    {isUploadingDefectPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-orange-550" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <span className="text-[10px] text-muted-foreground mt-1 text-center font-medium">Unggah</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-orange-900 dark:text-orange-450">Deskripsi Cacat / Defect (Wajib)</label>
                  <VoiceInput
                    onTranscript={(text) => setDefectDescription((prev) => prev ? `${prev} ${text}` : text)}
                  />
                </div>
                <textarea
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  placeholder="Deskripsikan bagian mana yang cacat / tidak sesuai..."
                  disabled={isSubmittingDefect}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 min-h-[80px] bg-white dark:bg-zinc-950 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="p-5 border-t dark:border-zinc-850 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReportDefectModalOpen(false);
                  setDefectTargetStage(null);
                  setDefectDescription('');
                  setDefectPhotos([]);
                }}
                disabled={isSubmittingDefect || isUploadingDefectPhoto}
                className="text-xs border-zinc-200 text-zinc-700 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-100"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleReportDefectSubmit}
                disabled={isSubmittingDefect || isUploadingDefectPhoto || !defectDescription.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow flex items-center gap-1.5"
              >
                {isSubmittingDefect ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    <Bug className="h-4 w-4" /> Laporkan Defect
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Project Health Audit Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[650px] w-[95%] bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <ClipboardCheck className="text-teal-500 h-5 w-5" />
              Laporan Audit Kesehatan Proyek (AI)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[400px] overflow-y-auto border border-teal-50/50 bg-teal-50/5 p-4 rounded-xl dark:border-zinc-800 dark:bg-zinc-950/40">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-650 dark:text-gray-300">
              {aiHealthReport}
            </pre>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAiModalOpen(false)}
              className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
            >
              Tutup
            </Button>
            <Button
              onClick={() => {
                if (aiHealthReport) {
                  navigator.clipboard.writeText(aiHealthReport);
                  toast.success('Laporan audit berhasil disalin');
                }
              }}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold h-9 px-4 rounded-xl text-xs gap-1.5 shadow-lg shadow-teal-500/20"
            >
              Salin Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
