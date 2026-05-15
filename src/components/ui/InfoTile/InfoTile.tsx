import React from 'react';

interface InfoTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass?: string;
}

export default function InfoTile({ 
  icon: Icon, 
  label, 
  value, 
  colorClass = "text-primary" 
}: InfoTileProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-2xl bg-surface-1/50 border border-border-subtle">
      <div className="flex items-center gap-1.5 opacity-40">
        <Icon size={14} className={colorClass} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-bold text-surface-2 truncate">{value}</span>
    </div>
  );
}
