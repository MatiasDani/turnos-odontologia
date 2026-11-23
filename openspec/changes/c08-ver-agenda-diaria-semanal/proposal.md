# C-08 Agenda diaria y semanal

## Why

US-002 requiere que el equipo del consultorio pueda consultar la ocupación por día o semana y por recurso. Los bloqueos registrados en C-06 deben aparecer junto a los turnos.

## What Changes

- Agregar consultas de agenda diaria y semanal con filtros por profesional y sillón.
- Limitar al odontólogo a su propia agenda y permitir a recepción y administración consultar la agenda del consultorio.
- Conservar el estado de cada turno e indicar si ocupa recursos según DD-05.
- Exponer los casos de uso desde el núcleo de la aplicación para que los consuma la futura interfaz de C-15.

## Impact

- Capacidad nueva: `consulta-agenda`.
- Dependencias: C-01 y C-06. La identificación del actor corresponde a C-09.
