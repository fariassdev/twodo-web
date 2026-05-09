import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'group max-w-md bg-toast-bg border border-toast-border p-4 rounded-2xl shadow-toast flex items-center gap-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-5',
          title: 'text-[14px] font-bold text-toast-text flex-1 tracking-tight',
          description: 'text-xs text-toast-text/60 font-medium',
          actionButton: 'bg-primary text-white px-4 py-2 rounded-xl text-[12px] font-bold hover:brightness-110 active:scale-95 transition-all whitespace-nowrap shrink-0',
          cancelButton: 'bg-white/5 text-white/60 px-4 py-2 rounded-xl text-[12px] font-bold hover:bg-white/10 hover:text-white transition-all whitespace-nowrap shrink-0',
          success: 'border-success/30 bg-success/10',
          error: 'border-danger/30 bg-danger/10',
          info: 'border-primary/30 bg-primary/10',
        },
      }}
      icons={{
        success: <span className="material-symbols-outlined text-success text-xl">check_circle</span>,
        error: <span className="material-symbols-outlined text-danger text-xl">error</span>,
        info: <span className="material-symbols-outlined text-primary text-xl">info</span>,
      }}
      offset={{ bottom: 80 }}
      mobileOffset={{ bottom: 80 }}
      className="z-[100]"
    />
  );
}
