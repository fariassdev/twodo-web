# Home Screen — Product Documentation

**Versión:** 1.0
**Estado:** Design final aprobado
**Última actualización:** Marzo 2026
**Autores:** Sesión de diseño de producto

---

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Estructura de la pantalla](#2-estructura-de-la-pantalla)
3. [Componentes — especificación detallada](#3-componentes--especificación-detallada)
4. [Comportamiento e interacciones](#4-comportamiento-e-interacciones)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Estados de la pantalla](#6-estados-de-la-pantalla)
7. [Decisiones de producto cerradas](#7-decisiones-de-producto-cerradas)
8. [Fuera de scope — MVP](#8-fuera-de-scope--mvp)

---

## 1. Contexto y objetivos

### Propósito de la Home

La Home es la pantalla de mayor frecuencia de uso de la app. Su objetivo es doble:

- **Operativo**: permitir al usuario ver y completar las tareas del día de un vistazo, sin fricción.
- **Awareness**: ofrecer una señal de estado del equipo (Balance Score) que genere conciencia sobre la distribución de carga sin necesidad de navegar a Metrics.

### Principios de diseño aplicados

| Principio | Aplicación en la Home |
|---|---|
| **Fricción mínima** | Las tareas del día son lo primero visible tras el widget de estado |
| **Densidad controlada** | Jerarquía visual de 3 niveles: sección › bloque › fila |
| **Framing de equipo** | El copy siempre en plural; los assignees se muestran como avatares, no como "responsables" |
| **Acción inmediata** | FAB persistente para crear tareas desde cualquier punto del scroll |
| **Sin culpa acumulada** | Las tareas diarias no completadas no aparecen como deuda al día siguiente |

---

## 2. Estructura de la pantalla

```
┌─────────────────────────────────────────┐
│ [👤👤] JUEVES, 19 MAR 🔍 │ ← Header sticky
│ Bubis │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ (52) - ESTADO DE CARGA │ │ ← Balance Score widget
│ │ ◯ % Lleváis una carga │ │
│ │ equilibrada entre ambos │ │
│ └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Hoy [5 PENDIENTES] │ ← Sección HOY
│ │
│ MAÑANA │
│ ▌ □ Preparar comida ⚡ [👤][👤]│ ← HIGH + borde verde izq.
│ ▌ □ Hacer la cama ⚡ [👤][👤]│
│ │
│ TARDE │
│ │ □ Limpiar el baño [L] [👤] │
│ │
│ NOCHE │
│ │ □ Planchar la ropa [XL] [👤] │
│ │ ☑ Preparar cena [👤] │ ← Completada, al fondo
│ │
│ 🕐 Pendientes de otros días ˅ │ ← Colapsable
​
├─────────────────────────────────────────┤
│ Próximos 7 días │ ← Sección upcoming
│ │
│ MAR · Nutri 🍕 [👤][👤] │
│ 20 │
│ MAR · Hacer compra semanal [👤] │
│ 24 │
│ MAR · Limpiar baño completo [👤] │
│ 25 │
│ MAR · Papelito viajero 🚂📖 [👤][👤]│
│ 31 │
├─────────────────────────────────────────┤
│ [🏠] [📅] [💳] [🛒] [📊] │ ← Bottom nav
│ HOME CALENDAR EXPENSES SHOPPING METRICS│
└─────────────────────────────────────────┘
╭─────╮
│ + │ ← FAB verde, bottom-right
╰─────╯
```


---

## 3. Componentes — especificación detallada

### 3.1 Header

**Posición:** fijo en scroll (sticky top).

| Elemento | Detalle |
|---|---|
| Avatar pareja | Dos fotos de perfil solapadas, lado izquierdo |
| Fecha | Formato largo localizado: `JUEVES, 19 MAR` en mayúsculas, peso ligero |
| Nombre pareja | `Bubis` — nombre de la pareja, debajo de la fecha, peso bold |
| Search | Icono lupa, lado derecho — abre búsqueda global (no barra permanente) |

**Comportamiento:** el header permanece visible durante todo el scroll. No colapsa.

---

### 3.2 Balance Score widget

**Posición:** inmediatamente bajo el header, antes de las tareas.

| Elemento | Detalle |
|---|---|
| Gráfico | Donut / circular progress, valor `52` centrado en grande |
| Indicador semántico | Dot de color + label `ESTADO DE CARGA` |
| Copy adaptativo | Frase debajo del label según zona semántica (ver tabla) |
| Interacción | Tap en cualquier zona de la card → navega a pantalla Metrics |

**Estados semánticos del widget:**

| Rango BS | Color dot | Copy |
|---|---|---|
| 40–60 | 🟢 Verde | *"Lleváis una carga equilibrada entre ambos"* |
| 30–39 / 61–70 | 🟡 Ámbar | *"Hay cierta descompensación este período"* |
| < 30 / > 70 | 🔴 Rojo suave | *"La carga está bastante desigual"* |

**Datos necesarios:**
- Puntos completados por cada miembro en la ventana temporal activa (default: mes en curso)
- Fórmula: `BS = (P_A / P_A + P_B) × 100`

---

### 3.3 Sección HOY

**Título:** `Hoy` — tamaño grande, peso bold.

**Badge:** `5 PENDIENTES` — pastilla verde, top-right del título. Muestra el número de tareas pendientes (no completadas) del día.

#### Bloques temporales

Las tareas se agrupan en bloques según el campo `cuando` asignado al crear la tarea:

| Bloque | Label | Emoji |
|---|---|---|
| Mañana | `MAÑANA` | — (sin emoji en el label) |
| Tarde | `TARDE` | — |
| Noche | `NOCHE` | — |
| Sin preferencia | `SIN PREFERENCIA` | — |

Los labels de bloque van en mayúsculas, peso ligero/secondary — visualmente menos prominentes que el título de sección.

#### Filas de tarea

Anatomía de una fila (de izquierda a derecha):

```
[acento izq.] [checkbox] [nombre] [size?] [assignee avatar(s)]
```


| Elemento | Regla de visibilidad |
|---|---|
| **Acento izquierdo** (borde verde) | Solo si `urgencia = HIGH` |
| **Checkbox** | Siempre — circular, tap → completa la tarea |
| **Nombre** | Siempre — 16px, peso medium |
| **⚡ badge** | Solo si `urgencia = HIGH` — icono junto al nombre |
| **Size label** `[L]` / `[XL]` | Solo si `esfuerzo = L` o `esfuerzo = XL`. Los tamaños S y M no se muestran |
| **Assignee avatar(s)** | Siempre — lado derecho. Si `asignación = Equipo`, se muestran los dos avatares solapados. Si `asignación = Individual`, solo el avatar de esa persona. Si `asignación = Cualquiera`, los dos avatares |

#### Tareas completadas

- El checkbox pasa a estado filled (✓ verde)
- El texto del nombre aparece tachado y en color muted
- El avatar pasa a estado muted/desaturado
- La fila se desplaza automáticamente **al fondo de su bloque temporal**
- No hay caption de autoría en la fila (simplificado respecto al diseño original)

#### Fila "Pendientes de otros días"

Aparece siempre como el último elemento de la sección HOY.

| Elemento | Detalle |
|---|---|
| Icono | 🕐 reloj, color accent rojo/ámbar suave |
| Label | `Pendientes de otros días` |
| Badge | Número de tareas pendientes en pastilla circular |
| Chevron | `˅` — indica que es colapsable/expandible |
| Default | **Colapsado** — el usuario empieza el día viendo sus tareas de hoy |
| Contenido | Solo tareas **no-diarias** (semanales, mensuales, puntuales) cuya fecha límite ya pasó |

> Las tareas con recurrencia diaria **nunca** aparecen aquí — pasan a estado `expired` al final del día sin generar deuda visible.

---

### 3.4 Sección PRÓXIMOS 7 DÍAS

**Título:** `Próximos 7 días` — mismo peso visual que `Hoy`.

**Sin link "Ver más" en el MVP** — la sección muestra hasta 5 ítems. Navegación al calendario desde el tab de nav.

#### Filas de upcoming

Anatomía de una fila:

```
[MES] [nombre tarea + emoji?] [assignee avatar(s)]
[DÍA]
```


| Elemento | Detalle |
|---|---|
| Fecha | Mes en mayúsculas muted + número del día en bold, columna izquierda fija |
| Nombre | Texto principal — puede incluir emojis si el nombre los tiene |
| Assignee | Avatar(s) lado derecho — misma lógica que en filas de HOY |

**Qué aparece:**
- Solo tareas **no-diarias** (semanales, mensuales, puntuales)
- Con fecha límite dentro de los **próximos 7 días** desde hoy
- Ordenadas cronológicamente
- Máximo **5 ítems** visibles

**Qué no aparece:**
- Tareas con recurrencia diaria
- Tareas del día actual (ya están en la sección HOY)
- Tareas vencidas (ya están en "Pendientes de otros días")

---

### 3.5 FAB — Botón de acción flotante

| Elemento | Detalle |
|---|---|
| Forma | Circular |
| Icono | `+` |
| Color | Verde primario (accent color de la app) |
| Posición | Bottom-right, 16px de los bordes |
| Z-index | Por encima del contenido y del bottom nav bar — nunca lo tapa |
| Tap | Abre el **bottom sheet de creación de tarea** (flujo existente) |

---

### 3.6 Bottom Navigation Bar

| Tab | Icono | Estado en esta pantalla |
|---|---|---|
| Home | 🏠 | **Activo** — verde, label visible |
| Calendar | 📅 | Inactivo |
| Expenses | 💳 | Inactivo |
| Shopping | 🛒 | Inactivo |
| Metrics | 📊 | Inactivo |

---

## 4. Comportamiento e interacciones

### Completar una tarea

1. Usuario tap en checkbox → tarea pasa a `completed`
2. Animación: el checkbox se rellena con ✓ verde
3. El nombre se tacha y se vuelve muted
4. La fila se desplaza al fondo de su bloque temporal (animación suave)
5. El contador de `N PENDIENTES` se decrementa en 1
6. Si era una tarea de tipo `Cualquiera`: se actualiza en tiempo real en la pantalla de **ambos** miembros vía Supabase Realtime

### Expandir "Pendientes de otros días"

1. Usuario tap en la fila → se expande mostrando las tareas vencidas no-diarias
2. El chevron rota a `˄`
3. Tap de nuevo → colapsa

### Tap en Balance Score widget

1. Navega a la pantalla de Metrics
2. No hay estado de carga — la navegación es inmediata

### Tap en FAB `+`

1. Abre el bottom sheet de creación de tarea (flujo existente, sin cambios)
2. El bottom sheet sube desde el borde inferior con animación estándar

### Scroll

- El header es sticky — siempre visible
- El FAB es sticky — siempre visible
- El resto de la pantalla hace scroll normalmente

---

## 5. Reglas de negocio

### Qué aparece en HOY

1. Tareas con `fecha_limite = hoy`
2. Instancias de tareas recurrentes cuya ocurrencia corresponde a hoy
3. Las tareas completadas se mantienen visibles en su bloque, al fondo, hasta que el usuario abandona la pantalla o refresca

### Qué aparece en Próximos 7 días

1. Tareas no-diarias con `fecha_limite` entre `mañana` y `hoy + 7 días`
2. Excluye tareas del día actual (ya están en HOY)
3. Excluye tareas vencidas (ya están en Pendientes de otros días)
4. Excluye instancias de tareas con recurrencia diaria

### Badge "N PENDIENTES"

- Cuenta únicamente tareas en estado `pending` del día actual
- Las tareas completadas no cuentan
- Se actualiza en tiempo real

### Cálculo del Balance Score en widget

- Ventana temporal: mes en curso por defecto
- Solo instancias en estado `completed` contribuyen al cálculo
- Las instancias `expired` (tareas diarias no completadas) no entran en el cálculo
- Fórmula: `BS = (P_A / P_A + P_B) × 100`

---

## 6. Estados de la pantalla

### Estado normal (día con tareas)
El descrito en esta documentación.

### Estado sin tareas hoy
- La sección HOY muestra un empty state: ilustración + copy `"¡No tenéis tareas para hoy!"` o similar
- El badge `N PENDIENTES` no aparece o muestra `0`
- La sección Próximos 7 días sigue mostrándose con normalidad si hay items

### Estado sin datos en Próximos 7 días
- La sección muestra un empty state compacto: `"No hay tareas programadas para los próximos 7 días"`

### Estado sin datos en Balance Score
- Si no hay tareas completadas en el período: el widget muestra `--` en lugar del número y copy `"Completad tareas para ver vuestro estado de carga"`

### Estado de carga (loading)
- El Balance Score widget muestra un skeleton loader
- Las secciones HOY y Próximos 7 días muestran skeleton rows

### Estado de error
- Si falla la carga de datos: snackbar/toast no intrusivo — la pantalla no colapsa

---

## 7. Decisiones de producto cerradas

| # | Decisión | Opción elegida | Rationale |
|---|---|---|---|
| D-01 | Search bar permanente | ❌ Eliminada — icono en header | Libera espacio premium; la búsqueda es uso infrecuente |
| D-02 | Balance Score en home | ✅ Widget compacto siempre visible | Genera awareness sin obligar a navegar a Metrics |
| D-03 | Formato Balance Score widget | Donut/circular con número central | Más visual e impactante que una barra o solo el número |
| D-04 | Love Notes | ❌ Eliminado del MVP | Reduce scope; infraestructura de mensajería no prioritaria en v1 |
| D-05 | Shared Plans | ❌ Eliminado — reemplazado por Próximos 7 días | Naming más preciso, alcance definido, vinculado al modelo de datos |
| D-06 | FAB creación de tarea | ✅ Bottom sheet con flujo existente | No hay quick-add — se prioriza calidad del dato sobre velocidad extrema |
| D-07 | Agrupación Próximos 7 días | Lista plana por fecha | Suficiente jerarquía visual; la agrupación por día vive en el Calendario |
| D-08 | Size label en filas de HOY | Solo L y XL visibles | S y M no aportan señal relevante para priorizar; reducen ruido visual |
| D-09 | Metadatos en Próximos 7 días | Fecha + nombre + assignee | El assignee es accionable (puedo recordárselo a mi pareja) |
| D-10 | Tareas diarias en Próximos 7 días | ❌ Excluidas | Ya tienen su representación en HOY cada día; incluirlas duplicaría información |
| D-11 | Caption de autoría en completadas | ❌ Eliminada en MVP | El avatar muted es señal suficiente; el caption añade altura innecesaria |

---

## 8. Fuera de scope — MVP

Los siguientes elementos han sido identificados pero quedan para iteraciones futuras:

| Elemento | Motivo de exclusión | Versión objetivo |
|---|---|---|
| Love Notes | Infraestructura de mensajería en tiempo real no prioritaria | v2 |
| "Ver más" en Próximos 7 días | El calendario cubre esta necesidad; link redundante en MVP | v1.1 |
| Quick-add desde FAB | Se prioriza integridad del dato; el flujo completo es suficientemente ágil | v1.1 |
| Notificaciones / recordatorios | Requiere infraestructura de push/email independiente | v2 |
| Drag & drop para reordenar tareas | Complejidad de implementación vs. valor en v1 | v1.1 |
| Filtros en HOY (por assignee, categoría) | Innecesario con el volumen de tareas esperado en v1 | v2 |
| Balance Score con ventana temporal seleccionable desde home | La selección de ventana vive en Metrics | v2 |

---

*Documento generado en sesión de diseño de producto · Couple Organizer · Marzo 2026*
