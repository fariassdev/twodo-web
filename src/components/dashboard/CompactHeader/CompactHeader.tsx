import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import Button from '../../ui/Button';
import { useProfilesQuery } from '../../../lib/queryHooks';

export default function CompactHeader() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { data: profiles = [] } = useProfilesQuery();

  const today = new Date();
  const dateStr = today.toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const formattedDate = dateStr.toUpperCase();

  return (
    <div className="flex items-center justify-between pb-4 pt-2 border-b border-[#232b27]">
      <div className="flex flex-col">
        <h1 className="text-xs font-bold text-emerald-400 tracking-wider mb-0.5">{formattedDate}</h1>
        <h2 className="text-2xl font-bold text-white">Bubis</h2>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex -space-x-2 cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate({ to: '/profile' })}
        >
          {profiles.slice(0, 2).map((p, i) => (
            <div
              key={p.id}
              className={`w-9 h-9 rounded-full border-2 border-[#131815] flex items-center justify-center overflow-hidden bg-emerald-500/20 ${
                i === 0 ? 'z-10' : 'z-0'
              }`}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-emerald-400">
                  {p.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          ))}
        </div>

        <Button
          aria-label={t('expenses.openSearch')}
          className="text-gray-300 hover:text-white"
          onClick={() => navigate({ to: '/expenses/list' })}
          size="icon"
          variant="icon"
        >
          <Search className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
