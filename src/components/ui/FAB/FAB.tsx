import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

export default function FAB() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate({ to: '/create' })}
      className="fixed bottom-24 right-5 bg-primary text-background-dark p-4 rounded-full shadow-glow-primary hover:scale-105 transition-transform active:scale-95 z-50 focus:outline-none"
      aria-label="Create Entry"
    >
      <Plus className="w-8 h-8 stroke-[2.5]" />
    </button>
  );
}
