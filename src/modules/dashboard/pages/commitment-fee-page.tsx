import { useEffect, useState } from 'react';
import { 
  Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, 
  AlignmentType, WidthType, BorderStyle, PageBreak
} from 'docx';
import { api, API_BASE_URL } from '@/lib/axios';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Search, Eye, Download, Upload, RefreshCw, AlertCircle, Loader2, Coins, FileText, Printer, Check, Image
} from 'lucide-react';
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
  nama_customer: string;
  jenis_interior?: string;
  tanggal_masuk_customer?: string | null;
  alamat: string;
  teams?: TeamMember[];
}

interface MoodboardFile {
  id: number;
  file_path: string;
  file_type: 'kasar' | 'final';
  original_name: string;
  status: 'pending' | 'approved' | 'revisi';
  revisi?: string;
  created_at?: string;
}

interface EstimasiFile {
  id: number;
  moodboard_file_id: number;
  file_path: string;
  original_name: string;
}

interface Estimasi {
  id: number;
  estimated_cost: string;
  files: EstimasiFile[];
}

interface CommitmentFee {
  id: number;
  total_fee: number | null;
  payment_proof: string;
  payment_status: 'pending' | 'completed';
  response_by: string;
  response_time: string | null;
  pm_response_by: string | null;
  pm_response_time: string | null;
}

