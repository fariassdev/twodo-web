/** Keywords which trigger a specific icon when they appear in the task text. */
const TASK_ICONS: Record<string, string> = {
  // shopping / groceries
  compra: 'shopping_cart',
  mercado: 'shopping_cart',
  supermarket: 'shopping_cart',
  grocer: 'shopping_cart',
  shop: 'shopping_cart',

  // cleaning
  limpi: 'cleaning_services',
  clean: 'cleaning_services',
  mop: 'cleaning_services',
  barre: 'cleaning_services',
  fregar: 'cleaning_services',
  broom: 'cleaning_services',
  vacuum: 'cleaning_services',
  aspirar: 'cleaning_services',
  dust: 'cleaning_services',
  polvo: 'cleaning_services',

  // cooking / kitchen
  cocina: 'restaurant',
  cook: 'restaurant',
  kitchen: 'restaurant',
  meal: 'restaurant',
  comida: 'restaurant',
  desayuno: 'restaurant',
  almuerzo: 'restaurant',
  cena: 'restaurant',
  eat: 'restaurant',

  // garbage / trash
  basura: 'delete',
  trash: 'delete',
  garbage: 'delete',
  reciclaje: 'delete',
  recycle: 'delete',
  "throw away": 'delete',

  // ironing
  planch: 'iron',
  iron: 'iron',

  // pets
  pet: 'pets',
  mascota: 'pets',
  dog: 'pets',
  perro: 'pets',
  gato: 'pets',
  cat: 'pets',

  // washing / laundry
  lavar: 'water_drop',
  wash: 'water_drop',
  laundry: 'water_drop',
  colada: 'water_drop',

  // relationship / couple life
  bill: 'paid',
  pago: 'paid',
  date: 'calendar_today',
  aniversario: 'celebration',
  call: 'phone',
  schedule: 'calendar_today',
};

/**
 * Returns a material-symbols icon name for the given task description.
 *
 * The logic is intentionally simple: build a lowercase haystack out of the
 * title and return the first matching icon keyword.
 * Falls back to `task_alt` when nothing matches.
 */
export function getTaskIcon(title: string, location?: string): string {
  const haystack = `${title} ${location ?? ''}`.toLowerCase();
  for (const [keyword, icon] of Object.entries(TASK_ICONS)) {
    if (haystack.includes(keyword)) {
      return icon;
    }
  }
  return 'task_alt';
}
