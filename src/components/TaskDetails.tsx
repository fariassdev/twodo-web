import React from 'react';

export default function TaskDetails({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col min-h-screen pb-32">
      <header className="flex items-center px-4 py-4 justify-between sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 max-w-md mx-auto w-full">
        <button onClick={() => onNavigate('dashboard')} className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
          <span className="material-symbols-outlined text-slate-100">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">Detalle de Tarea</h2>
        <button className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
          <span className="material-symbols-outlined text-slate-100">more_vert</span>
        </button>
      </header>

      <main className="flex-1 px-4 max-w-md mx-auto w-full">
        <div className="pt-4 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pendiente</span>
            <span className="text-slate-400 text-xs font-medium">Asignada a: Tú</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">Limpiar la cocina</h1>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="material-symbols-outlined text-rose-500 text-lg">priority_high</span>
              <span className="text-sm font-medium">Crítica</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="material-symbols-outlined text-primary text-lg">repeat</span>
              <span className="text-sm font-medium">Diario</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="material-symbols-outlined text-primary text-lg">groups</span>
              <span className="text-sm font-medium">Trabajo en Equipo</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6 mb-2">
            <button className="w-full bg-primary text-background-dark h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined font-bold">check_circle</span>
              Marcar como completada
            </button>
            <div className="flex gap-3">
              <button className="flex-1 bg-slate-800/50 text-slate-300 h-12 rounded-xl font-bold border border-slate-700 active:scale-[0.98] transition-transform flex items-center justify-center">
                Posponer
              </button>
              <button onClick={() => onNavigate('create')} className="flex-1 bg-slate-800/50 text-slate-300 h-12 rounded-xl font-bold border border-slate-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">edit</span>
                <span>Editar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary filled-icon">favorite</span>
            <h3 className="text-lg font-bold">Nota de amor</h3>
          </div>
          <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700 italic text-slate-300 leading-relaxed relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-8xl">format_quote</span>
            </div>
            "¡Gracias por encargarte hoy, amor! Te prepararé tu té favorito después para que descanses. ¡Eres el mejor equipo! ❤️"
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Detalles de asignación</h3>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700 divide-y divide-slate-700">
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">Tipo de rotación</span>
              <span className="font-medium">Semanal estricta</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">Última vez hecha por</span>
              <span className="font-medium">Sofía</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-slate-400">Recompensa actual</span>
              <span className="font-medium text-primary">+15 Puntos</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
