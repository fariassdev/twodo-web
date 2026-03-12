import { describe, expect, it } from 'vitest';
import { getTaskIcon } from './taskIcons';

describe('getTaskIcon', () => {
  it('returns task_alt when no keywords match', () => {
    expect(getTaskIcon('Study math')).toBe('task_alt');
    expect(getTaskIcon('Read a book', 'balcony')).toBe('task_alt');
  });

  it('matches keywords case-insensitively in the title', () => {
    expect(getTaskIcon('Pasear perro')).toBe('pets');
    expect(getTaskIcon('PASEAR PERRO')).toBe('pets');
    expect(getTaskIcon('comprar mercadona')).toBe('shopping_cart');
    expect(getTaskIcon('clean the kitchen')).toBe('cleaning_services');
    expect(getTaskIcon('planchar camisa')).toBe('iron');
  });

  it('returns the first matching icon when multiple keywords appear', () => {
    // our TASK_ICONS definition uses object iteration order; the helper stops
    // at first match.
    const result = getTaskIcon('perro y mercadona');
    expect(result).toBe('shopping_cart');
  });

  it('recognizes couple-related keywords', () => {
    expect(getTaskIcon('pay bills')).toBe('paid');
    expect(getTaskIcon('aniversario')).toBe('celebration');
    expect(getTaskIcon('schedule dentist')).toBe('calendar_today');
    expect(getTaskIcon('call mom')).toBe('phone');
  });
});
