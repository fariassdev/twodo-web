import React from 'react';

export default function Calendar({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="pb-24 flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md">
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">Our Calendar</h1>
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <div className="px-4 mb-4 max-w-md mx-auto w-full">
        <div className="flex p-1 bg-slate-800/50 rounded-lg">
          <button className="flex-1 py-2 text-sm font-bold rounded-md bg-primary text-background-dark shadow-sm">Monthly</button>
          <button className="flex-1 py-2 text-sm font-bold text-slate-400">Weekly</button>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-2 max-w-md mx-auto w-full">
        <button className="p-2 rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-base font-bold">October 2023</h2>
        <button className="p-2 rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="px-4 mb-6 max-w-md mx-auto w-full">
        <div className="grid grid-cols-7 mb-2">
          {['S','M','T','W','T','F','S'].map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          <div className="h-12 flex items-center justify-center text-slate-700">27</div>
          <div className="h-12 flex items-center justify-center text-slate-700">28</div>
          <div className="h-12 flex items-center justify-center text-slate-700">29</div>
          <div className="h-12 flex items-center justify-center text-slate-700">30</div>
          
          <button className="relative h-12 flex flex-col items-center justify-center rounded-xl hover:bg-slate-800">
            <span className="text-sm font-medium">1</span>
            <div className="absolute bottom-2 size-1 bg-slate-400 rounded-full"></div>
          </button>
          <button className="relative h-12 flex flex-col items-center justify-center rounded-xl hover:bg-slate-800">
            <span className="text-sm font-medium">2</span>
          </button>
          <button className="relative h-12 flex flex-col items-center justify-center rounded-xl hover:bg-slate-800">
            <span className="text-sm font-medium">3</span>
            <div className="absolute bottom-2 flex gap-0.5">
              <div className="size-1 bg-primary rounded-full"></div>
              <div className="size-1 bg-blue-400 rounded-full"></div>
            </div>
          </button>
          <button className="relative h-12 flex flex-col items-center justify-center rounded-xl hover:bg-slate-800">
            <span className="text-sm font-medium">4</span>
          </button>
          <button className="relative h-12 flex flex-col items-center justify-center rounded-xl bg-primary text-background-dark font-bold shadow-lg shadow-primary/20">
            <span className="text-sm">5</span>
            <div className="absolute bottom-2 size-1 bg-background-dark rounded-full"></div>
          </button>
          
          {[6,7,8].map(d => (
            <button key={d} className="h-12 flex items-center justify-center rounded-xl hover:bg-slate-800">{d}</button>
          ))}
          
          <button className="relative h-12 flex flex-col items-center justify-center rounded-xl hover:bg-slate-800">
            <span className="text-sm font-medium">9</span>
            <div className="absolute bottom-2 size-1 bg-primary rounded-full"></div>
          </button>
          
          {Array.from({length: 22}, (_, i) => i + 10).map(d => (
            <button key={d} className="h-12 flex items-center justify-center rounded-xl hover:bg-slate-800">{d}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-slate-900/40 rounded-t-xl p-4 shadow-2xl border-t border-slate-800 overflow-y-auto max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">Events 5 Oct 2023</h3>
          <button onClick={() => onNavigate('create')} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">+ Add Event</button>
        </div>
        <div className="space-y-3">
          <div onClick={() => onNavigate('details')} className="flex gap-4 p-4 bg-slate-800/60 rounded-xl border border-transparent hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex flex-col items-center justify-center bg-primary/20 text-primary rounded-lg px-3 py-1 h-fit">
              <span className="text-xs font-bold">OCT</span>
              <span className="text-lg font-bold">05</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">Dinner at Le Petit</h4>
              <p className="text-xs text-slate-400 mt-1">
                <span className="material-symbols-outlined text-[12px] align-middle">schedule</span> 19:30 • <span className="text-primary font-medium">Table for 2</span>
              </p>
            </div>
            <div className="flex -space-x-2 items-center">
              <div className="size-6 rounded-full border-2 border-background-dark overflow-hidden bg-slate-300">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyr0nRCLq3UAyXUI_b1NDmyRX6wK0qEmv6EPIO2oD8dTspS-X9RV41khHSQgpSzh9i9Qc-mln24qWuQRw8GFoGKdhTUWQw6e3rysO5NpX94uhYgtNzcPrtbdDsPLzF-DsURg82_3Vhd-zTOZSq1HW8fDAxA8QBl6LoBv47sVXccLvjX-AXBQ6UOwtwunQobl9Crf8i_QK5hhczU2YyR5R8tluidwgmgiyaIcQyYP8BXjvGYDiGitcFrtjFD9ZymwKhDQw7U-rYOu_Q" alt="Avatar" />
              </div>
              <div className="size-6 rounded-full border-2 border-background-dark overflow-hidden bg-slate-300">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDB7RrjNMeWm4NyD8p7LGiQFBC4N6ab4QxjcaT3V8U4nwh3se3rhRfUpg_PYrMKqlr4zaXRErK5-k4w-2MA9vNnkkzbTpx3L6ry_hbVQpE3OB1g2HAQUJwJ5xfeR2QYCczsAxxJ2RT-qSerMpMVVayqvqAcXeLaBc4n63IbJdNnxSKqK12OX3xF2QUhGz5tfejSgI9sBJlJrKUkxrk8HzSZzXT3vQ2W4QWkV0Bav8mQDLTn0ehmCIiP3kuvbVDNvLfHzyOkbMmKQYH5" alt="Avatar" />
              </div>
            </div>
          </div>

          <div onClick={() => onNavigate('details')} className="flex gap-4 p-4 bg-slate-800/60 rounded-xl border border-transparent cursor-pointer">
            <div className="flex flex-col items-center justify-center bg-blue-400/20 text-blue-400 rounded-lg px-3 py-1 h-fit">
              <span className="text-xs font-bold">OCT</span>
              <span className="text-lg font-bold">09</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">Weekly Grocery Run</h4>
              <p className="text-xs text-slate-400 mt-1">
                <span className="material-symbols-outlined text-[12px] align-middle">shopping_cart</span> Farmers Market
              </p>
            </div>
            <div className="flex items-center">
              <div className="size-6 rounded-full border-2 border-background-dark overflow-hidden bg-slate-300">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLHQ6aBLncHKo1KQfh1UetKwUEb-v-N3zRBDj20PuPSZoJ49F46r_OEIjazMeg_7boNYRtO4jHoKFcIW4HuKLu5YTyMdTawRFbyScATHi8hkxXMZhMJw0wsh0aXd8V9ZxwpDFBITWwlAmE2P0Kr6PgZ2DX4rJLpbTbXW0JAaEyujMP5JJbMJTlqO5upkQMfNOzFqK1yKXlEALM6-93tbDGz3taXazjMUIK-R2Pbcim4AI-e-W7x7qpJuvQbAV8PwSaWnwojipDWY9M" alt="Avatar" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
