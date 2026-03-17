# PRD: Control de Gastos de Pareja

**Feature:** Expense Tracking
**Versión:** 1.0 (MVP)
**Estado:** En definición
**Última actualización:** Marzo 2026

***

## 1. Visión y Objetivo

### 1.1 Problema que resuelve

Las parejas que no comparten cuenta bancaria necesitan un mecanismo para registrar quién ha pagado qué, calcular automáticamente el balance de deuda entre ambos, y liquidar esa deuda de forma clara y sin fricción emocional.

El dolor principal **no** es la contabilidad — es la conversación incómoda de "creo que me debes dinero pero no estoy seguro de cuánto". Esta feature elimina esa conversación.

### 1.2 Objetivo de la feature

> Que cualquier miembro de la pareja sepa en todo momento, con un vistazo, cuánto le debe al otro — y pueda saldar esa deuda con un solo gesto.

### 1.3 Métricas de éxito (indicadores, no targets)

| Métrica | Descripción | Por qué importa |
|---|---|---|
| **Gastos/semana por pareja** | Frecuencia de registro | Indica si la feature se usa de forma habitual |
| **Tiempo hasta primer gasto** | Desde onboarding hasta primer registro | Indica si el flujo de creación es fluido |
| **Tasa de liquidación** | % de balances que llegan a settlement | Indica si el ciclo se completa |
| **Ratio gastos propios vs del otro** | Quién registra qué | Detecta si una persona carga con el tracking |

***

## 2. Scope del MVP

### ✅ Dentro del MVP

- Registro de gastos: importe, descripción, quién pagó, categoría, fecha
- Split automático 50/50 por defecto
- Cualquier miembro puede registrar gastos propios o del otro
- Balance neto en tiempo real (quién debe cuánto)
- Liquidación total (settle up) con registro histórico
- Historial de gastos con filtros básicos
- Categorías predefinidas

### ❌ Fuera del MVP (V2+)

- Gastos recurrentes / suscripciones automáticas
- Split personalizado por porcentaje o importe exacto
- Liquidación parcial
- Adjuntar fotos de tickets
- Exportar a CSV/PDF
- Notificaciones push
- Integración con bancos
- Presupuestos por categoría

***

## 3. Decisiones de Diseño

Estas decisiones son **cerradas** para el MVP. Se documentan aquí para que no se reabran sin justificación:

| Decisión | Elección | Justificación |
|---|---|---|
| **Split por defecto** | 50/50 | Cubre el 95% de casos, máxima simplicidad |
| **¿Quién registra?** | Cualquier miembro, sobre cualquier pagador | Reduce fricción; si tu pareja olvidó añadirlo, lo añades tú |
| **Liquidación** | Total siempre, resetea balance a 0 | Evita complejidad cognitiva de pagos parciales |
| **Recurrentes** | Manual en MVP | Scope acotado; duplicar gasto es workaround aceptable |
| **Moneda** | Una sola divisa por pareja | MVP. Multi-divisa es V2 |

***

## 4. Entidades y Lógica de Negocio

### 4.1 Entidades

```
Expense
  - id
  - couple_id
  - paid_by_user_id       → quién pagó físicamente
  - amount                → importe total (lo que se pagó)
  - description
  - category_id
  - date
  - created_by_user_id    → quién lo registró (puede ser distinto al pagador)
  - created_at

Category
  - id
  - name_es / name_en
  - icon
  - is_default            → categorías del sistema vs custom (V2)

Settlement
  - id
  - couple_id
  - paid_by_user_id       → quién hizo la transferencia
  - paid_to_user_id       → quién la recibió
  - amount                → importe en el momento del settlement
  - settled_at
  - note                  → opcional ("Transferencia marzo")
```

### 4.2 Lógica del balance neto

El balance se calcula **on-the-fly** con todos los gastos posteriores al último settlement (o desde el inicio si no hay ninguno).

```
Para cada expense:
  - La mitad (amount / 2) la "debe" quien NO pagó al que SÍ pagó

balance_neto = Σ (amount / 2) de gastos donde paid_by = Usuario A
            - Σ (amount / 2) de gastos donde paid_by = Usuario B

Si balance_neto > 0 → Usuario B debe (balance_neto) a Usuario A
Si balance_neto < 0 → Usuario A debe (|balance_neto|) a Usuario B
Si balance_neto = 0 → Estáis en paz
```

