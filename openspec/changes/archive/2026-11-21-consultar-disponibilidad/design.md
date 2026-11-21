# Design

## Context

Ver `proposal.md` (Why) y `specs/disponibilidad-turnos/spec.md` (requisitos). Estado actual relevante del código de C-01:

- `validarAlta(entrada)` (`src/domain/reglas/validar-alta.ts`) es la única fuente de evaluación de reglas del alta, con orden fijo RN-18 → RN-16 → RN-06 → RN-07/RN-17 → bloqueos → RN-02 → RN-03. Es pura y recibe ya cargados horarios, bloqueos y turnos.
- `validarHorario` solo evalúa el horario del consultorio (los horarios con `profesionalId` se ignoran; el horario por profesional es C-05).
- `aHoraLocal(instante, zona)` (`src/domain/tiempo.ts`) convierte UTC → día de semana y minutos locales. No existe la conversión inversa (hora local → instante).
- Repositorios: profesionales, sillones y prestaciones solo tienen `obtenerPorId`; `TurnoRepositorio.listarPorRecursos(p, s)` y `BloqueoRepositorio.listarPorRecursos(p, s, intervalo)` ya existen.
- No hay puerto `Reloj` (llega con C-02). Regla dura 3: nada de `new Date()` / `Date.now()` sin argumentos en `src/domain`.
- Decisiones de explore ya registradas en la KB: RN-13 refinada y DD-12.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de verdad: todo combo ofrecido pasa `validarAlta`; cero lógica de solapamiento, horario o bloqueo duplicada.
- Salida determinista y reproducible en tests.
- Generación de candidatos pura y testeable sin repositorios.

**Non-Goals:**
- Horario por profesional (C-05), `requiereSillonIds` (pregunta abierta), validar habilitación en `AgendarTurno` (posible RN-19).
- Reservar o retener el hueco; capa HTTP; UI; paginación; caché.
- Optimización por resta de intervalos libres.

## Decisions

### D1. Estrategia: enumerar candidatos y evaluarlos con `validarAlta`
Para cada inicio candidato × profesional habilitado × sillón del consultorio se arma una `EntradaValidacion` y se llama `validarAlta`; el combo se ofrece si `ok`. Inactivos (RN-18), bloqueos (RN-07), tramos (RN-07/RN-17) y solapamientos (RN-02/RN-03) se descartan por la misma función que usa el alta. Así el escenario "Todo hueco ofrecido se puede agendar" se cumple por construcción.
*Alternativas*: resta de intervalos libres por recurso e intersección (más rápida, pero reimplementa RN-07/RN-17/RN-02/RN-03 y puede divergir del alta); prefiltrar inactivos antes de `validarAlta` (se permite como optimización solo si no cambia el resultado; la decisión la toma `validarAlta`).

### D2. Validaciones previas (una vez por consulta) y orden de errores
Antes de enumerar, en este orden: (1) rango, (2) paso → `ConsultaInvalidaError`; (3) prestación inexistente, (4) profesional del filtro inexistente → `RecursoNoEncontradoError`; (5) prestación inactiva → `ReglaNegocioError` `RN-18`; (6) duración con `validarDuracion(actor, prestacion, duracionMinutos)` → `ReglaNegocioError` `RN-16`/`RN-06`. Rango y paso se validan primero porque no requieren I/O. Las violaciones de (5) y (6) son de la consulta entera, no de un candidato, por eso lanzan en vez de devolver vacío; los rechazos de `validarAlta` por candidato nunca lanzan, solo descartan.

### D3. Error tipado nuevo `ConsultaInvalidaError` (no `ReglaNegocioError`)
`src/domain/errores.ts` suma `ConsultaInvalidaError extends Error` con `campo: 'rango' | 'paso'` y `motivo: string`. No se amplía `CodigoRN` porque rango y paso son límites de la consulta (validación de entrada, ver RN-13), no reglas de agenda: no determinan si un turno es válido. Mantiene `CodigoRN` cerrado a reglas reales y deja RN-19 libre para la pregunta abierta.
*Alternativa*: `ReglaNegocioError` con un RN nuevo (mezclaría validación de entrada con reglas de agenda; rompería la convención de `ReglaNegocioError` = regla del dominio).

### D4. Contrato de entrada y salida
`ConsultarDisponibilidadInput` (`src/application/consultar-disponibilidad-input.ts`): `actor: Actor`, `prestacionId`, `rango: { desde: Date; hasta: Date }`, `ahora: Date`, `duracionMinutos?`, `pasoMinutos?` (por defecto 15), `profesionalId?`. Sin campo de forzado (RN-04).
Salida: `readonly Hueco[]` con `Hueco = { inicio: Date; fin: Date; profesionalId: string; sillonId: string }` (`src/domain/disponibilidad/hueco.ts`).
`ahora` es un parámetro explícito: el caso de uso no lee el reloj. Cuando exista el `Reloj` de C-02, quien llama (C-10, HTTP) pasa `reloj.ahora()`. Los tests pasan instantes fijos del seed.

