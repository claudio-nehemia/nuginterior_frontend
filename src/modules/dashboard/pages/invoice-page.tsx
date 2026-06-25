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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Search, Eye, Shield, Loader2, FileText, CheckCircle2, Clock, ChevronLeft, ChevronRight, Coins, Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface Tahapan {
  step: number;
  text: string;
  persentase: number;
}

interface Termin {
  id: number;
  kode_tipe: string;
  nama_tipe: string;
  deskripsi: string;
  tahapan: Tahapan[];
}

interface Invoice {
  id: number;
  contract_id: number;
  order_id: number;
  step: number;
  keterangan: string;
  persentase: number;
  amount: number;
  deadline?: string;
  status: string;
}

interface ContractInvoiceRow {
  contract_id: number;
  order_id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  termin_id?: number;
  termin?: {
    id: number;
    kode_tipe: string;
    nama_tipe: string;
    deskripsi: string;
    tahapan: Tahapan[];
  };
  status_pembayaran: string;
  invoice_response_by?: string;
  invoice_response_time?: string;
  invoices: Invoice[];
}

export default function InvoicePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ContractInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Settings
  const [config, setConfig] = useState({ response_enabled: false });

  // Modal Termin State
  const [terminModalOpen, setTerminModalOpen] = useState(false);
  const [selectedTermin, setSelectedTermin] = useState<Termin | null>(null);

  // Action Loading
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const handleGenerateInvoices = async (contractId: number) => {
    setGeneratingId(contractId);
    try {
      const res = await api.post(`/invoices/contract/${contractId}/generate`);
      toast.success(res.data.message || 'Invoice termin berhasil diterbitkan');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan invoice');
    } finally {
      setGeneratingId(null);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices');
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data tagihan');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const s = res.data.data || [];
      setConfig({
        response_enabled: s.find((x: any) => x.key === 'response_enabled')?.value === 'true',
      });
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchSettings();
  }, []);

  const handleResponse = async (contractId: number) => {
    setRespondingId(contractId);
    try {
      const res = await api.post(`/invoices/contract/${contractId}/response`);
      toast.success(res.data.message || 'Respons regular berhasil disimpan');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal merespons invoice');
    } finally {
      setRespondingId(null);
    }
  };

  // Filter & Search
  const filteredData = data.filter((row) => {
    const s = search.toLowerCase();
    const matchesSearch =
      row.nomor_order.toLowerCase().includes(s) ||
      row.nama_project.toLowerCase().includes(s) ||
      row.nama_customer.toLowerCase().includes(s);

    let matchesStatus = true;
    if (statusFilter === 'belum_bayar') {
      matchesStatus = row.status_pembayaran === 'Belum Bayar';
    } else if (statusFilter === 'sebagian') {
      matchesStatus = row.status_pembayaran !== 'Belum Bayar' && !row.status_pembayaran.includes('Lunas');
    } else if (statusFilter === 'lunas') {
      matchesStatus = row.status_pembayaran.includes('Lunas');
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Receipt size={20} className="text-teal-500" /> Invoice Tagihan
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola termin pembayaran untuk kontrak yang sudah deal</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <Input
              placeholder="Cari order, proyek, atau klien..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-9 rounded-xl border-gray-100 bg-gray-50/50 focus-visible:ring-teal-400 focus-visible:border-teal-400 text-xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs font-bold border border-gray-100 rounded-xl bg-gray-50/50 focus:border-teal-400 focus:outline-none text-gray-700 outline-none transition-all cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="belum_bayar">Belum Bayar</option>
              <option value="sebagian">Sebagian Terbayar</option>
              <option value="lunas">Lunas (100%)</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-gray-50 hover:bg-transparent">
                  <TableHead className="font-bold text-gray-600 text-xs py-4 pl-6">No. Order</TableHead>
                  <TableHead className="font-bold text-gray-600 text-xs py-4">Nama Project</TableHead>
                  <TableHead className="font-bold text-gray-600 text-xs py-4">Klien</TableHead>
                  <TableHead className="font-bold text-gray-600 text-xs py-4">Termin</TableHead>
                  <TableHead className="font-bold text-gray-600 text-xs py-4">Status Pembayaran</TableHead>
                  <TableHead className="font-bold text-gray-600 text-xs py-4 text-center pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                        <Loader2 className="animate-spin text-teal-500" size={20} />
                        Memuat data tagihan...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 text-gray-400 text-xs">
                        <FileText size={24} className="text-gray-300" />
                        Tidak ada data kontrak deal yang ditemukan.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row) => {
                    const hasResponded = row.invoice_response_time != null;
                    const requireResponse = config.response_enabled && !hasResponded;

                    return (
                      <TableRow key={row.contract_id} className="border-gray-50 hover:bg-gray-50/30 transition-colors group">
                        <TableCell className="font-bold text-gray-800 text-xs py-4.5 pl-6">{row.nomor_order}</TableCell>
                        <TableCell className="font-semibold text-gray-700 text-xs py-4.5">{row.nama_project}</TableCell>
                        <TableCell className="font-medium text-gray-600 text-xs py-4.5">{row.nama_customer}</TableCell>
                        <TableCell className="py-4.5">
                          {row.termin ? (
                            <button
                              onClick={() => {
                                setSelectedTermin(row.termin || null);
                                setTerminModalOpen(true);
                              }}
                              className="text-teal-600 hover:text-teal-700 font-bold text-xs underline decoration-dotted underline-offset-4 hover:decoration-solid transition-all"
                            >
                              {row.termin.nama_tipe}
                            </button>
                          ) : (
                            <span className="text-gray-400 font-semibold text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4.5">
                          <div className="flex items-center gap-2">
                            {row.status_pembayaran.includes('Lunas') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
                                <CheckCircle2 size={10} /> {row.status_pembayaran}
                              </span>
                            ) : row.status_pembayaran === 'Belum Bayar' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-100">
                                <Clock size={10} /> {row.status_pembayaran}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                                <Coins size={10} /> {row.status_pembayaran}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4.5 text-center pr-6">
                          <div className="flex items-center justify-center gap-2">
                            {row.invoices.length === 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={generatingId === row.contract_id}
                                onClick={() => handleGenerateInvoices(row.contract_id)}
                                className="h-8 rounded-lg text-amber-600 border-amber-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                                title="Terbitkan invoice tagihan termin secara manual"
                              >
                                {generatingId === row.contract_id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Receipt size={12} />
                                )}
                                Terbitkan Invoice
                              </Button>
                            ) : requireResponse ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={respondingId === row.contract_id}
                                onClick={() => handleResponse(row.contract_id)}
                                className="h-8 rounded-lg text-teal-600 border-teal-100 hover:bg-teal-50 hover:text-teal-700 text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                              >
                                {respondingId === row.contract_id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Shield size={12} />
                                )}
                                Respons
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/dashboard/invoice/${row.contract_id}`)}
                                className="h-8 w-8 p-0 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 transition-colors shadow-sm"
                                title="Lihat detail invoice"
                              >
                                <Eye size={14} />
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
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 bg-gray-50/10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="h-7 w-7 p-0 border-gray-100 text-gray-500 rounded-md"
                >
                  <ChevronLeft size={14} />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 w-7 p-0 text-[10px] font-bold rounded-md ${
                      currentPage === page ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'border-gray-100 text-gray-500'
                    }`}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="h-7 w-7 p-0 border-gray-100 text-gray-500 rounded-md"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detail Termin */}
      <Dialog open={terminModalOpen} onOpenChange={setTerminModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl p-6 bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-50">
            <DialogTitle className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <Coins size={16} className="text-teal-500" /> Detail Termin: {selectedTermin?.nama_tipe}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-medium text-gray-400 mt-1">
              Rincian persentase dan tahapan pembayaran.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-3 bg-gray-50/50 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Deskripsi</span>
              <p className="text-xs font-semibold text-gray-600 leading-relaxed">{selectedTermin?.deskripsi || 'Tidak ada deskripsi.'}</p>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rincian Tahapan</span>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {selectedTermin?.tahapan.map((item) => (
                  <div key={item.step} className="flex justify-between items-center p-3 text-xs hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {item.step}
                      </span>
                      <span className="font-bold text-gray-700">{item.text}</span>
                    </div>
                    <span className="font-extrabold text-teal-600 bg-teal-50/50 px-2 py-0.5 rounded-full text-[10px]">
                      {item.persentase}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-50 flex justify-end">
            <Button
              type="button"
              onClick={() => setTerminModalOpen(false)}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-md shadow-teal-500/10"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