**Importante:** El settlement no borra gastos. Crea un punto de corte temporal. El balance siempre se calcula desde el último settlement hasta hoy.

### 4.3 Categorías predefinidas del sistema

| Icono | ES | EN |
|---|---|---|
| 🛒 | Supermercado | Groceries |
| 🍽️ | Restaurantes | Dining out |
| 🏠 | Hogar | Home |
| 🚗 | Transporte | Transport |
| 💊 | Salud | Health |
| 🎬 | Ocio | Entertainment |
| ✈️ | Viajes | Travel |
| 📱 | Suscripciones | Subscriptions |
| 🎁 | Regalos | Gifts |
| 📦 | Otros | Other |

***

## 5. Flujos de Usuario

### Flujo 1: Registrar un gasto

```
Usuario abre la app
  └── Ve el Dashboard de gastos
        └── Pulsa "+" o "Añadir gasto"
              └── Formulario de nuevo gasto
                    ├── Introduce importe
                    ├── Escribe descripción (opcional)
                    ├── Selecciona categoría
                    ├── Confirma quién pagó (por defecto: yo)
                    ├── Elige tipo de split:
                    │     ├── [50/50] ← seleccionado por defecto
                    │     └── [Lo pagué yo solo]
                    ├── Ajusta fecha (por defecto: hoy)
                    └── Pulsa "Guardar"
                          └── Vuelve al Dashboard con balance actualizado
```

**Casos alternativos:**
- Si el usuario quiere registrar un gasto que pagó *su pareja*: cambia el selector "¿Quién pagó?" al nombre del otro.
- Si cancela el formulario a medias: se descarta sin guardar (no hay autoguardado en formularios de creación).

***

### Flujo 2: Consultar el balance y el historial

```
Dashboard
  ├── Ve el balance neto destacado
  ├── Ve los últimos 5 gastos
  └── Pulsa "Ver todos" → Lista completa
        ├── Filtra por categoría
        ├── Filtra por persona (quién pagó)
        ├── Filtra por mes
        └── Pulsa un gasto → Detalle del gasto
              ├── Ve todos los campos
              ├── Puede editarlo
              └── Puede eliminarlo (con confirmación)
```

***

### Flujo 3: Saldar la deuda (Settlement)

```
Dashboard → Balance muestra "Debes 47€ a Ana"
  └── Pulsa "Saldar cuentas"
        └── Bottom sheet de confirmación:
              ├── Muestra: "¿Confirmas que has transferido 47€ a Ana?"
              ├── Campo opcional: nota (ej: "Bizum del 15 de marzo")
              ├── [Cancelar]
              └── [Confirmar settlement]
                    └── Balance se resetea a 0€
                          └── Dashboard actualizado + mensaje de confirmación
```

**Regla importante:** Solo puede iniciar un settlement quien tiene el balance negativo (quien debe). Esto evita confirmaciones asimétricas y confusión sobre quién transfiere.

**Caso de balance = 0:** El botón "Saldar" no aparece. Se muestra un estado vacío positivo ("¡Estáis en paz! 🎉").

***

### Flujo 4: Ver historial de liquidaciones

```
Dashboard → Menú o tab "Historial"
  └── Lista de settlements ordenados por fecha
        └── Cada fila: fecha, importe, quién pagó a quién, nota
```

***

## 6. Pantallas y Componentes

### 6.1 Dashboard de Gastos

La pantalla más importante. Estructura:

```
┌─────────────────────────────────┐
│  💰 Gastos                  [+] │
├─────────────────────────────────┤
│                                 │
│     Ana te debe                 │
│        47,50 €                  │   ← Balance hero, tipografía grande
│                                 │
│  [    Saldar cuentas    ]        │   ← CTA primario, solo visible si hay deuda
│                                 │
├─────────────────────────────────┤
│  Este mes                       │
│  ┌───────────────────────────┐  │
│  │ 🛒 Supermercado    32€  ✓ │  │   ← checkmark = compartido
│  │    Tú pagaste    Hoy      │  │
│  ├───────────────────────────┤  │
│  │ 🍽️ Cena cumple    80€     │  │   ← sin checkmark = lo pagué yo solo
│  │    Ana pagó      Ayer     │  │
│  └───────────────────────────┘  │
│  Ver todos los gastos →         │
└─────────────────────────────────┘
```

