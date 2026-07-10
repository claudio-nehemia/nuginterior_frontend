import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save, Calculator, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProductBahanBaku {
	bahan_baku_id: number;
	nama_bahan: string;
	harga_dasar: number;
	harga_jasa: number;
}

interface Product {
	id: number;
	nama_produk: string;
	harga: number;
	harga_jasa: number;
	bahan_bakus?: ProductBahanBaku[];
}

interface Item {
	id: number;
	nama_item: string;
	jenis_item: 'finishing_dalam' | 'finishing_luar' | 'aksesoris';
	harga: number;
}

// Client Room RAB State
interface RoomRABState {
	nama_ruangan: string;
	produk_id: number | null;
	qty: number;
	panjang: number;
	lebar: number;
	tinggi: number;
	markup: string;
	bahan_bakus: { bahan_baku_id: number; markup: string }[];
	finishing_dalams: { item_id: number; markup: string }[];
	finishing_luars: { item_id: number; markup: string }[];
	aksesoris: {
		item_id: number;
		qty: number;
		markup: string;
	}[];
}

interface RABDetail {
	id: number;
	input_item_id: number;
	order_id: number;
	markup_general: number;
	grand_total: number;
	status: 'draft' | 'submitted';
	order?: {
		id: number;
		nomor_order: string;
		nama_project: string;
		nama_customer: string;
		jenis_interior: string;
	};
	rooms: {
		nama_ruangan: string;
		produk_id: number | null;
		nama_produk: string;
		qty: number;
		panjang: number;
		lebar: number;
		tinggi: number;
		markup: number;
		bahan_bakus: { bahan_baku_id: number; markup: number }[];
		finishing_dalams: { item_id: number; markup: number }[];
		finishing_luars: { item_id: number; markup: number }[];
		aksesoris: {
			item_id: number;
			qty: number;
			markup: number;
		}[];
	}[];
}

