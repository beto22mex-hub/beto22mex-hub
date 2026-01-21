
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { db } from '../../services/storage';
import { WorkOrder, SerialUnit, PartNumber, Operation, UserRole } from '../../types';
import { Search, Lock, Unlock, Monitor, Eye, History, Trash2, RefreshCw, Edit2, Save, Package, ChevronRight, Clock } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import { AuthContext } from '../../context/AuthContext';

export default function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'trace' | 'stations'>('orders');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Producción</h1>
        <p className="text-slate-500">Supervisión de línea y trazabilidad de producto.</p>
      </div>

      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm inline-flex mb-6">
        {['orders', 'trace', 'stations'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab === 'orders' ? 'Órdenes' : tab === 'trace' ? 'Trazabilidad' : 'Estaciones'}
            </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6 min-h-[600px]">
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'trace' && <TraceabilityView />}
        {activeTab === 'stations' && <StationsMonitor />}
      </div>
    </div>
  );
}

function StationsMonitor() {
  const [ops, setOps] = useState<Operation[]>([]);
  const { showConfirm } = useAlert();

  const loadData = async () => {
    try {
      const data = await db.getOperations();
      setOps(data);
    } catch (e) { console.error("Error loading operations:", e); }
  };

  useEffect(() => { loadData(); const i = setInterval(loadData, 5000); return () => clearInterval(i); }, []);

  const handleUnlock = async (id: string) => {
    if (await showConfirm("Liberar Estación", "¿Desea forzar la salida del operador?")) {
        await db.unlockStation(id); loadData();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ops.map(op => (
            <div key={op.id} className={`p-4 rounded-xl border ${op.activeOperatorId ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">{op.name}</h4>
                    {op.activeOperatorId ? <Lock size={18} className="text-red-500"/> : <Unlock size={18} className="text-green-500"/>}
                </div>
                <div className="text-sm mb-3">{op.activeOperatorId ? <span className="text-red-700 font-medium">Operador: {op.activeOperatorName}</span> : <span className="text-green-700 font-medium">Disponible</span>}</div>
                {op.activeOperatorId && <button onClick={() => handleUnlock(op.id)} className="w-full text-xs bg-white border border-red-200 text-red-600 py-1 rounded hover:bg-red-50 transition-colors">Forzar Desbloqueo</button>}
            </div>
        ))}
    </div>
  )
}

function OrdersManager() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const { showAlert, showLoading, hideLoading } = useAlert();

  const load = async () => { const o = await db.getOrders(); setOrders(o); };
  useEffect(() => { load(); }, []);

  const handleSaveOrder = async () => {
      if (!editingOrder) return;
      showLoading();
      try { await db.updateOrder(editingOrder.id, { quantity: editingOrder.quantity, status: editingOrder.status }); load(); setEditingOrder(null); } 
      catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  };

  return (
    <div className="space-y-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-100 font-semibold text-slate-600"><tr><th className="p-4">Lote Interno</th><th className="p-4">SAP</th><th className="p-4">Cantidad</th><th className="p-4">Estatus</th><th className="p-4 text-right">Acciones</th></tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-b hover:bg-slate-50 transition-colors">
              <td className="p-4 font-bold">{o.orderNumber}</td><td className="p-4 font-mono text-blue-600">{o.sapOrderNumber || '-'}</td><td className="p-4">{o.quantity}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${o.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>{o.status}</span></td>
              <td className="p-4 text-right">
                <button onClick={() => setEditingOrder(o)} className="p-2 border rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={14}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                  <h3 className="font-bold text-xl mb-4 text-slate-800">Editar Orden</h3>
                  <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block uppercase">Cantidad Objetivo</label>
                        <input type="number" className="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none transition-all font-bold" value={editingOrder.quantity} onChange={e => setEditingOrder({...editingOrder, quantity: Number(e.target.value)})} />
                      </div>
                      {user?.role === UserRole.ADMIN && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 mb-1 block uppercase">Estado de la Orden</label>
                          <select className="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none transition-all font-bold" value={editingOrder.status} onChange={(e: any) => setEditingOrder({...editingOrder, status: e.target.value})}>
                            <option value="OPEN">ABIERTA</option>
                            <option value="CLOSED">CERRADA</option>
                          </select>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setEditingOrder(null)} className="flex-1 p-3 border-2 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button onClick={handleSaveOrder} className="flex-1 p-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-black transition-colors">Guardar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

function TraceabilityView() {
    const [serials, setSerials] = useState<SerialUnit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSerial, setSelectedSerial] = useState<SerialUnit | null>(null);

    useEffect(() => { db.getSerials().then(s => setSerials(s.reverse())); }, []);

    const filtered = useMemo(() => serials.filter(s => (s.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || s.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()))), [serials, searchTerm]);

    return (
        <div className="flex flex-col gap-6">
            <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all" placeholder="Buscar Serial, Lote o Charola..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-900 text-white font-semibold"><tr><th className="p-4">Serial / Unidad</th><th className="p-4">Lote / WO</th><th className="p-4">Estado</th><th className="p-4"></th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                          {filtered.map(s => (
                              <tr key={s.serialNumber} onClick={() => setSelectedSerial(s)} className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedSerial?.serialNumber === s.serialNumber ? 'bg-blue-50' : ''}`}>
                                  <td className="p-4 font-mono font-bold text-blue-600">{s.serialNumber}</td>
                                  <td className="p-4 font-medium">{s.orderNumber}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${s.isComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {s.isComplete ? 'COMPLETO' : 'EN PROCESO'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right"><ChevronRight size={16} className="text-slate-300"/></td>
                              </tr>
                          ))}
                          {filtered.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No se encontraron registros.</td></tr>}
                      </tbody>
                  </table>
              </div>

              <div className="lg:col-span-1">
                {selectedSerial ? (
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 sticky top-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-600 p-2 rounded-lg text-white"><History size={20}/></div>
                      <h3 className="font-bold text-slate-800">Historial de Unidad</h3>
                    </div>
                    
                    <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {selectedSerial.history.map((h, i) => (
                        <div key={i} className="relative pl-10">
                          <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${i === selectedSerial.history.length - 1 ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`}></div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{h.operationName}</p>
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] mt-1 font-medium">
                            <Clock size={10}/> {new Date(h.timestamp).toLocaleString()}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Operador: <span className="text-slate-600">{h.operatorName}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Eye size={48} className="mb-4 opacity-20"/>
                    <p className="text-sm font-medium">Seleccione una unidad para ver su trazabilidad detallada</p>
                  </div>
                )}
              </div>
            </div>
        </div>
    );
}
