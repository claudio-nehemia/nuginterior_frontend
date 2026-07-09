import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Box,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Wallet,
  Coins,
  Receipt,
  FileText,
  Loader2,
  Shield,
  Building2,
  ArrowRight,
  Settings,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface RecentOrder {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  project_status: string;
  tahapan_proyek: string;
  harga_kontrak: number;
  created_at: string;
}

interface DashboardData {
  total_orders: number;
  active_orders: number;
  completed_projects: number;
  success_rate: number;
  total_contracts_deal: number;
  lunas_count: number;
  lunas_amount: number;
  belum_bayar_count: number;
  belum_bayar_amount: number;
  total_omset: number;
  recent_orders: RecentOrder[];
}

const projectStatusStyles: Record<string, string> = {
  pending: "bg-gray-50 text-gray-600 border-gray-200",
  in_progress: "bg-teal-50 text-teal-600 border-teal-100",
  deal: "bg-emerald-50 text-emerald-600 border-emerald-100",
  cancel: "bg-red-50 text-red-600 border-red-100",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminStats, setSuperAdminStats] = useState<{
    totalUsers: number;
    totalCompanies: number;
    pendingCompanies: number;
    verifiedCompanies: number;
    rejectedCompanies: number;
    recentCompanies: any[];
  } | null>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleGenerateAiAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const res = await api.get("/dashboard/stats/ai-analysis");
      setAiAnalysis(res.data?.data?.analysis || "");
      setIsAiModalOpen(true);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Gagal memproses analisis AI. Pastikan OpenAI API Key sudah diatur."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      setIsLoading(true);
      try {
        const { data: meData } = await api.get('/auth/me');
        if (meData.success) {
          const u = meData.data;
          const isSuper = u.company_id === 1 && u.role?.nama_role === 'Super Admin';
          setIsSuperAdmin(isSuper);
          
          if (isSuper) {
            // Fetch super admin stats
            const [companiesRes, usersRes] = await Promise.all([
              api.get('/companies'),
              api.get('/users')
            ]);
            
            const companiesList = companiesRes.data.data || [];
            const usersList = usersRes.data.data || [];
            
            setSuperAdminStats({
              totalUsers: usersList.length,
              totalCompanies: companiesList.length,
              pendingCompanies: companiesList.filter((c: any) => c.status === 'pending').length,
              verifiedCompanies: companiesList.filter((c: any) => c.status === 'verified').length,
              rejectedCompanies: companiesList.filter((c: any) => c.status === 'rejected').length,
              recentCompanies: [...companiesList]
                .sort((a, b) => b.id - a.id)
                .slice(0, 5),
            });
          } else {
            // Fetch normal tenant stats
            const statsRes = await api.get('/dashboard/stats');
            setData(statsRes.data.data);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat data dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    
    initDashboard();
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const stats = [
    {
      title: "Total Order",
      value: isLoading ? "..." : data?.total_orders.toString() || "0",
      icon: Box,
      color: "text-blue-500",
      bg: "bg-blue-50",
      trend: "Total",
      desc: "Semua order terdaftar",
    },
    {
      title: "Order Aktif",
      value: isLoading ? "..." : data?.active_orders.toString() || "0",
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-50",
      trend: "Running",
      desc: "Proyek sedang berjalan",
    },
    {
      title: "Proyek Selesai",
      value: isLoading ? "..." : data?.completed_projects.toString() || "0",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      trend: "Closed",
      desc: "Proyek berhasil diselesaikan",
    },
    {
      title: "Success Rate",
      value: isLoading ? "..." : `${data?.success_rate.toFixed(0) || "0"}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-50",
      trend: "Rate",
      desc: "Rasio penyelesaian proyek",
    },
  ];

  if (isSuperAdmin) {
    return (
      <div className="space-y-6 p-2 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              <Shield className="text-teal-500" /> Platform Administration
            </h1>
            <p className="text-xs text-gray-500 font-medium">Platform-wide overview, tenant management, and system stats</p>
          </div>
          <div className="flex items-center gap-2 bg-teal-50/50 px-3.5 py-2 rounded-xl border border-teal-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">System Online & Active</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden p-5 flex items-center gap-4 relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-teal-400" />
            <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-xl flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Pengguna</span>
              <span className="text-2xl font-black text-gray-800 tracking-tight mt-0.5 block">
                {isLoading ? "..." : superAdminStats?.totalUsers || 0}
              </span>
            </div>
          </Card>

          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden p-5 flex items-center gap-4 relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400" />
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Perusahaan</span>
              <span className="text-2xl font-black text-gray-800 tracking-tight mt-0.5 block">
                {isLoading ? "..." : superAdminStats?.totalCompanies || 0}
              </span>
            </div>
          </Card>

          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden p-5 flex items-center gap-4 relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400" />
            <div className="w-12 h-12 bg-emerald-50 text-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Terverifikasi</span>
              <span className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5 block">
                {isLoading ? "..." : superAdminStats?.verifiedCompanies || 0}
              </span>
            </div>
          </Card>

          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden p-5 flex items-center gap-4 relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
            <div className="w-12 h-12 bg-amber-50 text-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={22} className="text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Menunggu Verifikasi</span>
              <span className="text-2xl font-black text-amber-600 tracking-tight mt-0.5 block">
                {isLoading ? "..." : superAdminStats?.pendingCompanies || 0}
              </span>
            </div>
          </Card>
        </div>

        {/* Breakdown & Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent registrations */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Pendaftaran Perusahaan Terbaru</h2>
              <Button 
                onClick={() => navigate('/dashboard/companies')}
                variant="ghost" 
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 text-xs font-bold gap-1 rounded-xl h-8 px-3 transition-all"
              >
                Lihat Semua <ArrowRight size={14} />
              </Button>
            </div>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-12 text-gray-400 text-xs">Loading...</div>
                ) : !superAdminStats?.recentCompanies || superAdminStats.recentCompanies.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">Belum ada pendaftaran perusahaan.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Perusahaan</TableHead>
                        <TableHead className="text-xs font-bold">Direktur</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superAdminStats.recentCompanies.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/30">
                          <TableCell className="font-bold text-xs text-gray-800">
                            <div>{c.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{c.email}</div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-650 font-medium">{c.director_name}</TableCell>
                          <TableCell className="text-xs">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              c.status === 'verified'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : c.status === 'rejected'
                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {c.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => navigate('/dashboard/companies')}
                              size="sm"
                              variant="ghost"
                              className="text-teal-600 hover:bg-teal-50 hover:text-teal-700 text-[10px] font-bold h-7 rounded-lg"
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Status distribution */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Tindakan Cepat Administrasi</h2>
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white p-5 space-y-3">
                <Button 
                  onClick={() => navigate('/dashboard/companies')}
                  className="w-full justify-start gap-3 h-11 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-[0_8px_16px_-6px_rgba(20,184,166,0.3)] transition-all"
                >
                  <Building2 size={16} /> Kelola & Verifikasi Perusahaan
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard/roles')}
                  variant="outline"
                  className="w-full justify-start gap-3 h-11 border-gray-150 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl transition-all"
                >
                  <Users size={16} className="text-gray-400" /> Manajemen Peran & Pengguna
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard/settings')}
                  variant="outline"
                  className="w-full justify-start gap-3 h-11 border-gray-150 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl transition-all"
                >
                  <Settings size={16} className="text-gray-400" /> Platform & Global Settings
                </Button>
              </Card>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Rasio Status Perusahaan</h2>
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Terverifikasi ({superAdminStats?.verifiedCompanies || 0})</span>
                    <span>
                      {superAdminStats?.totalCompanies 
                        ? Math.round((superAdminStats.verifiedCompanies / superAdminStats.totalCompanies) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${superAdminStats?.totalCompanies 
                          ? (superAdminStats.verifiedCompanies / superAdminStats.totalCompanies) * 100 
                          : 0}%` 
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Menunggu Verifikasi ({superAdminStats?.pendingCompanies || 0})</span>
                    <span>
                      {superAdminStats?.totalCompanies 
                        ? Math.round((superAdminStats.pendingCompanies / superAdminStats.totalCompanies) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${superAdminStats?.totalCompanies 
                          ? (superAdminStats.pendingCompanies / superAdminStats.totalCompanies) * 100 
                          : 0}%` 
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Ditolak ({superAdminStats?.rejectedCompanies || 0})</span>
                    <span>
                      {superAdminStats?.totalCompanies 
                        ? Math.round((superAdminStats.rejectedCompanies / superAdminStats.totalCompanies) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${superAdminStats?.totalCompanies 
                          ? (superAdminStats.rejectedCompanies / superAdminStats.totalCompanies) * 100 
                          : 0}%` 
                      }} 
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
            Main Dashboard
          </h1>
          <p className="text-xs font-medium text-gray-400">
            Welcome back! Check your latest interior project metrics below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">
              Status
            </p>
            <p className="text-[11px] font-bold text-gray-700 mt-0.5">
              Real-time Sync
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-teal-500 border border-gray-50">
            <TrendingUp size={14} />
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <Card
            key={i}
            className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 bg-white group cursor-default"
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                    {stat.title}
                  </p>
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg mt-1" />
                  ) : (
                    <p className="text-2xl font-extrabold text-gray-800 tracking-tight group-hover:text-teal-500 transition-colors">
                      {stat.value}
                    </p>
                  )}
                </div>
                <div
                  className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}
                >
                  <stat.icon size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-600">
                  {stat.trend}
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  {stat.desc}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finance Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-800 tracking-tight">
            Finance Overview
          </h2>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            Metrik keuangan & penagihan proyek
          </p>
        </div>

        {/* AI Executive Assistant Banner */}
        <Card className="border border-teal-100 bg-teal-50/10 rounded-2xl shadow-none overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100/50 text-teal-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-teal-800 uppercase tracking-wider">AI Executive Assistant</h3>
                <p className="text-[11px] text-teal-600 font-medium mt-0.5">Minta AI untuk menganalisis kesehatan finansial dan order perusahaan secara keseluruhan.</p>
              </div>
            </div>
            <Button
              onClick={handleGenerateAiAnalysis}
              disabled={isAiLoading}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold h-9 px-5 rounded-xl text-xs gap-1.5 shadow-lg shadow-teal-500/20 shrink-0"
            >
              {isAiLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <TrendingUp size={13} />
              )}
              {isAiLoading ? "Menganalisis..." : "Tanya Asisten AI"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Project Deal */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 bg-white group cursor-default">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                    Total Project Deal
                  </p>
                  {isLoading ? (
                    <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-lg mt-1" />
                  ) : (
                    <p className="text-2xl font-extrabold text-gray-800 tracking-tight group-hover:text-teal-500 transition-colors">
                      {data?.total_contracts_deal || 0}{" "}
                      <span className="text-xs font-semibold text-gray-400">
                        Proyek
                      </span>
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <FileText size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-600">
                  Deal
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Kontrak berstatus signed
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lunas */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 bg-white group cursor-default border-l-4 border-emerald-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                    Lunas
                  </p>
                  {isLoading ? (
                    <div className="h-8 w-36 bg-gray-100 animate-pulse rounded-lg mt-1" />
                  ) : (
                    <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                      {formatRupiah(data?.lunas_amount || 0)}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Coins size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                  Paid
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Tagihan terbayar
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Belum Terbayar */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 bg-white group cursor-default border-l-4 border-rose-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                    Belum Terbayar
                  </p>
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-6 w-36 bg-gray-100 animate-pulse rounded-lg" />
                      <div className="h-4 w-24 bg-gray-100 animate-pulse rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-extrabold text-rose-600 tracking-tight">
                        {formatRupiah(data?.belum_bayar_amount || 0)}
                      </p>
                      <p className="text-xs font-extrabold text-gray-500">
                        {data?.belum_bayar_count || 0} Proyek Belum Lunas
                      </p>
                    </>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Receipt size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600">
                  Unpaid
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Menunggu pembayaran
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Omset */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 bg-white group cursor-default border-l-4 border-teal-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                    Total Omset
                  </p>
                  {isLoading ? (
                    <div className="h-8 w-36 bg-gray-100 animate-pulse rounded-lg mt-1" />
                  ) : (
                    <p className="text-xl font-extrabold text-teal-600 tracking-tight">
                      {formatRupiah(data?.total_omset || 0)}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Wallet size={20} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-600">
                  Omset
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Nilai akumulasi invoice
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Orders Table */}
        <Card className="xl:col-span-2 border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 tracking-tight">
                Recent Orders
              </h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Real-time status
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard/order")}
              className="text-[10px] font-bold text-teal-500 hover:text-teal-600 transition-colors uppercase tracking-widest"
            >
              View All
            </button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/30">
                <TableRow className="border-0">
                  <TableHead className="font-bold text-[9px] text-gray-400 uppercase tracking-widest px-6 py-3">
                    Order ID
                  </TableHead>
                  <TableHead className="font-bold text-[9px] text-gray-400 uppercase tracking-widest">
                    Client Name
                  </TableHead>
                  <TableHead className="font-bold text-[9px] text-gray-400 uppercase tracking-widest text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-bold text-[9px] text-gray-400 uppercase tracking-widest px-6">
                    Contract Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow key={idx} className="border-gray-50">
                      <TableCell className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
                          <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
                        </div>
                      </TableCell>
                      <TableCell className="flex justify-center py-4">
                        <div className="h-5 w-16 bg-gray-100 animate-pulse rounded-lg" />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-100 animate-pulse rounded ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !data?.recent_orders || data.recent_orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-xs font-bold text-gray-400 uppercase tracking-wider"
                    >
                      Tidak ada order terbaru
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_orders.map((order, i) => (
                    <TableRow
                      key={i}
                      className="border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/dashboard/order`)}
                    >
                      <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">
                        {order.nomor_order}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-xs">
                            {order.nama_customer}
                          </span>
                          <span className="text-[9px] text-gray-400 font-medium">
                            {order.nama_project}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-extrabold border uppercase tracking-wider ${
                            order.tahapan_proyek === "selesai"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : projectStatusStyles[order.project_status] ||
                                "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {order.tahapan_proyek === "selesai" ? "selesai" : order.project_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-xs text-gray-800 px-6">
                        {formatRupiah(order.harga_kontrak)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Logged In Info */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-teal-500 text-white p-1.5">
          <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-xl">
                <Users size={20} />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold tracking-tight">
                  Active Session
                </h2>
                <p className="text-teal-50/80 text-[10px] font-bold uppercase tracking-widest">
                  Administrator Account
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-teal-600 flex items-center justify-center font-black text-sm shadow-lg">
                  {(user?.name || "A")[0].toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-sm leading-none">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-[10px] font-bold text-teal-100/70 uppercase tracking-tighter">
                    {user?.role?.nama_role || "Administrator"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <p className="text-[10px] font-medium text-teal-50/60 leading-relaxed italic">
                "Architecture is the learned game, correct and magnificent, of
                forms assembled in the light."
              </p>
              <div className="h-[1px] bg-white/20" />
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-teal-100">
                Arsiflow v1.0
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Executive Analysis Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[650px] w-[95%]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-teal-500 h-5 w-5" />
              Laporan Analisis Eksekutif AI
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[400px] overflow-y-auto border border-teal-50/50 bg-teal-50/5 p-4 rounded-xl">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">
              {aiAnalysis}
            </pre>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAiModalOpen(false)}
              className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Tutup
            </Button>
            <Button
              onClick={() => {
                if (aiAnalysis) {
                  navigator.clipboard.writeText(aiAnalysis);
                  toast.success("Hasil analisis berhasil disalin ke clipboard");
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
