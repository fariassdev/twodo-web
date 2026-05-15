import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCart, 
  Utensils, 
  Home, 
  Car, 
  Activity, 
  Film, 
  Plane, 
  Repeat, 
  Gift, 
  Tag, 
  CheckCircle2, 
  Banknote 
} from 'lucide-react';
import type { ExpenseActivityFeedItem } from '../../../domain/expense';
import { centsToCurrency, toRelativeExpenseDate } from '../../../helpers/expense';
import IconBox from '../../ui/IconBox';
import ListRow from '../../ui/ListRow';
import { cn } from '@/src/utils';

type ExpenseListItemProps = {
  item: ExpenseActivityFeedItem;
  currentProfileId: string | null;
  onClick?: () => void | Promise<void>;
};

const CATEGORY_CONFIG: Record<string, { icon: any; bg: string; text: string }> = {
  shopping_cart: { icon: ShoppingCart, bg: 'bg-[#fb923c]/15', text: 'text-[#fb923c]' },
  restaurant: { icon: Utensils, bg: 'bg-[#60a5fa]/15', text: 'text-[#60a5fa]' },
  home: { icon: Home, bg: 'bg-[#a78bfa]/15', text: 'text-[#a78bfa]' },
  directions_car: { icon: Car, bg: 'bg-[#facc15]/15', text: 'text-[#facc15]' },
  local_hospital: { icon: Activity, bg: 'bg-[#4ade80]/15', text: 'text-[#4ade80]' },
  movie: { icon: Film, bg: 'bg-[#f472b6]/15', text: 'text-[#f472b6]' },
  flight: { icon: Plane, bg: 'bg-[#22d3ee]/15', text: 'text-[#22d3ee]' },
  subscriptions: { icon: Repeat, bg: 'bg-[#f87171]/15', text: 'text-[#f87171]' },
  redeem: { icon: Gift, bg: 'bg-[#fbbf24]/15', text: 'text-[#fbbf24]' },
  category: { icon: Tag, bg: 'bg-[#94a3b8]/15', text: 'text-[#94a3b8]' },
  payments: { icon: Banknote, bg: 'bg-primary/15', text: 'text-primary' },
  verified: { icon: CheckCircle2, bg: 'bg-success/10', text: 'text-success' },
};

export default function ExpenseListItem({
  item,
  currentProfileId,
  onClick,
}: ExpenseListItemProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isSettlement = item.type === 'settlement';

  const baseData = isSettlement ? item.settlement : item.expense;

  const iconKey = isSettlement ? 'verified' : (item.expense.category?.icon ?? 'shopping_cart');
  const { icon: IconComponent, bg: iconBg, text: iconText } = 
    CATEGORY_CONFIG[iconKey] || CATEGORY_CONFIG.category;

  const title = isSettlement 
    ? t('expenses.settleUp')
    : item.expense.description?.trim() || 
      (language.startsWith('es') ? item.expense.category?.name_es : item.expense.category?.name_en) || 
      t('expenses.categoryFallback');

  const whenLabel = toRelativeExpenseDate(baseData.expense_date, language);

  const amountLabel = centsToCurrency(baseData.amount_cents, language);
  const isDebtor = !isSettlement && item.expense.paid_by_profile_id !== currentProfileId;
  const statusColor = isDebtor ? 'text-danger' : 'text-success';
  
  const statusLabel = isSettlement 
    ? t('expenses.settlement.feedStatus')
    : t(isDebtor ? 'expenses.impact.youOwe' : 'expenses.impact.theyOwe', { 
        amount: centsToCurrency(Math.round(item.expense.amount_cents / 2), language) 
      });

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <ListRow
      as="article"
      className={cn(
        "group p-3 gap-3",
        isSettlement && "border-success/20 bg-success/[0.03]"
      )}
      interactive={!!onClick}
      variant="subtle"
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <IconBox className={cn(iconBg, iconText, "rounded-xl")} size="sm" tone="custom">
        <IconComponent size={20} />
      </IconBox>

      <div className="flex-1 min-w-0">
        <h3 className="truncate text-base font-bold tracking-tight text-surface-2">
          {title}
        </h3>
        <p className="text-sm font-medium text-surface-2/60">
          {whenLabel}
        </p>
      </div>

      <div className="text-right flex flex-col items-end">
        <p className="text-lg font-bold tracking-tight text-surface-2 flex items-baseline gap-1">
          <span>{amountLabel.replace(/[^\d.,]/g, '')}</span>
          <span className="text-sm font-medium text-surface-2/30">€</span>
        </p>
        <p className={cn("text-[9px] font-bold uppercase tracking-[0.05em]", statusColor)}>
          {statusLabel}
        </p>
      </div>
    </ListRow>
  );
}
