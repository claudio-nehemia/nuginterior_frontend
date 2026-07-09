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
    const fetchStats = async () => {
      try {
        const res = await api.get("/dashboard/stats");
        setData(res.data.data);
      } catch (err) {
        toast.error("Gagal memuat statistik dashboard");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
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
