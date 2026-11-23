# Proposal

## Why

C-10 entrega al paciente un token de gestión y C-12 lo pone en el enlace del recordatorio, pero hoy ese token solo sirve para confirmar: US-010 (ver, cancelar y reprogramar el propio turno desde el enlace) sigue sin cubrirse y es el eslabón que falta en el camino crítico `C-01 → C-02 → C-03 → C-11 → C-14`. Sin estos casos de uso, el paciente tendría que llamar a recepción incluso para consultar su horario o moverlo con más de 24 h de anticipación.

## What Changes

- Se agregan tres operaciones públicas por token vigente: ver el propio turno, cancelarlo y reprogramarlo. El token se resuelve con `ServicioTokens.resolver` (hash SHA-256); no se acepta un `turnoId` ni un rol desde el pedido.
- Ver devuelve solo `turnoId`, `inicio`, `fin`, el nombre de la prestación y el nombre y apellido del profesional (DD-18): sin sillón, id de paciente ni token.
- Cancelar y reprogramar delegan en `CancelarTurno` (C-02) y `ReprogramarTurno` (C-03) con actor `paciente`, sin duplicar RN-08, RN-09, RN-10 ni la revalidación atómica de RN-11/RN-12.
- RN-08 se traduce al límite público: con menos de 24 h se rechaza con un código fijo que indica al paciente que contacte al consultorio, sin cancelar ni mover y sin exponer el código interno. Con 24 h exactas se permite (umbral inclusivo).
- Un token inexistente, vencido, rotado o de un turno cancelado se rechaza con el mismo error genérico de enlace inválido de C-12, sin revelar motivo ni estado. Ningún error público incluye datos de otros pacientes, turnos, recursos ni el token.
- Reprogramar conserva el token vigente: `resolver` calcula la vigencia con el `fin` actual del turno, y RN-21 solo exige rotar en cada envío de recordatorio (C-12).
- La frontera pública no expone `actor`, `rol`, `sillonId`, `duracionMinutos` ni `forzar` (RN-04, RN-16, DD-18). El cableo HTTP (`GET/POST /public/turnos/:token`) queda para C-14.

## Capabilities

### New Capabilities

- `gestion-turno-online-por-token`: acceso del paciente a su propio turno mediante token vigente para consultarlo, cancelarlo y reprogramarlo, con errores públicos sin filtrado de datos y límite de anticipación.

### Modified Capabilities

(ninguna: `reserva-online`, `recordatorios-turno`, `cancelacion-turnos` y `reprogramacion-turnos` conservan sus requisitos; C-11 solo reutiliza sus contratos y errores)

## Impact

- **Aplicación**: tres casos de uso públicos con DTOs de entrada/salida y errores de conjunto cerrado; reutilización sin cambios de `ServicioTokens`, `CancelarTurno` y `ReprogramarTurno`.
- **Dominio**: sin reglas nuevas. RN-08, RN-09, RN-10, RN-11, RN-12, RN-15 y RN-21 ya están en `knowledge-base/05_reglas_de_negocio.md`; se registra la decisión de traducción de errores y de no rotación en DD-23.
- **Adaptadores**: sin servidor ni dependencias nuevas; se extienden solo las fixtures de test para cablear token, cancelación y reprogramación sobre los mismos repositorios.
- **Tests**: una suite nueva con un test por escenario del spec; las suites de C-02, C-03, C-10 y C-12 deben seguir en verde sin modificar su comportamiento.
- **KB y roadmap**: DD-23 en `knowledge-base/09_decisiones_y_supuestos.md`; US-010 queda cubierta a nivel de caso de uso; `CHANGES.md` se marca `[x]` recién al archivar.
- **Sin UI ni HTTP**: las pantallas y el cableo de rutas son C-14; este change expone solo casos de uso, DTOs y errores públicos.
