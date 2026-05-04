# Sistema de Métricas

> Documento de producto · Versión 1.1 · Marzo 2026

---

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Principios de diseño](#2-principios-de-diseño)
3. [Sistema de peso de tareas](#3-sistema-de-peso-de-tareas)
4. [Modelo de asignación](#4-modelo-de-asignación)
5. [Balance Score — definición exacta](#5-balance-score--definición-exacta)
6. [Catálogo de métricas](#6-catálogo-de-métricas)
7. [Catálogo inicial de tareas](#7-catálogo-inicial-de-tareas)
8. [Estructura visual de la pantalla](#8-estructura-visual-de-la-pantalla)
9. [Decisiones de producto cerradas](#9-decisiones-de-producto-cerradas)
10. [Backlog de mejoras futuras](#10-backlog-de-mejoras-futuras)

---

## 1. Contexto y objetivos

La pantalla de métricas tiene un único objetivo primario: **generar conciencia** sobre cómo se distribuye la carga del hogar entre los dos miembros de la pareja. En segundo lugar, y de forma subordinada, busca **motivar** a seguir utilizando la app.

### Lo que NO es esta pantalla

- Un marcador competitivo entre los dos miembros.
- Una herramienta de reproches o control.
- Un dashboard de productividad personal.

### Contexto de uso

- Cada miembro la consulta **individualmente**, no en conjunto.
- Ambos ven **exactamente los mismos datos** (sin vistas personalizadas por usuario).
- La pantalla debe funcionar bien tanto para **usuarios nuevos** (semana/mes) como para **usuarios con recorrido** (histórico).

---

## 2. Principios de diseño

| Principio | Aplicación práctica |
| --- | --- |
| **Framing de equipo** | Todo el copy usa primera persona del plural ("lleváis", "completasteis") |
| **Awareness antes que alarma** | Los colores de alerta son suaves; nunca hay tono acusatorio |
| **Trabajo invisible visible** | Las métricas miden planificación y carga mental, no solo ejecución física |
| **Densidad controlada** | Jerarquía de 4 niveles; el usuario ve lo importante primero |
| **Sin penalización por contexto** | Las tareas diarias que caducan no penalizan métricas; su contexto desaparece con el día |
| **Extensibilidad** | El modelo está preparado para gastos y eventos en v2 |

---

## 3. Sistema de peso de tareas

### Decisión adoptada: Catálogo + nivel de esfuerzo + override

El sistema opera en tres capas:

### Capa 1 — Biblioteca de tareas predefinidas (~20–80 tareas)

Cada tarea del catálogo tiene un peso editorial predefinido. El usuario simplemente la selecciona; no toma ninguna decisión de peso. Cubre el ~80% de los casos de uso.

### Capa 2 — Tarea personalizada con nivel de esfuerzo

Para tareas fuera del catálogo, el usuario elige entre 4 niveles:

| Nivel | Label | Puntos | Referencia mental |
| --- | --- | --- | --- |
| 1 | Tarea rápida | 2 | Menos de 15 min |
| 2 | Tarea normal | 4 | 15–45 min |
| 3 | Tarea considerable | 8 | 45 min – 2h |
| 4 | Tarea grande | 16 | Más de 2h o alta carga mental |

> La escala de potencias de 2 asegura que las tareas grandes tengan impacto real en el balance sin distorsionar las pequeñas.

### Capa 3 — Override manual

Cualquier tarea del catálogo puede tener su peso ajustado manualmente. El peso del catálogo es el *default*, no una imposición.

### Alternativas descartadas

| Enfoque | Motivo de descarte |
| --- | --- |
| Puntos manuales libres | Fricción muy alta; los usuarios no los rellenan bien |
| Peso fijo por categoría | Intra-categoría muy variable (tirar la basura ≠ limpiar el baño) |
| T-shirt sizes abstractos | Menos intuitivo que el lenguaje de tiempo |

---

## 4. Modelo de asignación

Las tareas tienen 3 tipos de asignación posibles, con impacto directo en cómo se computan los puntos:

| Tipo | Descripción | Cómputo de puntos |
| --- | --- | --- |
| **Equipo** | Se hace en conjunto | peso / 2 para cada persona |
| **Cualquiera** | Asignada a ambos; la hace quien la complete primero | peso completo al que la complete |
| **Individual** | Asignada a una persona concreta | peso completo a esa persona |
| **Individual rotativa** | Asignación alternante automática | peso completo al turno activo |

### Tareas individuales fijas

- **Sí cuentan** en el Balance Score.
- Se marcan como **"acordada"** para que no generen alerta de desequilibrio.
- Rationale: en la app todo lo registrado está relacionado con la convivencia; las responsabilidades fijas acordadas también son carga real.

---

## 5. Balance Score — definición exacta

El Balance Score (BS) es la **hero metric** de la pantalla. Representa el porcentaje de carga ponderada que lleva la persona A sobre el total.

$$
BS = \frac{P_A}{P_A + P_B} \times 100
$$

Donde $P_x$ son los puntos acumulados de instancias **completadas** en la ventana temporal activa. Las instancias en estado `expired` (tareas diarias no completadas) no entran en el cálculo — aportan 0 puntos a ambos miembros.

> **Nota**: si un miembro completa hábitos diarios con más consistencia que el otro, esa diferencia sí se refleja en el BS (a través de los puntos de los días en que sí se completaron). Las diarias completadas suman; las caducadas simplemente no restan.

### Zonas semánticas

| Rango BS | Estado | Color | Copy |
| --- | --- | --- | --- |
| 40–60 | Equilibrado | 🟢 Verde | *"Lleváis una carga muy equilibrada"* |
| 30–39 / 61–70 | Descompensado | 🟡 Ámbar | *"Hay cierta descompensación este período"* |
| < 30 / > 70 | Muy descompensado | 🔴 Rojo suave | *"La carga está bastante desigual"* |

- El BS se muestra como **número explícito** (ej: 54).
- El rojo es siempre suave; el copy habla en plural, nunca señala a nadie.
- El rango saludable es 40–60 (±10 puntos sobre el equilibrio perfecto de 50).

### Ventanas temporales

| Ventana | Caso de uso principal |
| --- | --- |
| Semana actual | Usuarios nuevos, revisión rápida |
| Últimos 30 días | Uso habitual, más representativo |
| Todo (histórico) | Usuarios con recorrido; desbloquea nivel 3 |

---

## 6. Catálogo de métricas

### Tratamiento de tareas diarias en métricas

Las tareas con recurrencia diaria tienen un comportamiento especial en todo el sistema de métricas:

| Instancia diaria | Balance Score | Tasa de completado | Puntualidad | Vencidas activas | Detector carga oculta | Constancia de hábitos |
| --- | --- | --- | --- | --- | --- | --- |
| **Completada** | ✅ Suma puntos | ❌ Excluida | ❌ Excluida | ❌ No aplica | ✅ Cuenta | ✅ Numerador |
| **Expirada** | ❌ 0 puntos | ❌ Excluida | ❌ Excluida | ❌ Nunca aparece | ❌ Ignorada | ✅ Denominador |

---

### Nivel 0 — Hero metric

**Balance Score**: valor 0–100 con color semántico y copy adaptativo. Primera cosa visible en la pantalla.

---

### Nivel 1 — Distribución de ejecución

| Métrica | Qué mide | Alcance | Señal que detecta |
| --- | --- | --- | --- |
| **% de carga por peso** | Puntos de A vs B sobre el total (barra o donut) | Todas las completadas (incl. diarias) | Desequilibrio general de esfuerzo |
| **Tasa de completado** | Tareas completadas / asignadas, por persona | Solo tareas no-diarias · excl. hábitos diarios | Quién ejecuta vs quién acumula pendientes en compromisos reales |
| **Puntualidad** | % de tareas completadas en fecha o antes, por persona | Solo tareas no-diarias · excl. hábitos diarios | Patrones de procrastinación o sobrecarga en compromisos con fecha |
| **Vencidas activas** | Pendientes fuera de plazo en este momento | Solo tareas no-diarias | Señal de alarma inmediata y accionable |

> **Nota sobre Tasa de Completado y Puntualidad**: ambas métricas excluyen deliberadamente las instancias de tareas diarias. Las tareas diarias responden a la pregunta "¿somos constantes con nuestras rutinas?", que tiene su propia métrica (Constancia de hábitos). La Tasa de Completado y Puntualidad responden a "¿cumplimos los compromisos con fecha real que acordamos?". Mezclar ambas naturalezas produce un denominador inestable que no es comparable entre períodos.

> **Nota sobre Puntualidad**: la métrica original "tiempo de resolución" (creación → completado) fue descartada porque no tiene sentido para tareas recurrentes creadas de antemano. La referencia correcta es siempre la **fecha de vencimiento**.

---

### Nivel 2 — Señales especiales por tipo de asignación

#### Detector de carga oculta (tareas "Cualquiera")

Muestra qué porcentaje de las tareas de tipo *Cualquiera* resuelve cada persona. Solo se contabilizan instancias **completadas** — las instancias diarias expiradas sin que nadie las haya hecho se ignoran en este cálculo.

> *"Ana resuelve el 74% de las tareas compartidas · Carlos el 26%"*

Es la métrica más reveladora de la pantalla: detecta desequilibrios que **ninguno de los dos decidió explícitamente**.

#### Salud de rotaciones (tareas rotativas)

Muestra si las tareas rotativas están funcionando o si alguien acumula más turnos.

> Estado OK: *"3 tareas rotativas · Todas en equilibrio ✓"*
> Estado alerta: *"Fregar los platos: Ana lleva 3 turnos seguidos ⚠️"*

---

### Nivel 3 — Tendencia histórica

Solo activo en ventana "Todo" o con más de 2 meses de datos.

| Métrica | Descripción |
| --- | --- |
| **Evolución del Balance Score** | Gráfico de línea mes a mes |
| **Categoría con desequilibrio crónico** | Detecta si una categoría recae sistemáticamente en una persona |
| **Mejor mes del equipo** | Refuerzo positivo retrospectivo |

---

### Nivel 4 — Gamificación ligera

Siempre al fondo de la pantalla, nunca protagonista.

| Elemento | Descripción | Alcance | Configuración |
| --- | --- | --- | --- |
| **Racha de equipo** | Semanas consecutivas sin tareas no-diarias vencidas más de 2 días | Solo tareas no-diarias | Umbral: 2 días (fijo en v1) |
| **Constancia de hábitos** | % de instancias diarias completadas sobre el total generado en el período, como equipo | Solo tareas diarias | Siempre positivo; no hay desglose por persona |
| **Logro del período** | Frase automática tipo *"Este mes completasteis el 91% de vuestros compromisos antes de su vencimiento"* | Solo tareas no-diarias | Generada automáticamente |

> **Nota sobre Constancia de hábitos**: esta métrica es el único lugar donde las instancias diarias expiradas dejan rastro (como denominador). El framing es siempre positivo — se muestra el porcentaje completado como equipo, nunca desglosado por persona ni con lenguaje de fallo. Ejemplo: *"Esta semana habéis completado 34 de 42 hábitos diarios · 81% 🌱"*

---

## 7. Catálogo inicial de tareas

21 tareas de alta frecuencia que cubren el 80%+ de los casos de uso domésticos comunes.

| # | Tarea | Categoría | Puntos | Notas |
| --- | --- | --- | --- | --- |
| 1 | Tirar la basura | 🗑️ Basura | 2 | < 5 min, rutinaria |
| 2 | Bajar contenedores de reciclaje | 🗑️ Basura | 2 | Similar, algo más desplazamiento |
| 3 | Limpiar cubo de basura | 🗑️ Basura | 4 | Más desagradable y tardada |
| 4 | Hacer la cama | 🛏️ Limpieza | 2 | Rápida, diaria |
| 5 | Recoger y ordenar salón | 🛏️ Limpieza | 4 | Variable, peso medio |
| 6 | Pasar la aspiradora | 🧹 Limpieza | 4 | 20–30 min en piso estándar |
| 7 | Fregar el suelo | 🧹 Limpieza | 8 | Más físico y tardado que aspirar |
| 8 | Limpiar polvo (general) | 🧹 Limpieza | 4 | Recorrido completo del piso |
| 9 | Limpiar lavabo y espejo | 🚿 Baño | 4 | 10–15 min |
| 10 | Limpiar baño completo | 🚿 Baño | 8 | Inodoro + ducha + lavabo + suelo |
| 11 | Limpiar cocina (encimera + vitro) | 🍳 Cocina | 4 | Post-cocina, frecuente |
| 12 | Fregar los platos a mano | 🍳 Cocina | 4 | — |
| 13 | Poner / vaciar lavavajillas | 🍳 Cocina | 2 | Separado de fregar a mano |
| 14 | Preparar desayuno | 🍳 Cocina | 2 | Rápido, bajo esfuerzo |
| 15 | Cocinar comida o cena | 🍳 Cocina | 8 | Planificación + ejecución + limpieza |
| 16 | Hacer lista de la compra | 🛒 Compras | 4 | Carga mental, habitualmente invisible |
| 17 | Hacer la compra semanal | 🛒 Compras | 8 | Desplazamiento + tiempo + decisiones |
| 18 | Poner lavadora | 🧺 Ropa | 2 | 5 min de acción real |
| 19 | Tender / meter en secadora | 🧺 Ropa | 4 | Más tiempo y esfuerzo físico |
| 20 | Doblar y guardar ropa | 🧺 Ropa | 4 | Tedioso, se pospone mucho |
| 21 | Planchar | 🧺 Ropa | 8 | Alta inversión de tiempo |

### Gaps identificados para v2

- 🌱 Plantas / mascotas
- 🔧 Mantenimiento del hogar
- 💰 Gestión administrativa (facturas, seguros…)
- 📦 Organización puntual (limpiezas de fondo, armarios…)

---

## 8. Estructura visual de la pantalla

```
┌──────────────────────────────────────────┐
│ Métricas [ ⚙️ ] │
│ [ Semana ] [ Mes ] [ Todo ] │
├──────────────────────────────────────────┤
│ │
│ BALANCE SCORE │
│ 54 │
│ "Lleváis una carga equilibrada" │
│ │
│ Ana ████████████░░░░░░ 54% │
│ Carlos ████████░░░░░░░░ 46% │
│ │
├──────────────┬───────────────────────────┤
│ Completado │ Puntualidad │
│ Tareas con │ Tareas con fecha │
│ fecha │ excl. hábitos diarios │
│ Ana 88% │ Ana 91% │
│ Carlos 79% │ Carlos 84% │
├──────────────┴───────────────────────────┤
│ ⚠️ Vencidas ahora: 2 │
│ Ana: 1 · Carlos: 1 │
├──────────────────────────────────────────┤
│ Tareas "Cualquiera" │
│ Ana ████████ 74% · Carlos ██ 26% │
│ ⚠️ Ana resuelve la mayoría │
├──────────────────────────────────────────┤
│ Rotaciones activas: 3 │
│ Fregar platos ⚠️ Ana: 3 turnos seguidos │
│ Aspiradora ✓ · Compra semanal ✓ │
├──────────────────────────────────────────┤
│ [Solo en "Todo"] │
│ Evolución Balance Score ↗ │
│ ene ██ feb ████ mar ███ │
│ Mejor mes: enero (BS: 49) 🏆 │
│ Cocina recae más en Carlos últimos 3m │
├──────────────────────────────────────────┤
│ 🔥 Racha: 4 semanas │
│ 🌱 Hábitos esta semana: 34/42 · 81% │
│ "Este mes: 91% de compromisos a tiempo" │
└──────────────────────────────────────────┘
```


---

## 9. Decisiones de producto cerradas

| # | Decisión | Opción elegida | Rationale |
| --- | --- | --- | --- |
| D-01 | Sistema de peso | Catálogo + nivel de esfuerzo + override | Mejor ratio precisión / fricción |
| D-02 | Balance Score v1 | Solo ejecución | Simplicidad; planificación en v2 |
| D-03 | Tareas fijas individuales | Cuentan, marcadas como "acordada", sin alerta | Todo en la app es carga de convivencia real |
| D-04 | Vista de métricas | Ambos ven lo mismo | Simplicidad + alineación de pareja |
| D-05 | Formato Balance Score | Número explícito (0–100) | Más informativo y accionable |
| D-06 | Umbral de racha | 2 días de margen | Equilibrio entre exigencia y realismo |
| D-07 | Framing de métricas | Siempre en plural, equipo, sin señalar | Previene uso como herramienta de reproche |
| D-08 | Rango saludable BS | 40–60 | ±10 sobre el equilibrio perfecto (50) |
| D-09 | Tareas diarias no completadas | Estado `expired`; no generan deuda ni penalizan métricas principales | Su contexto desaparece con el día; no son compromisos incumplidos, son contextos caducados |
| D-10 | Tasa de completado y Puntualidad | Excluyen tareas diarias del cálculo | Naturalezas distintas requieren métricas distintas; mezclarlas produce un denominador inestable |
| D-11 | Detector de carga oculta con diarias expiradas | Las instancias diarias expiradas se ignoran | Si nadie pudo hacer la tarea ese día, no hay señal de carga oculta que extraer |
| D-12 | Constancia de hábitos | Métrica de equipo en Nivel 4, framing siempre positivo, sin desglose por persona | Las rutinas diarias se refuerzan positivamente; no se usan como herramienta de reproche |

---

## 10. Backlog de mejoras futuras

### v1.1 — Quick wins

- [ ]  Configuración del umbral de racha por pareja (1–3 días)
- [ ]  Notificación semanal con resumen de métricas
- [ ]  Ampliar catálogo a 50 tareas (gaps identificados)

### v2 — Extensiones del modelo

- [ ]  Incluir carga de planificación (tareas creadas/asignadas) en el Balance Score
- [ ]  Dimensión de **gastos compartidos** con su propio balance
- [ ]  Dimensión de **eventos del calendario**
- [ ]  Benchmarks anónimos entre parejas (requiere catálogo estandarizado)

### Deuda técnica / decisiones pendientes

- [ ]  ¿El BS se calcula en cliente o en base de datos (Supabase function)?
- [ ]  ¿Cómo se gestiona el historial cuando una tarea cambia de peso retroactivamente?
- [ ]  Política de datos: ¿cuánto histórico se conserva?
- [ ]  Cuándo y cómo se ejecuta la transición `pending` → `expired` en instancias diarias (cron job en Supabase, o lazy evaluation al cargar la app)

---

*Documento generado en sesión de diseño de producto · Twodo · Marzo 2026*