export default function RabEditPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [rab, setRab] = useState<RABDetail | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [items, setItems] = useState<Item[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// General RAB configuration states
	const [markupGeneral, setMarkupGeneral] = useState<string>('0');
	const [roomsState, setRoomsState] = useState<RoomRABState[]>([]);

	const loadData = async () => {
		setIsLoading(true);
		try {
			const [rabRes, prodRes, itemsRes] = await Promise.all([
				api.get(`/rab/${id}`),
				api.get('/produk'),
				api.get('/items')
			]);

			const rabData: RABDetail = rabRes.data.data;
			if (rabData.status === 'submitted') {
				toast.error('RAB yang sudah disubmit tidak dapat diedit');
				navigate(`/dashboard/rab/${id}`);
				return;
			}

			setRab(rabData);
			setMarkupGeneral(String(rabData.markup_general));
			setProducts(prodRes.data.data || []);
			setItems(itemsRes.data.data || []);

			// Populate states
			const initialRooms = rabData.rooms.map(room => ({
				nama_ruangan: room.nama_ruangan,
				produk_id: room.produk_id,
				qty: room.qty,
				panjang: parseFloat(room.panjang as any) || 0,
				lebar: parseFloat(room.lebar as any) || 0,
				tinggi: parseFloat(room.tinggi as any) || 0,
				markup: String(room.markup),
				bahan_bakus: room.bahan_bakus.map(bb => ({
					bahan_baku_id: bb.bahan_baku_id,
					markup: String(bb.markup || room.markup)
				})),
				finishing_dalams: room.finishing_dalams.map(f => ({
					item_id: f.item_id,
					markup: String(f.markup || room.markup)
				})),
				finishing_luars: room.finishing_luars.map(f => ({
					item_id: f.item_id,
					markup: String(f.markup || room.markup)
				})),
				aksesoris: room.aksesoris.map(a => ({
					item_id: a.item_id,
					qty: a.qty,
					markup: String(a.markup)
				}))
			}));
			setRoomsState(initialRooms);

		} catch (err: any) {
			toast.error('Gagal memuat detail data RAB: ' + (err.response?.data?.message || err.message));
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

	// Propagate General Markup to all items when modified
	const handleGeneralMarkupChange = (valStr: string) => {
		setMarkupGeneral(valStr);
		setRoomsState(prev =>
			prev.map(room => ({
				...room,
				markup: valStr,
				bahan_bakus: room.bahan_bakus.map(bb => ({ ...bb, markup: valStr })),
				finishing_dalams: room.finishing_dalams.map(f => ({ ...f, markup: valStr })),
				finishing_luars: room.finishing_luars.map(f => ({ ...f, markup: valStr })),
				aksesoris: room.aksesoris.map(aks => ({ ...aks, markup: valStr }))
			}))
		);
	};

	const handleRoomMarkupChange = (rIdx: number, valStr: string) => {
		setRoomsState(prev => {
			const newRooms = [...prev];
			newRooms[rIdx].markup = valStr;
			newRooms[rIdx].bahan_bakus = newRooms[rIdx].bahan_bakus.map(bb => ({ ...bb, markup: valStr }));
			newRooms[rIdx].finishing_dalams = newRooms[rIdx].finishing_dalams.map(f => ({ ...f, markup: valStr }));
			newRooms[rIdx].finishing_luars = newRooms[rIdx].finishing_luars.map(f => ({ ...f, markup: valStr }));
			return newRooms;
		});
	};

	const handleBahanBakuMarkupChange = (rIdx: number, bbIdx: number, valStr: string) => {
		setRoomsState(prev => {
			const newRooms = [...prev];
			newRooms[rIdx].bahan_bakus[bbIdx].markup = valStr;
			return newRooms;
		});
	};

	const handleFinishingDalamMarkupChange = (rIdx: number, fdIdx: number, valStr: string) => {
		setRoomsState(prev => {
			const newRooms = [...prev];
			newRooms[rIdx].finishing_dalams[fdIdx].markup = valStr;
			return newRooms;
		});
	};

	const handleFinishingLuarMarkupChange = (rIdx: number, flIdx: number, valStr: string) => {
		setRoomsState(prev => {
			const newRooms = [...prev];
			newRooms[rIdx].finishing_luars[flIdx].markup = valStr;
			return newRooms;
		});
	};

	const getMaterialPrice = (productId: number | null, materialId: number): number => {
		if (!productId) return 0;
		const prod = products.find(p => p.id === productId);
		if (!prod || !prod.bahan_bakus) return 0;
		const mat = prod.bahan_bakus.find(b => b.bahan_baku_id === materialId);
		return mat ? mat.harga_dasar : 0;
	};

	const getItemPrice = (itemId: number): number => {
		const it = items.find(i => i.id === itemId);
		return it ? it.harga : 0;
	};

	const getItemName = (itemId: number): string => {
		const it = items.find(i => i.id === itemId);
		return it ? it.nama_item : 'Item Pekerjaan';
	};

	const calculateRoomCosts = (room: RoomRABState) => {
		let totalBB = 0;
		room.bahan_bakus.forEach(bb => {
			const price = getMaterialPrice(room.produk_id, bb.bahan_baku_id);
			const markup = parseFloat(bb.markup) || 0;
			totalBB += price * (1 + markup / 100);
		});

		let totalFinishing = 0;
		room.finishing_dalams.forEach(f => {
			const price = getItemPrice(f.item_id);
			const markup = parseFloat(f.markup) || 0;
			totalFinishing += price * (1 + markup / 100);
		});
		room.finishing_luars.forEach(f => {
			const price = getItemPrice(f.item_id);
			const markup = parseFloat(f.markup) || 0;
			totalFinishing += price * (1 + markup / 100);
		});

		let totalAksesoris = 0;
		room.aksesoris.forEach(aks => {
			const price = getItemPrice(aks.item_id);
			const markup = parseFloat(aks.markup) || 0;
			totalAksesoris += price * (1 + markup / 100) * aks.qty;
		});

		// Room Harga Dasar = Total Bahan Baku + Total Finishing
		const hargaDasar = totalBB + totalFinishing;
		const volume = room.panjang * room.lebar * room.tinggi;
		const hargaSatuan = hargaDasar * volume * room.qty;
		const hargaTotal = hargaSatuan + totalAksesoris;

		return {
			totalBB,
			totalFinishing,
			totalAksesoris,
			hargaDasar,
			hargaSatuan,
			hargaTotal
		};
	};

	const calculateGrandTotal = () => {
		let total = 0;
		roomsState.forEach(room => {
			total += calculateRoomCosts(room).hargaTotal;
		});
		return total;
	};

	const handleUpdateRAB = async () => {
		try {
			const payload = {
				markup_general: parseFloat(markupGeneral) || 0,
				rooms: roomsState.map(room => ({
					...room,
					markup: parseFloat(room.markup) || 0,
					bahan_bakus: room.bahan_bakus.map(bb => ({
						bahan_baku_id: bb.bahan_baku_id,
						markup: parseFloat(bb.markup) || 0
					})),
					finishing_dalams: room.finishing_dalams.map(f => ({
						item_id: f.item_id,
						markup: parseFloat(f.markup) || 0
					})),
					finishing_luars: room.finishing_luars.map(f => ({
						item_id: f.item_id,
						markup: parseFloat(f.markup) || 0
					})),
					aksesoris: room.aksesoris.map(a => ({
						item_id: a.item_id,
						qty: a.qty,
						markup: parseFloat(a.markup) || 0
					}))
				}))
			};

			await api.put(`/rab/${id}`, payload);
			toast.success('RAB berhasil diperbarui');
			navigate(`/dashboard/rab/${id}`);
		} catch (err: any) {
			toast.error('Gagal memperbarui RAB: ' + (err.response?.data?.message || err.message));
		}
	};

	if (isLoading || !rab) {
		return (
			<div className="flex items-center justify-center h-96">
				<Loader2 className="w-8 h-8 animate-spin text-teal-500" />
			</div>
		);
	}

	return (
		<div className="space-y-5 animate-in fade-in duration-500">
			{/* Top Header Navigation */}
			<div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
				<div className="flex items-center gap-3">
					<Button
						onClick={() => navigate(`/dashboard/rab/${id}`)}
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-xl hover:bg-gray-100 text-gray-500"
					>
						<ArrowLeft size={18} />
					</Button>
					<div>
						<h1 className="text-base font-extrabold text-gray-800 tracking-tight">Edit Draft RAB</h1>
						<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
							Project: {rab.order?.nama_project} &bull; Client: {rab.order?.nama_customer}
						</p>
					</div>
				</div>
				<Button
					onClick={handleUpdateRAB}
					className="h-9 font-extrabold text-xs px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10"
				>
					<Save size={14} className="mr-1.5" /> Simpan Pembaruan
				</Button>
			</div>

			{/* Formula Info Banner */}
			<div className="bg-teal-50 border border-teal-200/80 p-4 rounded-2xl flex items-start gap-3 text-teal-800">
				<AlertCircle size={20} className="text-teal-600 shrink-0 mt-0.5" />
				<div className="space-y-1">
					<span className="font-extrabold text-xs block text-teal-900">Alur Rumus Kalkulasi RAB Finance</span>
					<p className="text-[11px] leading-relaxed font-semibold text-teal-800/90">
						1. <strong>Harga Bahan</strong> = Harga Dasar Bahan Baku &times; (1 + Markup Produk) <br />
						2. <strong>Harga Finishing</strong> = Harga Dasar Finishing &times; (1 + Markup Produk) <br />
						3. <strong>Harga Dasar Produk</strong> = Harga Bahan + Harga Finishing <br />
						4. <strong>Harga Satuan</strong> = Harga Dasar Produk &times; Volume (P &times; L &times; T) &times; Qty Produk <br />
						5. <strong>Harga Aksesoris</strong> = Harga Beli Aksesoris &times; (1 + Markup Aksesoris) &times; Qty Aksesoris <br />
						6. <strong>Harga Total Ruangan</strong> = Harga Satuan + Total Harga Aksesoris
					</p>
				</div>
			</div>

			{/* Configuration Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
				{/* Global Configuration */}
				<Card className="border-0 shadow-sm rounded-2xl bg-white md:col-span-2">
					<CardContent className="p-5 flex items-center justify-between gap-5">
						<div>
							<span className="font-extrabold text-xs text-gray-800 block">Markup Global (%)</span>
							<span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Persentase markup ini akan diterapkan ke seluruh item di bawah secara otomatis</span>
						</div>
						<div className="flex items-center gap-2">
							<Input
								type="text"
								value={markupGeneral}
								onChange={e => handleGeneralMarkupChange(e.target.value)}
								className="w-24 h-9 bg-gray-50 border-gray-100 rounded-lg text-xs font-bold text-center"
							/>
							<span className="text-xs font-bold text-gray-500">%</span>
						</div>
					</CardContent>
				</Card>

				{/* Live Total Card */}
				<Card className="border-0 shadow-sm rounded-2xl bg-teal-500 text-white">
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<span className="text-[10px] font-bold text-teal-100 uppercase tracking-widest block">Estimasi Grand Total</span>
							<span className="text-lg font-black block mt-1">Rp {calculateGrandTotal().toLocaleString('id-ID')}</span>
						</div>
						<div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
							<Calculator size={20} />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Pricing Breakdown Breakdown per Room */}
			<div className="space-y-6">
				{roomsState.map((room, rIdx) => {
					const calculations = calculateRoomCosts(room);
					const prod = products.find(p => p.id === room.produk_id);

					return (
						<Card key={rIdx} className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
							<div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
								<div>
									<h3 className="text-sm font-bold text-gray-800 tracking-tight">{room.nama_ruangan} ({prod?.nama_produk || 'Kustom'})</h3>
									<span className="text-[10px] text-gray-400 font-bold block mt-0.5">
										Dimensi: {room.panjang}m x {room.lebar}m x {room.tinggi}m &bull; Volume: {(room.panjang * room.lebar * room.tinggi).toFixed(2)}m³ &bull; Qty Produk: {room.qty}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1.5">
										<span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Markup Produk</span>
										<Input
											type="text"
											value={room.markup}
											onChange={e => handleRoomMarkupChange(rIdx, e.target.value)}
											className="w-16 h-8 bg-white border-gray-200 rounded text-center text-xs font-bold"
										/>
										<span className="text-xs font-bold text-gray-500">%</span>
									</div>
								</div>
							</div>

							<CardContent className="p-6 space-y-6">
								{/* Bahan Baku & Finishing Tables */}
								<div className="space-y-3">
									<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Biaya Produksi (Bahan Baku & Finishing)</span>
									<Table>
										<TableHeader className="bg-gray-50/30">
											<TableRow className="border-gray-50">
												<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest">Tipe Item</TableHead>
												<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest">Nama Material / Item</TableHead>
												<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-right">Harga Dasar (Unit)</TableHead>
												<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-center w-24">Markup (%)</TableHead>
												<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-right">Harga Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{/* Bahan Baku rows */}
											{room.bahan_bakus.map((bb, bIdx) => {
												const price = getMaterialPrice(room.produk_id, bb.bahan_baku_id);
												const bbName = prod?.bahan_bakus?.find(b => b.bahan_baku_id === bb.bahan_baku_id)?.nama_bahan || 'Bahan Baku';
												const bbMarkupFloat = parseFloat(bb.markup) || 0;
												const total = price * (1 + bbMarkupFloat / 100);
												return (
													<TableRow key={`bb-${bIdx}`} className="border-gray-50/50">
														<TableCell className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bahan Baku</TableCell>
														<TableCell className="text-xs font-bold text-gray-700">{bbName}</TableCell>
														<TableCell className="text-xs font-bold text-gray-700 text-right">Rp {price.toLocaleString('id-ID')}</TableCell>
														<TableCell className="text-center">
															<div className="flex items-center justify-center gap-1">
																<Input
																	type="text"
																	value={bb.markup}
																	onChange={e => handleBahanBakuMarkupChange(rIdx, bIdx, e.target.value)}
																	className="w-16 h-7 text-center text-xs bg-gray-50/50 font-bold"
																/>
																<span className="text-[10px] text-gray-400 font-bold">%</span>
															</div>
														</TableCell>
														<TableCell className="text-xs font-extrabold text-teal-600 text-right">Rp {total.toLocaleString('id-ID')}</TableCell>
													</TableRow>
												);
											})}

											{/* Finishing Dalam rows */}
											{room.finishing_dalams.map((fd, fIdx) => {
												const price = getItemPrice(fd.item_id);
												const name = getItemName(fd.item_id);
												const fdMarkupFloat = parseFloat(fd.markup) || 0;
												const total = price * (1 + fdMarkupFloat / 100);
												return (
													<TableRow key={`fd-${fIdx}`} className="border-gray-50/50">
														<TableCell className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Finishing Dalam</TableCell>
														<TableCell className="text-xs font-bold text-gray-700">{name}</TableCell>
														<TableCell className="text-xs font-bold text-gray-700 text-right">Rp {price.toLocaleString('id-ID')}</TableCell>
														<TableCell className="text-center">
															<div className="flex items-center justify-center gap-1">
																<Input
																	type="text"
																	value={fd.markup}
																	onChange={e => handleFinishingDalamMarkupChange(rIdx, fIdx, e.target.value)}
																	className="w-16 h-7 text-center text-xs bg-gray-50/50 font-bold"
																/>
																<span className="text-[10px] text-gray-400 font-bold">%</span>
															</div>
														</TableCell>
														<TableCell className="text-xs font-extrabold text-teal-600 text-right">Rp {total.toLocaleString('id-ID')}</TableCell>
													</TableRow>
												);
											})}

											{/* Finishing Luar rows */}
											{room.finishing_luars.map((fl, fIdx) => {
												const price = getItemPrice(fl.item_id);
												const name = getItemName(fl.item_id);
												const flMarkupFloat = parseFloat(fl.markup) || 0;
												const total = price * (1 + flMarkupFloat / 100);
												return (
													<TableRow key={`fl-${fIdx}`} className="border-gray-50/50">
														<TableCell className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Finishing Luar</TableCell>
														<TableCell className="text-xs font-bold text-gray-700">{name}</TableCell>
														<TableCell className="text-xs font-bold text-gray-700 text-right">Rp {price.toLocaleString('id-ID')}</TableCell>
														<TableCell className="text-center">
															<div className="flex items-center justify-center gap-1">
																<Input
																	type="text"
																	value={fl.markup}
																	onChange={e => handleFinishingLuarMarkupChange(rIdx, fIdx, e.target.value)}
																	className="w-16 h-7 text-center text-xs bg-gray-50/50 font-bold"
																/>
																<span className="text-[10px] text-gray-400 font-bold">%</span>
															</div>
														</TableCell>
														<TableCell className="text-xs font-extrabold text-teal-600 text-right">Rp {total.toLocaleString('id-ID')}</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>

								{/* Accessories Cost Section */}
								{room.aksesoris.length > 0 && (
									<div className="space-y-3">
										<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Komponen Aksesoris (Kalkulasi Markup)</span>
										<Table>
											<TableHeader className="bg-gray-50/30">
												<TableRow className="border-gray-50">
													<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest">Nama Aksesoris</TableHead>
													<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-center">Harga Beli</TableHead>
													<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-center w-20">Qty</TableHead>
													<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-center w-24">Markup</TableHead>
													<TableHead className="font-bold text-[9px] text-gray-500 uppercase tracking-widest text-right">Harga Total</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{room.aksesoris.map((aks, aIdx) => {
													const price = getItemPrice(aks.item_id);
													const name = getItemName(aks.item_id);
													const aksTotal = price * (1 + (parseFloat(aks.markup) || 0) / 100) * aks.qty;

													return (
														<TableRow key={`aks-${aIdx}`} className="border-gray-50/50">
															<TableCell className="text-xs font-bold text-gray-700">{name}</TableCell>
															<TableCell className="text-xs font-bold text-gray-500 text-center">Rp {price.toLocaleString('id-ID')}</TableCell>
															<TableCell className="text-center">
																<Input
																	type="number"
																	value={aks.qty}
																	onChange={e => {
																		const val = parseInt(e.target.value) || 1;
																		setRoomsState(prev => {
																			const newRooms = [...prev];
																			newRooms[rIdx].aksesoris[aIdx].qty = val;
																			return newRooms;
																		});
																	}}
																	className="w-16 h-7 text-center text-xs bg-gray-50/50"
																/>
															</TableCell>
															<TableCell className="text-center">
																<div className="flex items-center justify-center gap-1">
																	<Input
																		type="text"
																		value={aks.markup}
																		onChange={e => {
																			setRoomsState(prev => {
																				const newRooms = [...prev];
																				newRooms[rIdx].aksesoris[aIdx].markup = e.target.value;
																				return newRooms;
																			});
																		}}
																		className="w-16 h-7 text-center text-xs bg-gray-50/50 font-bold"
																	/>
																	<span className="text-[10px] text-gray-400 font-bold">%</span>
																</div>
															</TableCell>
															<TableCell className="text-xs font-bold text-teal-600 text-right">
																Rp {aksTotal.toLocaleString('id-ID')}
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>
								)}

								{/* Room Calculation Footer */}
								<div className="bg-gray-50/30 border border-gray-100 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
									<div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-[11px] font-semibold text-gray-500">
										<div>Cost Produksi: <span className="text-gray-800 font-bold">Rp {(calculations.totalBB + calculations.totalFinishing).toLocaleString('id-ID')}</span></div>
										<div>Harga Dasar: <span className="text-gray-800 font-bold">Rp {calculations.hargaDasar.toLocaleString('id-ID')}</span></div>
										<div>Harga Satuan: <span className="text-gray-800 font-bold">Rp {calculations.hargaSatuan.toLocaleString('id-ID')}</span></div>
										<div>Aksesoris Total: <span className="text-gray-800 font-bold">Rp {calculations.totalAksesoris.toLocaleString('id-ID')}</span></div>
									</div>
									<div className="text-right">
										<span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Total Biaya Ruangan</span>
										<span className="text-sm font-extrabold text-teal-600">Rp {calculations.hargaTotal.toLocaleString('id-ID')}</span>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
