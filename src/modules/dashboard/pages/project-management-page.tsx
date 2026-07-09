import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Search, ClipboardCheck, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  alamat: string;
  tahapan_proyek: string;
  payment_status: string;
  pic_name?: string;
  product_count?: number;
  lama_kontrak?: string;
}

interface WorkplanStage {
  id: number;
  workplan_id: number;
  input_item_room_id: number;
  stage_master_id: number;
  percentage: number;
  status: string;
}

interface Workplan {
  id: number;
  order_id: number;
  status: 'belum_isi' | 'sebagian' | 'lengkap';
  response_by: string | null;
  response_time: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  order?: Order;
  stages?: WorkplanStage[];
}

export default function ProjectManagementPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Workplan[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/workplans');
      // Filter workplans that have been submitted/approved ('lengkap')
      const allWorkplans: Workplan[] = response.data.data || [];
      const submittedProjects = allWorkplans.filter(wp => wp.status === 'lengkap');
      setProjects(submittedProjects);
    } catch {
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const calculateProjectProgress = (stages?: WorkplanStage[]): number => {
    if (!stages || stages.length === 0) return 0;

    // Group stages by product (input_item_room_id)
    const productStages: Record<number, WorkplanStage[]> = {};
    stages.forEach(stg => {
      if (!productStages[stg.input_item_room_id]) {
        productStages[stg.input_item_room_id] = [];
      }
      productStages[stg.input_item_room_id].push(stg);
    });

    const productIds = Object.keys(productStages).map(Number);
    if (productIds.length === 0) return 0;

    let totalProductProgress = 0;
    productIds.forEach(prodId => {
      const stgs = productStages[prodId];
      const sumAllWeights = stgs.reduce((sum, s) => sum + s.percentage, 0);
      const sumCompletedWeights = stgs
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + s.percentage, 0);

      const productProgress = sumAllWeights > 0 
        ? (sumCompletedWeights / sumAllWeights) * 100 
        : 0;

      totalProductProgress += productProgress;
    });

    const rawAvg = totalProductProgress / productIds.length;
    return Math.round(rawAvg * 100) / 100;
  };

  const filteredProjects = projects.filter(item => {
    const order = item.order;
    if (!order) return false;

    const project = order.nama_project?.toLowerCase() || '';
    const customer = order.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    return project.includes(searchLower) || customer.includes(searchLower);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-teal-800 dark:text-teal-400">
            <ClipboardCheck className="h-6 w-6" /> Project Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola dan pantau progress tahapan produksi proyek secara real-time.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 bg-teal-50 border-teal-200/60 dark:bg-teal-950/20 dark:border-teal-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-600 dark:text-teal-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider">Total Proyek Aktif</p>
              <h3 className="text-2xl font-bold text-teal-900 dark:text-teal-100">{projects.length} Proyek</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-teal-100 dark:border-teal-950 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-teal-50 dark:border-teal-950/50 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama proyek atau klien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 border-teal-100 focus-visible:ring-teal-500 focus-visible:border-teal-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat data proyek...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-full text-teal-600 dark:text-teal-400 mb-3">
              <ClipboardCheck className="h-10 w-10" />
            </div>
            <h3 className="font-semibold text-teal-900 dark:text-teal-100">Belum Ada Proyek Aktif</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Hanya proyek dengan workplan yang telah disubmit/lengkap yang akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-teal-50/50 dark:bg-teal-950/30">
                <TableRow className="border-teal-100 dark:border-teal-950">
                  <TableHead className="w-[180px] font-semibold text-teal-800 dark:text-teal-300">Nomor Order</TableHead>
                  <TableHead className="font-semibold text-teal-800 dark:text-teal-300">Nama Proyek</TableHead>
                  <TableHead className="font-semibold text-teal-800 dark:text-teal-300">Klien</TableHead>
                  <TableHead className="font-semibold text-teal-800 dark:text-teal-300">PIC / Supervisor</TableHead>
                  <TableHead className="font-semibold text-teal-800 dark:text-teal-300">Lama Kontrak</TableHead>
                  <TableHead className="w-[180px] font-semibold text-teal-800 dark:text-teal-300">Progress Proyek</TableHead>
                  <TableHead className="w-[120px] text-right font-semibold text-teal-800 dark:text-teal-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((wp) => {
                  const order = wp.order!;
                  const progress = calculateProjectProgress(wp.stages);

                  return (
                    <TableRow key={wp.id} className="border-teal-50 dark:border-teal-950/50 hover:bg-teal-50/10">
                      <TableCell className="font-medium">{order.nomor_order}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-teal-900 dark:text-teal-100">{order.nama_project}</div>
                        <div className="text-xs text-muted-foreground capitalize">{order.jenis_interior}</div>
                      </TableCell>
                      <TableCell>{order.nama_customer}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-950/40 dark:text-teal-300">
                          {order.pic_name || 'Belum Ditunjuk'}
                        </span>
                      </TableCell>
                      <TableCell>{order.lama_kontrak || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-teal-700 dark:text-teal-300">{progress}%</span>
                          </div>
                          <div className="w-full bg-teal-100 dark:bg-teal-950/60 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-teal-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/project-management/${order.id}`)}
                          className="hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-medium"
                        >
                          Lihat Progress <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
