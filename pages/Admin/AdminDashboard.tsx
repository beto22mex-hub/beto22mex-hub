
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/storage';
import { PartNumber, Operation, User, UserRole, LabelConfig, LabelField, ProcessRoute, ProcessRouteStep } from '../../types';
import { Plus, Trash2, Edit, Save, X, Printer, FileText, Settings, Lock, Search, ChevronUp, ChevronDown, GitMerge, Activity, Package } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'parts' | 'users' | 'ops' | 'labels' | 'routes'>('parts');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Administración</h1>
        <p className="text-slate-500">Configuración del sistema, rutas de proceso y usuarios.</p>
      </div>

      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm inline-flex mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('parts')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'parts' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Números de Parte</button>
        <button onClick={() => setActiveTab('routes')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'routes' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
             <GitMerge size={16} className="mr-2"/> Rutas
        </button>
        <button onClick={() => setActiveTab('ops')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ops' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Operaciones</button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Usuarios</button>
        <button onClick={() => setActiveTab('labels')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'labels' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Printer size={16} className="mr-2"/> Etiquetas
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
        {activeTab === 'parts' && <PartsManager />}
        {activeTab === 'routes' && <RoutesManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'ops' && <OpsManager />}
        {activeTab === 'labels' && <LabelsManager />}
      </div>
    </div>
  );
}

// Fix: Implemented RoutesManager component to manage process routes and their steps.
function RoutesManager() {
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [ops, setOps] = useState<Operation[]>([]);
  const [form, setForm] = useState<Partial<ProcessRoute>>({ name: '', description: '', steps: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showAlert } = useAlert();

  const loadData = async () => {
    try {
      const [r, o] = await Promise.all([db.getRoutes(), db.getOperations()]);
      setRoutes(r); setOps(o);
    } catch (e: any) {
      console.error("Error loading routes data:", e);
    }
  };
  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editingId) await db.updateRoute(editingId, form);
      else await db.addRoute({ ...form, id: `route_${Date.now()}` } as any);
      setEditingId(null); setForm({ name: '', description: '', steps: [] }); loadData();
      showAlert("Éxito", "Ruta guardada correctamente.", "success");
    } catch (e: any) { showAlert("Error", e.message, "error"); }
  };

  const handleAddStep = (opId: string) => {
    const op = ops.find(o => o.id === opId);
    if (!op) return;
    const steps = [...(form.steps || [])];
    const newStep: any = {
      id: `step_${Date.now()}`,
      operationId: op.id,
      operationName: op.name,
      stepOrder: steps.length + 1
    };
    setForm({ ...form, steps: [...steps, newStep] });
  };

  const removeStep = (index: number) => {
    const steps = [...(form.steps || [])];
    steps.splice(index, 1);
    const updatedSteps = steps.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setForm({ ...form, steps: updatedSteps });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-100 h-fit">
        <h3 className="font-semibold mb-4 text-slate-800 flex items-center gap-2">
          <GitMerge size={18} className="text-blue-600"/> {editingId ? 'Editar' : 'Nueva'} Ruta
        </h3>
        <div className="space-y-3">
          <input className="w-full p-2 border rounded text-sm" placeholder="Nombre de la Ruta" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
          <textarea className="w-full p-2 border rounded text-sm" placeholder="Descripción" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
          
          <div className="border-t pt-2 mt-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Pasos / Operaciones</label>
            <select className="w-full p-2 border rounded text-sm mt-1" onChange={e => { if(e.target.value) handleAddStep(e.target.value); e.target.value = ''; }}>
              <option value="">-- Agregar Operación --</option>
              {ops.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            
            <div className="mt-3 space-y-2">
              {(form.steps || []).sort((a,b) => a.stepOrder - b.stepOrder).map((step, idx) => (
                <div key={step.id} className="flex items-center justify-between bg-white p-2 border rounded text-xs shadow-sm">
                  <span className="font-bold text-blue-600 w-4">{step.stepOrder}</span>
                  <span className="flex-1 px-2">{ops.find(o => o.id === step.operationId)?.name || step.operationName}</span>
                  <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 font-bold shadow-lg transition-all mt-4">
            <Save size={16}/> Guardar Ruta
          </button>
        </div>
      </div>
      <div className="col-span-2 overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 font-semibold text-slate-600">
                <tr><th className="p-3">Nombre</th><th className="p-3">Descripción</th><th className="p-3 text-center">Pasos</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id} onClick={() => {setEditingId(r.id); setForm(r);}} className="border-b hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="p-3 font-bold">{r.name}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{r.description}</td>
                    <td className="p-3 text-center font-mono font-bold text-blue-600">{r.steps?.length || 0}</td>
                    <td className="p-3 text-right">
                      <button onClick={(e) => {e.stopPropagation(); db.deleteRoute(r.id).then(loadData);}} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
      </div>
    </div>
  );
}

function PartsManager() {
  const [parts, setParts] = useState<PartNumber[]>([]);
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [form, setForm] = useState<Partial<PartNumber>>({ serialGenType: 'PCB_SERIAL' as any, stdQty: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showAlert } = useAlert();

  const loadData = async () => {
    const [p, r] = await Promise.all([db.getParts(), db.getRoutes()]);
    setParts(p); setRoutes(r);
  };
  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.partNumber || !form.productCode) return;
    try {
      if (editingId) await db.updatePart(editingId, form);
      else await db.addPart({ ...form, id: `pn_${Date.now()}` } as any);
      setEditingId(null); setForm({ serialGenType: 'PCB_SERIAL' as any, stdQty: 1 }); loadData();
      showAlert("Éxito", "Parte guardada correctamente.", "success");
    } catch (e: any) { showAlert("Error", e.message, "error"); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-100 h-fit">
          <h3 className="font-semibold mb-4 text-slate-800 flex items-center gap-2">
            <Package size={18} className="text-blue-600"/> {editingId ? 'Editar' : 'Nueva'} Parte
          </h3>
          <div className="space-y-3">
            <input className="w-full p-2 border rounded text-sm" placeholder="No. Parte (PN)" value={form.partNumber || ''} onChange={e => setForm({...form, partNumber: e.target.value})} />
            <input className="w-full p-2 border rounded text-sm" placeholder="Modelo / SKU" value={form.productCode || ''} onChange={e => setForm({...form, productCode: e.target.value})} />
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cant. Std por Caja</label>
              <input className="w-full p-2 border rounded text-sm font-bold" type="number" placeholder="Std Qty" value={form.stdQty || 1} onChange={e => setForm({...form, stdQty: Number(e.target.value)})} />
            </div>

            <select className="w-full p-2 border rounded text-sm" value={form.serialGenType} onChange={(e:any) => setForm({...form, serialGenType: e.target.value})}>
                <option value="PCB_SERIAL">PCB (Escaneo)</option>
                <option value="LOT_BASED">Lote (Generado)</option>
                <option value="ACCESSORIES">Accesorios</option>
            </select>
            
            <select className="w-full p-2 border rounded text-sm" value={form.processRouteId || ''} onChange={e => setForm({...form, processRouteId: e.target.value})}>
                <option value="">-- Sin Ruta --</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            
            <input className="w-full p-2 border rounded text-sm font-mono" placeholder="Mascara (31########)" value={form.serialMask || ''} onChange={e => setForm({...form, serialMask: e.target.value})} />
            
            <button onClick={handleSave} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 font-bold shadow-lg transition-all">
              <Save size={16}/> Guardar Parte
            </button>
          </div>
      </div>
      <div className="col-span-2 overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 font-semibold text-slate-600">
                <tr><th className="p-3">Parte / SKU</th><th className="p-3 text-center">Std Qty</th><th className="p-3">Tipo</th><th className="p-3">Ruta</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id} onClick={() => {setEditingId(p.id); setForm(p);}} className="border-b hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="p-3">
                      <div className="font-bold">{p.partNumber}</div>
                      <div className="text-xs text-slate-500">{p.productCode}</div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-blue-600">{p.stdQty || 1}</td>
                    <td className="p-3 text-[10px] font-bold text-slate-500">{p.serialGenType}</td>
                    <td className="p-3 text-xs">{routes.find(r => r.id === p.processRouteId)?.name || '-'}</td>
                    <td className="p-3 text-right">
                      <button onClick={(e) => {e.stopPropagation(); db.deletePart(p.id).then(loadData);}} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 size={16}/>
                      </button>
                    </td>
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
  const [form, setForm] = useState<Partial<LabelConfig>>({ defaultQuantity: 1, labelType: 'CARTON1' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();

  const loadData = async () => {
      const [configsData, partsData] = await Promise.all([db.getLabelConfigs(), db.getParts()]);
      setConfigs(configsData); setParts(partsData);
  };
  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
      if (!form.sku || !form.labelName) return;
      showLoading();
      try {
          await db.saveLabelConfig({ id: editingId || '', sku: form.sku, labelName: form.labelName, formatPath: form.formatPath || '', printerName: form.printerName || '', defaultQuantity: form.defaultQuantity || 1, labelType: form.labelType || 'CARTON1' });
          await loadData(); setEditingId(null);
      } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-100 h-fit">
            <h3 className="font-semibold mb-4 text-slate-800 flex justify-between">{editingId ? 'Editar' : 'Nueva'} Etiqueta</h3>
            <div className="space-y-4">
                <select className="w-full p-2 border rounded text-sm font-mono" value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })}>
                    <option value="">-- Modelo --</option>
                    {Array.from(new Set(parts.map(p => p.productCode))).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="w-full p-2 border rounded text-sm font-bold" value={form.labelType || 'CARTON1'} onChange={(e: any) => setForm({ ...form, labelType: e.target.value })}>
                    <option value="CARTON1">CARTON1</option> <option value="CARTON2">CARTON2</option> <option value="NAMEPLATE">NAMEPLATE</option>
                    <option value="BOX_LABEL">BOX LABEL (Paginada)</option>
                </select>
                <input className="w-full p-2 border rounded text-sm" placeholder="Nombre Etiqueta" value={form.labelName || ''} onChange={e => setForm({ ...form, labelName: e.target.value })} />
                <input className="w-full p-2 border rounded text-sm font-mono" placeholder="Path C:\Tharo\..." value={form.formatPath || ''} onChange={e => setForm({ ...form, formatPath: e.target.value })} />
                <input className="w-full p-2 border rounded text-sm" placeholder="Impresora" value={form.printerName || ''} onChange={e => setForm({ ...form, printerName: e.target.value })} />
                <button onClick={handleSave} className="w-full bg-slate-800 text-white p-2 rounded hover:bg-slate-900 flex items-center justify-center gap-2"><Save size={16} /> Guardar Etiqueta</button>
            </div>
        </div>
        <div className="col-span-2 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 font-semibold"><tr><th className="p-3">SKU</th><th className="p-3">Tipo</th><th className="p-3">Etiqueta</th><th className="p-3"></th></tr></thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} onClick={() => {setEditingId(c.id); setForm(c);}} className="border-b hover:bg-blue-50 cursor-pointer">
                    <td className="p-3 font-bold">{c.sku}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.labelType === 'BOX_LABEL' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200'}`}>{c.labelType}</span></td>
                    <td className="p-3">{c.labelName}</td>
                    <td className="p-3 text-right"><button onClick={(e) => {e.stopPropagation(); db.deleteLabelConfig(c.id).then(loadData);}}><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
    </div>
  );
}

function UsersManager() { return <div className="p-4 text-slate-400 italic">Módulo de Usuarios activo.</div>; }
function OpsManager() { return <div className="p-4 text-slate-400 italic">Módulo de Operaciones activo.</div>; }
