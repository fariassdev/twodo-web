import React from 'react';

export default function ShoppingList() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="p-6 pt-12 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <span className="material-symbols-outlined text-primary">favorite</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Shopping List</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <div className="mt-8 mb-10">
          <label className="block text-sm font-medium text-primary mb-3" htmlFor="new-item">Add to list</label>
          <div className="relative">
            <input className="w-full bg-primary/5 border-none rounded-xl h-16 px-6 text-xl placeholder:text-slate-600 focus:ring-2 focus:ring-primary focus:bg-primary/10 transition-all font-display" id="new-item" placeholder="¿Qué falta?" type="text"/>
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <button className="bg-primary text-background-dark p-3 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined font-bold">add</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-24">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">To Buy</h2>
          
          <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-primary/10 shadow-sm transition-active active:scale-[0.98]">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <input className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none" type="checkbox"/>
              </div>
              <span className="text-lg font-medium">Leche de avena</span>
              <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-1 px-2 mx-2">
                <button className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">remove</span>
                </button>
                <span className="text-sm font-bold w-4 text-center">1</span>
                <button className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </div>
            </div>
            <button className="text-slate-400 hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-primary/10 shadow-sm transition-active active:scale-[0.98]">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <input className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none" type="checkbox"/>
              </div>
              <span className="text-lg font-medium">Pan integral</span>
              <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-1 px-2 mx-2">
                <button className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">remove</span>
                </button>
                <span className="text-sm font-bold w-4 text-center">1</span>
                <button className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </div>
            </div>
            <button className="text-slate-400 hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-primary/10 shadow-sm transition-active active:scale-[0.98]">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <input className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none" type="checkbox"/>
              </div>
              <span className="text-lg font-medium">Aguacates</span>
              <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-1 px-2 mx-2">
                <button className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">remove</span>
                </button>
                <span className="text-sm font-bold w-4 text-center">1</span>
                <button className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </div>
            </div>
            <button className="text-slate-400 hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4 opacity-30 p-4 rounded-xl border border-dashed border-primary/20">
            <div className="h-8 w-8 rounded-lg border-2 border-primary/20"></div>
            <div className="h-4 w-32 bg-slate-700 rounded"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
