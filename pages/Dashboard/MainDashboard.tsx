
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/storage';
import { SerialUnit, Operation, ProcessRoute, PartNumber } from '../../types';
import { BarChart3, TrendingUp, CheckCircle, AlertOctagon, RefreshCw, Clock, Timer, Layers, Activity, Calendar } from 'lucide-react';

export default function MainDashboard() {
  const [loading, setLoading] = useState(true);
  const [serials, setSerials] = useState<SerialUnit[]>([]);
  const [ops, setOps] = useState<Operation[]>([]);
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [parts, setParts] = useState<PartNumber[]>([]);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [dateStart, setDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sData, oData, rData, pData] = await Promise.all([db.getSerials(), db.getOperations(), db.getRoutes(), db.getParts()]);
      setSerials(sData); setOps(oData); setRoutes(rData); setParts(pData); setLastRefreshed(new Date());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadDashboardData(); const i = setInterval(loadDashboardData, 60000); return () => clearInterval(i); }, []);

  const stats = useMemo(() => {
      const start = new Date(dateStart); start.setHours(0,0,0,0);
      const end = new Date(dateStart); end.setHours(23,59,59,999);
      let produced = 0, wip = 0, totalTimeMs = 0, completedUnits = 0;
      const hourly = new Map(); for(let i=6; i<=22; i++) hourly.set(`${i}:00`, 0);

      const relevantSerials = selectedRouteId ? serials.filter(s => parts.find(p => p.id === s.partNumberId)?.processRouteId === selectedRouteId) : serials;

      relevantSerials.forEach(s => {
          const matchingLogs = s.history.filter(h => {
              const d = new Date(h.timestamp);
              const opMatch = selectedOpId ? h.operationId === selectedOpId : true;
              return d >= start && d <= end && opMatch;
          });

          if (matchingLogs.length > 0) {
              produced++;
              const last = matchingLogs[matchingLogs.length - 1];
              const h = new Date(last.timestamp).getHours();
              if(h >= 6 && h <= 22) hourly.set(`${h}:00`, (hourly.get(`${h}:00`) || 0) + 1);

              if (s.isComplete && s.history.length > 1) {
                  const sorted = [...s.history].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  const diff = new Date(sorted[sorted.length-1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime();
                  if(diff > 0 && diff < 86400000) { totalTimeMs += diff; completedUnits++; }
              }
          }
          if (!s.isComplete) wip++;
      });

      return {
          produced, wip, 
          avgCycle: completedUnits > 0 ? Math.round((totalTimeMs / completedUnits) / 60000) : 0,
          hourlyData: Array.from(hourly.entries()).map(([hour, count]) => ({ hour, count, sortVal: parseInt(hour) })).sort((a,b) => a.sortVal - b.sortVal)
      };
  }, [serials, selectedRouteId, selectedOpId, dateStart, parts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-2">
        <div><h1 className="text-3xl font-bold text-slate-900">Métricas de Producción</h1><p className="text-slate-500 text-sm flex items-center mt-1"><Clock size={14} className="mr-1"/> Actualización: {lastRefreshed.toLocaleTimeString()}</p></div>
        <button onClick={loadDashboardData} className="bg-white border p-2 rounded-lg shadow-sm hover:bg-slate-50"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/></button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold text-slate-500 mb-1 block">Ruta / Proceso</label><select className="w-full p-2 border rounded-lg text-sm" value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}><option value="">-- Todas las Rutas --</option>{routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div className="w-[160px]"><label className="text-xs font-bold text-slate-500 mb-1 block">Fecha</label><input type="date" className="w-full p-2 border rounded-lg text-sm" value={dateStart} onChange={e => setDateStart(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">SALIDA (OUTPUT)</p><h2 className="text-4xl font-black text-slate-800 mt-2">{stats.produced}</h2></div><div className="bg-blue-50 p-4 rounded-full text-blue-600"><BarChart3 size={28} /></div></div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">TIEMPO CICLO</p><h2 className="text-4xl font-black text-slate-800 mt-2">{stats.avgCycle} <span className="text-lg font-normal text-slate-400">min</span></h2></div><div className="bg-purple-50 p-4 rounded-full text-purple-600"><Timer size={28} /></div></div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">WIP ACTIVO</p><h2 className="text-4xl font-black text-slate-800 mt-2">{stats.wip}</h2></div><div className="bg-orange-50 p-4 rounded-full text-orange-600"><AlertOctagon size={28} /></div></div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">FPY</p><h2 className="text-4xl font-black text-slate-800 mt-2">99.8%</h2></div><div className="bg-green-50 p-4 rounded-full text-green-600"><CheckCircle size={28} /></div></div>
      </div>

      <div className="bg-white p-8 rounded-2xl border shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><Activity className="mr-2 text-blue-600"/> Producción Hora por Hora</h3>
        <div className="h-72 w-full flex items-end justify-between space-x-2 border-b pb-2">
            {stats.hourlyData.map((item, idx) => {
                const max = Math.max(...stats.hourlyData.map(d => d.count), 5);
                const height = (item.count / (max * 1.1)) * 100;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                         <div className={`text-xs font-bold mb-1 ${item.count > 0 ? 'text-slate-700' : 'opacity-0'}`}>{item.count}</div>
                         <div className={`w-full rounded-t-sm transition-all duration-700 ${item.count > 0 ? 'bg-blue-600' : 'bg-slate-100 h-1'}`} style={{ height: item.count > 0 ? `${height}%` : '4px' }}></div>
                         <div className="text-[9px] text-slate-400 mt-2 font-mono">{item.hour}</div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}
