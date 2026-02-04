
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { db } from '../../services/storage';
import { Operation, WorkOrder, SerialUnit, PartNumber, ProcessRoute, SerialGenType } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { 
  Scan, CheckCircle, AlertTriangle, Printer, Box, ArrowLeft, Lock, Info, 
  PlayCircle, PlusSquare, ArrowRight, GitMerge, ChevronRight, X, 
  RefreshCw, FileDown, Layers, LogOut, CheckSquare, Square, List, Hash, Download,
  Package, Loader2, Clock, Trash2
} from 'lucide-react';

export default function OperatorStation() {
  const { user } = useContext(AuthContext);
  const { showAlert, showLoading, hideLoading } = useAlert();
  const [selectedRoute, setSelectedRoute] = useState<ProcessRoute | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [allOperations, setAllOperations] = useState<Operation[]>([]); 
  const [operations, setOperations] = useState<Operation[]>([]); 

  useEffect(() => {
    const load = async () => {
        try {
          const [r, o] = await Promise.all([db.getRoutes(), db.getOperations()]);
          setRoutes(r);
          setAllOperations(o);
        } catch (e: any) {
          showAlert("Error de Conexión", "No se pudieron cargar los datos del servidor.", "error");
        }
    };
    load();
  }, [showAlert]);

  useEffect(() => {
      if (selectedRoute) {
          const routeOps: Operation[] = [];
          const sortedSteps = [...selectedRoute.steps].sort((a, b) => a.stepOrder - b.stepOrder);
          sortedSteps.forEach(step => {
             const op = allOperations.find(o => o.id === step.operationId);
             if (op) routeOps.push(op);
          });
          setOperations(routeOps);
      }
  }, [selectedRoute, allOperations]);

  const handleSelectRoute = (route: ProcessRoute) => {
      if (selectedOp) handleExitStation(selectedOp);
      setSelectedRoute(route);
  };

  const handleSelectOp = async (op: Operation) => {
    try {
        await db.enterStation(op.id, user!.id);
        setSelectedOp(op);
    } catch (e: any) {
        showAlert("Acceso Denegado", e.message || "No se pudo ingresar a la estación.", "error");
    }
  };

  const handleExitStation = async (op: Operation) => {
      if (user) {
          try {
              await db.exitStation(op.id, user.id);
          } catch (e) {
              console.error("Error unlocking station", e);
          }
      }
  };

  const handleBackToRoutes = () => {
      if (selectedOp) {
          handleExitStation(selectedOp);
          setSelectedOp(null);
      }
      setSelectedRoute(null);
  };

  const handleBackToOps = async () => {
    if (selectedOp) {
        await handleExitStation(selectedOp);
        setSelectedOp(null);
    }
  };

  useEffect(() => {
      return () => {
          if (selectedOp) handleExitStation(selectedOp);
      };
  }, [selectedOp]);

  if (!selectedRoute) {
      return (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="mb-8 text-center md:text-left">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Selección de Ruta</h1>
                  <p className="text-slate-500 font-medium tracking-wide">Seleccione la línea de producción activa.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {routes.map(route => (
                      <button 
                        key={route.id} 
                        onClick={() => handleSelectRoute(route)}
                        className="bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 transition-all text-left group"
                      >
                          <div className="flex justify-between items-start mb-6">
                              <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  <GitMerge size={28}/>
                              </div>
                          </div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">{route.name}</h3>
                          <p className="text-sm text-slate-500 font-medium line-clamp-2">{route.description}</p>
                          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                              {route.steps.length} Operaciones
                              <ChevronRight className="ml-auto text-blue-500" size={16}/>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  if (!selectedOp) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedRoute.name}</h1>
            <p className="text-slate-500 font-medium">Línea de Ensamble y Empaque</p>
          </div>
          <button onClick={handleBackToRoutes} className="flex items-center text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 bg-white border-2 border-slate-100 px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all">
              <ArrowLeft size={16} className="mr-2"/> Cambiar Ruta
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operations.map((op, idx) => (
            <div key={op.id} className="relative group">
                <button onClick={() => handleSelectOp(op)} className="w-full flex flex-col items-center p-10 bg-white rounded-[2.5rem] shadow-sm border-4 border-transparent hover:border-blue-500 hover:shadow-2xl transition-all relative overflow-hidden h-full">
                <div className={`p-6 rounded-3xl mb-6 transition-transform group-hover:scale-110 ${op.isInitial ? 'bg-green-100 text-green-600' : op.isFinal ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-700'}`}>
                    {op.isFinal ? <Box size={40} /> : <Scan size={40} />}
                </div>
                <h3 className="text-xl font-black text-slate-800 group-hover:text-blue-600 text-center uppercase tracking-tighter">{op.name}</h3>
                <span className="text-[10px] font-black text-slate-300 mt-4 bg-slate-50 px-4 py-1 rounded-full uppercase tracking-widest">PASO {idx + 1}</span>
                {(op as any).activeOperatorId && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-2xl flex items-center uppercase tracking-widest">
                        <Lock size={10} className="mr-1.5"/> {(op as any).activeOperatorName || 'BLOQUEADO'}
                    </div>
                )}
                {op.isInitial && <span className="absolute top-6 left-6 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-200"></span>}
                </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <StationInterface operation={selectedOp} route={selectedRoute} onBack={handleBackToOps} user={user!} />;
}

interface StationProps {
  operation: Operation;
  route: ProcessRoute;
  onBack: () => void;
  user: { id: string; name: string };
}

function StationInterface({ operation, route, onBack, user }: StationProps) {
  const { showLoading, hideLoading, showAlert, showConfirm } = useAlert();

  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [activeOrderPart, setActiveOrderPart] = useState<PartNumber | null>(null);
  const [allOrderSerials, setAllOrderSerials] = useState<SerialUnit[]>([]); 
  
  const [serialInput, setSerialInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const [contextInput, setContextInput] = useState('');
  const [sapOrderInput, setSapOrderInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1); 

  const [trayInput, setTrayInput] = useState('');
  const [trayGenerated, setTrayGenerated] = useState(false);
  
  const [showBoxPrintButton, setShowBoxPrintButton] = useState(false);
  const [lastRefForBox, setLastRefForBox] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimer = useRef<number | null>(null);

  useEffect(() => {
    if (activeOrder) {
        db.getSerials().then(serials => {
             const relevant = serials.filter(s => s.orderNumber === activeOrder.orderNumber);
             setAllOrderSerials(relevant);
        });
    }
  }, [activeOrder, statusMsg, trayGenerated]);

  const cleanInput = (val: string) => {
    let cleaned = val.trim();
    if (cleaned.length > 5 && /[a-zA-Z]$/.test(cleaned)) {
        cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  };

  useEffect(() => {
    const cleaned = cleanInput(sapOrderInput);
    if (operation.isInitial && !activeOrder && cleaned.length === 10) {
        if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
        autoSubmitTimer.current = window.setTimeout(() => validateAndProceedSAP(cleaned), 600);
    }
    return () => { if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current); };
  }, [sapOrderInput, operation.isInitial, activeOrder]);

  const validateAndProceedSAP = async (sapOrder: string) => {
      showLoading("Validando SAP...");
      try {
          const orders = await db.getOrders();
          const match = orders.find(o => o.sapOrderNumber === sapOrder);
          if (match) {
              if (match.status === 'CLOSED') throw new Error("Orden SAP CERRADA.");
              const parts = await db.getParts();
              const part = parts.find(p => p.id === match.partNumberId);
              if (part && part.processRouteId && part.processRouteId !== route.id) throw new Error("Ruta incorrecta.");
              setActiveOrder(match); setActiveOrderPart(part || null);
              setStatusMsg({ type: 'success', text: "Contexto SAP Cargado" });
          } else {
              setSetupStep(2); setTimeout(() => qtyRef.current?.focus(), 150);
          }
      } catch (e: any) { showAlert("Aviso", e.message, "warning"); setSapOrderInput(''); } finally { hideLoading(); }
  };

  const handleFinishSetup = async () => {
      const cleanedModel = cleanInput(modelInput).toUpperCase();
      if (!sapOrderInput || !qtyInput || !cleanedModel) return;
      showLoading("Creando WO...");
      try {
          const res = await db.generateAutoOrder(cleanInput(sapOrderInput), cleanedModel, Math.min(parseInt(qtyInput), 9999));
          if (res.success) {
              const order = await db.getOrderByNumber(res.orderNumber);
              if (order) {
                  const parts = await db.getParts();
                  const part = parts.find(p => p.id === order.partNumberId);
                  setActiveOrder(order); setActiveOrderPart(part || null);
                  setStatusMsg({ type: 'success', text: `Lote ${res.orderNumber} Creado` });
              }
          }
      } catch (e: any) { showAlert("Error", e.message, "error"); setSetupStep(1); setSapOrderInput(''); } finally { hideLoading(); }
  };

  const handleScanContext = async (e: React.FormEvent, manualValue?: string) => {
      if (e) e.preventDefault();
      const val = cleanInput(manualValue || contextInput);
      if (!val) return;
      showLoading("Buscando...");
      try {
          const orders = await db.getOrders();
          const parts = await db.getParts();
          
          let match = orders.find(o => (o.sapOrderNumber === val || o.orderNumber === val) && o.status === 'OPEN');
          
          if (!match) {
              const unit = await db.getSerial(val).catch(() => null);
              if (unit) {
                  const unitPart = parts.find(p => p.id === unit.partNumberId);
                  if (unitPart?.serialGenType === SerialGenType.PCB_SERIAL) {
                      match = orders.find(o => o.orderNumber === unit.orderNumber);
                  }
              }
          }

          if (match) {
              const part = parts.find(p => p.id === match!.partNumberId);
              setActiveOrder(match!); 
              setActiveOrderPart(part || null);
              setContextInput(''); 
              setStatusMsg({ type: 'success', text: "Lote detectado." });
              
              if (part?.serialGenType === SerialGenType.PCB_SERIAL && operation.isFinal) {
                  setTimeout(() => executeSerialProcess(val, match!, part), 100);
              }
          } else {
              throw new Error("Referencia no encontrada o tipo no compatible para carga por serial.");
          }
      } catch (e: any) { showAlert("Error", e.message, "error"); setContextInput(''); } finally { hideLoading(); }
  };

  const handleSerialScan = async (e: React.FormEvent | null) => {
    if (e) e.preventDefault();
    const val = cleanInput(serialInput);
    if (!val) return;

    if (!activeOrder) {
        if (operation.isFinal) {
            handleScanContext(null as any, val);
            setSerialInput('');
            return;
        } else {
            showAlert("Error", "Debe cargar un lote primero.", "warning");
            return;
        }
    }

    executeSerialProcess(val, activeOrder, activeOrderPart!);
    setSerialInput('');
  };

  const executeSerialProcess = async (val: string, order: WorkOrder, part: PartNumber) => {
    showLoading("Validando...");
    try {
      if (operation.isInitial) {
        if (part?.serialMask) {
            const regex = new RegExp('^' + part.serialMask.replace(/#/g, '\\d') + '$');
            if (!regex.test(val)) throw new Error("Máscara inválida.");
        }
        await db.saveSerial({
            serialNumber: val, orderNumber: order.orderNumber, partNumberId: order.partNumberId, currentOperationId: operation.id, isComplete: false,
            history: [{ operationId: operation.id, operationName: operation.name, operatorId: user.id, operatorName: user.name, timestamp: new Date().toISOString() }], printHistory: []
        });
        if (part?.serialGenType === SerialGenType.PCB_SERIAL) {
            await db.printLabel(val, part.partNumber, { sku: part.productCode, quantity: 1, excludeLabelTypes: ['CARTON1'], operatorId: user.id });
        }
      } else {
        const unit = await db.getSerial(val).catch(() => null);
        if (!unit) throw new Error("Serial no existe.");
        if (unit.orderNumber !== order.orderNumber) throw new Error("Serial pertenece a otra WO.");
        
        unit.currentOperationId = operation.id;
        if (operation.isFinal) unit.isComplete = true;
        unit.history.push({ operationId: operation.id, operationName: operation.name, operatorId: user.id, operatorName: user.name, timestamp: new Date().toISOString() });
        await db.saveSerial(unit);

        if (operation.isFinal) {
            await db.printLabel(val, part.partNumber, { sku: part.productCode, targetLabelType: 'NAMEPLATE', operatorId: user.id });
            const processedCount = allOrderSerials.filter(s => s.history.some(h => h.operationId === operation.id)).length + 1;
            const boxStdQty = part.stdQty || 1;
            
            if (processedCount % boxStdQty === 0 || processedCount >= order.quantity) {
                setLastRefForBox(val);
                setShowBoxPrintButton(true);
            }
        }
      }
      setStatusMsg({ type: 'success', text: `${val} PROCESADO OK` });
    } catch (err: any) { showAlert("Error", err.message, "error"); } finally { hideLoading(); inputRef.current?.focus(); }
  };

  const handleScanTrayInitial = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = cleanInput(trayInput);
    if (!val || !activeOrder || !activeOrderPart) return;
    showLoading("Generando Charola...");
    try {
      const qty = activeOrderPart.stdQty || 1;
      const res = await db.generateBatchSerials({ orderNumber: activeOrder.orderNumber, partNumberId: activeOrderPart.id, currentOperationId: operation.id, operatorId: user.id, trayId: val, quantity: qty });
      if (res.success) {
        setTrayGenerated(true);
        setStatusMsg({ type: 'success', text: `Charola ${val} Generada` });
        if (res.serials && res.serials.length > 0) {
          await db.printMultiLabels(res.serials, activeOrderPart.productCode, activeOrderPart.partNumber, user.id);
        }
      }
    } catch (err: any) { showAlert("Error", err.message, "error"); } finally { hideLoading(); }
  };

  const handleProcessTray = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = cleanInput(contextInput);
    if (!val || !activeOrder) return;
    showLoading("Procesando Charola...");
    try {
      await db.updateBatchSerials({ trayId: val, operationId: operation.id, operatorId: user.id, isComplete: operation.isFinal });
      if (operation.isFinal && activeOrderPart) {
          setLastRefForBox(val);
          setShowBoxPrintButton(true);
      }
      setStatusMsg({ type: 'success', text: `Charola ${val} Procesada OK` });
      setContextInput('');
    } catch (err: any) { showAlert("Error", err.message, "error"); } finally { hideLoading(); }
  };

  const handleFinishAccessories = async () => {
      if (await showConfirm("Terminar Lote", "¿Marcar todo como completado?")) {
          showLoading();
          try {
              await db.generateBatchSerials({ orderNumber: activeOrder!.orderNumber, partNumberId: activeOrderPart!.id, currentOperationId: operation.id, operatorId: user.id, quantity: activeOrder!.quantity, autoComplete: true });
              if (operation.isFinal && activeOrderPart) {
                setLastRefForBox(activeOrder!.orderNumber);
                setShowBoxPrintButton(true);
              }
              showAlert("Éxito", "Lote completado.", "success");
              handleChangeContext();
          } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
      }
  };

  const handlePrintBoxLabel = async () => {
      if (!lastRefForBox || !activeOrderPart) return;
      showLoading("Imprimiendo Caja...");
      try {
          await db.printLabel(lastRefForBox, activeOrderPart.partNumber, { 
              sku: activeOrderPart.productCode, 
              targetLabelType: 'CARTON1',
              order: activeOrder?.orderNumber,
              operatorId: user.id
          });
          showAlert("Éxito", "Etiqueta de Caja Enviada.", "success");
          setShowBoxPrintButton(false);
      } catch (e: any) { showAlert("Error", e.message, "error"); } finally { hideLoading(); }
  };

  const handleChangeContext = () => {
    setActiveOrder(null); setActiveOrderPart(null); setAllOrderSerials([]); setStatusMsg(null); setSapOrderInput(''); setQtyInput(''); setModelInput(''); setSetupStep(1); setTrayGenerated(false); setShowBoxPrintButton(false);
  };

  const stationProcessedCount = useMemo(() => {
    return allOrderSerials.filter(s => s.history.some(h => h.operationId === operation.id)).length;
  }, [allOrderSerials, operation.id]);

  const isOrderComplete = activeOrder && stationProcessedCount >= activeOrder.quantity;
  const isLotBased = activeOrderPart?.serialGenType === SerialGenType.LOT_BASED;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 shrink-0">
        <div className="flex items-center">
            <div className={`p-2.5 rounded-2xl mr-4 ${operation.isInitial ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {operation.isFinal ? <Box size={28} /> : <Scan size={28} />}
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-tight">{operation.name}</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Estación de Trabajo MES</p>
            </div>
        </div>
        <button onClick={onBack} className="flex items-center px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
            <ArrowLeft size={14} className="mr-2" /> Salir Estación
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden pb-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 flex flex-col justify-center items-center border border-blue-50 relative overflow-hidden">
          <div className="w-full max-w-md z-10">
            
            {showBoxPrintButton ? (
                <div className="w-full animate-in zoom-in duration-300 text-center">
                    <div className="bg-purple-50 p-10 rounded-[2.5rem] border-4 border-purple-200 shadow-2xl">
                        <Printer size={80} className="mx-auto text-purple-500 mb-6 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Caja Completa</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Ref: {lastRefForBox}</p>
                        <button 
                            onClick={handlePrintBoxLabel}
                            className="w-full py-6 bg-purple-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
                        >
                            <Printer size={24} /> Imprimir Etiqueta de Caja
                        </button>
                        <button onClick={() => setShowBoxPrintButton(false)} className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Omitir Impresión</button>
                    </div>
                </div>
            ) : operation.isInitial && !activeOrder ? (
                <div className="w-full animate-in zoom-in duration-300">
                    <h3 className="text-xl font-black text-slate-700 mb-8 flex items-center justify-center uppercase tracking-tighter"><PlayCircle className="mr-2 text-blue-600"/> Setup Inicial de Orden</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">1. Orden SAP (10 dígitos)</label>
                            <input autoFocus={setupStep === 1} value={sapOrderInput} onChange={e => setSapOrderInput(e.target.value)} disabled={setupStep !== 1} className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 text-2xl font-mono font-black tracking-widest shadow-inner transition-all disabled:bg-slate-50 disabled:text-slate-400" placeholder="0000000000"/>
                        </div>
                        {setupStep >= 2 && (
                            <div className="animate-in slide-in-from-top-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">2. Cantidad del Lote</label>
                                <input ref={qtyRef} type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} disabled={setupStep !== 2} className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 text-2xl font-black shadow-inner transition-all" placeholder="Cant."/>
                            </div>
                        )}
                        {setupStep >= 3 && (
                            <div className="animate-in slide-in-from-top-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">3. Modelo / SKU</label>
                                <input ref={modelRef} value={modelInput} onChange={e => setModelInput(e.target.value)} className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 text-2xl font-black uppercase shadow-inner transition-all" placeholder="MODELO-XYZ" onKeyDown={e => e.key === 'Enter' && handleFinishSetup()}/>
                            </div>
                        )}
                    </div>
                </div>
            ) : !activeOrder ? (
                <div className="w-full animate-in zoom-in duration-300 text-center">
                     <Package size={64} className="text-blue-100 mx-auto mb-6"/>
                     <h3 className="text-2xl font-black text-slate-700 mb-2 uppercase tracking-tighter">Cargar Lote</h3>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">
                        {operation.isFinal ? "Escanee SAP o Serial (PCB)" : "Escanee SAP o Identificador"}
                     </p>
                     <form onSubmit={handleScanContext} className="relative">
                         <Scan className="absolute left-5 top-5 text-slate-300" size={32} />
                         <input autoFocus value={contextInput} onChange={e => setContextInput(e.target.value)} className="w-full pl-16 pr-6 py-6 text-2xl border-4 border-slate-100 rounded-3xl focus:border-blue-500 font-mono shadow-2xl outline-none transition-all uppercase" placeholder="SCAN..."/>
                     </form>
                </div>
            ) : (
                <div className="w-full animate-in zoom-in duration-300">
                    {isOrderComplete && activeOrderPart?.serialGenType !== SerialGenType.LOT_BASED && activeOrderPart?.serialGenType !== SerialGenType.ACCESSORIES ? (
                         <div className="bg-green-50 border-2 border-green-100 rounded-[2.5rem] p-10 text-center shadow-xl">
                             <CheckCircle className="mx-auto text-green-500 mb-6" size={80}/>
                             <h4 className="text-3xl font-black text-green-800 mb-4 uppercase tracking-tighter">Meta Alcanzada</h4>
                             <p className="text-sm text-slate-500 mb-10 font-bold uppercase tracking-widest">{stationProcessedCount} / {activeOrder.quantity} unidades</p>
                             <button onClick={handleChangeContext} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">
                                 Cerrar Lote
                             </button>
                         </div>
                    ) : (
                        <div className="space-y-8">
                             <div className="flex justify-between items-center px-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entrada de Unidades</span>
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">WO: {activeOrder.orderNumber}</span>
                             </div>

                             {activeOrderPart?.serialGenType === SerialGenType.LOT_BASED ? (
                                operation.isInitial ? (
                                    !trayGenerated ? (
                                        <form onSubmit={handleScanTrayInitial}>
                                            <div className="relative group">
                                                <Layers className="absolute left-5 top-5 text-slate-300 transition-colors" size={32}/>
                                                <input autoFocus value={trayInput} onChange={e => setTrayInput(e.target.value)} className="w-full pl-16 pr-6 py-6 text-2xl border-4 border-slate-100 rounded-3xl focus:border-blue-500 font-mono font-black tracking-widest shadow-2xl outline-none" placeholder="TRAY ID"/>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="bg-blue-600 p-8 rounded-[2rem] text-center text-white shadow-2xl animate-in zoom-in">
                                            <CheckCircle className="mx-auto mb-4" size={48}/>
                                            <p className="font-black uppercase tracking-widest mb-8">Charola Generada</p>
                                            <button onClick={() => { setTrayGenerated(false); setTrayInput(''); }} className="w-full py-4 bg-white text-blue-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">Siguiente Charola</button>
                                        </div>
                                    )
                                ) : (
                                    <form onSubmit={handleProcessTray} className="relative group">
                                        <Layers className="absolute left-5 top-5 text-slate-300" size={32}/>
                                        <input autoFocus value={contextInput} onChange={e => setContextInput(e.target.value)} className="w-full pl-16 pr-6 py-6 text-2xl border-4 border-slate-100 rounded-3xl focus:border-blue-500 font-mono font-black tracking-widest shadow-2xl outline-none uppercase" placeholder="TRAY SCAN"/>
                                    </form>
                                )
                             ) : activeOrderPart?.serialGenType === SerialGenType.ACCESSORIES ? (
                                <div className="text-center p-10 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200">
                                    <Package size={64} className="text-orange-400 mx-auto mb-6"/>
                                    <h4 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Proceso de Accesorios</h4>
                                    <button onClick={handleFinishAccessories} className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black shadow-xl hover:bg-orange-700 transition-all uppercase tracking-widest">
                                        Confirmar Lote Completo
                                    </button>
                                </div>
                             ) : (
                                <div className="relative group">
                                    <Scan className="absolute left-5 top-5 text-slate-300 transition-all" size={32} />
                                    <form onSubmit={handleSerialScan}>
                                        <input ref={inputRef} autoFocus value={serialInput} onChange={e => setSerialInput(e.target.value)} className="w-full pl-16 pr-6 py-6 text-3xl border-4 border-slate-100 rounded-3xl focus:border-blue-500 font-mono font-black shadow-2xl outline-none transition-all uppercase tracking-tight" placeholder="SERIAL UNITARIO"/>
                                    </form>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            )}
            
            {statusMsg && (
                <div className={`mt-10 w-full p-6 rounded-2xl flex items-center justify-center shadow-lg animate-in slide-in-from-bottom-4 ${statusMsg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  <span className="font-black uppercase tracking-widest text-xs text-center">{statusMsg.text}</span>
                </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-hidden">
             {activeOrder ? (
                 <>
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shrink-0">
                        <div className="flex justify-between items-start mb-6">
                            <div><p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-1">Orden SAP</p><p className="text-2xl font-mono font-black text-blue-400">{activeOrder.sapOrderNumber || 'INTERNA'}</p></div>
                            <div className="text-right"><p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-1">Progreso</p><p className="text-2xl font-black text-white">{stationProcessedCount} / {activeOrder.quantity}</p></div>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 mb-8 overflow-hidden shadow-inner border border-slate-700">
                            <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{width: `${Math.min((stationProcessedCount/activeOrder.quantity)*100, 100)}%`}}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-700/50 flex flex-col items-center">
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Modelo</span>
                                <span className="font-black text-xs text-slate-100 text-center">{activeOrderPart?.productCode}</span>
                            </div>
                            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-700/50 flex flex-col items-center">
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Caja Std.</span>
                                <span className="font-black text-xs text-blue-400">{activeOrderPart?.stdQty || 1} pzas</span>
                            </div>
                        </div>
                        <button onClick={handleChangeContext} className="mt-6 w-full text-[9px] font-black text-red-400 border-2 border-red-900/50 p-2.5 rounded-xl uppercase tracking-widest hover:bg-red-950 transition-all">Cambiar Lote</button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex justify-between items-center">
                            <span>Cola de Producción</span>
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{allOrderSerials.length} Totales</span>
                        </div>
                        <div className="overflow-y-auto p-6 space-y-3 flex-1 scrollbar-hide">
                            {allOrderSerials.slice(0, 50).reverse().map(s => {
                                const isDone = s.history.some(h => h.operationId === operation.id);
                                return (
                                    <div key={s.serialNumber} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${isDone ? 'bg-green-50 border-green-100 scale-[0.98]' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                        <div className="flex flex-col">
                                            <span className="font-mono font-black text-slate-700 text-sm tracking-tighter">{s.serialNumber}</span>
                                            {s.trayId && <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Tray: {s.trayId}</span>}
                                        </div>
                                        {isDone ? <CheckCircle size={18} className="text-green-500"/> : <Clock size={16} className="text-slate-300"/>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                 </>
             ) : (
                 <div className="bg-slate-50 border-4 border-dashed border-slate-200 p-20 rounded-[3rem] text-center text-slate-300 h-full flex flex-col items-center justify-center shadow-inner">
                     <Info size={80} className="mb-8 opacity-10"/>
                     <p className="font-black text-xs uppercase tracking-[0.3em] max-w-[250px] leading-relaxed">Active un lote para visualizar el progreso de línea.</p>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
}
