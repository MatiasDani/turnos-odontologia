# Tasks

## 1. Preparación y decisiones registradas

- [x] 1.1 Agregar RN-26 a `knowledge-base/05_reglas_de_negocio.md` (elegibilidad `wa.me`, URL codificada sin token, lista de pendientes y transición `pendiente → enviado` idempotente) y ampliar RN-14 con su precisión; verificar con `grep` que ambos textos aparecen
- [x] 1.2 Agregar DD-24 a `knowledge-base/09_decisiones_y_supuestos.md` (decorador sobre `Recordatorios`, teléfono compartido, mensaje sin token, marca por id, filtros de canal) y marcar US-012 como cubierta a nivel de caso de uso en `knowledge-base/06_funcionalidades.md`; verificar con `grep`
- [x] 1.3 Verificar con `npm run typecheck` y `npm test` que la baseline (46 archivos / 773 tests) está en verde antes de escribir código

## 2. Dominio: teléfono, elegibilidad, URL y transición

- [x] 2.1 Extraer `normalizarTelefonoArgentino` a `src/domain/reglas/telefono.ts` y hacer que `validarDatosPacienteOnline` lo importe sin cambiar su comportamiento; verificar con `tests/domain/reglas/telefono.test.ts` los escenarios "Prefijo de otro país se rechaza", "Teléfono con longitud fuera de rango se rechaza" y el normalizado de `+54 9 11 0000-0001` (rojo → verde)
- [x] 2.2 Ampliar `Recordatorio` con `canal: 'email' | 'wa_me'` y `enlaceWaMe?: string`, conservando opcional el campo para los registros `email` existentes; verificar con `npm run typecheck`
- [x] 2.3 Agregar `debeProgramarseWaMe` en `src/domain/reglas/recordatorios.ts` sin tocar `debeProgramarse`; verificar los escenarios "Sin consentimiento no se genera el `wa.me`", "Sin e-mail sí se genera el `wa.me`" y los rechazos de teléfono (rojo → verde)
- [x] 2.4 Agregar `armarEnlaceWaMe` (teléfono de solo dígitos y `encodeURIComponent` del mensaje con fecha/hora de `formatearFechaHoraLocal`, prestación, profesional y consultorio) en reglas puras; verificar los cinco escenarios de "URL `wa.me` codificada y mensaje mínimo" con títulos idénticos a los del spec (rojo → verde)
- [x] 2.5 Agregar la regla pura de transición que devuelve el recordatorio `enviado` o un error tipado; verificar con `tests/domain/reglas/recordatorio-wa-me.test.ts` los tres escenarios de error y el caso idempotente (rojo → verde)

## 3. Decorador de programación

- [x] 3.1 Crear `src/application/recordatorios-wa-me.ts` con `RecordatoriosConWaMe implements Recordatorios`: delega `cancelarPendientes` al interno y, en `programar`, programa el e-mail y reemplaza/crea el `wa_me` `pendiente` conservando su `id`; verificar "Alta de recepción programa el `wa.me`", "Anticipación configurada", "Programar dos veces no duplica el `wa.me`" y "Turno movido reprograma el `wa.me`" (rojo → verde)
- [x] 3.2 Verificar "Reserva online programa el `wa.me`" y "Alta rechazada no programa recordatorios" cableando el decorador en el `agendar` de `ReservarOnline` (rojo → verde)
- [x] 3.3 Acotar `RecordatoriosEmail.programar` a `canal === 'email'` y verificar el escenario "Programar el e-mail conserva el `wa.me` pendiente" del delta de `recordatorios-turno`, sin editar las suites existentes de C-12 (rojo → verde)

## 4. Lista y marca manual para recepción

- [x] 4.1 Crear `ListarRecordatoriosPendientesWaMe` con el DTO `RecordatorioWaMePendiente` (solo `id`, `turnoId`, `enlaceWaMe`, `programadoPara`), filtrando `pendiente` + `wa_me` y ordenando por `programadoPara`; verificar los cuatro escenarios de "Lista de `wa.me` pendientes para recepción" con títulos idénticos a los del spec (rojo → verde)
- [x] 4.2 Crear `MarcarRecordatorioEnviado` con `ErrorMarcarRecordatorio` (`RECORDATORIO_NO_ENCONTRADO`, `ESTADO_NO_ENVIABLE`) y `enviadoEn = reloj.ahora()`; verificar los seis escenarios de "Marcar el `wa.me` como enviado" con títulos idénticos a los del spec (rojo → verde)

## 5. Independencia de canales

- [x] 5.1 Filtrar `canal === 'email'` en `EnviarRecordatoriosPendientes.ejecutar` y verificar "El barrido de e-mail ignora los `wa.me`" y "El barrido no envía los `wa.me`" (rojo → verde)
- [x] 5.2 Verificar "Cancelar el turno anula ambos canales" y "Marcar enviado el `wa.me` no reenvía el e-mail" sobre el fixture compartido (rojo → verde)

## 6. Integración y verificación

- [x] 6.1 Extender `tests/fixtures/sistema-recordatorios.ts` con la opción `conWaMe` (por defecto `false`) que inyecta el decorador en alta, reserva y cancelación y expone los dos casos de uso nuevos; verificar que las suites de C-01, C-10, C-11 y C-12 quedan en verde sin editarse
- [x] 6.2 Ejecutar `npm run typecheck` y `npm test` completos, confirmar 0 fallos y que ningún test cambió de comportamiento
- [x] 6.3 Ejecutar `openspec validate c13-recordatorio-wa-me --strict --no-interactive` y verificar 4/4 artefactos (proposal, design, 2 specs, tasks) antes de archivar

## Workflow follow-up

- Aplicar con `/opsx:apply` respetando TDD estricto y las reglas duras de `AGENTS.md`.
- Archivar con `/opsx:archive`, marcar C-13 como `[x]` en `CHANGES.md` y ejecutar `openspec validate --all`.
- Commitear con mensaje conventional en español y usuario `Luka Garro <luka.f.garro@gmail.com>`, pushear `c13-recordatorio-wa-me` y hacer merge a `main` con `git merge --ff-only` seguido de `git push origin main`, igual que C-11.
