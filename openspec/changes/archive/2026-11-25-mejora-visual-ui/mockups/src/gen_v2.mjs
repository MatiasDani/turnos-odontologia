// Genera los mockups v2 (minimalistas) de las direcciones A y B con la misma estructura.
// Uso (desde la raíz del repo): node openspec/changes/mejora-visual-ui/mockups/src/gen_v2.mjs
// Solo datos ficticios.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mockups = join(dirname(fileURLToPath(import.meta.url)), '..');
const DS = '../../../../design-system';

const direcciones = {
  a: { nombre: 'A · Cálido sereno', paleta: 'paleta-a.css' },
  b: { nombre: 'B · Clínico calmo', paleta: 'paleta-b.css' },
};

const isotipo = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.6 3.5C5 3.5 3.5 5.6 3.5 8.2c0 2.2.9 3.6 1.5 5.2.8 2.1.9 7.1 2.7 7.1 1.6 0 1.5-4.7 4.3-4.7s2.7 4.7 4.3 4.7c1.8 0 1.9-5 2.7-7.1.6-1.6 1.5-3 1.5-5.2 0-2.6-1.5-4.7-4.1-4.7-1.9 0-2.8 1.1-4.4 1.1S9.5 3.5 7.6 3.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ico = {
  prev: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

const marca = (href = 'portada') =>
  `<a class="brand" href="{{D}}-${href}.html" aria-label="Turnos Odonto, inicio">${isotipo}<b data-brand-name>Turnos Odonto</b></a>`;

function pagina(d, titulo, nota, cuerpo, claseBody = '') {
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<link rel="stylesheet" href="${DS}/${direcciones[d].paleta}">
<link rel="stylesheet" href="v2.css">
</head>
<body${claseBody ? ` class="${claseBody}"` : ''}>
${cuerpo.replaceAll('{{D}}', d)}
<span class="mock-note" aria-hidden="true">Mockup v2 · ${direcciones[d].nombre} · ${nota}</span>
<script src="${DS}/brand.js"></script>
<script src="brand-propuesto.js"></script>
</body>
</html>
`;
}

// ---------- Portada ----------
const portada = `<div class="p-shell">
  <header class="p-head">${marca()}<span>Consultorio Odontológico Demo</span></header>
  <main id="contenido" class="p-hero" tabindex="-1">
    <h1>Tu próximo turno, sin llamar ni esperar.</h1>
    <p>Elegí la prestación, el día y el horario que te quedan bien. Te confirmamos por mail.</p>
    <div class="p-cta">
      <a class="btn btn-primary" href="{{D}}-reserva-1.html">Reservar turno</a>
      <a class="link" href="#">Soy del consultorio</a>
    </div>
  </main>
  <footer class="p-foot">
    <div class="p-trust"><span>Cancelás o reprogramás online hasta 24 h antes</span><span>Tus datos se usan solo para tu turno (Ley 25.326)</span></div>
  </footer>
</div>`;

// ---------- Reserva ----------
const progreso = (n) => `<div class="progress" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</div>`;
const encabezadoReserva = `<header class="r-head">${marca()}<span>Consultorio Odontológico Demo</span></header>`;
const prestaciones = [['Consulta/control', 30], ['Limpieza', 45], ['Extracción simple', 60], ['Endodoncia', 90]];
const reserva1 = `${encabezadoReserva}
<main id="contenido" class="r-main" tabindex="-1">
  <div id="app">
    ${progreso(1)}
    <p class="step-label">Paso 1 de 4 · Prestación</p>
    <h1>¿Qué necesitás?</h1>
    <p class="lead">La duración es aproximada y la define el consultorio.</p>
    <fieldset class="rows"><legend class="visually-hidden">Prestación</legend>
      ${prestaciones.map(([n, m], i) => `<label class="choice${i === 0 ? ' is-on' : ''}"><input type="radio" name="prestacion"${i === 0 ? ' checked' : ''}><span class="dot"></span><span class="grow">${n}</span><span class="dur num">${m} min</span></label>`).join('\n      ')}
    </fieldset>
    <div class="r-actions"><a class="link" href="{{D}}-portada.html">Volver al inicio</a><button type="button" class="btn btn-primary">Continuar</button></div>
    <p class="r-note">Podés cancelar o reprogramar online hasta 24 h antes del turno.</p>
  </div>
</main>`;

const dias = [['lun', 23, true], ['mar', 24], ['mié', 25], ['jue', 26], ['vie', 27], ['sáb', 28, true], ['dom', 29, true]];
const manana = ['09:00', '09:30', '10:00', '11:30', '12:00'];
const tarde = ['15:00', '15:30', '16:00', '16:30', '17:30', '18:00', '18:30'];
const slots = (lista, elegido) => `<div class="slots">${lista.map((h) => `<button type="button" class="slot${h === elegido ? ' chosen' : ''}"${h === elegido ? ' aria-pressed="true"' : ''}>${h}</button>`).join('')}</div>`;
const reserva2 = `${encabezadoReserva}
<main id="contenido" class="r-main" tabindex="-1">
  <div id="app">
    ${progreso(2)}
    <p class="step-label">Paso 2 de 4 · Día y horario</p>
    <h1>¿Cuándo te queda bien?</h1>
    <div class="summary-line"><span>Consulta/control · <span class="num">30 min</span></span><a class="link" href="{{D}}-reserva-1.html">Cambiar</a></div>
    <p class="field-label">Profesional</p>
    <div class="pills" role="group" aria-label="Profesional"><button type="button" aria-pressed="true">Cualquiera</button><button type="button" aria-pressed="false">Ana Ejemplo</button><button type="button" aria-pressed="false">Bruno Muestra</button></div>
    <p class="field-label">Noviembre</p>
    <div class="days">${dias.map(([d, n, off]) => `<button type="button" class="day${n === 25 ? ' chosen' : ''}"${off ? ' disabled' : ''} aria-label="${d} ${n}${off ? ', sin horarios' : ''}"><small>${d}</small><b class="num">${n}</b></button>`).join('')}</div>
    <section class="slot-group"><h2>Mañana</h2>${slots(manana, '10:00')}</section>
    <section class="slot-group"><h2>Tarde</h2>${slots(tarde)}</section>
    <div class="r-actions"><a class="link" href="{{D}}-reserva-1.html">Atrás</a><button type="button" class="btn btn-primary">Continuar</button></div>
  </div>
</main>`;

// ---------- Recepción ----------
const INI = 9 * 60;
const fila = (h, m) => (h * 60 + m - INI) / 15 + 1;
const hhmm = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
const ESTADO = { reservado: 'Reservado', confirmado: 'Confirmado', atendido: 'Atendido', ausente: 'Ausente' };
function turno(nombre, prest, h, m, dur, estado, sel = false) {
  const ini = hhmm(h * 60 + m), fin = hhmm(h * 60 + m + dur), n = dur / 15;
  const det = n <= 2 ? `<span>${ESTADO[estado]} · ${prest}</span>` : `<span>${prest} · <span class="num">${ini}–${fin}</span></span><span>${ESTADO[estado]}</span>`;
  return `<button class="appt ${estado}${sel ? ' sel' : ''}" type="button" style="--s:${fila(h, m)};--n:${n}" aria-label="${ini}, ${nombre}, ${prest}, ${ESTADO[estado]}"><b>${nombre}</b>${det}</button>`;
}
const cerrado = (h1, h2) => `<div class="closed" style="--s:${fila(h1, 0)};--n:${(h2 - h1) * 4}">Fuera de horario</div>`;
const bloqueo = (h, m, dur, motivo) => `<button class="blocked" type="button" style="--s:${fila(h, m)};--n:${dur / 15}" aria-label="Bloqueado de ${hhmm(h * 60 + m)} a ${hhmm(h * 60 + m + dur)}, ${motivo}"><b>Bloqueado</b> · ${motivo}</button>`;
const cols = [
  ['Sillón 1', 'Ana Ejemplo', [cerrado(13, 15), turno('Carla Prueba', 'Consulta/control', 9, 0, 30, 'confirmado'), turno('Paciente Ficticio 3', 'Limpieza', 10, 0, 45, 'reservado', true), turno('Paciente Ficticio 6', 'Consulta/control', 12, 0, 30, 'atendido'), bloqueo(16, 30, 60, 'Capacitación')]],
  ['Sillón 2', 'Bruno Muestra', [cerrado(13, 15), turno('Paciente Ficticio 9', 'Consulta/control', 9, 30, 30, 'ausente'), turno('Diego Modelo', 'Extracción simple', 11, 0, 60, 'confirmado'), turno('Paciente Ficticio 4', 'Endodoncia', 15, 0, 90, 'reservado'), turno('Paciente Ficticio 5', 'Consulta/control', 17, 30, 30, 'reservado')]],
  ['Sillón 3', 'Ana Ejemplo', [cerrado(13, 15), turno('Paciente Ficticio 7', 'Limpieza', 9, 30, 45, 'confirmado'), turno('Paciente Ficticio 8', 'Consulta/control', 15, 30, 30, 'reservado')]],
];
const grilla = `<div class="agenda" style="--cols:${cols.length}">
  <div class="ag-head corner"><span class="visually-hidden">Hora</span></div>
  ${cols.map(([t, s]) => `<div class="ag-head">${t}<small>${s}</small></div>`).join('')}
  <div class="ag-times">${Array.from({ length: 10 }, (_, i) => `<span class="num">${hhmm(INI + i * 60)}</span>`).join('')}</div>
  ${cols.map(([, , c]) => `<div class="ag-col">${c.join('')}</div>`).join('\n  ')}
</div>`;
const leyenda = `<div class="legend" aria-label="Estados">${Object.entries(ESTADO).map(([k, v]) => `<span><i style="background:var(--v-${{ reservado: 'res', confirmado: 'conf', atendido: 'at', ausente: 'aus' }[k]}-mark)"></i>${v}</span>`).join('')}</div>`;
const recordatorios = [['Carla Prueba', 'Mañana 09:00 · Consulta/control'], ['Diego Modelo', 'Mañana 11:00 · Extracción simple']];
const recepcion = `<div class="rc">
  <header class="bar topbar">
    ${marca()}
    <span class="sep" aria-hidden="true"></span>
    <span id="consultorio" class="consul">Consultorio Odontológico Demo</span>
    <span class="grow"></span>
    <div class="who"><span id="usuario-email">recepcion@demo.test</span><span class="dot" aria-hidden="true">·</span><span id="usuario-rol" class="role">Recepción</span></div>
    <button id="salir" class="btn btn-quiet" type="button">Salir</button>
  </header>
  <div class="toolbar" role="toolbar" aria-label="Agenda">
    <div class="datenav">
      <button id="anterior" class="icon-btn" type="button" aria-label="Anterior">${ico.prev}</button>
      <button id="hoy" class="btn btn-quiet" type="button">Hoy</button>
      <button id="siguiente" class="icon-btn" type="button" aria-label="Siguiente">${ico.next}</button>
      <h1 id="titulo">Martes 24 de noviembre</h1>
      <label class="visually-hidden" for="fecha">Fecha</label><input id="fecha" type="date" value="2026-11-24">
    </div>
    <span class="grow"></span>
    <div class="views">
      <div class="seg" role="group" aria-label="Vista"><button id="v-dia" type="button" aria-pressed="true">Día</button><button id="v-semana" type="button" aria-pressed="false">Semana</button></div>
      <div id="modo" class="seg quiet" role="group" aria-label="Columnas"><button id="m-sillon" type="button" aria-pressed="true">Por sillón</button><button id="m-profesional" type="button" aria-pressed="false">Por profesional</button></div>
    </div>
    <span class="sep" aria-hidden="true"></span>
    <div class="rc-actions">
      <button id="btn-bloquear" class="btn btn-quiet" type="button">Bloquear horario</button>
      <button id="btn-dar-turno" class="btn btn-primary" type="button">${ico.plus}Dar turno</button>
    </div>
  </div>
  <main id="contenido" class="ws" tabindex="-1">
    <section id="agenda" aria-label="Agenda" aria-busy="false">
      <div class="ag-top">${leyenda}<span class="num">10 turnos · 1 bloqueo</span></div>
      <div class="agenda-scroll agenda-wrap" role="region" aria-label="Agenda del martes 24 de noviembre por sillón" tabindex="0">${grilla}</div>
    </section>
    <div id="panel">
      <aside class="wa" aria-labelledby="wa-t">
        <h2 id="wa-t">Recordatorios por WhatsApp</h2>
        <p class="hint"><span class="num">2</span> turnos de mañana sin aviso.</p>
        <ul>
          ${recordatorios.map(([n, m]) => `<li><b>${n}</b><span class="meta">${m}</span><div class="acts"><a class="btn btn-quiet" href="#" aria-label="Abrir WhatsApp para ${n}">Abrir WhatsApp</a><button class="btn btn-quiet" type="button" aria-label="Marcar enviado el recordatorio de ${n}">Marcar enviado</button></div></li>`).join('\n          ')}
        </ul>
      </aside>
    </div>
  </main>
</div>`;

for (const d of Object.keys(direcciones)) {
  const salidas = {
    portada: pagina(d, 'Turnos Odonto · Consultorio Odontológico Demo', 'portada', portada),
    'reserva-1': pagina(d, 'Reservá tu turno · Turnos Odonto', 'reserva paso 1', reserva1),
    'reserva-2': pagina(d, 'Reservá tu turno · Turnos Odonto', 'reserva paso 2', reserva2),
    recepcion: pagina(d, 'Agenda · Turnos Odonto', 'recepción', recepcion),
  };
  for (const [n, html] of Object.entries(salidas)) writeFileSync(join(mockups, `${d}-${n}.html`), html, 'utf8');
}
console.log('ok');