### D5. Generación pura de candidatos (`src/domain/disponibilidad/generar-candidatos.ts`)
`generarInicios({ rango, ahora, zona, horarios, pasoMinutos })` → `Date[]` ordenados:
1. Recorre las fechas de calendario locales desde la fecha local de `desde` hasta la de `hasta` (aritmética de calendario sobre año/mes/día, sin sumar 24 h a instantes).
2. Para cada fecha toma los tramos del consultorio de ese día de semana (`profesionalId` indefinido, igual que `validarHorario`) y genera minutos `tramo.desde + k·paso` con `< tramo.hasta`.
3. Convierte (fecha local, minutos) → instante con una función nueva `deHoraLocal(fecha, minutos, zona)` en `tiempo.ts`: estima el instante en UTC, mide el desfase con `aHoraLocal`/`Intl` y corrige (sin dependencias, DD-09). Se testea ida y vuelta con `aHoraLocal`.
4. Conserva solo inicios con `desde <= inicio < hasta` y `inicio >= ahora`.
El ajuste del fin al tramo (cierre, corte del mediodía) no se resuelve acá: lo decide `validarAlta` (D1). El generador no usa `new Date()` sin argumentos.

### D6. Orden determinista y agrupación
El caso de uso ordena profesionales y sillones por `id` (comparación de strings) antes de enumerar e itera inicio → profesional → sillón, por lo que la salida queda en orden (inicio, profesionalId, sillonId) sin depender del repositorio. `agruparPorHorario(huecos)` (`src/domain/disponibilidad/agrupar-huecos.ts`) es pura: devuelve `{ inicio, fin, opciones: { profesionalId, sillonId }[] }[]` agrupando por `inicio`+`fin` y preservando el orden de entrada. C-10 tomará `opciones[0]`.

### D7. Puertos y carga de datos
Se agregan `listarPorConsultorio(consultorioId)` a `ProfesionalRepositorio` y `SillonRepositorio` (y a sus adaptadores en memoria). El consultorio se obtiene de `prestacion.consultorioId`. Turnos y bloqueos se cargan una vez por par (profesional, sillón) con los métodos existentes `listarPorRecursos` (bloqueos con el intervalo `[desde, hasta + duración)`), y se reutilizan para todos los inicios del par. Es lectura pura: no pasa por `agregarSiDisponible` ni toma la sección crítica.

### D8. Complejidad
O(D · I · P · S · (T + B)), con D ≤ 31 días, I ≈ 32 inicios por día con paso 15, P ≤ 5, S ≤ 3 y T + B turnos y bloqueos del par. Peor caso ≈ 15 000 llamadas a `validarAlta` con listas chicas: aceptable para el segmento (consultorios de 1-5 profesionales). El tope de 31 días es la cota.

### D9. Estrategia de pruebas (TDD estricto)
Unitarias puras: `deHoraLocal`, `generarInicios` (paso, alineación por tramo, rango semiabierto, `ahora`, fin de semana) y `agruparPorHorario`. De caso de uso: un `test` por escenario del spec con el título idéntico, agrupados en `describe` por requisito, en `tests/application/consultar-disponibilidad.test.ts`, usando `crearSistema` extendido con `consultarDisponibilidad` y un helper `consultar(sistema, {...})` con los valores por defecto del contexto común del spec. Solo datos ficticios del seed.

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-21. C-07 es un caso de uso de lectura sin pantallas; la UI que lo consume es C-14.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Risks / Trade-offs

- [Disponibilidad ofrece solo profesionales habilitados pero `AgendarTurno` no lo exige] → documentado como pregunta abierta (posible RN-19); el escenario de consistencia sigue valiendo porque el alta es más permisiva.
- [Carrera entre consulta y alta] → la consulta no reserva; RN-12 rechaza en el alta y C-10 vuelve a consultar.
- [Conversión hora local → UTC en cambios de offset] → `deHoraLocal` corrige con el desfase medido; Buenos Aires no tiene horario de verano, pero se testea ida y vuelta.
- [Costo de enumeración] → acotado por 31 días y el tamaño del consultorio (D8).
- [El horario por profesional (C-05) cambiará `validarHorario`] → como la disponibilidad delega en `validarAlta`, hereda el cambio sin tocar este change.

## Migration Plan

Cambios aditivos: métodos nuevos en puertos y adaptadores en memoria, un error nuevo y módulos nuevos. No se modifica el comportamiento de `AgendarTurno` ni sus tests. Rollback: revertir los commits del change.

## Open Questions

- Si C-10 necesitará paginar o limitar cantidad de combos para la vista pública (no cambia el contrato de este change).
