
import React, { useState, useEffect, useRef, useContext } from 'react';
import { db } from '../../services/storage';
import { Operation, WorkOrder, SerialUnit, PartNumber, ProcessRoute } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { Scan, CheckCircle, Box, ArrowLeft, Lock, Info, PlayCircle, GitMerge, ChevronRight, X, Layers, LogOut, CheckSquare, Square, List, Hash, Download, Printer } from 'lucide-react';

export default function OperatorStation() {
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const [selectedRoute, setSelectedRoute] = useState<ProcessRoute | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [allOperations, setAllOperations] = useState<Operation[]>([]);

  useEffect(() => {
    const load = async () => {
        const [r, o] = await Promise.all([db.getRoutes(), db.getOperations()]);
        setRoutes(r); setAllOperations(o);
    }
    load();
  }, []);

  const handleSelectOp = async (op: Operation) => {
    try {
        await db.enterStation(op.id, user!.id);
        setSelectedOp(op);
    } catch (e: any) { showAlert("Acceso Denegado", e.message, "error"); }
  };

  if (!selectedRoute) {
      return (
          <div className="max-w-6xl mx-auto animate-in fade-in">
              <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900">Selección de Ruta</h1>
                  <p className="text-slate-500">Seleccione el proceso para comenzar.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {routes.map(r => (
                      <button key={r.id} onClick={() => setSelectedRoute(r)} className="bg-white p-6 rounded-2xl border hover:border-blue-500 hover:shadow-lg transition-all text-left group">
                          <GitMerge className="text-blue-600 mb-4 group-hover:scale-110 transition-transform" size={24}/>
                          <h3 className="text-xl font-bold text-slate-800">{r.name}</h3>
                          <p className="text-sm text-slate-500 mt-2">{r.description}</p>
                          <div className="mt-4 pt-4 border-t text-[10px] text-slate-400 font-mono flex items-center">
                              {r.steps.length} OPERACIONES <ChevronRight size={14} className="ml-auto"/>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )
  }

  if (!selectedOp) {
    const routeOps = selectedRoute.steps.map(s => allOperations.find(o => o.id === s.operationId)).filter(Boolean) as Operation[];
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in">
        <div className="mb-8 flex justify-between items-start">
          <div><h1 className="text-3xl font-bold text-slate-900">{selectedRoute.name}</h1><p className="text-slate-500">Seleccione operación activa.</p></div>
          <button onClick={() => setSelectedRoute(null)} className="flex items-center text-sm text-slate-500 hover:text-slate-800 bg-white border px-3 py-2 rounded-lg transition-colors"><ArrowLeft size={16} className="mr-2"/> Cambiar Ruta</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {routeOps.map((op, idx) => (
            <button key={op.id} onClick={() => handleSelectOp(op)} className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 group relative transition-all">
                <div className={`p-4 rounded-full mb-4 transition-transform group-hover:scale-110 ${op.isInitial ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {op.isFinal ? <Box size={32} /> : <Scan size={32} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{op.name}</h3>
                <span className="text-xs text-slate-400 mt-1">PASO {idx + 1}</span>
                {(op as any).activeOperatorId && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold"><Lock size={10} className="inline mr-1"/> Ocupado</div>
                )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <StationInterface operation={selectedOp} route={selectedRoute} onBack={() => { db.exitStation(selectedOp.id, user!.id); setSelectedOp(null); }} user={user!} />;
}

function StationInterface({ operation, route, onBack, user }: { operation: Operation, route: ProcessRoute, onBack: () => void, user: any }) {
  const { showLoading, hideLoading, showAlert, showConfirm } = useAlert();
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [activeOrderPart, setActiveOrderPart] = useState<PartNumber | null>(null);
  const [trayInput, setTrayInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [activeTrayId, setActiveTrayId] = useState<string | null>(null);
  const [traySerials, setTraySerials] = useState<SerialUnit[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: string, text: string } | null>(null);
  const [sapOrderInput, setSapOrderInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [setupStep, setSetupStep] = useState<1|2|3>(1);

  const handleScanContext = async (e: React.FormEvent) => {
      e.preventDefault();
      const val = contextInput.trim();
      if (!val) return;
      showLoading("Cargando Contexto...");
      try {
          const order = await db.getOrderByNumber(val);
          if (!order) throw new Error("Orden SAP no encontrada o ya cerrada.");
          const parts = await db.getParts();
          const part = parts.find(p => p.id === order.partNumberId);
          if (part?.processRouteId && part.processRouteId !== route.id) throw new Error(`El producto ${part.productCode} pertenece a otra ruta.`);
          setActiveOrder(order); setActiveOrderPart(part || null); setContextInput('');
      } catch (e: any) { showAlert("Error", e.message, "error"); setContextInput(''); } finally { hideLoading(); }
  };

  const handleFinishSetup = async () => {
      if(!sapOrderInput || !qtyInput || !modelInput) return;
      showLoading("Generando Lote...");
      try {
          const res = await db.generateAutoOrder(sapOrderInput, modelInput, Number(qtyInput));
          const order = await db.getOrderByNumber(res.orderNumber);
          const part = (await db.getParts()).find(p => p.id === order?.partNumberId);
          setActiveOrder(order!); setActiveOrderPart(part!);
          setStatusMsg({ type: 'success', text: `Orden ${res.orderNumber} iniciada.` });
      } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  }

  const handleScanTray = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!trayInput || !activeOrder) return;
      showLoading("Validando Charola...");
      try {
          if (operation.isInitial) {
              const res = await db.generateBatchSerials({
                  orderNumber: activeOrder.orderNumber, partNumberId: activeOrderPart!.id, currentOperationId: operation.id, trayId: trayInput, operatorId: user.id, quantity: Math.min(100, activeOrder.quantity)
              });
              if(res.success) {
                  const blob = new Blob(["PN,SKU,SERIAL\n" + res.serials.map(s => `${activeOrderPart?.partNumber},${activeOrderPart?.productCode},${s.serialNumber}`).join("\n")], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `CSV_${activeOrder.sapOrderNumber}_TRAY_${trayInput}.csv`; a.click();
                  setStatusMsg({ type: 'success', text: `Charola ${trayInput} generada con éxito.` });
              }
          } else {
              const serials = await db.getSerialsByTray(trayInput);
              const relevant = serials.filter(s => s.orderNumber === activeOrder.orderNumber);
              if(relevant.length === 0) throw new Error("La charola no contiene unidades para esta orden.");
              setTraySerials(relevant);
              setActiveTrayId(trayInput);
          }
          setTrayInput('');
      } catch (e: any) { showAlert("Error", e.message, "error"); setTrayInput(''); } finally { hideLoading(); }
  }

  const handleProcessBatch = async () => {
      if (!activeTrayId || !activeOrder || !activeOrderPart) return;
      showLoading("Finalizando Lote...");
      try {
          await db.updateBatchSerials({ serials: traySerials.map(s => s.serialNumber), operationId: operation.id, operatorId: user.id, isComplete: operation.isFinal });
          
          if(operation.isFinal) {
              // Si es final, imprimir etiquetas (Standard + BOX_LABEL si existe)
              await db.printMultiLabels(traySerials, activeOrderPart.productCode, activeOrderPart.partNumber);
              // Disparar BOX_LABEL pasándole el número de orden como serial de referencia
              await db.printLabel(activeOrder.orderNumber, activeOrderPart.partNumber, {
                  sku: activeOrderPart.productCode,
                  jobDescription: `Box Labels ${activeOrder.sapOrderNumber}`,
                  excludeLabelTypes: ['CARTON1', 'CARTON2', 'NAMEPLATE'] // Solo BOX_LABEL
              });
          }

          setActiveTrayId(null); setTraySerials([]); setStatusMsg({ type: 'success', text: "Lote completado y liberado." });
          
          // Verificar si la orden se cerró
          const updatedOrder = await db.getOrderByNumber(activeOrder.orderNumber);
          if(updatedOrder?.status === 'CLOSED') {
              showAlert("Orden Finalizada", `La orden ${activeOrder.sapOrderNumber} ha sido completada en su totalidad.`, "success");
              setActiveOrder(null); setActiveOrderPart(null);
          }
      } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in zoom-in-95">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-4 ${operation.isInitial ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {operation.isFinal ? <Box size={24}/> : <Scan size={24}/>}
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">{operation.name}</h2>
                <p className="text-xs text-slate-500 font-medium">Operador: <span className="text-slate-800">{user.name}</span> | Ruta: <span className="text-slate-800">{route.name}</span></p>
            </div>
        </div>
        <button onClick={onBack} className="bg-slate-100 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Salir</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col justify-center items-center relative overflow-hidden">
            {!activeOrder ? (
                operation.isInitial ? (
                    <div className="w-full max-w-sm space-y-4 z-10">
                        <div className="text-center mb-6"><PlayCircle size={48} className="mx-auto text-blue-600 mb-2"/><h3 className="font-bold text-xl text-slate-800">Inicio de Orden SAP</h3></div>
                        <input autoFocus className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 outline-none font-mono" placeholder="Escanear Orden SAP" value={sapOrderInput} onChange={e => {setSapOrderInput(e.target.value); if(e.target.value.length === 10) setSetupStep(2);}} />
                        {setupStep >= 2 && (
                            <div className="animate-in slide-in-from-top-4">
                                <input className="w-full p-3 border-2 border-slate-200 rounded-xl mb-3 text-center font-bold" type="number" placeholder="Cantidad Total" value={qtyInput} onChange={e => setQtyInput(e.target.value)} />
                                <input className="w-full p-3 border-2 border-slate-200 rounded-xl uppercase text-center font-bold" placeholder="Modelo / SKU" value={modelInput} onChange={e => setModelInput(e.target.value)} />
                                {modelInput && qtyInput && <button onClick={handleFinishSetup} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-6 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">COMENZAR PRODUCCIÓN</button>}
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleScanContext} className="w-full max-w-sm z-10"><h3 className="font-bold text-center text-xl mb-6 text-slate-700">Seleccionar Contexto de Trabajo</h3><input autoFocus className="w-full p-4 border-2 border-slate-200 rounded-2xl text-2xl text-center font-mono focus:border-blue-500 outline-none" placeholder="0000000000" value={contextInput} onChange={e => setContextInput(e.target.value)} /></form>
                )
            ) : (
                <div className="w-full max-w-sm text-center z-10">
                    <div className="mb-8">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Orden Activa</p>
                        <h4 className="text-3xl font-black text-slate-900 font-mono">{activeOrder.sapOrderNumber}</h4>
                    </div>
                    {activeTrayId ? (
                        <div className="space-y-6 animate-in zoom-in-95">
                            <div className="bg-slate-50 p-6 border-2 border-blue-100 rounded-3xl">
                                <Layers className="mx-auto text-blue-600 mb-2" size={32}/>
                                <h4 className="font-black text-slate-800">CHAROLA: {activeTrayId}</h4>
                                <p className="text-sm font-bold text-slate-500 mt-1">{traySerials.length} unidades listas</p>
                            </div>
                            <button onClick={handleProcessBatch} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-black shadow-xl transition-all">PROCESAR Y LIBERAR LOTE</button>
                            <button onClick={() => {setActiveTrayId(null); setTraySerials([]);}} className="text-sm font-bold text-red-500 hover:underline">Cancelar Selección</button>
                        </div>
                    ) : (
                        <form onSubmit={handleScanTray} className="animate-in fade-in">
                            <Layers size={64} className="mx-auto text-slate-200 mb-6"/>
                            <input autoFocus className="w-full p-4 border-2 border-slate-200 rounded-2xl text-2xl text-center font-mono focus:border-blue-500 outline-none shadow-inner bg-slate-50" placeholder="ESCANEAR CHAROLA" value={trayInput} onChange={e => setTrayInput(e.target.value)} />
                            <p className="text-xs text-slate-400 mt-4 font-bold uppercase tracking-widest">Escanee ID de charola para {operation.isInitial ? 'generar' : 'cargar'} unidades</p>
                        </form>
                    )}
                </div>
            )}
            {statusMsg && <div className={`mt-8 px-6 py-3 rounded-full text-sm font-black shadow-sm animate-bounce ${statusMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{statusMsg.text}</div>}
        </div>
        <div className="space-y-6">
            {activeOrder && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg animate-in slide-in-from-right-8">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-6">
                        <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest">Información del Lote</h3>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black">{activeOrder.status}</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline"><span className="text-slate-500 text-sm font-medium">Producto:</span><span className="font-black text-slate-800 text-lg">{activeOrderPart?.productCode}</span></div>
                        <div className="flex justify-between items-baseline"><span className="text-slate-500 text-sm font-medium">No. Parte:</span><span className="font-bold text-slate-700 font-mono">{activeOrderPart?.partNumber}</span></div>
                        <div className="flex justify-between items-baseline"><span className="text-slate-500 text-sm font-medium">Cant. Caja (Std):</span><span className="font-black text-blue-600 bg-blue-50 px-2 rounded">{activeOrderPart?.stdQty || 1} pzas</span></div>
                        <div className="flex justify-between items-baseline"><span className="text-slate-500 text-sm font-medium">Meta Orden:</span><span className="font-black text-slate-800">{activeOrder.quantity} pzas</span></div>
                    </div>
                    <button onClick={() => {setActiveOrder(null); setTraySerials([]); setStatusMsg(null);}} className="w-full mt-8 py-3 text-xs font-black text-red-400 bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-100 uppercase tracking-widest">Finalizar Turno / Cambiar Orden</button>
                </div>
            )}
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                <Info className="mx-auto mb-4 text-blue-500 opacity-80" size={32}/>
                <h4 className="text-white font-bold mb-2">Sistema de Trazabilidad</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Box Packing Logic v3.1<br/>Soporte para etiquetas de caja paginadas e impresión por charola activa.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
