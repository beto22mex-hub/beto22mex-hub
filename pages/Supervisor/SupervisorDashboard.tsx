
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { db } from '../../services/storage';
import { WorkOrder, SerialUnit, PartNumber, Operation, UserRole, SerialGenType } from '../../types';
import { Search, Lock, Unlock, Monitor, Eye, X, History, Trash2, Printer, AlertCircle, CheckCircle, RefreshCw, Edit2, Save, Filter, Package, ChevronRight, Clock, List, Calendar, UserX } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import { AuthContext } from '../../context/AuthContext';

export default function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'trace' | 'stations'>('orders');

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Gestión de Producción</h1>
          <p className="text-slate-500 font-medium tracking-wide">Panel de Control para Supervisores y Administradores.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex mb-10 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'orders' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          Órdenes de Trabajo
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'trace' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          Rastreabilidad
        </button>
        <button
          onClick={() => setActiveTab('stations')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'stations' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          Estaciones
        </button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border-2 border-slate-50 p-10 min-h-[600px]">
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'trace' && <TraceabilityView />}
        {activeTab === 'stations' && <StationsMonitor />}
      </div>
    </div>
  );
}

function StationsMonitor() {
  const [ops, setOps] = useState<Operation[]>([]);
  const [historyToday, setHistoryToday] = useState<any[]>([]);
  const { showConfirm, showAlert, showLoading, hideLoading } = useAlert();

  const loadData = async () => {
    try {
      const data = await db.getOperations();
      setOps(data);

      const allSerials = await db.getSerials();
      const todayStr = new Date().toISOString().split('T')[0];
      const flatHistory: any[] = [];
      
      allSerials.forEach(s => {
          if (s.history && Array.isArray(s.history)) {
              s.history.forEach(h => {
                   if (h.timestamp.startsWith(todayStr)) {
                       flatHistory.push({
                           serial: s.serialNumber,
                           order: s.orderNumber,
                           time: new Date(h.timestamp).toLocaleTimeString(),
                           operator: h.operatorName || h.operatorId,
                           operation: h.operationName || h.operationId,
                           rawTime: new Date(h.timestamp).getTime()
                       });
                   }
              });
          }
      });
      setHistoryToday(flatHistory.sort((a, b) => b.rawTime - a.rawTime).slice(0, 50));
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlock = async (opId: string) => {
    if (await showConfirm("Forzar Liberación", "¿Expulsar al operador actual?")) {
        showLoading();
        try {
            await db.unlockStation(opId);
            await loadData();
            showAlert("Éxito", "Estación liberada.", "success");
        } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ops.map(op => (
            <div key={op.id} className={`p-8 rounded-[2rem] border-2 transition-all ${op.activeOperatorId ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <div className="flex justify-between items-start mb-6">
                    <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg leading-tight">{op.name}</h4>
                    {op.activeOperatorId ? <Lock size={20} className="text-red-500"/> : <Unlock size={20} className="text-green-500"/>}
                </div>
                <div className="mb-8">
                    {op.activeOperatorId ? (
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-red-300 uppercase tracking-widest">En Estación</p>
                            <p className="font-black text-red-700 truncate text-sm">{op.activeOperatorName || op.activeOperatorId}</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600 font-black text-xs uppercase tracking-widest"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Disponible</div>
                    )}
                </div>
                {op.activeOperatorId && (
                    <button onClick={() => handleUnlock(op.id)} className="w-full text-[9px] font-black bg-white border-2 border-red-200 text-red-600 py-3 rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase tracking-[0.2em]">
                        Liberar Estación
                    </button>
                )}
            </div>
        ))}
      </div>

      <div className="pt-10 border-t border-slate-50">
         <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter flex items-center gap-3"><History className="text-blue-600" size={24}/> Log de Producción Diaria</h3>
         <div className="overflow-hidden rounded-3xl border-2 border-slate-100 shadow-sm">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
                    <tr><th className="p-5">Hora</th><th className="p-5">Operador</th><th className="p-5">Estación</th><th className="p-5">Serie / Lote</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {historyToday.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5 font-mono font-black text-slate-400">{h.time}</td>
                            <td className="p-5 font-black text-slate-700">{h.operator}</td>
                            <td className="p-5"><span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl font-black text-[9px] uppercase tracking-widest">{h.operation}</span></td>
                            <td className="p-5 font-mono font-black text-slate-900 text-base">{h.serial}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
         </div>
      </div>
    </div>
  );
}

function OrdersManager() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<PartNumber[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const [managingOrder, setManagingOrder] = useState<WorkOrder | null>(null);
  const [orderSerials, setOrderSerials] = useState<SerialUnit[]>([]);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);

  const loadData = async () => {
    try {
        const [o, p, allSerials] = await Promise.all([db.getOrders(), db.getParts(), db.getSerials()]);
        setOrders(o); setParts(p);
        const counts: Record<string, number> = {};
        allSerials.forEach(s => { if(s.orderNumber) counts[s.orderNumber] = (counts[s.orderNumber] || 0) + 1; });
        setOrderCounts(counts);
    } catch (e: any) { showAlert("Error", e.message, "error"); }
  };

  useEffect(() => { loadData(); }, []);

  const openManageSerials = async (order: WorkOrder) => {
      showLoading("Cargando...");
      setManagingOrder(order);
      const allSerials = await db.getSerials();
      setOrderSerials(allSerials.filter(s => s.orderNumber === order.orderNumber));
      hideLoading();
  };

  const handleRemoveSerial = async (serialNumber: string) => {
      if (await showConfirm("¿Retirar de la Orden?", `Se desvinculará la unidad ${serialNumber} de esta cuenta, pero SE MANTENDRÁ su historial de rastreabilidad histórico.`)) {
          try {
              showLoading();
              await db.unassignSerial(serialNumber); // Desvincular conservando registro
              const allSerials = await db.getSerials();
              setOrderSerials(allSerials.filter(s => s.orderNumber === managingOrder!.orderNumber));
              await loadData(); 
              hideLoading();
              showAlert("Éxito", "Unidad desvinculada. Rastreabilidad conservada.", "success");
          } catch (e: any) { hideLoading(); showAlert("Error", e.message, "error"); }
      }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
        const matchesTerm = (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.sapOrderNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesTerm) return false;
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
        return true;
    });
  }, [orders, searchTerm, statusFilter]);

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-white shadow-inner flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[250px]">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Filtro de Órdenes</label>
              <div className="relative">
                 <Search className="absolute left-4 top-3.5 text-slate-300" size={20}/>
                 <input type="text" placeholder="Buscar por Lote o SAP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 p-3.5 border-4 border-white rounded-2xl text-sm font-black focus:border-blue-500 outline-none transition-all shadow-xl uppercase" />
              </div>
          </div>
          <div className="w-[180px]">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Estado</label>
              <select className="w-full p-3.5 border-4 border-white rounded-2xl text-sm font-black bg-white shadow-xl outline-none focus:border-blue-500 transition-all uppercase" value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)}>
                  <option value="ALL">TODAS</option><option value="OPEN">ABIERTAS</option><option value="CLOSED">CERRADAS</option>
              </select>
          </div>
          <button onClick={loadData} className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"><RefreshCw size={24}/></button>
      </div>

      <div className="border-2 border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
            <tr>
                <th className="p-6">WO MES</th><th className="p-6 text-blue-300">SAP</th><th className="p-6">No. Parte / Modelo</th><th className="p-6">Producción</th><th className="p-6">Estatus</th><th className="p-6 text-right"></th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filteredOrders.map(o => {
                const assigned = orderCounts[o.orderNumber] || 0;
                const progress = Math.min((assigned / o.quantity) * 100, 100);
                const part = parts.find(p => p.id === o.partNumberId);
                return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 font-black text-slate-800 text-base">{o.orderNumber}</td>
                    <td className="p-6 font-mono font-black text-blue-700">{o.sapOrderNumber || 'N/A'}</td>
                    <td className="p-6"><p className="font-black text-xs text-slate-700">{part?.productCode}</p><p className="text-[10px] text-slate-400 font-mono font-bold">{part?.partNumber}</p></td>
                    <td className="p-6 w-56">
                        <div className="flex flex-col">
                            <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase tracking-tighter"><span>{assigned} de {o.quantity}</span><span className={progress >= 100 ? 'text-green-600' : 'text-blue-600'}>{Math.round(progress)}%</span></div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner"><div className={`h-full rounded-full transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div></div>
                        </div>
                    </td>
                    <td className="p-6"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${o.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>{o.status}</span></td>
                    <td className="p-6 text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openManageSerials(o)} className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-sm border border-blue-50 bg-white"><Eye size={20} /></button>
                        <button onClick={() => setEditingOrder(o)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><Edit2 size={20} /></button>
                    </td>
                    </tr>
                );
            })}
            </tbody>
        </table>
      </div>

      {editingOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] backdrop-blur-md p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm animate-in zoom-in-95">
                  <h3 className="text-2xl font-black mb-8 tracking-tighter uppercase text-slate-900 border-b pb-4">Editar {editingOrder.orderNumber}</h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Meta de Unidades</label>
                          <input type="number" className="w-full p-4 border-2 border-slate-100 rounded-2xl text-2xl font-black focus:border-blue-500 outline-none transition-all shadow-inner" value={editingOrder.quantity} onChange={e => setEditingOrder({...editingOrder, quantity: Number(e.target.value)})} />
                      </div>
                      {isAdmin && (
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Estado</label>
                             <select className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-sm bg-white outline-none" value={editingOrder.status} onChange={(e: any) => setEditingOrder({...editingOrder, status: e.target.value})}>
                                 <option value="OPEN">ABIERTA</option><option value="CLOSED">CERRADA</option>
                             </select>
                        </div>
                      )}
                      <div className="flex gap-4 pt-6">
                          <button onClick={() => setEditingOrder(null)} className="flex-1 py-4 font-black text-xs text-slate-400 hover:text-slate-600 transition-all uppercase">Cancelar</button>
                          <button onClick={() => {
                                showConfirm("Guardar Cambios", "¿Desea actualizar los datos de la orden?").then(ok => ok && db.updateOrder(editingOrder.id, { quantity: editingOrder.quantity, status: editingOrder.status }).then(() => { setEditingOrder(null); loadData(); }));
                          }} className="flex-1 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-black transition-all uppercase tracking-widest text-xs">GUARDAR</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {managingOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] backdrop-blur-md p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[3rem]">
                      <div>
                        <h3 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Gestión de Unidades</h3>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-2">WO MES: {managingOrder.orderNumber} | Lote Asignado: {orderSerials.length}</p>
                      </div>
                      <button onClick={() => setManagingOrder(null)} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={32}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 bg-white">
                      {orderSerials.length === 0 ? (
                          <div className="h-64 flex flex-col items-center justify-center text-slate-200 italic font-black uppercase tracking-widest"><Package size={80} className="mb-6 opacity-5"/><p>Sin registros.</p></div>
                      ) : (
                        <div className="border-4 border-slate-50 rounded-[2rem] overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                <tr><th className="p-5">Número de Serie</th><th className="p-5">Estado MES</th><th className="p-5 text-right">Acción</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {orderSerials.map(s => (
                                    <tr key={s.serialNumber} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-5 font-mono font-black text-blue-600 text-lg">{s.serialNumber}</td>
                                        <td className="p-5"><span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-tighter ${s.isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{s.isComplete ? 'FINALIZADO' : 'EN PRODUCCIÓN'}</span></td>
                                        <td className="p-5 text-right"><button onClick={() => handleRemoveSerial(s.serialNumber)} className="text-red-500 hover:bg-red-50 p-3 rounded-2xl transition-all" title="Desvincular de esta orden (Conserva Historia)"><UserX size={20}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                      )}
                  </div>
                  <div className="p-8 border-t border-slate-100 bg-slate-50 rounded-b-[3rem] text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">⚠️ Nota: Retirar un serial de la orden reduce el contador de producción actual pero NO ELIMINA su rastreabilidad histórica. La unidad podrá ser asignada a otra orden conservando sus logs.</p></div>
              </div>
          </div>
      )}
    </div>
  );
}

function TraceabilityView() {
  const [traceType, setTraceType] = useState<'SERIAL' | 'LOT'>('SERIAL');
  const [serials, setSerials] = useState<SerialUnit[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<PartNumber[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSerial, setSelectedSerial] = useState<SerialUnit | null>(null);
  const [selectedLot, setSelectedLot] = useState<WorkOrder | null>(null);

  const load = async () => {
     const [s, o, p] = await Promise.all([db.getSerials(), db.getOrders(), db.getParts()]);
     setSerials(s.reverse()); setOrders(o.reverse()); setParts(p);
  };
  useEffect(() => { load(); }, []);

  const getPartDetails = (pid: string) => parts.find(p => p.id === pid);

  const filtered = useMemo(() => {
      if (traceType === 'SERIAL') {
          return serials.filter(s => (s.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()));
      } else {
          return orders.filter(o => {
              const part = getPartDetails(o.partNumberId);
              const matchesSearch = (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.sapOrderNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
              return part?.serialGenType === SerialGenType.ACCESSORIES && matchesSearch;
          });
      }
  }, [traceType, serials, orders, searchTerm, parts]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex bg-slate-100 p-2 rounded-[1.5rem] w-full md:w-auto shadow-inner">
            <button onClick={() => setTraceType('SERIAL')} className={`flex-1 md:px-12 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${traceType === 'SERIAL' ? 'bg-white shadow-xl text-blue-700' : 'text-slate-400'}`}>Unidades Individuales</button>
            <button onClick={() => setTraceType('LOT')} className={`flex-1 md:px-12 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${traceType === 'LOT' ? 'bg-white shadow-xl text-blue-700' : 'text-slate-400'}`}>Lotes de Accesorios</button>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-5 top-4.5 text-slate-300" size={24} />
          <input className="w-full pl-16 pr-6 py-4.5 border-4 border-slate-50 rounded-2xl focus:border-blue-500 outline-none font-black transition-all shadow-xl text-lg uppercase" placeholder="BUSCAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="border-2 border-slate-50 rounded-[2.5rem] overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-[0.2em]">
            <tr>
              {traceType === 'SERIAL' ? (
                <><th className="p-6">ID de Serie</th><th className="p-6">WO MES</th><th className="p-6">Modelo SKU</th><th className="p-6">Estado Final</th></>
              ) : (
                <><th className="p-6">Lote MES</th><th className="p-6 text-blue-300">SAP</th><th className="p-6">Modelo</th><th className="p-6">Cant.</th><th className="p-6">Estatus</th></>
              )}
              <th className="p-6 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((item, i) => {
              if (traceType === 'SERIAL') {
                  const s = item as SerialUnit;
                  const p = getPartDetails(s.partNumberId);
                  return (
                    <tr key={i} className="hover:bg-blue-50/30 cursor-pointer group transition-all" onClick={() => setSelectedSerial(s)}>
                      <td className="p-6 font-mono font-black text-blue-600 text-lg tracking-tight">{s.serialNumber}</td>
                      <td className="p-6 font-black text-slate-700 uppercase">{s.orderNumber || 'DESVINCULADO'}</td>
                      <td className="p-6 font-black text-xs text-slate-500">{p?.productCode || '-'}</td>
                      <td className="p-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${s.isComplete ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{s.isComplete ? 'TERMINADO' : 'EN PISO'}</span></td>
                      <td className="p-6 text-right"><ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform"/></td>
                    </tr>
                  );
              } else {
                  const o = item as WorkOrder;
                  const p = getPartDetails(o.partNumberId);
                  return (
                    <tr key={i} className="hover:bg-blue-50/30 cursor-pointer group transition-all" onClick={() => setSelectedLot(o)}>
                      <td className="p-6 font-black text-slate-800 text-lg">{o.orderNumber}</td>
                      <td className="p-6 font-mono font-black text-blue-700 uppercase">{o.sapOrderNumber || 'N/A'}</td>
                      <td className="p-6 font-black text-xs text-slate-700">{p?.productCode || '-'}</td>
                      <td className="p-6 font-black">{o.quantity}</td>
                      <td className="p-6"><span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest">{o.status}</span></td>
                      <td className="p-6 text-right"><ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform"/></td>
                    </tr>
                  );
              }
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-24 text-center text-slate-200 italic font-black uppercase tracking-[0.4em]"><p>Sin Resultados</p></div>}
      </div>

      {selectedSerial && <SerialDetailModal serial={selectedSerial} part={getPartDetails(selectedSerial.partNumberId)} onClose={() => setSelectedSerial(null)} />}
      {selectedLot && <LotDetailModal order={selectedLot} part={getPartDetails(selectedLot.partNumberId)} onClose={() => setSelectedLot(null)} />}
    </div>
  );
}

function LotDetailModal({ order, part, onClose }: { order: WorkOrder, part?: PartNumber, onClose: () => void }) {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const serials = await db.getSerials();
                const related = serials.find(s => s.serialNumber === order.orderNumber);
                if (related) setHistory(related.printHistory || []);
            } catch (e) {}
        };
        load();
    }, [order]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] backdrop-blur-md p-4">
             <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95">
                <div className="p-10 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-[3rem]">
                     <div>
                        <h3 className="text-3xl font-black tracking-tighter uppercase text-slate-900 flex items-center gap-3"><Package className="text-blue-600" size={32}/> {order.orderNumber}</h3>
                        <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-2 text-[10px] font-black uppercase tracking-widest">
                            <p className="text-slate-400">SAP: <span className="text-slate-800 ml-1">{order.sapOrderNumber}</span></p>
                            <p className="text-slate-400">Modelo: <span className="text-slate-800 ml-1">{part?.productCode}</span></p>
                            <p className="text-slate-400">Cantidad: <span className="text-slate-800 ml-1">{order.quantity} Unidades</span></p>
                        </div>
                     </div>
                     <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={32}/></button>
                </div>
                <div className="p-10 flex-1 overflow-y-auto">
                    <h4 className="font-black text-xs text-slate-900 uppercase tracking-widest mb-8 flex items-center"><List className="mr-2 text-blue-500" size={16}/> Historial de Lote</h4>
                    {history.length === 0 ? (
                        <p className="text-center text-slate-300 italic py-16 font-black uppercase tracking-[0.3em]">Sin Eventos</p>
                    ) : (
                        <div className="space-y-4">
                             {history.map((log, idx) => (
                                <div key={idx} className="p-5 rounded-3xl border-4 border-slate-50 bg-slate-50/30 flex justify-between items-center group transition-all">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-700 uppercase tracking-tighter text-base">Impresión de Etiquetas</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Operador: {log.operatorId}</span>
                                    </div>
                                    <span className="text-xs font-black font-mono text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                             ))}
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
}

function SerialDetailModal({ serial, part, onClose }: { serial: SerialUnit, part?: PartNumber, onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="p-12 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <h2 className="text-5xl font-black text-slate-900 font-mono tracking-tighter">{serial.serialNumber}</h2>
                            {serial.isComplete ? (
                                <span className="bg-green-600 text-white px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-green-200">Terminado</span>
                            ) : (
                                <span className="bg-blue-600 text-white px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200">En Piso</span>
                            )}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] grid grid-cols-3 gap-12">
                            <div>Orden MES <p className="text-base text-slate-900 mt-1 font-black tracking-tight">{serial.orderNumber || 'N/A'}</p></div>
                            <div>Modelo SKU <p className="text-base text-slate-900 mt-1 font-black tracking-tight">{part?.productCode}</p></div>
                            <div>Caja Std. <p className="text-base text-slate-900 mt-1 font-black tracking-tight">{part?.stdQty || 1} pzas</p></div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white shadow-xl rounded-full hover:bg-slate-200 transition-all active:scale-90"><X size={32} className="text-slate-500"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 lg:grid-cols-2 gap-16 bg-white">
                    <section>
                        <h3 className="font-black text-slate-900 mb-10 flex items-center text-2xl uppercase tracking-tighter">
                            <History className="mr-4 text-blue-600" size={32}/> Pasos de Proceso
                        </h3>
                        <div className="relative border-l-8 border-slate-100 ml-6 space-y-12 pb-10">
                            {serial.history.map((h, idx) => (
                                <div key={idx} className="relative pl-12">
                                    <div className={`absolute -left-[24px] top-1 w-8 h-8 rounded-full border-8 border-white shadow-xl transition-all ${idx === serial.history.length -1 ? 'bg-blue-600 scale-125 ring-8 ring-blue-50' : 'bg-slate-300'}`}></div>
                                    <div>
                                        <p className="font-black text-slate-800 text-xl uppercase tracking-tight leading-none mb-2">{h.operationName}</p>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <span className="flex items-center gap-1.5"><Monitor size={12}/> {h.operatorName}</span>
                                            <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(h.timestamp).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-slate-50/50 p-10 rounded-[3rem] border-4 border-slate-50 shadow-inner">
                        <h3 className="font-black text-slate-900 mb-10 flex items-center text-2xl uppercase tracking-tighter">
                            <Printer className="mr-4 text-purple-600" size={32}/> Eventos de Impresión
                        </h3>
                        <div className="space-y-5">
                            {(!serial.printHistory || serial.printHistory.length === 0) ? (
                                <div className="p-16 text-center text-slate-200 bg-white rounded-[2rem] border-4 border-dashed border-slate-100 italic font-black uppercase tracking-widest text-xs">Sin Actividad</div>
                            ) : (
                                serial.printHistory.map((log, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm transition-all hover:border-purple-200 group">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-[9px] font-black uppercase tracking-widest">Enviado</span>
                                            <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Etiqueta: <span className="text-slate-900">{log.labelType || 'Estándar'}</span></p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Operador: {log.operatorId}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
