import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Eye, Pencil, Trash2, Shield, Loader2, Coins, CheckCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';


interface OrderBrief {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  nama_perusahaan?: string;
  jenis_interior: string;
}

interface InputItem {
  id: number;
  desain_final_id: number;
  order_id: number;
  status: 'draft' | 'approved';
  response_time: string | null;
  response_by: string | null;
  marketing_response_time: string | null;
  marketing_response_by: string | null;
  order?: OrderBrief;
  created_at: string;
}

interface RAB {
  id: number;
  input_item_id: number;
  order_id: number;
  markup_general: number;
  grand_total: number;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  submitted_by: string | null;
  created_at: string;
  order?: OrderBrief;
}

export default function RabPage() {
	const navigate = useNavigate();
	const user = useAuthStore(state => state.user);
	const [inputItems, setInputItems] = useState<InputItem[]>([]);
	const [rabs, setRabs] = useState<RAB[]>([]);
	const [search, setSearch] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [config, setConfig] = useState({
		response_enabled: false,
		marketing_response_enabled: false,
	});

	// State for filters
	const [rabStatusFilter, setRabStatusFilter] = useState<'all' | 'submitted' | 'draft'>('all');
	const [priceRangeFilter, setPriceRangeFilter] = useState<'all' | 'under_50' | '50_150' | '150_300' | 'over_300' | 'custom'>('all');
	const [minPrice, setMinPrice] = useState<string>('');
	const [maxPrice, setMaxPrice] = useState<string>('');

	// State for pagination
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [pageSize] = useState<number>(5);


	// Check if user has write/edit/submit access
	const allowedRoles = ['Super Admin', 'Admin', 'Estimator', 'Legal Admin'];
	const hasAccess = user?.role?.nama_role ? allowedRoles.includes(user.role.nama_role) : false;

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const [iiRes, rabRes, settingsRes] = await Promise.all([
				api.get('/input-items'),
				api.get('/rab'),
				api.get('/settings'),
			]);

			// Only get approved input items
			const allII: InputItem[] = iiRes.data.data || [];
			const approvedII = allII.filter(ii => ii.status === 'approved' && ii.order);
			setInputItems(approvedII);

			setRabs(rabRes.data.data || []);

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

	const handleDelete = async (id: number) => {
		if (!confirm('Apakah Anda yakin ingin menghapus RAB ini?')) return;
		try {
			await api.delete(`/rab/${id}`);
			toast.success('RAB berhasil dihapus');
			fetchData();
		} catch {
			toast.error('Gagal menghapus RAB');
		}
	};

	const handleSubmitRAB = async (id: number) => {
		if (!confirm('Apakah Anda yakin ingin submit RAB ini? Dokumen akan dikunci setelah disubmit.')) return;
		try {
			await api.post(`/rab/${id}/submit`);
			toast.success('RAB berhasil disubmit dan dikunci');
			fetchData();
		} catch (err: any) {
			toast.error(err.response?.data?.message || 'Gagal submit RAB');
		}
	};

	// Filter based on search text
	const searchLower = search.toLowerCase();
	
	const filteredInputItems = inputItems.filter(ii => {
		const project = ii.order?.nama_project?.toLowerCase() || '';
		const customer = ii.order?.nama_customer?.toLowerCase() || '';
		const nomorOrder = ii.order?.nomor_order?.toLowerCase() || '';
		const matchesSearch = project.includes(searchLower) || 
		                      customer.includes(searchLower) || 
		                      nomorOrder.includes(searchLower);

		// Check if RAB already exists for this input item
		const alreadyHasRAB = rabs.some(r => r.input_item_id === ii.id);
		return matchesSearch && !alreadyHasRAB;
	});

	const filteredRabs = rabs.filter(r => {
		const project = r.order?.nama_project?.toLowerCase() || '';
		const customer = r.order?.nama_customer?.toLowerCase() || '';
		const nomorOrder = r.order?.nomor_order?.toLowerCase() || '';
		const matchesSearch = project.includes(searchLower) || 
		                      customer.includes(searchLower) || 
		                      nomorOrder.includes(searchLower);

		// Status Filter
		const matchesStatus = rabStatusFilter === 'all' || r.status === rabStatusFilter;

		// Price Range Filter
		let matchesPrice = true;
		const total = r.grand_total;
		
		if (priceRangeFilter === 'under_50') {
			matchesPrice = total < 50000000;
		} else if (priceRangeFilter === '50_150') {
			matchesPrice = total >= 50000000 && total <= 150000000;
		} else if (priceRangeFilter === '150_300') {
			matchesPrice = total >= 150000000 && total <= 300000000;
		} else if (priceRangeFilter === 'over_300') {
			matchesPrice = total > 300000000;
		} else if (priceRangeFilter === 'custom') {
			const min = parseFloat(minPrice) || 0;
			const max = parseFloat(maxPrice) || Infinity;
			matchesPrice = total >= min && total <= max;
		}

		return matchesSearch && matchesStatus && matchesPrice;
	});

	// Pagination logic for RAB List
	const totalItems = filteredRabs.length;
	const totalPages = Math.ceil(totalItems / pageSize);
	const startIndex = (currentPage - 1) * pageSize;
	const paginatedRabs = filteredRabs.slice(startIndex, startIndex + pageSize);

	// Reset page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [search, rabStatusFilter, priceRangeFilter, minPrice, maxPrice, pageSize]);

	return (
		<div className="space-y-5 animate-in fade-in duration-700">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
				<div className="space-y-0.5">
					<h1 className="text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
						<Coins size={22} className="text-teal-500" /> Rencana Anggaran Biaya (RAB)
					</h1>
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
						Kelola biaya produksi dan aksesoris dengan markup dinamis untuk penawaran klien dan kebutuhan internal
					</p>
				</div>
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

			{/* Settings info and role access check banner */}
			<div className="flex flex-col md:flex-row justify-between md:items-center gap-3 bg-teal-50/40 border border-teal-100/40 p-3 rounded-xl">
				<div className="flex items-center gap-2">
					<span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">Rule Response:</span>
					<div className="flex items-center gap-1.5">
						<Shield size={12} className={config.response_enabled ? 'text-emerald-500' : 'text-gray-300'} />
						<span className={`text-[10px] font-bold ${config.response_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
							Designer Response {config.response_enabled ? '(Aktif - RAB dapat dibuat jika desainer sudah merespons)' : '(Off - Tidak wajib respon desainer)'}
						</span>
					</div>
				</div>
				<div className="text-[10px] font-bold text-gray-500">
					Role Anda: <span className="text-teal-600 uppercase">{user?.role?.nama_role || 'Administrator'}</span> 
					{hasAccess ? (
						<span className="text-emerald-600 ml-1.5">(Akses Penuh RAB)</span>
					) : (
						<span className="text-red-500 ml-1.5">(Akses Lihat Detail)</span>
					)}
				</div>
			</div>

			{/* Approved Input Items Queue */}
			{filteredInputItems.length > 0 && (
				<Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden border-l-4 border-amber-400">
					<div className="px-6 py-4 border-b border-gray-50 bg-amber-50/10">
						<h2 className="text-sm font-bold text-amber-800 tracking-tight">Antrian Pembuatan RAB (Rincian Item Approved)</h2>
						<p className="text-[10px] font-medium text-amber-600/80 mt-0.5">Rincian item berikut telah disetujui dan siap dibuatkan dokumen RAB</p>
					</div>
					<CardContent className="p-0">
						<Table>
							<TableHeader className="bg-gray-50/50">
								<TableRow className="border-gray-50 hover:bg-transparent">
									<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Project & Client</TableHead>
									{config.response_enabled && (
										<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Designer Response</TableHead>
									)}
									<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredInputItems.map(ii => {
									const order = ii.order!;
									const hasDesignerResponse = ii.response_time !== null;

									return (
										<TableRow key={ii.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
											<TableCell className="px-6 py-4">
												<div className="space-y-0.5">
													<span className="font-extrabold text-xs text-gray-800 block">{order.nama_project}</span>
													<span className="text-[10px] text-gray-400 font-bold block">{order.nama_customer} &bull; {order.nomor_order}</span>
												</div>
											</TableCell>
											{config.response_enabled && (
												<TableCell className="py-4 text-xs font-semibold">
													{hasDesignerResponse ? (
														<span className="text-emerald-600">✓ Mengisi pada {new Date(ii.response_time!).toLocaleDateString('id-ID')}</span>
													) : (
														<span className="text-red-500">Belum ada response</span>
													)}
												</TableCell>
											)}
											<TableCell className="text-right px-6 py-4">
												<Button
													onClick={() => navigate(`/dashboard/rab/${ii.id}/create`, { state: { orderId: ii.order_id } })}
													disabled={!hasAccess || (config.response_enabled && !hasDesignerResponse)}
													size="sm"
													className="h-8 font-extrabold text-[10px] px-3.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
												>
													<Plus size={11} className="mr-1" /> Buat RAB
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Existing RAB List */}
			<Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-50">
					<h2 className="text-sm font-bold text-gray-800 tracking-tight">Dokumen RAB Terbit</h2>
				</div>

				{/* Filters Row */}
				<div className="px-6 py-3 bg-gray-50/20 border-b border-gray-50 flex flex-wrap items-center gap-4 text-xs font-semibold">
					<div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest mr-1">
						<Filter size={12} className="text-teal-500" /> Filter Dokumen
					</div>

					{/* Status RAB Filter */}
					<div className="flex items-center gap-1.5">
						<span className="text-[10px] text-gray-400 uppercase tracking-wider">Status Terbit</span>
						<Select value={rabStatusFilter} onValueChange={(val: any) => setRabStatusFilter(val)}>
							<SelectTrigger className="h-8 w-36 bg-white border-gray-200/80 rounded-lg text-[10px] font-bold text-gray-700">
								<SelectValue placeholder="Semua Status" />
							</SelectTrigger>
							<SelectContent className="rounded-lg text-[10px] font-bold">
								<SelectItem value="all">Semua Status</SelectItem>
								<SelectItem value="submitted">Submitted (Terbit)</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Range Harga Filter */}
					<div className="flex items-center gap-1.5">
						<span className="text-[10px] text-gray-400 uppercase tracking-wider">Range Harga</span>
						<Select value={priceRangeFilter} onValueChange={(val: any) => setPriceRangeFilter(val)}>
							<SelectTrigger className="h-8 w-44 bg-white border-gray-200/80 rounded-lg text-[10px] font-bold text-gray-700">
								<SelectValue placeholder="Semua Harga" />
							</SelectTrigger>
							<SelectContent className="rounded-lg text-[10px] font-bold">
								<SelectItem value="all">Semua Harga</SelectItem>
								<SelectItem value="under_50">Di bawah Rp 50 Juta</SelectItem>
								<SelectItem value="50_150">Rp 50 Juta - Rp 150 Juta</SelectItem>
								<SelectItem value="150_300">Rp 150 Juta - Rp 300 Juta</SelectItem>
								<SelectItem value="over_300">Di atas Rp 300 Juta</SelectItem>
								<SelectItem value="custom">Kustom Range</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Custom Price Inputs */}
					{priceRangeFilter === 'custom' && (
						<div className="flex items-center gap-2 animate-in fade-in duration-300">
							<Input
								type="number"
								placeholder="Min (Rp)"
								value={minPrice}
								onChange={e => setMinPrice(e.target.value)}
								className="h-8 w-28 bg-white border-gray-200 rounded-lg text-[10px] font-bold"
							/>
							<span className="text-gray-400 text-[10px] font-bold">s/d</span>
							<Input
								type="number"
								placeholder="Max (Rp)"
								value={maxPrice}
								onChange={e => setMaxPrice(e.target.value)}
								className="h-8 w-28 bg-white border-gray-200 rounded-lg text-[10px] font-bold"
							/>
						</div>
					)}
				</div>

				<CardContent className="p-0">
					<Table>
						<TableHeader className="bg-gray-50/50">
							<TableRow className="border-gray-50 hover:bg-transparent">
								<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Project & Client</TableHead>
								<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Tanggal Dibuat</TableHead>
								<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Grand Total</TableHead>
								<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status</TableHead>
								<TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={5} className="text-center py-12 text-gray-400 text-xs">
										<Loader2 className="w-5 h-5 animate-spin mx-auto text-teal-500" />
									</TableCell>
								</TableRow>
							) : paginatedRabs.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="text-center py-12 text-gray-400 text-xs font-semibold">
										Tidak ada dokumen RAB yang ditemukan.
									</TableCell>
								</TableRow>
							) : (
								paginatedRabs.map(rab => {
									const order = rab.order!;
									return (
										<TableRow key={rab.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/dashboard/rab/${rab.id}`)}>
											<TableCell className="px-6 py-4">
												<div className="space-y-0.5">
													<span className="font-extrabold text-xs text-gray-800 block">{order?.nama_project || 'Project'}</span>
													<span className="text-[10px] text-gray-400 font-bold block">{order?.nama_customer} &bull; {order?.nomor_order}</span>
												</div>
											</TableCell>
											<TableCell className="py-4 text-xs font-semibold text-gray-500">
												{new Date(rab.created_at).toLocaleDateString('id-ID', {
													day: 'numeric',
													month: 'short',
													year: 'numeric'
												})}
											</TableCell>
											<TableCell className="py-4 text-xs font-extrabold text-teal-600">
												Rp {rab.grand_total.toLocaleString('id-ID')}
											</TableCell>
											<TableCell className="py-4">
												{rab.status === 'submitted' ? (
													<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border bg-emerald-50 text-emerald-600 border-emerald-200">
														<CheckCircle size={10} /> SUBMITTED
													</span>
												) : (
													<span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border bg-amber-50 text-amber-600 border-amber-200">
														DRAFT
													</span>
												)}
											</TableCell>
											<TableCell className="text-right px-6 py-4" onClick={(e) => e.stopPropagation()}>
												<div className="flex items-center justify-end gap-2 transition-all">
													<button
														onClick={() => navigate(`/dashboard/rab/${rab.id}`)}
														className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-md transition-colors"
														title="Lihat Detail RAB"
													>
														<Eye size={14} />
													</button>
													
													{(rab.status === 'draft' || rab.status === 'submitted') && (
														<button
															onClick={() => navigate(`/dashboard/rab/${rab.id}/edit`)}
															disabled={!hasAccess}
															className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
															title="Edit RAB"
														>
															<Pencil size={14} />
														</button>
													)}
													
													{rab.status === 'draft' && (
														<>
															<button
																onClick={() => handleDelete(rab.id)}
																disabled={!hasAccess}
																className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
																title="Hapus RAB"
															>
																<Trash2 size={14} />
															</button>
															<Button
																onClick={() => handleSubmitRAB(rab.id)}
																disabled={!hasAccess}
																className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 rounded bg-teal-600 hover:bg-teal-700 text-white hover:text-white shadow-sm disabled:bg-gray-100 disabled:text-gray-400 inline-flex items-center justify-center transition-colors font-extrabold border-0"
															>
																Submit
															</Button>
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

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 bg-gray-50/10">
						<div className="text-xs text-gray-500 font-semibold">
							Menampilkan <span className="text-teal-600 font-bold">{startIndex + 1}</span> - <span className="text-teal-600 font-bold">{Math.min(startIndex + pageSize, totalItems)}</span> dari <span className="text-teal-600 font-bold">{totalItems}</span> dokumen
						</div>
						<div className="flex items-center gap-1.5">
							<Button
								onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
								disabled={currentPage === 1}
								variant="outline"
								className="h-8 w-8 p-0 border-gray-200 rounded-lg hover:bg-teal-50 hover:text-teal-600 disabled:opacity-40"
							>
								<ChevronLeft size={14} />
							</Button>
							
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
								<Button
									key={page}
									onClick={() => setCurrentPage(page)}
									variant={currentPage === page ? 'default' : 'outline'}
									className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${
										currentPage === page
											? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/10'
											: 'border-gray-200 hover:bg-teal-50 hover:text-teal-600'
									}`}
								>
									{page}
								</Button>
							))}

							<Button
								onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
								disabled={currentPage === totalPages}
								variant="outline"
								className="h-8 w-8 p-0 border-gray-200 rounded-lg hover:bg-teal-50 hover:text-teal-600 disabled:opacity-40"
							>
								<ChevronRight size={14} />
							</Button>
						</div>
					</div>
				)}
			</Card>
		</div>
	);
}
