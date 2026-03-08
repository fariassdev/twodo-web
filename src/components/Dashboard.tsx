import React from 'react';

export default function Dashboard({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">grid_view</span>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary">
              <img alt="Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzYn9U1SkV6vaNTTMqDRHEPXwjoYhfu5IRtpwUQf99KhUleg55dJ4oio_qWVWDGxBqxBRxREm1ZcBlbNyx4v4xqDDr9xvRMCizBJHI36cAARAnkRsAicA0oDZ6UQZtxbrH-TWjlCCYcEjAbM5rHItsLtdsrN1xUP1Bgi0Ao1gPOQ7gkHtDMLeSIHDGQ53d9Oo2JG4_n-hpHcbnwQsctruL-1z0G39mJgjrBEuXu7amTofTRddeojEl1cE3HpcyD_i0vFxrR4eaY5c1"/>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        <div className="relative mb-8">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input className="w-full pl-10 pr-4 py-3 bg-primary/5 border border-primary/20 rounded-xl focus:ring-primary focus:border-primary text-slate-100 placeholder:text-slate-500" placeholder="Buscar misiones o planes..." type="text"/>
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-bold tracking-tight">Misiones de hoy</h2>
            <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">3 Pendientes</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm cursor-pointer" onClick={() => onNavigate('details')}>
              <div className="flex-shrink-0">
                <input className="h-6 w-6 rounded-lg border-2 border-primary/30 bg-transparent text-primary focus:ring-primary" type="checkbox" onClick={(e) => e.stopPropagation()} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base leading-tight">Hacer la compra</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-500 font-bold rounded uppercase">Crítico</span>
                </div>
                <p className="text-slate-400 text-sm">Supermercado Mercadona</p>
              </div>
              <div className="flex-shrink-0 text-primary">
                <span className="material-symbols-outlined">shopping_cart</span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm cursor-pointer" onClick={() => onNavigate('details')}>
              <div className="flex-shrink-0">
                <input className="h-6 w-6 rounded-lg border-2 border-primary/30 bg-transparent text-primary focus:ring-primary" type="checkbox" onClick={(e) => e.stopPropagation()} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base leading-tight">Limpiar la cocina</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary font-bold rounded uppercase">Flexible</span>
                </div>
                <p className="text-slate-400 text-sm">Turno de tarde</p>
              </div>
              <div className="flex-shrink-0 text-primary">
                <span className="material-symbols-outlined">cleaning_services</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-yellow-500/10 p-5 rounded-2xl border border-yellow-500/20 shadow-sm relative overflow-hidden">
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-6xl text-yellow-500/10 rotate-12">favorite</span>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-yellow-400 filled-icon">favorite</span>
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-sm font-bold text-yellow-200 uppercase tracking-wider mb-1">Nota de amor</h2>
                <p className="text-slate-300 italic font-medium leading-relaxed">
                  "¡Que tengas un día increíble hoy! No olvides que eres lo mejor de mi día. Te quiero ❤️"
                </p>
                <div className="mt-3 flex justify-end">
                  <button className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    <span>Responder</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-100">Planes conjuntos</h2>
            <button className="text-primary font-bold text-sm" onClick={() => onNavigate('calendar')}>Ver calendario</button>
          </div>
          <div className="space-y-4">
            <div className="bg-primary/5 rounded-2xl border border-primary/10 shadow-md p-4 flex gap-4 cursor-pointer" onClick={() => onNavigate('details')}>
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary border border-primary/20">
                <span className="text-xs font-bold uppercase">Jul</span>
                <span className="text-2xl font-black">01</span>
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary uppercase mb-0.5 tracking-wider">Próximo Sábado</span>
                    <h3 className="text-base font-bold">Barbacoa en Cáceres</h3>
                  </div>
                  <span className="material-symbols-outlined text-primary text-sm">celebration</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">Dehesa extremeña, Cáceres</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                  <span className="text-xs font-medium text-slate-400">14:00h - 22:00h</span>
                </div>
              </div>
              <div className="flex-shrink-0 self-center">
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl border border-primary/10 shadow-md p-4 flex gap-4 cursor-pointer" onClick={() => onNavigate('details')}>
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary border border-primary/20">
                <span className="text-xs font-bold uppercase">Jun</span>
                <span className="text-2xl font-black">24</span>
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold">Boda de Ainhoa</h3>
                  <span className="material-symbols-outlined text-red-500 filled-icon text-sm">favorite</span>
                </div>
                <p className="text-slate-400 text-sm mb-3">Celebración y banquete familiar</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                  <span className="text-xs font-medium text-slate-400">Palacio de Oquendo</span>
                </div>
              </div>
              <div className="flex-shrink-0 self-center">
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
