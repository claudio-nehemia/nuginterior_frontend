import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, CheckCircle, FileText, ShieldAlert, FileSpreadsheet, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface RABRoomBahanBaku {
	id: number;
	bahan_baku_id: number;
	nama_bahan: string;
	harga_dasar: number;
	harga_jasa: number;
	markup: number;
	displayPrice?: number;
	displayMarkup?: number;
}

interface RABRoomFinishing {
	id: number;
	item_id: number;
	nama_item: string;
	harga: number;
	type: string;
	markup: number;
	displayPrice?: number;
	displayMarkup?: number;
}

interface RABRoomAksesoris {
	id: number;
	item_id: number;
	nama_item: string;
	qty: number;
	harga: number;
	markup: number;
	harga_total: number;
}

interface RABRoom {
	id: number;
	nama_ruangan: string;
	produk_id: number | null;
	nama_produk: string;
	qty: number;
	panjang: number;
	lebar: number;
	tinggi: number;
	markup: number;
	harga_dasar: number;
	harga_satuan: number;
	harga_total: number;
	bahan_bakus: RABRoomBahanBaku[];
	finishing_dalams: RABRoomFinishing[];
	finishing_luars: RABRoomFinishing[];
	aksesoris: RABRoomAksesoris[];
	total_aksesoris?: number;
}

interface RABDetail {
	id: number;
	input_item_id: number;
	order_id: number;
	markup_general: number;
	grand_total: number;
	status: 'draft' | 'submitted';
	submitted_at: string | null;
	submitted_by: string | null;
	created_at: string;
	order?: {
		id: number;
		nomor_order: string;
		nama_project: string;
		nama_customer: string;
		jenis_interior: string;
	};
	rooms: RABRoom[];
}

type RabFormat = 'internal' | 'kontrak' | 'vendor' | 'jasa';