interface Moodboard {
  id: number;
  order_id: number;
  status: 'pending' | 'approved' | 'revisi';
  moodboard_kasar: string;
  files: MoodboardFile[];
  order?: Order;
  estimasi?: Estimasi;
  commitment_fee?: CommitmentFee;
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

export default function CommitmentFeePage() {
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [responseFilter, setResponseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true, marketing_response_enabled: true });

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    title: string;
    fileName: string;
    filePath: string;
  } | null>(null);

  // Fee Input Modal
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [targetMoodboard, setTargetMoodboard] = useState<Moodboard | null>(null);
  const [totalFeeInput, setTotalFeeInput] = useState('');
  const [isSubmittingFee, setIsSubmittingFee] = useState(false);

  // Upload Payment Proof Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [targetFeeId, setTargetFeeId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Verification Loading
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mbRes, settingsRes] = await Promise.all([
        api.get('/moodboards'),
        api.get('/settings')
      ]);

      setMoodboards(mbRes.data.data || []);
      const s: { key: string; value: string }[] = settingsRes.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
        marketing_response_enabled: s.find(x => x.key === 'marketing_response_enabled')?.value === 'true',
      });
    } catch {
      toast.error('Gagal memuat data commitment fee');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter moodboards that have approved/accepted design (moodboard_kasar is set or status approved)
  const approvedMoodboards = moodboards.filter(m => {
    const hasApprovedKasar = m.files?.some(f => f.file_type === 'kasar' && f.status === 'approved');
    return (m.status === 'approved' || hasApprovedKasar) && m.order;
  });

  const serviceTypeOptions = (() => {
    const baseMap = new Map(jenisOptions.map(o => [o.value, o.label]));
    const fromData = approvedMoodboards
      .map(m => m.order?.jenis_interior)
      .filter(Boolean) as string[];
    const extraValues = Array.from(new Set(fromData.filter(v => !baseMap.has(v)))).sort();
    return [
      ...jenisOptions,
      ...extraValues.map(v => ({ value: v, label: toTitleCase(v) })),
    ];
  })();

  const filteredItems = approvedMoodboards.filter(m => {
    const project = m.order?.nama_project?.toLowerCase() || '';
    const customer = m.order?.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      m.order?.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const paymentStatus = m.commitment_fee?.payment_status || 'pending';
    const matchesPayment = paymentStatusFilter === 'all' || paymentStatus === paymentStatusFilter;

    const responseKey = m.commitment_fee?.response_by ? 'done' : 'waiting';
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

    return matchesSearch && matchesServiceType && matchesPayment && matchesResponse && matchesDate;
  });

  const getFileUrl = (path: string) => {
    if (!path) return '';
    return `${API_BASE_URL}${path}`;
  };

  const handlePreviewDesign = (mb: Moodboard) => {
    const approvedKasar = mb.files?.find(f => f.file_type === 'kasar' && f.status === 'approved');
    if (!approvedKasar) {
      toast.error('Belum ada desain kasar yang disetujui');
      return;
    }
    setPreviewData({
      title: 'Preview Desain Terpilih',
      fileName: approvedKasar.original_name,
      filePath: approvedKasar.file_path,
    });
    setPreviewModalOpen(true);
  };

  const handlePreviewEstimasi = (mb: Moodboard) => {
    const approvedKasar = mb.files?.find(f => f.file_type === 'kasar' && f.status === 'approved');
    const matchedRAB = approvedKasar ? mb.estimasi?.files?.find(ef => ef.moodboard_file_id === approvedKasar.id) : null;
    if (!matchedRAB) {
      toast.error('Belum ada file estimasi/RAB yang terunggah');
      return;
    }
    setPreviewData({
      title: 'Preview Estimasi Terpilih',
      fileName: matchedRAB.original_name,
      filePath: matchedRAB.file_path,
    });
    setPreviewModalOpen(true);
  };

  const handleResponseCommitmentFee = async (moodboardId: number) => {
    try {
      await api.post(`/moodboards/${moodboardId}/commitment-fee/response`);
      toast.success('Inisialisasi commitment fee berhasil');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal merespons');
    }
  };

  const formatThousand = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const numStr = val.toString().replace(/\D/g, '');
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleFeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setTotalFeeInput(formatThousand(rawVal));
  };

  const handleOpenFeeModal = async (mb: Moodboard) => {
    setTargetMoodboard(mb);
    if (!mb.commitment_fee) {
      // Auto initialize response first
      setIsSubmittingFee(true);
      try {
        const initRes = await api.post(`/moodboards/${mb.id}/commitment-fee/response`);
        const updatedMb = initRes.data.data;
        setTargetMoodboard(updatedMb);
        setTotalFeeInput(formatThousand(updatedMb.commitment_fee?.total_fee?.toString() || ''));
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal menginisialisasi fee');
        setIsSubmittingFee(false);
        return;
      }
      setIsSubmittingFee(false);
    } else {
      setTotalFeeInput(formatThousand(mb.commitment_fee.total_fee?.toString() || ''));
    }
    setFeeModalOpen(true);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMoodboard || !totalFeeInput) return;
    setIsSubmittingFee(true);

    const feeId = targetMoodboard.commitment_fee?.id;
    if (!feeId) {
      toast.error('Data commitment fee belum siap');
      setIsSubmittingFee(false);
      return;
    }

    const rawNum = Number(totalFeeInput.replace(/\./g, ''));
    if (isNaN(rawNum) || rawNum <= 0) {
      toast.error('Nilai fee tidak valid');
      setIsSubmittingFee(false);
      return;
    }

    try {
      await api.put(`/commitment-fees/${feeId}/total`, {
        total_fee: rawNum
      });
      toast.success('Jumlah commitment fee berhasil diperbarui');
      setFeeModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan fee');
    } finally {
      setIsSubmittingFee(false);
    }
  };

  const handleOpenUploadPayment = (feeId: number) => {
    setTargetFeeId(feeId);
    setSelectedFile(null);
    setPaymentModalOpen(true);
  };

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFeeId || !selectedFile) return;
    setIsSubmittingPayment(true);

    const formData = new FormData();
    formData.append('payment_proof', selectedFile);

    try {
      await api.post(`/commitment-fees/${targetFeeId}/payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Bukti pembayaran berhasil diunggah');
      setPaymentModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah bukti pembayaran');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleVerifyPayment = async (feeId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menyetujui dan memverifikasi pembayaran ini?')) return;
    setVerifyingId(feeId);
    try {
      await api.post(`/commitment-fees/${feeId}/verify`);
      toast.success('Pembayaran commitment fee berhasil diverifikasi');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi pembayaran');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleResetPayment = async (feeId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin mereset/menghapus bukti pembayaran ini?')) return;
    try {
      await api.post(`/commitment-fees/${feeId}/reset`);
      toast.success('Pembayaran berhasil direset ke status pending');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal reset pembayaran');
    }
  };

  // Generate Word Document client-side using docx library (valid ZIP format)
  const handlePrintWord = (mb: Moodboard) => {
    const fee = mb.commitment_fee;
    if (!fee || !fee.total_fee) return;

    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalFeeStr = fee.total_fee.toLocaleString('id-ID');
    const nomorOrder = mb.order?.nomor_order || '';
    const namaCustomer = mb.order?.nama_customer || '';
    const namaProject = mb.order?.nama_project || '';
    const alamat = mb.order?.alamat || '';

    // Create the document using docx node builders
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // =================================================================
            // PAGE 1: SURAT PERNYATAAN KOMITMEN (COMMITMENT FEE)
            // =================================================================
            // Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 }, // 6pt
              children: [
                new TextRun({
                  text: "SURAT PERNYATAAN KOMITMEN (COMMITMENT FEE)",
                  bold: true,
                  size: 28, // 14pt
                  font: "Times New Roman",
                }),
              ],
            }),
            // Subtitle
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 }, // 18pt
              children: [
                new TextRun({
                  text: `Nomor Dokumen: DOC/CF/${nomorOrder}/${fee.id}`,
                  size: 22, // 11pt
                  font: "Times New Roman",
                }),
              ],
            }),
            // Body Paragraph 1
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
              indent: { firstLine: 720 }, // Indent first line
              children: [
                new TextRun({
                  text: "Pada hari ini, tanggal ",
                  size: 22,
                  font: "Times New Roman",
                }),
                new TextRun({
                  text: todayStr,
                  bold: true,
                  size: 22,
                  font: "Times New Roman",
                }),
                new TextRun({
                  text: ", kami yang bertanda tangan di bawah ini menyatakan kesepakatan komitmen proyek desain interior:",
                  size: 22,
                  font: "Times New Roman",
                }),
              ],
            }),
            // Table for client details
            new DocxTable({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nama Klien", bold: true, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 70, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: `: ${namaCustomer}`, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nama Project", bold: true, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 70, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: `: ${namaProject}`, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nomor Order", bold: true, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 70, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: `: ${nomorOrder}`, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Alamat Proyek", bold: true, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 70, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: `: ${alamat}`, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            // Body Paragraph 2
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 240, after: 120 },
              indent: { firstLine: 720 },
              children: [
                new TextRun({
                  text: "Bahwa pihak klien telah menyatakan kesepakatan dan komitmen atas pengerjaan konsep desain visual proyek dengan membayar ",
                  size: 22,
                  font: "Times New Roman",
                }),
                new TextRun({
                  text: "Commitment Fee",
                  bold: true,
                  size: 22,
                  font: "Times New Roman",
                }),
                new TextRun({
                  text: " sebesar ",
                  size: 22,
                  font: "Times New Roman",
                }),
                new TextRun({
                  text: `Rp ${totalFeeStr}`,
                  bold: true,
                  size: 22,
                  font: "Times New Roman",
                }),
                new TextRun({
                  text: " (Rupiah) sebagai prasyarat dimulainya pengerjaan master blueprint desain final.",
                  size: 22,
                  font: "Times New Roman",
                }),
              ],
            }),
            // Body Paragraph 3
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
              indent: { firstLine: 720 },
              children: [
                new TextRun({
                  text: "Commitment fee ini bersifat mengikat dan akan diperhitungkan sebagai pengurang dari total biaya jasa desain interior pada saat pelunasan termin berikutnya.",
                  size: 22,
                  font: "Times New Roman",
                }),
              ],
            }),
            // Body Paragraph 4
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 480 },
              indent: { firstLine: 720 },
              children: [
                new TextRun({
                  text: "Demikian surat pernyataan komitmen ini dibuat dengan kesadaran penuh dari kedua belah pihak untuk dapat dipergunakan sebagaimana mestinya.",
                  size: 22,
                  font: "Times New Roman",
                }),
              ],
            }),
            // Signatures Table
            new DocxTable({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "Hormat Kami,", size: 22, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({ spacing: { after: 720 } }), // gap for signature
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "PT. MOEY LIVING INDONESIA", bold: true, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "(Finance / Customer Service)", size: 18, color: "888888", font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "Menyetujui,", size: 22, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({ spacing: { after: 720 } }), // gap for signature
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: namaCustomer, bold: true, size: 22, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "(Pelanggan / Klien)", size: 18, color: "888888", font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // =================================================================
            // PAGE 2: INVOICE / KWITANSI COMMITMENT FEE
            // =================================================================
            // Page Break
            new Paragraph({
              children: [new PageBreak()],
            }),

            // Kop Surat / Header
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: "PT. MOEY LIVING INDONESIA",
                  bold: true,
                  size: 32, // 16pt
                  color: "008080", // Teal color
                  font: "Arial",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: "Premium Interior Design & Architecture Services",
                  size: 18, // 9pt
                  color: "646464", // Gray color
                  font: "Arial",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Email: finance@moeyliving.com | Phone: +62 812-3456-7890",
                  size: 18, // 9pt
                  color: "646464", // Gray color
                  font: "Arial",
                }),
              ],
            }),

            // Horizontal Line
            new DocxTable({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 24, color: "008080" }, // 3pt thickness
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [],
                    }),
                  ],
                }),
              ],
            }),

            // Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 60 },
              children: [
                new TextRun({
                  text: "INVOICE / KWITANSI COMMITMENT FEE",
                  bold: true,
                  size: 28, // 14pt
                  font: "Arial",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [
                new TextRun({
                  text: `No. Invoice: INV/CF/${nomorOrder}/${fee.id}`,
                  size: 20, // 10pt
                  font: "Arial",
                }),
              ],
            }),

            // Invoice Info Grid Table
            new DocxTable({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                // Grid Header
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "INFORMASI KELAYAKAN PROYEK",
                              bold: true,
                              color: "008080",
                              size: 20,
                              font: "Arial",
                            }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Rincian Tagihan",
                              bold: true,
                              color: "008080",
                              size: 20,
                              font: "Arial",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                // Grid Row 1
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nomor Order: ", size: 18, font: "Arial" }),
                            new TextRun({ text: nomorOrder, bold: true, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Tanggal Tagihan: ", size: 18, font: "Arial" }),
                            new TextRun({ text: todayStr, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                // Grid Row 2
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nama Project: ", size: 18, font: "Arial" }),
                            new TextRun({ text: namaProject, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Status Bayar: ", size: 18, font: "Arial" }),
                            new TextRun({
                              text: fee.payment_status === 'completed' ? "LUNAS (Completed)" : "MENUNGGU PEMBAYARAN",
                              bold: true,
                              color: fee.payment_status === 'completed' ? "107C41" : "C87800",
                              size: 18,
                              font: "Arial",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                // Grid Row 3
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Pelanggan: ", size: 18, font: "Arial" }),
                            new TextRun({ text: namaCustomer, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Metode Bayar: ", size: 18, font: "Arial" }),
                            new TextRun({ text: "Bank Transfer", size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                // Grid Row 4 (Alamat Proyek)
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      columnSpan: 2,
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Alamat Proyek: ", size: 18, font: "Arial" }),
                            new TextRun({ text: alamat, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // Spacer paragraph
            new Paragraph({ spacing: { before: 240 } }),

            // Items Table
            new DocxTable({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                // Table Header
                new DocxTableRow({
                  tableHeader: true,
                  children: [
                    new DocxTableCell({
                      width: { size: 10, type: WidthType.PERCENTAGE },
                      shading: { fill: "008080" },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "No", bold: true, color: "FFFFFF", size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 60, type: WidthType.PERCENTAGE },
                      shading: { fill: "008080" },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Deskripsi Layanan", bold: true, color: "FFFFFF", size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      shading: { fill: "008080" },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({ text: "Total Biaya", bold: true, color: "FFFFFF", size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                // Table Row 1
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "1", size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `Pembayaran Awal (Commitment Fee) untuk Pembuatan Desain Interior Proyek: ${namaProject}`,
                              size: 18,
                              font: "Arial",
                            }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({ text: `Rp ${totalFeeStr}`, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                // Total Row
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      columnSpan: 2,
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({ text: "Total Tagihan", bold: true, size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({ text: `Rp ${totalFeeStr}`, bold: true, color: "008080", size: 18, font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // Note / Bank Account
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 240, after: 60 },
              children: [
                new TextRun({
                  text: "INFORMASI PEMBAYARAN TRANSFER BANK:",
                  bold: true,
                  color: "008080",
                  size: 18,
                  font: "Arial",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({ text: "Bank: BCA (Bank Central Asia)", size: 18, font: "Arial" }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({ text: "Nomor Rekening: 123-456-7890", size: 18, font: "Arial" }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 240 },
              children: [
                new TextRun({ text: "Atas Nama: PT. MOEY LIVING INDONESIA", size: 18, font: "Arial" }),
              ],
            }),

            // Signatures Page 2
            new DocxTable({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "Hormat Kami,", size: 18, font: "Arial" }),
                          ],
                        }),
                        new Paragraph({ spacing: { after: 720 } }), // gap for signature
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "PT. MOEY LIVING INDONESIA", bold: true, size: 18, font: "Arial" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "(Finance / Customer Service)", size: 16, color: "888888", font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                    new DocxTableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "Pelanggan,", size: 18, font: "Arial" }),
                          ],
                        }),
                        new Paragraph({ spacing: { after: 720 } }), // gap for signature
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: namaCustomer, bold: true, size: 18, font: "Arial" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "(Tanda Tangan & Nama Terang)", size: 16, color: "888888", font: "Arial" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    // Save as blob and trigger download
    Packer.toBlob(doc).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Surat_Komitmen_${nomorOrder}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Surat Komitmen (Word .docx) berhasil diunduh');
    }).catch(() => {
      toast.error('Gagal mengunduh Surat Komitmen');
    });
  };

  const handlePrintPDF = async (feeId: number, nomorOrder: string) => {
    try {
      const response = await api.get(`/commitment-fees/${feeId}/print`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_CF_${nomorOrder}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Kwitansi PDF berhasil diunduh');
    } catch {
      toast.error('Gagal mencetak Kwitansi PDF');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Coins size={18} className="text-teal-500 animate-pulse" /> Commitment Fee
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola rincian biaya awal dan bukti komitmen pengerjaan proyek</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Komitmen Pembayaran Klien</h2>
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

            {/* Payment Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Payment Status</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Payment" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua Payment</SelectItem>
                  <SelectItem value="pending" className="text-xs font-medium">Pending</SelectItem>
                  <SelectItem value="completed" className="text-xs font-medium">Completed</SelectItem>
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
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Files & Desain</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Fee Details</TableHead>
                {(config.response_enabled || config.marketing_response_enabled) && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Response Status</TableHead>
                )}
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 6 : 5} className="text-center py-12 text-gray-400 text-xs">Loading...</TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 6 : 5} className="text-center py-12 text-gray-400 text-xs">Belum ada proyek yang disetujui desain kasarnya</TableCell>
                </TableRow>
              ) : (
                filteredItems.map(m => {
                  const order = m.order!;
                  const fee = m.commitment_fee;
                  const isAwaitingResponse = config.response_enabled && (!fee || !fee.response_by);

                  // Calculate status badge style
                  let statusText = 'Belum Isi Fee';
                  let statusStyle = 'bg-red-50 text-red-600 border-red-100';

                  if (fee && fee.total_fee !== null) {
                    if (!fee.payment_proof) {
                      statusText = 'Menunggu Pembayaran';
                      statusStyle = 'bg-amber-50 text-amber-600 border-amber-100';
                    } else if (fee.payment_status !== 'completed') {
                      statusText = 'Menunggu Verifikasi';
                      statusStyle = 'bg-blue-50 text-blue-600 border-blue-100';
                    } else {
                      statusText = 'Lunas / Selesai';
                      statusStyle = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    }
                  }

                  return (
                    <TableRow key={m.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
                      {/* Project & Client */}
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-gray-800 block">{order.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold block">{order.nama_customer} &bull; {order.nomor_order}</span>
                        </div>
                      </TableCell>

                      {/* FILES & DESAIN */}
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5 max-w-[200px]">
                          {/* Design Preview & Download */}
                          {(() => {
                            const approvedKasar = m.files?.find(f => f.file_type === 'kasar' && f.status === 'approved');
                            return approvedKasar ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  onClick={() => handlePreviewDesign(m)}
                                  className="h-8 text-[10px] font-bold px-2.5 rounded-lg flex-1 bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100 hover:text-purple-700 flex items-center justify-start gap-1.5"
                                >
                                  <Image size={12} className="text-purple-500 animate-in fade-in" />
                                  <span>Preview Design</span>
                                </Button>
                                <a
                                  href={getFileUrl(approvedKasar.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-8 w-8 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shrink-0"
                                  title="Download Desain"
                                >
                                  <Download size={11} />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-semibold italic">Desain belum disetujui</span>
                            );
                          })()}

                          {/* Estimasi Preview & Download */}
                          {(() => {
                            const approvedKasar = m.files?.find(f => f.file_type === 'kasar' && f.status === 'approved');
                            const matchedRAB = approvedKasar ? m.estimasi?.files?.find(ef => ef.moodboard_file_id === approvedKasar.id) : null;
                            return matchedRAB ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  onClick={() => handlePreviewEstimasi(m)}
                                  className="h-8 text-[10px] font-bold px-2.5 rounded-lg flex-1 bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 hover:text-sky-700 flex items-center justify-start gap-1.5"
                                >
                                  <FileText size={12} className="text-sky-500 animate-in fade-in" />
                                  <span>File Estimasi</span>
                                </Button>
                                <a
                                  href={getFileUrl(matchedRAB.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-8 w-8 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shrink-0"
                                  title="Download Estimasi"
                                >
                                  <Download size={11} />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-semibold italic">Estimasi belum diunggah</span>
                            );
                          })()}
                        </div>
                      </TableCell>

                      {/* Fee Details */}
                      <TableCell className="py-4">
                        {fee && fee.total_fee !== null ? (
                          <span className="text-xs font-bold text-gray-800">
                            Rp {fee.total_fee.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold italic">Belum ditentukan</span>
                        )}
                      </TableCell>

                      {/* Response Status */}
                      {(config.response_enabled || config.marketing_response_enabled) && (
                        <TableCell className="py-4">
                          <div className="space-y-1.5">
                            {/* CS Response */}
                            {config.response_enabled && (
                              fee?.response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                  <Check size={10} className="stroke-[3]" /> {fee.response_by.split('@')[0]} • {formatResponseTime(fee.response_time)}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleResponseCommitmentFee(m.id)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 transition-colors"
                                >
                                  Response CF
                                </button>
                              )
                            )}

                            {/* Marketing Response */}
                            {config.marketing_response_enabled && (
                              fee?.pm_response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                  <Check size={10} className="stroke-[3]" /> {fee.pm_response_by.split('@')[0]} • {formatResponseTime(fee.pm_response_time)}
                                </div>
                              ) : fee?.payment_proof ? (
                                <button
                                  onClick={() => handleVerifyPayment(fee.id)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 transition-colors"
                                >
                                  Verify PM
                                </button>
                              ) : (
                                <span className="text-[9px] text-gray-400 font-semibold italic block">
                                  Belum diverifikasi PM
                                </span>
                              )
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Status */}
                      <TableCell className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${statusStyle}`}>
                          {statusText}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {isAwaitingResponse ? (
                            <span className="text-gray-400 text-[10px] font-semibold italic flex items-center gap-1">
                              <AlertCircle size={10} /> Awaiting Response
                            </span>
                          ) : (
                            <>
                              {/* 1. Belum isi Fee */}
                              {(!fee || fee.total_fee === null) && (
                                <Button
                                  onClick={() => handleOpenFeeModal(m)}
                                  className="h-7 text-[10px] font-extrabold px-3 bg-teal-500 hover:bg-teal-600 text-white rounded-md shadow-sm"
                                >
                                  Isi Fee
                                </Button>
                              )}

                              {/* 2. Sudah isi Fee but no payment proof */}
                              {fee && fee.total_fee !== null && !fee.payment_proof && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleOpenFeeModal(m)}
                                    className="h-7 text-[10px] font-extrabold px-2.5 rounded-md hover:bg-gray-50"
                                  >
                                    Edit Fee
                                  </Button>
                                  <Button
                                    onClick={() => handleOpenUploadPayment(fee.id)}
                                    className="h-7 text-[10px] font-extrabold px-3 bg-purple-500 hover:bg-purple-600 text-white rounded-md shadow-sm flex items-center gap-1"
                                  >
                                    <Upload size={10} /> Upload Bukti
                                  </Button>
                                </div>
                              )}

                              {/* 3. Payment proof uploaded */}
                              {fee && fee.payment_proof && (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Verification button for CS/PM if pending */}
                                  {fee.payment_status !== 'completed' && (
                                    <Button
                                      onClick={() => handleVerifyPayment(fee.id)}
                                      disabled={verifyingId === fee.id}
                                      className="h-7 text-[10px] font-extrabold px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md shadow-sm flex items-center gap-1"
                                    >
                                      {verifyingId === fee.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check size={11} className="stroke-[3]" />}
                                      Verifikasi
                                    </Button>
                                  )}

                                  {/* Print Dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="h-7 text-[10px] font-extrabold px-2.5 rounded-md flex items-center gap-1">
                                        <Printer size={11} /> Cetak
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 rounded-xl border border-gray-100 bg-white p-1 shadow-md">
                                      <DropdownMenuItem 
                                        onClick={() => handlePrintWord(m)} 
                                        className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-700 font-medium hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                      >
                                        <FileText size={13} className="text-blue-500 shrink-0" />
                                        <span>Unduh Dokumen (.docx / Word)</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handlePrintPDF(fee.id, order.nomor_order)} 
                                        className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-700 font-medium hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                      >
                                        <FileText size={13} className="text-red-500 shrink-0" />
                                        <span>Unduh Dokumen (PDF)</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {/* Download proof */}
                                  <a
                                    href={getFileUrl(fee.payment_proof)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Download Bukti Pembayaran"
                                  >
                                    <Download size={11} />
                                  </a>

                                  {/* Reset & Revise */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                                        <RefreshCw size={11} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-xs font-semibold">
                                      <DropdownMenuItem onClick={() => handleOpenFeeModal(m)} className="cursor-pointer">
                                        Revisi Nilai Fee
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleResetPayment(fee.id)} className="cursor-pointer text-red-500">
                                        Reset Bukti Pembayaran
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </>
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

      {/* DIALOG MODAL: Preview File */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[640px] w-[90vw] bg-white">
          {previewData && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Eye size={18} className="text-teal-500" />
                  {previewData.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-gray-500 truncate mt-1">
                  Nama file: <strong>{previewData.fileName}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="my-5">
                {(() => {
                  const ext = previewData.filePath.split('.').pop()?.toLowerCase() || '';
                  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
                    return (
                      <div className="flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-2 max-h-[60vh]">
                        <img
                          src={getFileUrl(previewData.filePath)}
                          alt={previewData.fileName}
                          className="object-contain max-h-[55vh] rounded-lg shadow-sm w-auto max-w-full"
                        />
                      </div>
                    );
                  } else if (ext === 'pdf') {
                    return (
                      <div className="w-full h-[60vh] rounded-xl overflow-hidden border border-gray-100">
                        <iframe
                          src={getFileUrl(previewData.filePath)}
                          title={previewData.fileName}
                          className="w-full h-full border-0"
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 px-5 border border-dashed border-gray-200 bg-gray-50/50 rounded-xl space-y-4 text-center">
                        <div className="h-16 w-16 bg-white shadow-sm border border-gray-100 rounded-2xl flex items-center justify-center text-teal-500">
                          <FileText size={32} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-gray-800 break-all">{previewData.fileName}</p>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Format: {ext || 'Unknown'}</p>
                        </div>
                        <a
                          href={getFileUrl(previewData.filePath)}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-4 h-9 text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-md shadow-teal-500/10 transition-all gap-1.5"
                        >
                          <Download size={12} /> Unduh Berkas
                        </a>
                      </div>
                    );
                  }
                })()}
              </div>

              <DialogFooter className="flex sm:flex-row gap-2">
                <a
                  href={getFileUrl(previewData.filePath)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center flex-1 sm:flex-initial px-4 h-9 text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-md shadow-teal-500/10 transition-all gap-1.5"
                >
                  <Download size={12} /> Unduh
                </a>
                <Button
                  variant="outline"
                  onClick={() => setPreviewModalOpen(false)}
                  className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 flex-1 sm:flex-initial"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL: Input / Edit Fee */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[400px]">
          <form onSubmit={handleSaveFee}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-800">
                {targetMoodboard?.commitment_fee?.total_fee !== null ? 'Revisi Nominal Commitment Fee' : 'Tentukan Nominal Commitment Fee'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
                Masukkan nilai nominal commitment fee untuk proyek <strong>{targetMoodboard?.order?.nama_project}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 space-y-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Jumlah Fee (Rupiah)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                <Input
                  type="text"
                  placeholder="Contoh: 5.000.000"
                  value={totalFeeInput}
                  onChange={handleFeeInputChange}
                  className="pl-9 font-bold text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFeeModalOpen(false)}
                disabled={isSubmittingFee}
                className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingFee}
                className="rounded-xl font-bold h-9 text-xs bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20"
              >
                {isSubmittingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Nominal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL: Upload Payment Proof */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[400px]">
          <form onSubmit={handleUploadPayment}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-800">Unggah Bukti Pembayaran</DialogTitle>
              <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
                Silakan pilih berkas bukti transfer / pembayaran commitment fee untuk proyek ini.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 space-y-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Berkas Bukti Pembayaran</span>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentModalOpen(false)}
                disabled={isSubmittingPayment}
                className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPayment}
                className="rounded-xl font-bold h-9 text-xs bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20"
              >
                {isSubmittingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unggah Bukti'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