**Detalles de diseño:**
- El balance hero usa color semántico: **verde** si te deben, **naranja/rojo** si debes tú, **neutro** si estáis en paz.
- El texto del balance es siempre desde la perspectiva del usuario actual: "Ana te debe X" / "Debes X a Ana" — nunca un número sin contexto.
- Los gastos "lo pagué yo solo" se muestran visualmente más tenues (opacity reducida) porque no afectan al balance.
- El botón "+" del header es el CTA secundario para añadir gasto rápido.

***

### 6.2 Formulario de Nuevo Gasto

```
┌─────────────────────────────────┐
│  ← Nuevo gasto                  │
├─────────────────────────────────┤
│                                 │
│         0,00 €                  │   ← Input de importe grande, autofocus
│                                 │
├─────────────────────────────────┤
│  Descripción          [opcional]│
│  ________________________________│
│                                 │
│  Categoría                      │
│  [🛒 Supermercado       ▼]      │
│                                 │
│  ¿Quién pagó?                   │
│  [● Yo]  [○ Ana]                │   ← Toggle pill, nombre real
│                                 │
│  ¿Cómo se divide?               │
│  [● 50/50]                      │   ← Siempre 50/50
│                                 │
│  Fecha                          │
│  [Hoy, 17 mar →]                │
│                                 │
├─────────────────────────────────┤
│  [       Guardar gasto       ]  │
└─────────────────────────────────┘
```

**Detalles de diseño:**
- El **importe** tiene el foco al abrir. El teclado numérico aparece directamente.
- La **descripción** es opcional pero recomendada. Placeholder: "¿En qué fue?" / "What was it for?"
- "¿Quién pagó?" usa los nombres reales de los miembros de la pareja, no "Yo / Otro".
- El botón Guardar está **deshabilitado** hasta que el importe sea > 0.
- Si el importe tiene más de 2 decimales, se redondea automáticamente.

***

### 6.3 Lista de Gastos

```
┌─────────────────────────────────┐
│  ← Todos los gastos             │
│  [Categoría ▼] [Persona ▼] [Mes ▼] │
├─────────────────────────────────┤
│  MARZO 2026                     │
│  ┌──────────────────────────┐   │
│  │ 🛒  Supermercado         │   │
│  │     Tú pagaste · 17 mar  │   │
│  │                   32,00€ │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 🍽️  Cena cumple           │   │
│  │     Ana pagó · 16 mar    │   │
│  │                   80€ │   │
│  └──────────────────────────┘   │
│                                 │
│  FEBRERO 2026                   │
│  ...                            │
└─────────────────────────────────┘
```

**Detalles:**
- Agrupación por mes con headers sticky.
- Badge visual diferenciado para gastos "lo pagué yo solo" — evita confusión sobre si afectan al balance.
- Swipe-to-delete con confirmación (patrón nativo).
- Tap en un gasto abre el detalle/edición.

***

### 6.4 Detalle / Edición de Gasto

Misma estructura que el formulario de creación, pre-rellenado. Añade:
- Botón "Eliminar gasto" al final, en rojo, con confirmación modal.
- Indicación de "Añadido por [nombre]" en modo solo lectura (no editable).

***

### 6.5 Bottom Sheet de Settlement

```
┌─────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌                      │   ← drag handle
│                                 │
│  💸 Saldar cuentas              │
│                                 │
│  Vas a registrar que has        │
│  transferido                    │
│                                 │
│          47,50 €                │   ← importe destacado
│         a Ana                   │
│                                 │
│  Nota (opcional)                │
│  ________________________________│
│  Ej: "Bizum del 17 de marzo"    │
│                                 │
│  [     Confirmar pago     ]     │   ← botón primario
│  [          Cancelar      ]     │   ← botón secundario
└─────────────────────────────────┘
```

**Detalles:**
- Este sheet solo lo puede abrir quien debe el dinero. Si intenta abrirlo el otro, se muestra un mensaje: "Cuando [nombre] te transfiera el dinero, puede confirmarlo desde su cuenta."
- No hay integración con pagos reales. La app asume que la transferencia ocurre fuera (Bizum, transferencia, etc.).

***

## 7. Estados Vacíos y Edge Cases

