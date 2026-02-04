
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/storage';
import { PartNumber, Operation, User, UserRole, LabelConfig, LabelField, LabelDataSource, ProcessRoute, ProcessRouteStep, SerialGenType } from '../../types';
// Fixed: Added ChevronRight to imports from lucide-react
import { Plus, Trash2, Edit, Save, X, Printer, FileText, List, Settings, Lock, Search, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Filter, GitMerge, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'parts' | 'users' | 'ops' | 'labels' | 'routes'>('parts');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control Administrativo</h1>
        <p className="text-slate-500 font-medium">Configuración maestra del sistema MES Lion.</p>
      </div>

      <div className="flex space-x-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex mb-8 overflow-x-auto max-w-full">
        <button onClick={() => setActiveTab('parts')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'parts' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Números de Parte</button>
        <button onClick={() => setActiveTab('ops')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'ops' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Operaciones</button>
        <button onClick={() => setActiveTab('routes')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${activeTab === 'routes' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
             <GitMerge size={16} className="mr-2"/> Rutas Proceso
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Usuarios</button>
        <button onClick={() => setActiveTab('labels')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${activeTab === 'labels' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Printer size={16} className="mr-2"/> Config. Etiquetas
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'parts' && <PartsManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'ops' && <OpsManager />}
        {activeTab === 'labels' && <LabelsManager />}
        {activeTab === 'routes' && <RoutesManager />}
      </div>
    </div>
  );
}

function RoutesManager() {
    const [routes, setRoutes] = useState<ProcessRoute[]>([]);
    const [ops, setOps] = useState<Operation[]>([]);
    const [form, setForm] = useState<{name: string, desc: string, steps: {opId: string}[]}>({ name: '', desc: '', steps: [] });
    const [editingId, setEditingId] = useState<string | null>(null);
    const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();

    const loadData = async () => {
        const [rData, oData] = await Promise.all([db.getRoutes(), db.getOperations()]);
        setRoutes(rData);
        setOps(oData);
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (route: ProcessRoute) => {
        setEditingId(route.id);
        const steps = route.steps
            .sort((a,b) => a.stepOrder - b.stepOrder)
            .map(s => ({ opId: s.operationId }));
        setForm({ name: route.name, desc: route.description, steps });
    };

    const handleCancel = () => {
        setEditingId(null);
        setForm({ name: '', desc: '', steps: [] });
    };

    const handleSave = async () => {
        if (!form.name || form.steps.length === 0) return showAlert("Error", "Nombre y operaciones requeridos.", "error");
        
        const initialOpIds = ops.filter(o => o.isInitial).map(o => o.id);
        const hasInitial = form.steps.some(s => initialOpIds.includes(s.opId));
        if (!hasInitial) return showAlert("Ruta Inválida", "La ruta debe incluir al menos una Operación Inicial.", "warning");

        showLoading();
        try {
            const stepsData: ProcessRouteStep[] = form.steps.map((s, idx) => ({
                id: '', 
                processRouteId: editingId || '',
                operationId: s.opId,
                stepOrder: (idx + 1) * 10
            }));

            if (editingId) {
                await db.updateRoute(editingId, { name: form.name, description: form.desc, steps: stepsData });
            } else {
                await db.addRoute({ id: `route_${Date.now()}`, name: form.name, description: form.desc, steps: stepsData });
            }
            handleCancel(); loadData();
        } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 h-fit">
                <h3 className="font-black text-xl mb-6 text-slate-800 flex justify-between uppercase tracking-tighter">
                    {editingId ? 'Editar Ruta' : 'Crear Nueva Ruta'}
                    {editingId && <button onClick={handleCancel}><X size={20} className="text-slate-400 hover:text-red-500"/></button>}
                </h3>
                <div className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre del Proceso</label>
                        <input className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold" placeholder="Ej. Ensamble Li-Ion R3" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Descripción</label>
                        <input className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium" placeholder="Detalles de la línea..." value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} />
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100">
                        <h4 className="font-black text-xs uppercase text-blue-600 mb-4 tracking-widest">Secuencia de Operaciones</h4>
                        <div className="flex gap-2 mb-6">
                            <select className="flex-1 p-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500" id="opSelect">
                                <option value="">-- Seleccionar --</option>
                                {ops.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            <button onClick={() => {
                                const sel = document.getElementById('opSelect') as HTMLSelectElement;
                                if (sel.value) setForm({ ...form, steps: [...form.steps, { opId: sel.value }] });
                            }} className="bg-blue-600 text-white px-5 rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">+</button>
                        </div>
                        
                        <div className="space-y-2">
                            {form.steps.map((s, idx) => {
                                const op = ops.find(o => o.id === s.opId);
                                return (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 group">
                                        <div className="flex items-center">
                                            <span className="w-6 h-6 flex items-center justify-center bg-slate-900 text-white rounded-full text-[10px] font-black mr-3">{idx + 1}</span>
                                            <span className="font-bold text-slate-700">{op?.name}</span>
                                        </div>
                                        <button onClick={() => {
                                            const ns = [...form.steps]; ns.splice(idx, 1); setForm({...form, steps: ns});
                                        }} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all uppercase tracking-widest text-sm">
                        {editingId ? 'Actualizar Ruta' : 'Guardar Ruta'}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Rutas Activas</h3>
                <div className="grid grid-cols-1 gap-4">
                    {routes.map(r => (
                        <div key={r.id} onClick={() => handleEdit(r)} className={`group border-2 rounded-3xl p-6 hover:shadow-xl transition-all cursor-pointer ${editingId === r.id ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-900 text-lg uppercase leading-tight">{r.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">{r.description}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); db.deleteRoute(r.id).then(loadData); }} className="text-slate-300 hover:text-red-600 p-2 transition-colors"><Trash2 size={18}/></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {r.steps.map((s, idx) => (
                                    <div key={idx} className="flex items-center">
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">
                                            {s.operationName}
                                        </span>
                                        {idx < r.steps.length - 1 && <ChevronRight size={12} className="text-slate-300 mx-1"/>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PartsManager() {
  const [parts, setParts] = useState<PartNumber[]>([]);
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [form, setForm] = useState<Partial<PartNumber>>({ serialGenType: SerialGenType.PCB_SERIAL, stdQty: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showAlert, showLoading, hideLoading } = useAlert();

  const loadData = async () => {
    const [pData, rData] = await Promise.all([db.getParts(), db.getRoutes()]);
    setParts(pData); setRoutes(rData);
  };
  useEffect(() => { loadData(); }, []);

  const filteredParts = useMemo(() => {
    return parts.filter(p => 
        p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parts, searchTerm]);

  const handleSave = async () => {
    if (!form.partNumber || !form.productCode) return showAlert("Error", "No. Parte y SKU requeridos.", "error");
    showLoading();
    try {
      if (editingId) {
        await db.updatePart(editingId, form);
      } else {
        await db.addPart({
          ...form as PartNumber,
          id: `pn_${Date.now()}`,
          revision: form.revision || 'A',
          serialMask: form.serialMask || '',
          stdQty: form.stdQty || 1
        });
      }
      handleCancel(); loadData();
    } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  };

  const handleCancel = () => { setEditingId(null); setForm({ serialGenType: SerialGenType.PCB_SERIAL, stdQty: 1 }); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 bg-slate-50 p-8 rounded-3xl border border-slate-200 h-fit">
            <h3 className="font-black text-xl mb-6 text-slate-800 uppercase tracking-tighter">{editingId ? 'Editar Parte' : 'Nueva Parte'}</h3>
            <div className="space-y-4">
                <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Número de Parte" value={form.partNumber || ''} onChange={e => setForm({...form, partNumber: e.target.value})} />
                <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="SKU / Modelo" value={form.productCode || ''} onChange={e => setForm({...form, productCode: e.target.value})} />
                
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo de Generación Serial</label>
                    <select className="w-full p-3 border-2 rounded-xl font-bold text-sm" value={form.serialGenType} onChange={(e: any) => setForm({...form, serialGenType: e.target.value})}>
                        <option value={SerialGenType.PCB_SERIAL}>PCB SERIAL (Escaneo Individual)</option>
                        <option value={SerialGenType.LOT_BASED}>LOT BASED (Generado por Charola)</option>
                        <option value={SerialGenType.ACCESSORIES}>ACCESSORIES (Solo Lote)</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Ruta de Proceso</label>
                    <select className="w-full p-3 border-2 rounded-xl font-bold text-sm" value={form.processRouteId || ''} onChange={e => setForm({...form, processRouteId: e.target.value})}>
                        <option value="">-- Sin Ruta --</option>
                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>

                {form.serialGenType === SerialGenType.PCB_SERIAL && (
                    <input className="w-full p-3 border-2 rounded-xl font-mono text-sm" placeholder="Máscara (Ej. 31########)" value={form.serialMask || ''} onChange={e => setForm({...form, serialMask: e.target.value})} />
                )}

                <button onClick={handleSave} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm">
                    Guardar Número de Parte
                </button>
            </div>
        </div>

        <div className="lg:col-span-2">
            <div className="mb-6 relative">
                <Search className="absolute left-4 top-4 text-slate-400" />
                <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all" placeholder="Buscar por Parte o Modelo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="border-2 border-slate-100 rounded-3xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
                        <tr><th className="p-5">No. Parte</th><th className="p-5">Modelo</th><th className="p-5">Tipo Serial</th><th className="p-5 text-right">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredParts.map(p => (
                            // Fixed: Changed from a logical expression with void functions to a block to avoid truthiness error
                            <tr key={p.id} onClick={() => { setForm(p); setEditingId(p.id); }} className={`hover:bg-slate-50 cursor-pointer transition-colors ${editingId === p.id ? 'bg-blue-50' : ''}`}>
                                <td className="p-5 font-black text-slate-700">{p.partNumber}</td>
                                <td className="p-5 font-bold text-blue-600">{p.productCode}</td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${p.serialGenType === SerialGenType.LOT_BASED ? 'bg-purple-100 text-purple-700' : p.serialGenType === SerialGenType.ACCESSORIES ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {p.serialGenType}
                                    </span>
                                </td>
                                <td className="p-5 text-right"><button onClick={(e) => { e.stopPropagation(); db.deletePart(p.id).then(loadData); }} className="text-slate-300 hover:text-red-600"><Trash2 size={18}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<Partial<User>>({ role: UserRole.OPERATOR });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showAlert, showLoading, hideLoading } = useAlert();

  const loadData = async () => { setUsers(await db.getUsers()); };
  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if(!form.username || !form.name) return showAlert("Error", "Usuario y nombre requeridos.", "error");
    showLoading();
    try {
      if (editingId) {
        await db.updateUser(editingId, form);
      } else {
        await db.addUser({ ...form as User, id: Date.now().toString() });
      }
      setEditingId(null); setForm({ role: UserRole.OPERATOR }); loadData();
    } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 h-fit">
            <h3 className="font-black text-xl mb-6 text-slate-800 uppercase tracking-tighter">Gestión de Usuarios</h3>
            <div className="space-y-4">
                <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Username / ID" value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} />
                <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Nombre Completo" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                <select className="w-full p-3 border-2 rounded-xl font-bold text-sm" value={form.role} onChange={(e: any) => setForm({...form, role: e.target.value})}>
                    {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {(form.role === UserRole.ADMIN || form.role === UserRole.SUPERVISOR) && (
                    <input type="password" title="Contraseña" className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Contraseña de Sistema" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} />
                )}
                <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-black">
                    Guardar Usuario
                </button>
            </div>
        </div>
        <div className="lg:col-span-2 overflow-hidden border-2 border-slate-100 rounded-3xl">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                    <tr><th className="p-5">ID / Usuario</th><th className="p-5">Nombre</th><th className="p-5">Rol</th><th className="p-5 text-right"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                        <tr key={u.id} onClick={() => { setForm(u); setEditingId(u.id); }} className="hover:bg-slate-50 cursor-pointer transition-colors">
                            <td className="p-5 font-black font-mono">{u.username}</td>
                            <td className="p-5 font-bold text-slate-700">{u.name}</td>
                            <td className="p-5"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-black text-[10px]">{u.role}</span></td>
                            <td className="p-5 text-right"><button onClick={(e) => { e.stopPropagation(); db.deleteUser(u.id).then(loadData); }} className="text-slate-300 hover:text-red-600"><Trash2 size={18}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}

function OpsManager() {
  const [ops, setOps] = useState<Operation[]>([]);
  const [form, setForm] = useState<Partial<Operation>>({ isInitial: false, isFinal: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showAlert, showLoading, hideLoading } = useAlert();

  const loadData = async () => { setOps(await db.getOperations()); };
  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if(!form.name) return showAlert("Error", "Nombre de operación requerido.", "error");
    showLoading();
    try {
      if (editingId) await db.updateOperation(editingId, form);
      else await db.addOperation({ ...form as Operation, id: `op_${Date.now()}` });
      setEditingId(null); setForm({}); loadData();
    } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 h-fit">
            <h3 className="font-black text-xl mb-6 text-slate-800 uppercase tracking-tighter">Estaciones</h3>
            <div className="space-y-4">
                <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Nombre Estación" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                <input type="number" className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Índice de Orden" value={form.orderIndex || ''} onChange={e => setForm({...form, orderIndex: Number(e.target.value)})} />
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 font-bold text-xs"><input type="checkbox" checked={form.isInitial} onChange={e => setForm({...form, isInitial: e.target.checked})} /> INICIAL</label>
                    <label className="flex items-center gap-2 font-bold text-xs"><input type="checkbox" checked={form.isFinal} onChange={e => setForm({...form, isFinal: e.target.checked})} /> FINAL</label>
                </div>
                <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm hover:bg-black transition-all">Guardar Operación</button>
            </div>
        </div>
        <div className="lg:col-span-2 border-2 border-slate-100 rounded-3xl overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                    <tr><th className="p-5 text-left">Orden</th><th className="p-5 text-left">Estación</th><th className="p-5 text-left">Tipo</th><th className="p-5 text-right"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {ops.map(o => (
                        <tr key={o.id} onClick={() => { setForm(o); setEditingId(o.id); }} className="hover:bg-slate-50 cursor-pointer">
                            <td className="p-5 font-black text-slate-400">{o.orderIndex}</td>
                            <td className="p-5 font-bold">{o.name}</td>
                            <td className="p-5">
                                <div className="flex gap-1">
                                    {o.isInitial && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-black">INI</span>}
                                    {o.isFinal && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">FIN</span>}
                                </div>
                            </td>
                            <td className="p-5 text-right"><button onClick={(e) => { e.stopPropagation(); db.deleteOperation(o.id).then(loadData); }} className="text-slate-300 hover:text-red-600"><Trash2 size={18}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}

function LabelsManager() {
    const [configs, setConfigs] = useState<LabelConfig[]>([]);
    const [parts, setParts] = useState<PartNumber[]>([]); 
    const [form, setForm] = useState<Partial<LabelConfig>>({ defaultQuantity: 1, labelType: 'NAMEPLATE' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();
    const [managingFieldsConfig, setManagingFieldsConfig] = useState<LabelConfig | null>(null);

    const loadData = async () => {
        const [configsData, partsData] = await Promise.all([db.getLabelConfigs(), db.getParts()]);
        setConfigs(configsData); setParts(partsData);
    };
    useEffect(() => { loadData(); }, []);

    const uniqueModels = Array.from(new Set(parts.map(p => p.productCode).filter(Boolean))).sort();
    const filteredConfigs = useMemo(() => {
        return configs.filter(c => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (c.labelName.toLowerCase().includes(term) || c.printerName.toLowerCase().includes(term) || c.sku.toLowerCase().includes(term));
            }
            return true;
        });
    }, [configs, searchTerm]);

    const handleSave = async () => {
        if (!form.sku || !form.labelName) return showAlert("Error", "Modelo y Nombre Etiqueta requeridos.", "error");
        showLoading();
        try {
            await db.saveLabelConfig({ 
                id: editingId || `lbl_${Date.now()}`, 
                sku: form.sku, 
                labelName: form.labelName, 
                formatPath: form.formatPath || '', 
                printerName: form.printerName || '', 
                defaultQuantity: form.defaultQuantity || 1, 
                labelType: form.labelType || 'NAMEPLATE' 
            });
            await loadData(); handleCancel();
        } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
    };

    const handleCancel = () => { setEditingId(null); setForm({ defaultQuantity: 1, labelType: 'NAMEPLATE' }); };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 h-fit">
                <h3 className="font-black text-xl mb-6 text-slate-800 uppercase tracking-tighter">Formatos Tharo</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Modelo Relacionado</label>
                        <select className="w-full p-3 border-2 rounded-xl font-bold text-sm" value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })}>
                            <option value="">-- Seleccionar SKU --</option>
                            {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo de Etiqueta</label>
                        <select className="w-full p-3 border-2 rounded-xl font-bold text-sm" value={form.labelType} onChange={(e: any) => setForm({ ...form, labelType: e.target.value })}>
                            <option value="NAMEPLATE">NAMEPLATE (Unidad)</option> 
                            <option value="CARTON1">CARTON 1 (Caja)</option> 
                            <option value="CARTON2">CARTON 2 (Master)</option>
                        </select>
                    </div>
                    <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Nombre Archivo (.fmt)" value={form.labelName || ''} onChange={e => setForm({ ...form, labelName: e.target.value })} />
                    <input className="w-full p-3 border-2 rounded-xl font-mono text-xs" placeholder="Ruta del Formato" value={form.formatPath || ''} onChange={e => setForm({ ...form, formatPath: e.target.value })} />
                    <input className="w-full p-3 border-2 rounded-xl font-bold" placeholder="Impresora Destino" value={form.printerName || ''} onChange={e => setForm({ ...form, printerName: e.target.value })} />
                    <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm hover:bg-black transition-all shadow-xl">Guardar Formato</button>
                </div>
            </div>
            <div className="lg:col-span-2">
                <div className="mb-6 relative"><Search className="absolute left-4 top-4 text-slate-400" /><input className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" placeholder="Buscar formatos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                <div className="border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest"><tr><th className="p-5">SKU</th><th className="p-5">Tipo</th><th className="p-5">Formato</th><th className="p-5 text-center">Variables</th><th className="p-5 text-right"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredConfigs.map(c => (
                                <tr key={c.id} onClick={() => { setForm(c); setEditingId(c.id); }} className={`hover:bg-slate-50 cursor-pointer transition-colors ${editingId === c.id ? 'bg-blue-50' : ''}`}>
                                    <td className="p-5 font-black text-slate-700">{c.sku}</td>
                                    <td className="p-5 text-[10px] font-black uppercase text-blue-600">{c.labelType}</td>
                                    <td className="p-5 font-medium">{c.labelName}</td>
                                    <td className="p-5 text-center"><button onClick={(e) => { e.stopPropagation(); setManagingFieldsConfig(c); }} className="text-[10px] font-black text-blue-600 border-2 border-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all">Configurar</button></td>
                                    <td className="p-5 text-right"><button onClick={(e) => { e.stopPropagation(); db.deleteLabelConfig(c.id).then(loadData); }} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {managingFieldsConfig && <LabelFieldsModal config={managingFieldsConfig} onClose={() => setManagingFieldsConfig(null)} />}
        </div>
    );
}

function LabelFieldsModal({ config, onClose }: { config: LabelConfig, onClose: () => void }) {
    const [fields, setFields] = useState<LabelField[]>([]);
    const [newField, setNewField] = useState<Partial<LabelField>>({ dataSource: 'SERIAL' });
    const { showAlert } = useAlert();
    const loadFields = async () => { const data = await db.getLabelFields(config.id); setFields(data); };
    useEffect(() => { loadFields(); }, [config.id]);
    const handleAddField = async () => {
        if (!newField.fieldName) return;
        await db.addLabelField({ labelConfigId: config.id, fieldName: newField.fieldName, dataSource: newField.dataSource || 'SERIAL', staticValue: newField.staticValue });
        await loadFields(); setNewField({ dataSource: 'SERIAL', fieldName: '' });
    };
    const handleDeleteField = async (id: number) => { await db.deleteLabelField(id); await loadFields(); };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Mapeo de Variables</h3>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{config.sku} | {config.labelName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="bg-blue-50/50 p-6 rounded-2xl mb-8 flex flex-col gap-4 border border-blue-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Campo en EasyLabel</label>
                                <input className="w-full p-3 border-2 border-white rounded-xl text-sm font-bold shadow-sm focus:border-blue-500 outline-none" placeholder="Nombre exacto..." value={newField.fieldName || ''} onChange={e => setNewField({...newField, fieldName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Origen de Datos</label>
                                <select className="w-full p-3 border-2 border-white rounded-xl text-sm font-black shadow-sm" value={newField.dataSource} onChange={(e: any) => setNewField({...newField, dataSource: e.target.value})}>
                                    <option value="SERIAL">SERIAL UNITARIO</option>
                                    <option value="PART">NO. PARTE</option>
                                    <option value="SKU">MODELO / SKU</option>
                                    <option value="ORDER">ORDEN SAP</option>
                                    <option value="DATE">FECHA ACTUAL</option>
                                    <option value="STATIC">VALOR FIJO</option>
                                </select>
                            </div>
                        </div>
                        {newField.dataSource === 'STATIC' && (
                            <input className="w-full p-3 border-2 border-white rounded-xl text-sm font-medium" placeholder="Ingrese el texto estático..." value={newField.staticValue || ''} onChange={e => setNewField({...newField, staticValue: e.target.value})} />
                        )}
                        <button onClick={handleAddField} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">
                            <Plus size={16} /> Agregar Variable al Formato
                        </button>
                    </div>
                    
                    <div className="border-2 border-slate-50 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                <tr><th className="p-4">Variable</th><th className="p-4">Origen</th><th className="p-4">Valor</th><th className="p-4 text-right"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {fields.map(f => (
                                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-black font-mono text-blue-600">{f.fieldName}</td>
                                        <td className="p-4 font-bold text-slate-500 text-xs">{f.dataSource}</td>
                                        <td className="p-4 text-slate-400 truncate max-w-[150px]">{f.staticValue || '-'}</td>
                                        <td className="p-4 text-right"><button onClick={() => handleDeleteField(f.id)} className="text-slate-300 hover:text-red-600 p-1"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                                {fields.length === 0 && (
                                    <tr><td colSpan={4} className="p-10 text-center text-slate-300 italic text-xs">Sin variables configuradas aún.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
