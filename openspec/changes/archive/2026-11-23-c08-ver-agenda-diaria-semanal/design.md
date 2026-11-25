# Diseño de C-08

## Consulta y calendario

`AgendaDiaria` y `AgendaSemanal` reutilizan la lectura y el filtrado por recursos. La raíz de composición proporciona la zona horaria del consultorio. La semana es la semana calendario que contiene la fecha pedida y devuelve siete grupos en orden, de lunes a domingo, incluidos los días vacíos. Un bloqueo figura en cada día local tocado por su intervalo semiabierto.

## Visibilidad y ocupación

El actor determina el ámbito de consulta antes de leer los repositorios. Ambos filtros, cuando se informan juntos, exigen coincidencia con los dos identificadores. El resultado conserva el estado del turno y las referencias al paciente, a la prestación, al profesional y al sillón. El campo `ocupa` utiliza `esActivo` y refleja DD-05.