### Estados vacíos

| Pantalla | Estado | Mensaje |
|---|---|---|
| Dashboard sin gastos | Primer uso | "Añade vuestro primer gasto compartido 💰" + CTA |
| Dashboard con balance 0 | Todo saldado | "¡Estáis en paz! No hay deudas pendientes 🎉" |
| Lista de gastos vacía | Sin gastos o sin resultados de filtro | "No hay gastos con estos filtros" |
| Historial de settlements vacío | Sin liquidaciones previas | "Aún no habéis saldado ninguna deuda" |

### Edge cases importantes

- **¿Qué pasa si se edita un gasto después de un settlement?** El gasto editado forma parte del nuevo período de cálculo (post-settlement). No se recalcula el settlement pasado — los settlements son inmutables.
- **¿Se puede eliminar un gasto de un período ya saldado?** Sí, pero solo afecta al balance actual. El settlement histórico no cambia.
- **¿Qué pasa si los dos añaden el mismo gasto a la vez?** No hay lógica de deduplicación automática. Es responsabilidad del usuario. Pueden eliminar el duplicado desde el listado.
- **¿Qué ocurre si el importe es 0,01€?** Se permite. No hay mínimo técnico, aunque la UX podría añadir una validación de "¿Seguro? El importe parece muy bajo" para evitar errores.
- **¿Y si la pareja se "separa" de la app?** El historial de gastos y settlements queda archivado. Out of scope para MVP.

***

## 8. Internacionalización (i18n)

### Claves de traducción críticas

El texto del balance es dinámico y requiere gestión de género en español:

```json
// ES
{
  "balance.youOwe": "Debes {{amount}} a {{name}}",
  "balance.theyOwe": "{{name}} te debe {{amount}}",
  "balance.settled": "¡Estáis en paz!",
  "expense.split.shared": "50/50",
  "expense.paidBy.me": "Yo",
  "expense.paidBy.partner": "{{name}}",
  "settlement.confirm": "Confirmar que has transferido {{amount}} a {{name}}",
  "settlement.badge": "Saldado el {{date}}"
}

// EN
{
  "balance.youOwe": "You owe {{name}} {{amount}}",
  "balance.theyOwe": "{{name}} owes you {{amount}}",
  "balance.settled": "You're all settled up!",
  "expense.split.shared": "Split 50/50",
  "expense.paidBy.me": "Me",
  "expense.paidBy.partner": "{{name}}",
  "settlement.confirm": "Confirm you've transferred {{amount}} to {{name}}",
  "settlement.badge": "Settled on {{date}}"
}
```

### Formato de moneda y fecha

- Moneda: usar `Intl.NumberFormat` con la configuración del locale. En ES → `47,50 €`. En EN → `€47.50`.
- Fecha: en ES → "17 mar", "ayer", "hoy". En EN → "Mar 17", "yesterday", "today". Usar `date-fns` con locale.

***

## 9. Accesibilidad

- Todos los elementos interactivos tienen `aria-label` descriptivo.
- El balance usa `role="status"` para que lectores de pantalla lo anuncien cuando cambia.
- Los toggles de "¿Quién pagó?" y "¿Cómo se divide?" son `role="radiogroup"`.
- El contraste de los colores semánticos del balance (verde/rojo) cumple WCAG AA como mínimo.
- No se usa solo color para comunicar información (el balance también usa texto explícito).

***

## 10. Navegación y Arquitectura de Rutas

```
/expenses                        → Dashboard
/expenses/new                    → Formulario nuevo gasto
/expenses/$expenseId             → Detalle / edición
/expenses/list                   → Historial completo
```

El tab de "Gastos" en la navegación principal muestra un **badge numérico** con el importe del balance pendiente si es > 0. Esto da visibilidad sin que el usuario tenga que entrar a la sección.

***

## 11. Resumen de Pantallas

| Pantalla | Propósito principal | CTA principal |
|---|---|---|
| **Dashboard** | Estado del balance + últimos gastos | Añadir gasto / Saldar |
| **Nuevo gasto** | Registrar un gasto | Guardar |
| **Lista de gastos** | Historial con filtros | — |
| **Detalle de gasto** | Ver / editar / eliminar | Guardar cambios |
| **Settlement sheet** | Confirmar liquidación | Confirmar pago |

***