# Flujos Principales

Flujos extremo a extremo del MVP. Las validaciones de agenda residen en el **dominio** (módulo puro); los adaptadores solo traducen entrada y salida.

## Flujo 1: Dar un turno (recepción)

**Disparador**: la recepción registra un turno.
**Actor**: recepción (o administrador).

**Pasos**:
1. La recepción elige paciente (existente o alta rápida), prestación, profesional, sillón y fecha/hora de inicio.
2. Caso de uso `AgendarTurno` obtiene la prestación y calcula `fin = inicio + duración` (RN-06).
3. Dominio valida: profesional y sillón activos; dentro de HorarioAtencion y fuera de BloqueoHorario (RN-07).
4. Dominio consulta turnos activos del profesional y del sillón en el rango y verifica que no haya solapamiento con la regla `a1 < b2 && b1 < a2` (RN-02, RN-03, RN-05).
5. En una operación atómica (RN-12) se persiste el turno en estado `reservado`/`confirmado` y se programa el recordatorio.
6. Se devuelve el turno creado.

```
Recepción → Caso de uso AgendarTurno → Dominio (reglas) → Repositorio (atómico)
                                              ← turno / error RN-XX
```

**Casos de error**:
- Solapamiento por profesional o sillón → rechazo con `RN-02`/`RN-03` y turno en conflicto.
- Fuera de horario o sobre bloqueo → rechazo con `RN-07`.
- Intento de forzar (sobreturno) → rechazo con `RN-04`.
- Recurso inactivo → rechazo.

## Flujo 2: Reserva online del paciente

**Disparador**: el paciente abre el enlace público.
**Actor**: paciente.

**Pasos**:
1. El paciente elige la prestación.
2. `ConsultarDisponibilidad` calcula huecos donde existan a la vez un profesional habilitado y un sillón libres para la duración completa (RN-13).
3. El paciente elige un horario e informa sus datos mínimos (DNI y teléfono; pregunta abierta) y consentimiento de contacto.
4. `ReservarOnline` reutiliza `AgendarTurno` (mismas reglas, sin excepciones por canal); el sistema asigna el sillón.
5. Se genera `tokenGestion` y se envía e-mail de confirmación con el enlace.

**Casos de error**:
- El hueco se ocupó entre la consulta y la reserva (carrera) → rechazo por RN-12 y se vuelve a ofrecer disponibilidad.
- Datos inválidos → validación de entrada.

## Flujo 3: Reprogramar un turno

**Disparador**: recepción o paciente pide mover el turno.
**Actor**: recepción, administrador o paciente (con token).

**Pasos**:
1. Se identifica el turno (recepción por búsqueda; paciente por token).
2. Si el actor es paciente: se verifica `inicio - ahora >= 24 h` (RN-08); si no, se indica contactar a recepción.
3. Se valida el nuevo horario con RN-01 a RN-07 **excluyendo el propio turno** de la comparación (RN-11).
4. Si pasa, se actualiza el turno (nuevo `inicio`/`fin`, recursos) en una operación atómica; el horario original queda libre (RN-09).
5. Se reprograma el recordatorio.

**Casos de error**: nuevo horario inválido → turno original intacto; paciente con menos de 24 h → rechazo por `RN-08`.

## Flujo 4: Cancelar un turno

**Disparador**: recepción o paciente cancela.

**Pasos**:
1. Se identifica el turno; si el actor es paciente, se aplica RN-08.
2. Estado pasa a `cancelado`, con `canceladoPor` y `canceladoEn`.
3. El horario del profesional y del sillón queda libre (RN-09).
4. Se cancelan los recordatorios pendientes.
5. (DIF, fuera de MVP) Se ofrecería el hueco a la lista de espera.

**Casos de error**: turno ya cancelado o atendido → rechazo; paciente con menos de 24 h → `RN-08`.

## Flujo 5: Bloquear horarios

**Disparador**: el odontólogo (o recepción/administrador) crea un bloqueo.

**Pasos**:
1. Se valida que el odontólogo solo bloquee su propia agenda.
2. Se buscan turnos activos que se solapen con el bloqueo.
3. Si no hay, se crea; si hay, el sistema informa los conflictos y no crea el bloqueo hasta que se reprogramen o cancelen (suposición provisoria DD-06).
4. Desde el bloqueo, los turnos nuevos que lo toquen son rechazados (RN-07).

## Flujo 6: Recordatorio y confirmación

**Disparador**: se alcanza `programadoPara` (24 h antes por defecto).
**Actor**: sistema y recepción.

**Pasos**:
1. El sistema genera el recordatorio por e-mail con enlace de confirmación/cancelación.
2. Para `wa.me`, genera la URL con el mensaje armado y la deja en la lista de pendientes de la recepción.
3. La recepción abre el enlace, envía el mensaje desde su WhatsApp y marca el recordatorio como enviado.
4. El paciente confirma desde el enlace: el turno pasa a `confirmado`.

**Casos de error**: e-mail fallido → estado `fallido` y aviso a recepción; paciente sin consentimiento de contacto → no se envía.

## Flujo 7: Cierre del turno

Después de la hora del turno: el odontólogo o la recepción marca `atendido` o `ausente`. `ausente` no ocupa recursos y alimenta el tablero futuro de ausentismo (DIF).