export default function RabDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [rab, setRab] = useState<RABDetail | null>(null);
	const [activeTab, setActiveTab] = useState<RabFormat>('internal');
	const [isLoading, setIsLoading] = useState(true);

	const colSpanVal = activeTab === 'internal' ? 13 : activeTab === 'jasa' ? 8 : 11;

	const loadData = async () => {
		setIsLoading(true);
		try {
			const res = await api.get(`/rab/${id}`);
			setRab(res.data.data);
		} catch (err: any) {
			toast.error('Gagal memuat detail RAB: ' + (err.response?.data?.message || err.message));
			navigate('/dashboard/rab');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (id) {
			loadData();
		}
	}, [id]);

	const handleSubmitRAB = async () => {
		if (!confirm('Apakah Anda yakin ingin submit RAB ini? Pilihan pengeditan akan dikunci setelah disubmit.')) return;
		try {
			await api.post(`/rab/${id}/submit`);
			toast.success('RAB berhasil disubmit dan dikunci');
			loadData();
		} catch (err: any) {
			toast.error(err.response?.data?.message || 'Gagal submit RAB');
		}
	};

	const handleExport = async (type: 'pdf' | 'excel') => {
		try {
			toast.info(`Mengekspor berkas ${type.toUpperCase()}...`);
			
			// Request arraybuffer to handle binary downloads
			const response = await api.get(`/rab/${id}/export`, {
				params: { type, mode: activeTab },
				responseType: 'blob'
			});

			const blob = new Blob([response.data], {
				type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			});
			
			const filename = `RAB_${rab?.order?.nomor_order || 'DOC'}_${activeTab}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
			const link = document.createElement('a');
			link.href = window.URL.createObjectURL(blob);
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			toast.success(`Ekspor ${type.toUpperCase()} berhasil`);
		} catch (err: any) {
			toast.error('Gagal mengekspor file: ' + err.message);
		}
	};

	if (isLoading || !rab) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="w-8 h-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
			</div>
		);
	}

	const isSubmitted = rab.status === 'submitted';

	// Client-side mapping calculations for switching layout modes instantly
	const getCalculatedRoomRow = (room: RABRoom, format: RabFormat) => {
		let totalBB = 0;
		const mappedBB = room.bahan_bakus.map(bb => {
			const bbPrice = format === 'jasa' ? bb.harga_jasa : bb.harga_dasar;
			const bbMarkup = (format === 'vendor' || format === 'jasa') ? 0 : (bb.markup || room.markup || 0);
			const markedUpPrice = bbPrice * (1 + bbMarkup / 100);
			totalBB += markedUpPrice;
			
			const displayPrice = format === 'kontrak' ? markedUpPrice : bbPrice;
			const displayMarkup = format === 'kontrak' ? 0 : bbMarkup;
			return { ...bb, displayPrice, displayMarkup };
		});

		let totalFinishing = 0;
		const mappedFinishingDalams = room.finishing_dalams.map(f => {
			const fMarkup = (format === 'vendor' || format === 'jasa') ? 0 : (f.markup || room.markup || 0);
			const markedUpPrice = f.harga * (1 + fMarkup / 100);
			totalFinishing += markedUpPrice;
			
			const displayPrice = format === 'kontrak' ? markedUpPrice : f.harga;
			const displayMarkup = format === 'kontrak' ? 0 : fMarkup;
			return { ...f, displayPrice, displayMarkup };
		});
		const mappedFinishingLuars = room.finishing_luars.map(f => {
			const fMarkup = (format === 'vendor' || format === 'jasa') ? 0 : (f.markup || room.markup || 0);
			const markedUpPrice = f.harga * (1 + fMarkup / 100);
			totalFinishing += markedUpPrice;
			
			const displayPrice = format === 'kontrak' ? markedUpPrice : f.harga;
			const displayMarkup = format === 'kontrak' ? 0 : fMarkup;
			return { ...f, displayPrice, displayMarkup };
		});

		let totalAksesoris = 0;
		const mappedAksesoris = room.aksesoris.map(a => {
			const aksPrice = format === 'jasa' ? 0 : a.harga;
			const aksMarkup = (format === 'vendor' || format === 'jasa') ? 0 : a.markup;
			const aksTotal = format === 'jasa' ? 0 : aksPrice * (1 + aksMarkup / 100) * a.qty;
			totalAksesoris += aksTotal;

			const displayPrice = format === 'kontrak' ? aksPrice * (1 + aksMarkup / 100) : aksPrice;
			const displayMarkup = format === 'kontrak' ? 0 : aksMarkup;

			return {
				...a,
				displayPrice,
				displayMarkup,
				displayTotal: aksTotal
			};
		});

		const currentMarkup = (format === 'vendor' || format === 'jasa') ? 0 : room.markup;
		const computedHargaDasar = totalBB + totalFinishing;
		const volume = room.panjang * room.lebar * room.tinggi;
		const computedHargaSatuan = computedHargaDasar * volume * room.qty;
		const computedHargaTotal = computedHargaSatuan + totalAksesoris;

		return {
			...room,
			bahan_bakus: mappedBB,
			finishing_dalams: mappedFinishingDalams,
			finishing_luars: mappedFinishingLuars,
			aksesoris: mappedAksesoris,
			markup: format === 'kontrak' ? 0 : currentMarkup,
			harga_dasar: computedHargaDasar,
			harga_satuan: computedHargaSatuan,
			total_aksesoris: totalAksesoris,
			harga_total: computedHargaTotal
		};
	};

	const calculatedRooms = rab.rooms.map(room => getCalculatedRoomRow(room, activeTab));
	const calculatedGrandTotal = calculatedRooms.reduce((acc, r) => acc + r.harga_total, 0);

	return (
		<div className="space-y-5 animate-in fade-in duration-500">
			{/* Header navigation and status info */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
				<div className="flex items-center gap-3">
					<Button
						onClick={() => navigate('/dashboard/rab')}
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-xl hover:bg-gray-100 text-gray-500"
					>
						<ArrowLeft size={18} />
					</Button>
					<div>
						<h1 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
							Detail Dokumen RAB
							{isSubmitted ? (
								<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border bg-emerald-50 text-emerald-600 border-emerald-200">
									<Lock size={10} /> TERKUNCI (SUBMITTED)
								</span>
							) : (
								<span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border bg-amber-50 text-amber-600 border-amber-200">
									DRAFT
								</span>
							)}
						</h1>
						<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
							No. Dokumen: DOC/RAB/{rab.order?.nomor_order}/{rab.id}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{isSubmitted ? (
						<Button
							disabled
							variant="outline"
							className="h-9 font-extrabold text-xs px-4 rounded-xl border-gray-200 text-gray-400"
						>
							<Edit size={14} className="mr-1.5" /> Edit (Disabled)
						</Button>
					) : (
						<>
							<Button
								onClick={() => navigate(`/dashboard/rab/${rab.id}/edit`)}
								variant="outline"
								className="h-9 font-extrabold text-xs px-4 rounded-xl border-teal-200 text-teal-600 hover:bg-teal-50"
							>
								<Edit size={14} className="mr-1.5" /> Edit RAB
							</Button>
							<Button
								onClick={handleSubmitRAB}
								className="h-9 font-extrabold text-xs px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white hover:text-white shadow-lg shadow-teal-600/10 border-0 inline-flex items-center justify-center"
							>
								<CheckCircle size={14} className="mr-1.5" /> Submit & Kunci RAB
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Project Info details */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
				<Card className="border-0 shadow-sm rounded-2xl bg-white md:col-span-2">
					<CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
						<div>
							<span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Nama Klien</span>
							<span className="text-gray-800 font-bold block mt-1">{rab.order?.nama_customer}</span>
						</div>
						<div>
							<span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Nama Project</span>
							<span className="text-gray-800 font-bold block mt-1">{rab.order?.nama_project}</span>
						</div>
						<div>
							<span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Nomor Order</span>
							<span className="text-gray-800 font-bold block mt-1">{rab.order?.nomor_order}</span>
						</div>
						<div>
							<span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Tipe Interior</span>
							<span className="text-gray-800 font-bold block mt-1 uppercase text-teal-600">{rab.order?.jenis_interior}</span>
						</div>
					</CardContent>
				</Card>

				<Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<span className="text-[9px] font-bold text-teal-100 uppercase tracking-widest block">RAB Grand Total ({activeTab.toUpperCase()})</span>
							<span className="text-lg font-black block mt-1">Rp {calculatedGrandTotal.toLocaleString('id-ID')}</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Locked Banner details */}
			{isSubmitted && (
				<div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-3 text-emerald-800">
					<ShieldAlert size={20} className="text-emerald-600 shrink-0 mt-0.5" />
					<div className="space-y-0.5">
						<span className="font-extrabold text-xs block text-emerald-900">Dokumen Telah Disubmit</span>
						<p className="text-[10px] leading-relaxed font-semibold text-emerald-800/90">
							RAB ini telah dikunci pada {rab.submitted_at ? new Date(rab.submitted_at).toLocaleString('id-ID') : '-'} oleh {rab.submitted_by || 'Finance'}. 
							Akses pengubahan dinonaktifkan demi menjaga integritas data akuntansi.
						</p>
					</div>
				</div>
			)}

			{/* Layout format Segmented controls */}
			<div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-5 flex-wrap">
				<div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
					{(['internal', 'kontrak', 'vendor', 'jasa'] as RabFormat[]).map(format => (
						<button
							key={format}
							onClick={() => setActiveTab(format)}
							className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
								activeTab === format
									? 'bg-teal-500 text-white shadow-md shadow-teal-500/15'
									: 'text-gray-400 hover:text-gray-600'
							}`}
						>
							RAB {format}
						</button>
					))}
				</div>

				<div className="flex items-center gap-2">
					<Button
						onClick={() => handleExport('pdf')}
						variant="outline"
						size="sm"
						className="h-8 text-[10px] font-extrabold px-3 border-teal-200 text-teal-600 hover:bg-teal-50 rounded-lg"
					>
						<FileText size={12} className="mr-1" /> PDF
					</Button>
					<Button
						onClick={() => handleExport('excel')}
						variant="outline"
						size="sm"
						className="h-8 text-[10px] font-extrabold px-3 border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg"
					>
						<FileSpreadsheet size={12} className="mr-1" /> Excel
					</Button>
				</div>
			</div>

			{/* Pricing breakdown table view */}
			<Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
				<CardContent className="p-0">
					<Table>
						<TableHeader className="bg-gray-50/50">
							<TableRow className="border-gray-100 hover:bg-transparent text-[10px] uppercase font-black text-gray-500 tracking-wider">
								<TableHead className="px-4 py-3">Produk</TableHead>
								<TableHead className="py-3">Bahan Baku</TableHead>
								<TableHead className="text-right py-3">Harga Bahan</TableHead>
								<TableHead className="py-3">Finishing</TableHead>
								<TableHead className="text-right py-3">Harga Finishing</TableHead>
								{activeTab === 'internal' && (
									<TableHead className="text-center py-3 w-16">Markup</TableHead>
								)}
								<TableHead className="text-center py-3">Qty / Volume</TableHead>
								<TableHead className="text-right py-3">Harga Satuan</TableHead>
								{activeTab !== 'jasa' && (
									<>
										<TableHead className="py-3">Aksesoris</TableHead>
										<TableHead className="text-right py-3">Harga Aksesoris</TableHead>
									</>
								)}
								{activeTab === 'internal' && (
									<TableHead className="text-center py-3 w-24">Markup Aksesoris</TableHead>
								)}
								{activeTab !== 'jasa' && (
									<TableHead className="text-right py-3">Total Aksesoris</TableHead>
								)}
								<TableHead className="text-right px-4 py-3">Grand Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(() => {
								// Group rooms by nama_ruangan
								const groupedRooms: { [key: string]: typeof calculatedRooms } = {};
								calculatedRooms.forEach(room => {
									if (!groupedRooms[room.nama_ruangan]) {
										groupedRooms[room.nama_ruangan] = [];
									}
									groupedRooms[room.nama_ruangan].push(room);
								});

								return Object.entries(groupedRooms).map(([namaRuangan, productsList]) => {
									const roomSubtotal = productsList.reduce((sum, p) => sum + p.harga_total, 0);
									const totalProductsCount = productsList.length;

									return (
										<>
											{/* Room Group Header Row (Blue/Teal Bar with explicit non-clashing bg) */}
											<TableRow key={`group-${namaRuangan}`} className="!bg-teal-600 hover:!bg-teal-600 border-b border-teal-700">
												<TableCell colSpan={colSpanVal} className="py-2 px-4 !bg-teal-600 !text-white">
													<div className="flex items-center gap-2 font-bold text-xs">
														<span className="font-black text-sm uppercase tracking-wide">{namaRuangan}</span>
														<span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
															{totalProductsCount} produk
														</span>
													</div>
												</TableCell>
											</TableRow>

											{/* Products list within this Room Group */}
											{productsList.map((room, pIdx) => {
												const volume = room.panjang * room.lebar * room.tinggi;
												return (
													<TableRow key={`room-${room.id}`} className="border-b border-gray-100 hover:bg-gray-50/40 text-xs font-semibold text-gray-700">
														{/* Column 1: Produk */}
														<TableCell className="px-4 py-3">
															<div className="space-y-1">
																<div className="font-extrabold text-xs text-gray-800">
																	{pIdx + 1}. {room.nama_produk || 'Kustom'}
																</div>
																<div className="text-[9px] text-gray-400 font-bold block uppercase tracking-wide">
																	P:{room.panjang.toFixed(2)}m L:{room.lebar.toFixed(2)}m T:{room.tinggi.toFixed(2)}m
																</div>
															</div>
														</TableCell>

														{/* Column 2: Bahan Baku (Nama) */}
														<TableCell className="py-3">
															{room.bahan_bakus.length > 0 ? (
																<ul className="space-y-1">
																	{room.bahan_bakus.map((bb, bIdx) => (
																		<li key={bIdx} className="font-bold text-gray-800 flex items-center gap-1">
																			<span>&bull;</span>
																			<span>{bb.nama_bahan}</span>
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-gray-400">-</span>
															)}
														</TableCell>

														{/* Column 3: Harga Bahan */}
														<TableCell className="text-right py-3 text-teal-600 font-extrabold">
															{room.bahan_bakus.length > 0 ? (
																<ul className="space-y-1">
																	{room.bahan_bakus.map((bb, bIdx) => (
																		<li key={bIdx}>
																			Rp {bb.displayPrice?.toLocaleString('id-ID')}
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-gray-400">-</span>
															)}
														</TableCell>

														{/* Column 4: Finishing (Nama) */}
														<TableCell className="py-3">
															{[...room.finishing_dalams, ...room.finishing_luars].length > 0 ? (
																<ul className="space-y-1">
																	{[...room.finishing_dalams, ...room.finishing_luars].map((f, fIdx) => (
																		<li key={fIdx} className="font-bold text-gray-800 flex items-center gap-1">
																			<span>&bull;</span>
																			<span>{f.nama_item} ({f.type === 'dalam' ? 'Dalam' : 'Luar'})</span>
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-gray-400">-</span>
															)}
														</TableCell>

														{/* Column 5: Harga Finishing */}
														<TableCell className="text-right py-3 text-teal-600 font-extrabold">
															{[...room.finishing_dalams, ...room.finishing_luars].length > 0 ? (
																<ul className="space-y-1">
																	{[...room.finishing_dalams, ...room.finishing_luars].map((f, fIdx) => (
																		<li key={fIdx}>
																			Rp {f.displayPrice?.toLocaleString('id-ID')}
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-gray-400">-</span>
															)}
														</TableCell>

														{/* Column 6: Markup (Internal only) */}
														{activeTab === 'internal' && (
															<TableCell className="text-center py-3 font-extrabold text-teal-600">
																{room.markup}%
															</TableCell>
														)}

														{/* Column 7: Qty / Volume */}
														<TableCell className="text-center py-3">
															<div className="space-y-0.5">
																<span className="font-bold text-gray-800 block">{volume.toFixed(2)}m³</span>
																<span className="text-[10px] text-gray-400 font-bold block">Qty: {room.qty}</span>
															</div>
														</TableCell>

														{/* Column 8: Harga Satuan */}
														<TableCell className="text-right py-3 font-bold text-gray-800">
															Rp {room.harga_satuan.toLocaleString('id-ID')}
														</TableCell>

														{/* Column 9: Aksesoris (Nama) */}
														{activeTab !== 'jasa' && (
															<TableCell className="py-3">
																{room.aksesoris.length > 0 ? (
																	<ul className="space-y-1">
																		{room.aksesoris.map((aks, aIdx) => (
																			<li key={aIdx} className="font-bold text-gray-800 flex items-center gap-1">
																				<span>&bull;</span>
																				<span>{aks.nama_item} (x{aks.qty})</span>
																			</li>
																		))}
																	</ul>
																) : (
																	<span className="text-gray-400">-</span>
																)}
															</TableCell>
														)}

														{/* Column 10: Harga Aksesoris */}
														{activeTab !== 'jasa' && (
															<TableCell className="text-right py-3 text-purple-600 font-extrabold">
																{room.aksesoris.length > 0 ? (
																	<ul className="space-y-1">
																		{room.aksesoris.map((aks, aIdx) => (
																			<li key={aIdx}>
																				Rp {(aks.displayTotal ?? 0).toLocaleString('id-ID')}
																			</li>
																		))}
																	</ul>
																) : (
																	<span className="text-gray-400">-</span>
																)}
															</TableCell>
														)}

														{/* Column 11: Markup Aksesoris (Internal only) */}
														{activeTab === 'internal' && (
															<TableCell className="text-center py-3">
																{room.aksesoris.length > 0 ? (
																	<ul className="space-y-1">
																		{room.aksesoris.map((aks, aIdx) => (
																			<li key={aIdx} className="font-extrabold text-teal-600">
																				{aks.displayMarkup}%
																			</li>
																		))}
																	</ul>
																) : (
																	<span className="text-gray-400">-</span>
																)}
															</TableCell>
														)}

														{/* Column 11.5: Total Aksesoris */}
														{activeTab !== 'jasa' && (
															<TableCell className="text-right py-3 font-extrabold text-purple-600">
																{room.aksesoris.length > 0 ? (
																	<span>Rp {(room.total_aksesoris ?? 0).toLocaleString('id-ID')}</span>
																) : (
																	<span className="text-gray-400">-</span>
																)}
															</TableCell>
														)}

														{/* Column 12: Grand Total */}
														<TableCell className="text-right px-4 py-3 font-black text-emerald-600">
															Rp {room.harga_total.toLocaleString('id-ID')}
														</TableCell>
													</TableRow>
												);
											})}

											{/* Room Group Footer Row (Subtotal placed below details) */}
											<TableRow key={`subtotal-${namaRuangan}`} className="border-t border-gray-200 !bg-gray-50/80 hover:!bg-gray-100/50">
												<TableCell colSpan={colSpanVal - 1} className="py-2.5 px-4 text-right font-extrabold text-gray-500 uppercase tracking-wider !bg-gray-50/80">
													Subtotal {namaRuangan}
												</TableCell>
												<TableCell className="text-right px-4 py-2.5 font-black text-teal-600 !bg-gray-50/80">
													Rp {roomSubtotal.toLocaleString('id-ID')}
												</TableCell>
											</TableRow>
										</>
									);
								});
							})()}

							{/* Entire Table Grand Total at the very bottom */}
							<TableRow className="border-t-2 border-teal-600 !bg-teal-50 hover:!bg-teal-50/90 font-black">
								<TableCell colSpan={colSpanVal - 1} className="py-3 px-4 text-right text-xs text-teal-800 uppercase tracking-widest !bg-teal-50">
									Grand Total RAB
								</TableCell>
								<TableCell className="text-right px-4 py-3 text-xs text-teal-700 font-extrabold !bg-teal-50">
									Rp {calculatedGrandTotal.toLocaleString('id-ID')}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
