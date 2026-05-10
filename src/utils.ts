import { format } from 'date-fns';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function getLocalDateString(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}