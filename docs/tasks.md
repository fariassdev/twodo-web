# Task Creation — Product Documentation

**Versión:** 1.1
**Estado:** Draft
**Última actualización:** Marzo 2026
**Autores:** Sesión de diseño de producto

---

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Modelo de tipos de tarea](#2-modelo-de-tipos-de-tarea)
3. [Sistema de puntos y peso](#3-sistema-de-puntos-y-peso)
4. [Catálogo de tareas](#4-catálogo-de-tareas)
5. [Modelo de asignación](#5-modelo-de-asignación)
6. [Formulario de creación](#6-formulario-de-creación)
7. [Comportamiento en la home y vista de día](#7-comportamiento-en-la-home-y-vista-de-día)
8. [Decisiones pendientes](#8-decisiones-pendientes)

---

## 1. Contexto y objetivos

### Propósito de las tareas en la app

Las tareas son la entidad central de la app. Su objetivo no es solo la gestión operativa (recordar qué hay que hacer), sino **generar conciencia de equipo**: hacer visible quién hace qué, detectar desequilibrios en la carga de trabajo y facilitar conversaciones productivas entre los miembros de la pareja.

### Principios de diseño que guían esta feature

- **Framing de equipo siempre**: ningún elemento de la UI debe percibirse como un marcador o herramienta de reproche. El lenguaje es siempre en primera persona del plural.
- **Fricción mínima al crear**: el flujo de creación debe ser rápido. La mayoría de decisiones deberían tener un default razonable que el usuario no necesite cambiar.
- **Datos coherentes para métricas**: cada campo del formulario tiene un impacto directo en el Balance Score y las métricas de equidad. La consistencia de los datos es prioritaria.
- **Extensible a eventos y gastos**: aunque la v1 solo cubre tareas, el modelo debe ser compatible con las dimensiones futuras (eventos de calendario y gastos compartidos).

---

## 2. Modelo de tipos de tarea

### Dimensión 1: Tipo de entrada

El primer paso en el flujo de creación es elegir el tipo de entrada, ya que condiciona todos los campos posteriores:

| Tipo | Descripción | Campos específicos |
| --- | --- | --- |
| **Tarea** | Acción doméstica con fecha límite | Momento del día, recurrencia, asignación, esfuerzo |
| **Evento** | Ocurrencia puntual con hora concreta | Hora inicio/fin (previsto para v2) |

> **Decisión**: Tarea y Evento se separan en flujos distintos desde el inicio del formulario. No se mezclan en el mismo formulario por tener campos estructuralmente diferentes.

### Dimensión 2: Recurrencia

| Tipo | Comportamiento |
| --- | --- |
| **Puntual** | Ocurre una sola vez en la fecha indicada |
| **Recurrente** | Se repite automáticamente con la frecuencia elegida (diaria, semanal, mensual) |

Las tareas recurrentes generan instancias individuales por período, cada una completable de forma independiente. Esto es necesario para que las métricas de balance sean precisas por ventana temporal.

### Estados de una instancia de tarea

Cada instancia de tarea (sea puntual o una ocurrencia de una recurrente) puede tener los siguientes estados:

| Estado | Descripción |
| --- | --- |
| `pending` | Pendiente dentro de su ventana válida |
| `completed` | Marcada como hecha por algún miembro |
| `overdue` | Pasada la fecha límite sin completar — **solo aplica a tareas no-diarias** |
| `expired` | Instancia de tarea diaria que no se completó en su día — **no genera deuda** |

> **Distinción clave**: `overdue` y `expired` son estados distintos con consecuencias distintas. Una tarea semanal no hecha genera deuda visible y afecta métricas. Una tarea diaria no hecha caduca silenciosamente al final del día — su contexto ya no es aplicable al día siguiente.

---

## 3. Sistema de puntos y peso

### Decisión de diseño

Se descarta el campo de **puntos manuales** (alta fricción, datos inconsistentes). Se adopta un sistema de **dos capas**:

### Capa 1 — Catálogo de tareas predefinidas

Un catálogo de tareas domésticas comunes con peso predefinido editorialmente. Cuando el usuario selecciona una tarea del catálogo, el campo de esfuerzo se pre-rellena automáticamente. El usuario puede hacer override si la tarea es inusualmente ligera o pesada.

Cubre el ~80% de los casos con fricción cero.

### Capa 2 — Tarea personalizada con nivel de esfuerzo

Para tareas no presentes en el catálogo, el usuario elige uno de cuatro niveles:

| Nivel | Etiqueta | Puntos | Referencia de tiempo |
| --- | --- | --- | --- |
| S | Tarea rápida | 2 pts | Menos de 15 min |
| M | Tarea normal | 4 pts | 15–45 min |
| L | Tarea considerable | 8 pts | 45 min – 2h |
| XL | Tarea grande | 16 pts | Más de 2h o alta carga mental |

La escala es potencia de 2 para que las tareas grandes tengan impacto real en el balance sin distorsionar las pequeñas.

### Visualización de puntos en el formulario

Los puntos numéricos se muestran junto a la etiqueta de nivel (`S · 2pts`) para educar al usuario sobre el sistema de forma progresiva.

### Override siempre disponible

Cualquier tarea del catálogo puede tener su peso ajustado manualmente. El peso del catálogo es el default, no una imposición.

---

## 4. Catálogo de tareas

### Catálogo base v1 — 21 tareas de alta frecuencia

| # | Tarea | Categoría | Puntos | Justificación |
| --- | --- | --- | --- | --- |
| 1 | Tirar la basura | 🗑️ Basura | 2 | < 5 min, rutinaria |
| 2 | Bajar contenedores de reciclaje | 🗑️ Basura | 2 | Similar, algo más de desplazamiento |
| 3 | Limpiar cubo de basura | 🗑️ Basura | 4 | Más desagradable y tardada |
| 4 | Hacer la cama | 🛏️ Limpieza | 2 | Rápida, diaria |
| 5 | Recoger y ordenar salón | 🛏️ Limpieza | 4 | Variable, media razonable |
| 6 | Pasar la aspiradora | 🧹 Limpieza | 4 | 20–30 min en piso estándar |
| 7 | Fregar el suelo | 🧹 Limpieza | 8 | Más físico y tardado que aspirar |
| 8 | Limpiar polvo (general) | 🧹 Limpieza | 4 | Recorrido completo del piso |
| 9 | Limpiar lavabo y espejo | 🚿 Baño | 4 | 10–15 min |
| 10 | Limpiar baño completo | 🚿 Baño | 8 | Inodoro + ducha + lavabo + suelo |
| 11 | Limpiar cocina (encimera + vitro) | 🍳 Cocina | 4 | Post-cocina, frecuente |
| 12 | Fregar los platos a mano | 🍳 Cocina | 4 | — |
| 13 | Poner/vaciar lavavajillas | 🍳 Cocina | 2 | Menor esfuerzo físico |
| 14 | Preparar desayuno | 🍳 Cocina | 2 | Rápido y poco esfuerzo |
| 15 | Cocinar comida o cena | 🍳 Cocina | 8 | Incluye planificación + ejecución + suciedad |
| 16 | Hacer lista de la compra | 🛒 Compras | 4 | Carga mental significativa, habitualmente invisible |
| 17 | Hacer la compra semanal | 🛒 Compras | 8 | Desplazamiento + tiempo + decisiones |
| 18 | Poner lavadora | 🧺 Ropa | 2 | 5 min de acción real |
| 19 | Tender / meter en secadora | 🧺 Ropa | 4 | Más tiempo y esfuerzo físico |
| 20 | Doblar y guardar ropa | 🧺 Ropa | 4 | Tedioso, se pospone mucho |
| 21 | Planchar | 🧺 Ropa | 8 | Alta inversión de tiempo, sin atajos |

### Notas editoriales del catálogo

- **"Hacer lista de la compra" lleva 4 pts** deliberadamente. La carga mental de planificar qué falta en casa es trabajo real y habitualmente invisible.
- **El peso refleja esfuerzo objetivo, no disfrute subjetivo.** "Cocinar" lleva 8 pts aunque a alguien le guste cocinar.
- **Dos entradas para fregar** (a mano vs. lavavajillas) en lugar de un override, porque son tareas estructuralmente distintas presentes en hogares distintos.

### Gaps identificados para iteraciones futuras

- 🌱 Plantas / mascotas
- 🔧 Mantenimiento del hogar (cambiar bombilla, montar mueble…)
- 💰 Gestión del hogar (pagar facturas, gestionar seguros…)
- 📦 Organización puntual (ordenar armario, limpieza de fondo…)

---

## 5. Modelo de asignación

### Tres tipos de asignación

| Tipo | Descripción | Puntos | Impacto en Balance Score |
| --- | --- | --- | --- |
| **Equipo** | Tarea hecha en conjunto. El peso se reparte al 50% entre ambos. | peso / 2 para cada uno | Neutral, no genera desequilibrio |
| **Cualquiera** | Ambos asignados, pero la completa una persona. Quien la marque se lleva los puntos. | 100% para quien completa | **Alta señal de carga oculta** |
| **Individual** | Asignada a una persona concreta. Puede ser fija o rotativa. | 100% para el asignado | Varía según subtipo |

### Subtipo Individual: fija vs. rotativa

| Subtipo | Comportamiento | En Balance Score |
| --- | --- | --- |
| **Individual fija** | Siempre la misma persona. Representa un acuerdo explícito. | Cuenta, marcada como "acordada" — no genera alerta |
| **Individual rotativa** | Cambia de persona en cada ocurrencia automáticamente. | Cuenta; el sistema detecta si la rotación se está respetando |

> **Decisión de producto**: las tareas individuales fijas **sí cuentan** en el Balance Score porque toda tarea en la app está relacionada con la convivencia. Se marcan como "acordadas" para que no generen alertas de desequilibrio, pero su peso contribuye al cálculo de equidad.

### Señal especial: detector de carga oculta

Las tareas de tipo **Cualquiera** son las más reveladoras para el objetivo de awareness. Si una persona resuelve consistentemente la mayoría de tareas compartidas, eso es un desequilibrio que nadie acordó explícitamente. Las métricas muestran esta distribución de forma destacada.

---

## 6. Formulario de creación

### Flujo de entrada

```
[+ Nueva entrada]
↓
┌─────────────────────┐
│ ¿Qué tipo? │
│ │
│ ✓ Tarea │
│ 📅 Evento │
└─────────────────────┘
↓ (Tarea)
┌──────────────────────────┐
│ 🔍 Busca en catálogo... │
│ │
│ 🚿 Limpiar baño - - - - │
│ 🍳 Cocinar - - - - │
│ 🛒 Hacer compra - - - - │
│ 🧺 Poner lavadora - - │
│ ────────────────────── │
│ ✏️ Crear tarea propia │
└──────────────────────────┘
```


Si selecciona del catálogo → formulario pre-rellenado (nombre, categoría, puntos). El usuario solo decide fecha, recurrencia, momento del día y asignación.

Si crea tarea propia → formulario completo con selector de nivel de esfuerzo.

### Estructura del formulario

```
┌────────────────────────────────────┐
│ ← Nueva tarea Guardar│
├────────────────────────────────────┤
│ ¿Qué hay que hacer? │
│ [Limpiar baño 🚿 ×] │ ← pre-filled si viene de catálogo
│ Categoría: 🚿 Baño (auto) │
├────────────────────────────────────┤
│ Esfuerzo │
│ [ S·2 ] [ M·4 ] [■L·8] [ XL·16] │ ← pre-selected si viene de catálogo
├────────────────────────────────────┤
│ Fecha límite Cuándo │
│ [13/03/2026] [🌅 Mañana ▾] │
│ │
│ ● Recurrente [Semanal ▾] │
├────────────────────────────────────┤
│ Urgencia │
│ ● Normal ○ Alta │
├────────────────────────────────────┤
│ Asignación │
│ ○ Equipo ○ Cualquiera ● Individual│
│ [Ethel 🌸] [FerV7 🕹️] │
│ Rotar ───────○ │
├────────────────────────────────────┤
│ + Descripción (opcional) ▾ │
└────────────────────────────────────┘
```

### Campos y decisiones

| Campo | Tipo | Notas |
| --- | --- | --- |
| Nombre | Texto libre / catálogo | Obligatorio |
| Categoría | Auto (catálogo) / selector | Auto si viene de catálogo; obligatorio en tarea propia |
| Esfuerzo | S / M / L / XL | Sustituye al campo de puntos manual |
| Fecha límite | Date picker | Obligatorio; referencia para métricas de fiabilidad |
| Cuándo | Selector (Mañana / Tarde / Noche / Sin preferencia) | Determina el bloque en la vista de día |
| Recurrente | Toggle + selector de frecuencia | Diaria / Semanal / Mensual |
| Urgencia | Normal / Alta | Afecta al orden visual dentro del bloque |
| Asignación | Equipo / Cualquiera / Individual | Individual expone selector de persona y toggle de rotación |
| Descripción | Texto libre | Opcional, colapsado por defecto |

### Campos eliminados respecto al diseño original

- ❌ **Location** — eliminado para simplificar
- ❌ **Points manual** — sustituido por nivel de esfuerzo
- ❌ **Type al fondo del formulario** — movido al inicio del flujo como selector previo
- ❌ **Start time / End time en tareas** — reservado para Eventos en v2

---

## 7. Comportamiento en la home y vista de día

### Estructura de la vista de día

Las tareas del día se organizan en bloques por momento, determinado por el campo "Cuándo" al crear:

```
┌─────────────────────────────────────┐
│ ⚠️ Pendientes de otros días (2) ▾ │ ← colapsado por defecto
│ Solo tareas semanales/puntuales │
├─────────────────────────────────────┤
│ 🌅 MAÑANA │
│ ○ Hacer el desayuno Equipo │
│ ✓ Poner lavadora · Ethel 🌸 │ ← completada, al fondo del bloque
├─────────────────────────────────────┤
│ ☀️ TARDE │
│ ○ Hacer la compra FerV7 🕹️ │
│ ○ Cocinar Equipo │
├─────────────────────────────────────┤
│ 🌙 NOCHE │
│ ○ Fregar los platos Cualq. │
├─────────────────────────────────────┤
│ 📌 SIN PREFERENCIA │
│ ○ Limpiar baño Ethel 🌸 │
└─────────────────────────────────────┘
```

### Reglas de qué aparece en "hoy"

1. Tareas con fecha límite = hoy
2. Instancias de tareas recurrentes cuya ocurrencia corresponde a hoy
3. Tareas pendientes de días anteriores **no-diarias** → sección separada, colapsada por defecto

### Comportamiento de las tareas diarias no completadas

Las instancias de tareas con recurrencia **diaria** que no se completan en su día pasan automáticamente a estado `expired` al finalizar el día. Este estado:

- **No genera entrada** en la sección "Pendientes de otros días"
- **No aparece** en ningún lugar de la home al día siguiente
- **No afecta** a las métricas de Tasa de Completado, Fiabilidad ni Racha de equipo
- **Sí queda registrado** en base de datos para la métrica de Constancia de hábitos

> **Rationale**: el contexto de una tarea diaria (hacer la cama, cocinar) desaparece con el día. Si no se hizo, al día siguiente ya no aplica — existe una nueva instancia para ese día. Mostrarlas como deuda acumulada generaría ansiedad sin valor para el usuario.

### Pendientes de días anteriores: framing y UX

Esta sección solo contiene tareas **no-diarias** (semanales, mensuales, puntuales) que genuinamente siguen siendo relevantes más allá de su fecha original.

- **Label**: "Pendientes de otros días (N)" — lenguaje neutro, sin "vencidas" ni "atrasadas"
- **Colapsada por defecto**: el usuario empieza el día viendo sus tareas de hoy, no su deuda acumulada
- **Contador siempre visible**: no se puede ignorar indefinidamente, pero no interrumpe el flujo principal
- **Se expande con un tap**

### Tareas de tipo "Cualquiera"

- Aparecen en la home de **ambos miembros** simultáneamente
- Sincronización en tiempo real vía **Supabase Realtime**
- Cuando un miembro la completa: **se mueve al fondo del bloque** en la lista de ambos, con tachado y autoría

> Ejemplo: *"Fregar los platos · completada por FerV7 🕹️"*

Este comportamiento aplica de forma consistente a todos los tipos de tarea: **todas las completadas se mueven al fondo de su bloque con tachado y autoría visible**. Esto genera:
- Sensación de progreso ("hemos hecho 3 de 5")
- Reconocimiento del trabajo del otro en tiempo real
- Coherencia visual en todos los tipos de asignación

### Ordenación dentro de cada bloque

1. Urgentes primero (Urgencia = Alta)
2. Resto por orden manual (drag & drop disponible)
3. Completadas siempre al fondo, con tachado

---

## 8. Decisiones pendientes

| Decisión | Contexto | Prioridad |
| --- | --- | --- |
| **¿Categoría obligatoria en tarea propia?** | Necesaria para métricas por categoría; añade fricción mínima | Alta |
| **¿Balance Score muestra número o zona semántica?** | Número (54) vs. "equilibrado". Decidido: número | ✅ Cerrado |
| **Umbral de racha** | Semanas sin tareas vencidas más de N días. Decidido: 2 días | ✅ Cerrado |
| **Tareas fijas en Balance Score** | Decidido: sí cuentan, marcadas como "acordadas" | ✅ Cerrado |
| **Tareas diarias expiradas** | No generan deuda, no aparecen en home, no afectan métricas principales | ✅ Cerrado |
| **Schema de base de datos** | Tablas `tasks`, `task_instances`, `task_completions`, `task_catalog`, RLS | Pendiente |
| **Modelo de recurrencia en BD** | Instancias generadas on-the-fly vs. pre-generadas; gestión del estado `expired` | Pendiente |
| **Notificaciones / recordatorios** | Vía email o push; vinculado al campo "Cuándo" y fecha límite | v2 |
| **Extensión a Eventos** | Campos específicos: hora inicio/fin | v2 |
| **Extensión a Gastos** | Nueva dimensión del Balance Score | v2 |

---

*Este documento refleja las decisiones tomadas durante la sesión de diseño de producto de marzo 2026. Debe actualizarse conforme avance la implementación y surjan nuevas decisiones técnicas o de producto.*
