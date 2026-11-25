"""Genera los mockups HTML de C-15 (ui-agenda-recepcion). Datos 100 % ficticios."""
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
DS = "../../../../design-system"

ICONS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
<symbol id="i-alert" viewBox="0 0 20 20"><path d="M10 2.5 18 16.5H2L10 2.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4M10 14.2v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-check" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m6.5 10.2 2.4 2.4 4.6-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-info" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v5M10 6.2v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-res" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
<symbol id="i-dot" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" fill="currentColor"/></symbol>
<symbol id="i-plus" viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-lock" viewBox="0 0 20 20"><rect x="4" y="9" width="12" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
<symbol id="i-chat" viewBox="0 0 20 20"><path d="M4 15.5 5 12.6A6.5 6.5 0 1 1 7.6 15Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="i-cal" viewBox="0 0 20 20"><rect x="3" y="4.5" width="14" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 8.5h14M7 2.5v4M13 2.5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-x" viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-wifi" viewBox="0 0 20 20"><path d="M3 8a10 10 0 0 1 14 0M5.5 10.8a6.5 6.5 0 0 1 9 0M8 13.6a3 3 0 0 1 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m3 3 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-empty" viewBox="0 0 20 20"><rect x="3" y="4.5" width="14" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 8.5h14M7.5 12.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
</svg>"""

ESTADOS = {
    "confirmado": ("Confirmado", "i-check"),
    "reservado": ("Reservado", "i-res"),
    "atendido": ("Atendido", "i-dot"),
    "ausente": ("Ausente", "i-alert"),
}


def fila(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return (h * 60 + m - 9 * 60) // 15 + 1


def head(title: str, note: str) -> str:
    return f"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{title} - Turnos Odonto (TBD)</title>
<!-- Mockup C-15 ui-agenda-recepcion: {note}. Datos 100 % ficticios. -->
<link rel="stylesheet" href="{DS}/tokens.css">
<link rel="stylesheet" href="recepcion.css">
</head>
<body>
{ICONS}
<a class="skip" href="#contenido">Saltar al contenido</a>
"""


def topbar(usuario="Recepción Demo", rol="Recepción") -> str:
    return f"""<header class="topbar"><div class="topbar-in">
  <div class="brand"><img src="{DS}/assets/logo.svg" alt="" width="96" height="32"><div class="brand-text"><b data-brand-name>Turnos Odonto (TBD)</b><span>Consultorio Odontológico Demo</span></div></div>
  <div class="who"><div><b>{usuario}</b><span class="role">{rol}</span></div><button class="btn btn-secondary btn-sm" type="button">Salir</button></div>
</div></header>"""


def toolbar(titulo, vista="dia", modo="sillon", recurso=None, odontologo=False, acciones=True) -> str:
    seg_vista = f'<div class="seg" role="group" aria-label="Vista"><button type="button" aria-pressed="{str(vista=="dia").lower()}">Día</button><button type="button" aria-pressed="{str(vista=="semana").lower()}">Semana</button></div>'
    if odontologo:
        filtro = '<span class="muted small">Mi agenda · Dra. Ana Ejemplo</span>'
    elif vista == "dia":
        filtro = f'<div class="seg" role="group" aria-label="Columnas"><button type="button" aria-pressed="{str(modo=="sillon").lower()}">Por sillón</button><button type="button" aria-pressed="{str(modo=="profesional").lower()}">Por profesional</button></div>'
    else:
        filtro = f'<label class="visually-hidden" for="rec">Recurso</label><select id="rec" class="select select-sm"><option>{recurso}</option><option>Dr. Bruno Muestra</option><option>Sillón 1</option><option>Sillón 2</option></select>'
    botones = ""
    if acciones:
        botones = ('<button class="btn btn-secondary" type="button"><svg class="icon"><use href="#i-lock"/></svg>Bloquear horario</button>'
                   + ("" if odontologo else '<button class="btn btn-primary" type="button"><svg class="icon"><use href="#i-plus"/></svg>Dar turno</button>'))
    return f"""<div class="toolbar" role="toolbar" aria-label="Agenda">
  <div class="date"><h1>{titulo}</h1></div>
  {seg_vista}{filtro}
  <div class="nav"><button class="btn btn-secondary" type="button" aria-label="Anterior">‹</button><button class="btn btn-secondary" type="button">Hoy</button><button class="btn btn-secondary" type="button" aria-label="Siguiente">›</button>
  <label class="visually-hidden" for="f">Fecha</label><input id="f" class="input select-sm mono" type="text" inputmode="numeric" value="24/11/2026" style="width:150px"></div>
  {botones}
</div>"""


def celda(t, sel=False, nuevo=False):
    ini, fin, pac, prest, est, extra = t
    nombre, ic = ESTADOS[est]
    s, n = fila(ini), fila(fin) - fila(ini)
    clases = f"cell-appt {est}" + (" is-selected" if sel else "") + (" is-new" if nuevo else "")
    aria = f"{ini}, {pac}, {prest}, {nombre}"
    detalle = f"{prest} · {ini} a {fin}" + (f" · {extra}" if extra else "")
    st = f'<span class="st"><svg><use href="#{ic}"/></svg>{nombre}</span>'
    if n <= 3:
        linea = f'<span class="top"><b>{pac}</b>{st}</span>'
        extra_linea = f'<span>{detalle}</span>' if n == 3 else ''
        return f'<button class="{clases} compact" style="--s:{s};--n:{n}" aria-label="{aria}" title="{detalle}">{linea}{extra_linea}</button>'
    return f'<button class="{clases}" style="--s:{s};--n:{n}" aria-label="{aria}"><b>{pac}</b><span>{detalle}</span>{st}</button>'


def bloque(b):
    ini, fin, motivo, quien = b
    return f'<div class="cell-block" role="note" style="--s:{fila(ini)};--n:{fila(fin)-fila(ini)}"><b>Bloqueado</b> · {ini} a {fin}<br>{motivo}{" · " + quien if quien else ""}</div>'


def columna(turnos, bloqueos=(), sel=None, nuevo=None, cerrado=True):
    partes = []
    if cerrado:
        partes.append(f'<div class="closed" style="--s:{fila("13:00")};--n:8">Fuera de horario</div>')
    partes += [bloque(b) for b in bloqueos]
    partes += [celda(t, sel=(t[2] == sel), nuevo=(t[2] == nuevo)) for t in turnos]
    return '<div class="ag-col">' + "".join(partes) + "</div>"


def grilla(cabeceras, columnas, label):
    horas = "".join(f'<span style="grid-row:span 2">{h:02d}:{m:02d}</span>' for h in range(9, 19) for m in (0, 30))
    heads = "".join(f'<div class="ag-head{" is-today" if c[2] else ""}">{c[0]}<small>{c[1]}</small></div>' for c in cabeceras)
    return f"""<div class="agenda-wrap" role="region" aria-label="{label}" tabindex="0">
<div class="agenda" style="--cols:{len(cabeceras)};--rows:40;--slot:17px">
<div class="ag-head">Hora</div>{heads}
<div class="ag-times" style="grid-template-rows:repeat(40,17px)">{horas}</div>
{''.join(columnas)}
</div></div>
<div class="legend"><span class="muted">Estados:</span><span class="badge b-reservado"><svg><use href="#i-res"/></svg>Reservado</span><span class="badge b-confirmado"><svg><use href="#i-check"/></svg>Confirmado</span><span class="badge b-atendido"><svg><use href="#i-dot"/></svg>Atendido</span><span class="badge b-ausente"><svg><use href="#i-alert"/></svg>Ausente</span><span class="muted">· Rayado: bloqueado o fuera de horario</span></div>"""


# Martes 24/11/2026, "ahora" 10:40. (inicio, fin, paciente, prestación, estado, extra)
S1 = [("09:00", "09:30", "Paciente Ficticio 1", "Consulta/control", "atendido", "Dra. Ejemplo"),
      ("09:30", "11:00", "Paciente Ficticio 2", "Endodoncia", "confirmado", "Dra. Ejemplo"),
      ("11:30", "12:00", "Paciente Ficticio 4", "Consulta/control", "confirmado", "Dra. Ejemplo"),
      ("15:00", "16:00", "Paciente Ficticio 7", "Extracción simple", "confirmado", "Dr. Muestra"),
      ("16:30", "17:00", "Paciente Ficticio 9", "Consulta/control", "reservado", "Dra. Ejemplo")]
S2 = [("09:00", "09:45", "Paciente Ficticio 5", "Limpieza", "ausente", "Dr. Muestra"),
      ("10:00", "10:45", "Paciente Ficticio 6", "Limpieza", "confirmado", "Dr. Muestra"),
      ("12:00", "12:30", "Paciente Ficticio 8", "Consulta/control", "reservado", "Dr. Muestra"),
      ("17:00", "18:30", "Paciente Ficticio 10", "Endodoncia", "confirmado", "Dra. Ejemplo")]
B_S2 = [("11:00", "12:00", "Capacitación", "Dr. Muestra"), ("15:00", "16:00", "Mantenimiento", "")]
ANA = [t[:5] + ("Sillón 1",) for t in S1 if t[5] == "Dra. Ejemplo"] + [S2[3][:5] + ("Sillón 2",)]
BRUNO = [t[:5] + ("Sillón 2",) for t in S2 if t[5] == "Dr. Muestra"] + [S1[3][:5] + ("Sillón 1",)]

CAB_SILLON = [("Sillón 1", "Dra. Ejemplo y Dr. Muestra", False), ("Sillón 2", "Dr. Muestra y Dra. Ejemplo", False)]
CAB_PROF = [("Dra. Ana Ejemplo", "Sillones 1 y 2", False), ("Dr. Bruno Muestra", "Sillones 1 y 2", False)]


def panel_wa(con_marcar=True, menos=False):
    items = [("Paciente Ficticio 11", "mié 25/11 · 09:00 · Consulta/control · Dra. Ejemplo"),
             ("Paciente Ficticio 12", "mié 25/11 · 10:30 · Limpieza · Dr. Muestra"),
             ("Paciente Ficticio 13", "mié 25/11 · 15:00 · Endodoncia · Dra. Ejemplo")]
    if menos:
        items = items[1:]
    filas = "".join(
        f'<li class="wa-item"><b>{p}</b><span class="small muted">{d}</span><span class="small mono">+54 9 11 0000-00{11 + i}</span>'
        f'<div class="row"><a class="btn btn-secondary btn-sm" href="#" target="_blank" rel="noopener"><svg class="icon"><use href="#i-chat"/></svg>Abrir WhatsApp</a>'
        + ('<button class="btn btn-ghost btn-sm" type="button">Marcar enviado</button>' if con_marcar else "")
        + "</div></li>" for i, (p, d) in enumerate(items))
    return f"""<aside class="panel" aria-labelledby="wa-t">
<div class="panel-head"><h2 id="wa-t">Recordatorios por WhatsApp</h2><span class="count">{len(items)}</span></div>
<p class="small muted">Turnos de mañana sin e-mail. Abrí el mensaje, envialo y marcalo.</p>
<ul style="list-style:none;margin:0;padding:0;display:grid;gap:var(--space-2)">{filas}</ul>
</aside>"""


def panel_detalle(odontologo=False):
    acciones = ('<button class="btn btn-secondary" type="button">Atendido</button><button class="btn btn-secondary" type="button">Ausente</button>'
                if odontologo else
                '<button class="btn btn-secondary" type="button">Atendido</button><button class="btn btn-secondary" type="button">Ausente</button><button class="btn btn-secondary" type="button">Reprogramar</button><button class="btn btn-danger" type="button">Cancelar turno</button>')
    contacto = "" if odontologo else '<dt>DNI</dt><dd class="mono">30000002</dd><dt>Teléfono</dt><dd class="mono">+54 9 11 0000-0002</dd>'
    return f"""<aside class="panel" aria-labelledby="det-t">
<div class="panel-head"><h2 id="det-t">Turno</h2><button class="btn btn-ghost btn-sm" type="button" aria-label="Cerrar detalle"><svg class="icon"><use href="#i-x"/></svg></button></div>
<p><b>Paciente Ficticio 2</b></p>
<span class="badge b-confirmado" style="justify-self:start"><svg><use href="#i-check"/></svg>Confirmado</span>
<dl class="dl"><dt>Horario</dt><dd class="mono">mar 24/11 · 09:30 a 11:00</dd><dt>Prestación</dt><dd>Endodoncia · 90 min</dd><dt>Profesional</dt><dd>Dra. Ana Ejemplo</dd><dt>Sillón</dt><dd>Sillón 1</dd>{contacto}<dt>Origen</dt><dd>Recepción</dd></dl>
<hr class="divider">
<div class="actions">{acciones}</div>
<p class="small muted">Atendido y Ausente se habilitan desde la hora del turno.</p>
</aside>"""


def pagina(nombre, titulo, nota, cuerpo, usuario="Recepción Demo", rol="Recepción"):
    html = head(titulo, nota) + topbar(usuario, rol) + cuerpo + f'\n<p class="mock-note">Mockup C-15 · {nota} · Approval: pending · Design system revisión 1 · Datos ficticios</p>\n</body>\n</html>\n'
    (OUT / nombre).write_text(html, encoding="utf-8")


def workspace(grid_html, panel_html):
    return f'<main id="contenido" class="workspace" tabindex="-1"><section aria-label="Agenda">{grid_html}</section>{panel_html}</main>'


TIT_DIA = "Martes 24 de noviembre <span class=\"muted small\">Hoy</span>"

# 1. Login y login con error
login = """<main id="contenido" class="login-wrap"><form class="login-card" novalidate>
<div class="brand"><img src="{ds}/assets/logo.svg" alt="" width="96" height="32"><div class="brand-text"><b data-brand-name>Turnos Odonto (TBD)</b><span>Consultorio Odontológico Demo</span></div></div>
<h1>Ingresá a la agenda</h1>
{alerta}
<div class="field"><label for="em">E-mail</label><input id="em" class="input" type="email" autocomplete="username" value="recepcion@demo.test"></div>
<div class="field"><label for="cl">Clave</label><input id="cl" class="input{foco}" type="password" autocomplete="current-password" value="{clave}"></div>
<button class="btn btn-primary btn-block" type="submit">Ingresar</button>
<p class="small muted" style="text-align:center">¿Olvidaste la clave? Pedile al administrador que la restablezca.</p>
</form></main>"""
for archivo, alerta, clave, foco, nota in [
    ("login.html", "", "", "", "Login"),
    ("login-error.html", '<div class="alert a-danger" role="alert"><svg><use href="#i-alert"/></svg><div><strong>E-mail o clave incorrectos.</strong><p>Revisalos y probá de nuevo.</p></div></div>', "", " is-focus", "Login con error"),
    ("login-vencida.html", '<div class="alert a-info" role="status"><svg><use href="#i-info"/></svg><div><strong>Tu sesión venció.</strong><p>Iniciá sesión de nuevo.</p></div></div>', "", "", "Sesión vencida"),
]:
    html = head("Ingresar", nota) + login.format(ds=DS, alerta=alerta, clave=clave, foco=foco) + f'\n<p class="mock-note">Mockup C-15 · {nota} · Approval: pending · Datos ficticios</p>\n</body>\n</html>\n'
    (OUT / archivo).write_text(html, encoding="utf-8")

# 2. Día por sillón (panel WhatsApp)
cols_sillon = [columna(S1), columna(S2, B_S2)]
pagina("agenda-dia-sillon.html", "Agenda", "Agenda del día por sillón",
       toolbar(TIT_DIA) + workspace(grilla(CAB_SILLON, cols_sillon, "Agenda del martes 24 de noviembre por sillón"), panel_wa()))

# 3. Día por profesional (con detalle)
cols_prof = [columna(ANA, sel="Paciente Ficticio 2"), columna(BRUNO, [B_S2[0]])]
pagina("agenda-dia-profesional.html", "Agenda", "Agenda del día por profesional con detalle de turno",
       toolbar(TIT_DIA, modo="profesional") + workspace(grilla(CAB_PROF, cols_prof, "Agenda del martes 24 de noviembre por profesional"), panel_detalle()))

# 4. Semana de un recurso
SEM = {
    "Lun 23": [("09:00", "09:30", "Paciente Ficticio 14", "Consulta/control", "atendido", "Sillón 1"), ("10:00", "11:30", "Paciente Ficticio 15", "Endodoncia", "atendido", "Sillón 1"), ("15:30", "16:00", "Paciente Ficticio 16", "Consulta/control", "ausente", "Sillón 2")],
    "Mar 24": ANA,
    "Mié 25": [("09:00", "09:30", "Paciente Ficticio 11", "Consulta/control", "confirmado", "Sillón 1"), ("15:00", "16:30", "Paciente Ficticio 13", "Endodoncia", "reservado", "Sillón 1")],
    "Jue 26": [("10:00", "11:00", "Paciente Ficticio 17", "Extracción simple", "confirmado", "Sillón 2")],
    "Vie 27": [("09:30", "10:00", "Paciente Ficticio 18", "Consulta/control", "reservado", "Sillón 1"), ("16:00", "16:45", "Paciente Ficticio 19", "Limpieza", "confirmado", "Sillón 1")],
}
cab_sem = [(d, "noviembre", d == "Mar 24") for d in SEM]
bloq_sem = {"Jue 26": [("15:00", "19:00", "Congreso", "")]}
cols_sem = [columna(t, bloq_sem.get(d, [])) for d, t in SEM.items()]
pagina("agenda-semana.html", "Agenda semanal", "Semana de un recurso",
       toolbar("Semana del 23 al 29 de noviembre", vista="semana", recurso="Dra. Ana Ejemplo")
       + workspace(grilla(cab_sem, cols_sem, "Semana de la Dra. Ana Ejemplo") + '<p class="small muted" style="margin-top:var(--space-2)">Sábado y domingo sin horario de atención.</p>', panel_wa()))


def con_dialogo(fondo, dialogo):
    return fondo + f'<div class="backdrop">{dialogo}</div>'


fondo_sillon = toolbar(TIT_DIA) + workspace(grilla(CAB_SILLON, cols_sillon, "Agenda del martes 24 de noviembre por sillón"), panel_wa())

# 5. Dar turno: búsqueda
dar_turno = """<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dt-t">
<div class="dialog-head"><div><h2 id="dt-t">Dar turno</h2><p class="small muted">Martes 24 de noviembre</p></div><button class="btn btn-ghost btn-sm" type="button" aria-label="Cerrar"><svg class="icon"><use href="#i-x"/></svg></button></div>
<div class="field combo"><label for="bp">Paciente</label><input id="bp" class="input is-focus" role="combobox" aria-expanded="true" aria-controls="res" value="Ficticio 3" autocomplete="off"><p class="hint">Buscá por DNI o por nombre (3 letras o más).</p>
<ul id="res" class="results" role="listbox" aria-label="Pacientes encontrados">
<li class="result" role="option" aria-selected="true"><span><b>Paciente Ficticio 3</b></span><span class="mono muted">DNI 30000003 · 11 0000-0003</span></li>
<li class="result" role="option" aria-selected="false"><span><b>Paciente Ficticio 30</b></span><span class="mono muted">DNI 30000030 · 11 0000-0030</span></li>
<li class="result add" role="option" aria-selected="false"><span><svg class="icon" style="vertical-align:-4px"><use href="#i-plus"/></svg> Dar de alta un paciente nuevo</span></li>
</ul></div>
<div class="grid3"><div class="field"><label for="pr">Prestación</label><select id="pr" class="select"><option>Consulta/control (30 min)</option></select></div>
<div class="field"><label for="pf">Profesional</label><select id="pf" class="select"><option>Cualquiera</option></select></div>
<div class="field"><label for="fe">Fecha</label><input id="fe" class="input mono" type="text" inputmode="numeric" value="24/11/2026"></div></div>
<div class="field"><span class="label">Horarios libres</span><div class="slots" role="group" aria-label="Horarios libres">
<button class="slot" type="button" aria-pressed="false">11:00<small>Dra. Ejemplo · S1</small></button><button class="slot" type="button" aria-pressed="true">12:00<small>Dra. Ejemplo · S1</small></button><button class="slot" type="button" aria-pressed="false">12:30<small>Dr. Muestra · S2</small></button><button class="slot" type="button" aria-pressed="false">16:00<small>Dr. Muestra · S1</small></button><button class="slot" type="button" aria-pressed="false">17:00<small>Dr. Muestra · S1</small></button><button class="slot" type="button" aria-pressed="false">18:00<small>Dra. Ejemplo · S1</small></button>
</div></div>
<details class="small"><summary>Ajustar duración, profesional o sillón a mano</summary><div class="grid3" style="margin-top:var(--space-3)"><div class="field"><label for="du">Duración (min)</label><input id="du" class="input mono" value="30"></div><div class="field"><label for="ps">Profesional</label><select id="ps" class="select"><option>Dra. Ana Ejemplo</option></select></div><div class="field"><label for="si">Sillón</label><select id="si" class="select"><option>Sillón 1</option></select></div></div></details>
<div class="dialog-foot"><button class="btn btn-secondary" type="button">Cancelar</button><button class="btn btn-primary" type="button" disabled style="opacity:.55">Dar turno</button></div>
</div>"""
pagina("dar-turno-buscar.html", "Dar turno", "Dar turno: búsqueda de paciente", con_dialogo(fondo_sillon, dar_turno))

# 6. Dar turno: alta rápida (DNI existente)
alta = """<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="al-t">
<div class="dialog-head"><div><h2 id="al-t">Dar de alta un paciente</h2><p class="small muted">Datos mínimos, los mismos que pide la reserva online.</p></div><button class="btn btn-ghost btn-sm" type="button" aria-label="Cerrar"><svg class="icon"><use href="#i-x"/></svg></button></div>
<div class="alert a-warning" role="alert"><svg><use href="#i-alert"/></svg><div><strong>Ya existe un paciente con ese DNI.</strong><p>Paciente Ficticio 3 · DNI 30000003 · 11 0000-0003</p><p style="margin-top:var(--space-2)"><button class="btn btn-secondary btn-sm" type="button">Elegir a Paciente Ficticio 3</button></p></div></div>
<div class="grid2">
<div class="field"><label for="dni">DNI</label><input id="dni" class="input mono" value="30000003" aria-invalid="true" aria-describedby="dni-e"><p class="err" id="dni-e"><svg class="icon"><use href="#i-alert"/></svg>Ese DNI ya está registrado.</p></div>
<div class="field"><label for="tel">Teléfono</label><input id="tel" class="input mono" value="11 0000 0033"><p class="hint">Con código de área.</p></div>
<div class="field"><label for="no">Nombre</label><input id="no" class="input" value="Paciente"></div>
<div class="field"><label for="ap">Apellido</label><input id="ap" class="input" value="Ficticio 33"></div>
<div class="field" style="grid-column:1/-1"><label for="em2">E-mail <span class="muted">(opcional)</span></label><input id="em2" class="input" value=""><p class="hint">Si lo cargás, recibe el recordatorio y el enlace para gestionar el turno.</p></div>
</div>
<label class="check"><input type="checkbox" checked> El paciente acepta que el consultorio lo contacte por teléfono, WhatsApp o e-mail para gestionar sus turnos.</label>
<div class="dialog-foot"><button class="btn btn-secondary" type="button">Volver a la búsqueda</button><button class="btn btn-primary" type="button">Guardar y elegir</button></div>
</div>"""
pagina("dar-turno-alta.html", "Alta de paciente", "Dar turno: alta rápida con DNI existente", con_dialogo(fondo_sillon, alta))

# 7. Detalle + modal cancelar
fondo_det = toolbar(TIT_DIA, modo="profesional") + workspace(grilla(CAB_PROF, cols_prof, "Agenda del martes 24 de noviembre por profesional"), panel_detalle())
cancelar = """<div class="dialog sm" role="alertdialog" aria-modal="true" aria-labelledby="ca-t" aria-describedby="ca-d">
<h2 id="ca-t">¿Cancelar este turno?</h2>
<p id="ca-d" class="muted">Paciente Ficticio 2, martes 24/11 de 09:30 a 11:00 con la Dra. Ana Ejemplo. El horario del Sillón 1 va a quedar libre y se anula el recordatorio pendiente.</p>
<div class="dialog-foot" style="border:0;padding:0"><button class="btn btn-secondary is-focus" type="button">Volver</button><button class="btn btn-danger" type="button">Sí, cancelar turno</button></div>
</div>"""
pagina("turno-cancelar.html", "Cancelar turno", "Detalle de turno y confirmación de cancelación", con_dialogo(fondo_det, cancelar))

# 8. Reprogramar
reprog = """<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rp-t">
<div class="dialog-head"><div><h2 id="rp-t">Reprogramar turno</h2><p class="small muted">Paciente Ficticio 4 · Consulta/control · hoy 11:30 con la Dra. Ejemplo en el Sillón 1</p></div><button class="btn btn-ghost btn-sm" type="button" aria-label="Cerrar"><svg class="icon"><use href="#i-x"/></svg></button></div>
<div class="grid3"><div class="field"><label for="rf">Nueva fecha</label><input id="rf" class="input mono" type="text" inputmode="numeric" value="25/11/2026"></div>
<div class="field"><label for="rpf">Profesional</label><select id="rpf" class="select"><option>Dra. Ana Ejemplo (el mismo)</option><option>Dr. Bruno Muestra</option></select></div>
<div class="field"><label for="rps">Sillón</label><select id="rps" class="select"><option>Cualquiera libre</option></select></div></div>
<div class="field"><span class="label">Horarios libres el miércoles 25</span><div class="slots" role="group" aria-label="Horarios libres">
<button class="slot" type="button" aria-pressed="false">09:30<small>Sillón 1</small></button><button class="slot" type="button" aria-pressed="false">10:00<small>Sillón 1</small></button><button class="slot" type="button" aria-pressed="true">10:30<small>Sillón 2</small></button><button class="slot" type="button" aria-pressed="false">11:00<small>Sillón 1</small></button><button class="slot" type="button" aria-pressed="false">16:30<small>Sillón 1</small></button><button class="slot" type="button" aria-pressed="false">17:00<small>Sillón 1</small></button>
</div></div>
<div class="alert a-info"><svg><use href="#i-info"/></svg><div><p>Se mueve el mismo turno: conserva paciente, prestación y estado. El recordatorio se reprograma solo.</p></div></div>
<div class="dialog-foot"><button class="btn btn-secondary" type="button">Cancelar</button><button class="btn btn-primary" type="button">Reprogramar a mié 25 · 10:30</button></div>
</div>"""
pagina("reprogramar.html", "Reprogramar", "Reprogramar eligiendo un hueco", con_dialogo(fondo_sillon, reprog))

# 9. Bloquear (conflicto RN-31)
bloq = """<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="bl-t">
<div class="dialog-head"><div><h2 id="bl-t">Bloquear horario</h2><p class="small muted">Licencias, capacitaciones o mantenimiento. Nadie puede dar turnos encima.</p></div><button class="btn btn-ghost btn-sm" type="button" aria-label="Cerrar"><svg class="icon"><use href="#i-x"/></svg></button></div>
<div class="field"><span class="label">Qué se bloquea</span><div class="seg" role="radiogroup" aria-label="Qué se bloquea"><button type="button" role="radio" aria-checked="true" aria-pressed="true">Un profesional</button><button type="button" role="radio" aria-checked="false" aria-pressed="false">Un sillón</button></div></div>
<div class="grid2"><div class="field"><label for="bp2">Profesional</label><select id="bp2" class="select"><option>Dra. Ana Ejemplo</option></select></div>
<div class="field"><label for="bf">Fecha</label><input id="bf" class="input mono" type="text" inputmode="numeric" value="24/11/2026"></div>
<div class="field"><label for="bd">Desde</label><input id="bd" class="input mono" value="09:00"></div>
<div class="field"><label for="bh">Hasta</label><input id="bh" class="input mono" value="12:00"></div>
<div class="field" style="grid-column:1/-1"><label for="bm">Motivo <span class="muted">(opcional)</span></label><input id="bm" class="input" value="Trámite personal"></div></div>
<div class="alert a-danger" role="alert"><svg><use href="#i-alert"/></svg><div><strong>No se puede bloquear: hay turnos en ese horario (RN-31).</strong><p>Reprogramalos o cancelalos primero, o elegí otro horario:</p><ul class="conflicts"><li>09:00 a 09:30 · Paciente Ficticio 1 · Atendido</li><li>09:30 a 11:00 · Paciente Ficticio 2 · Confirmado</li><li>11:30 a 12:00 · Paciente Ficticio 4 · Confirmado</li></ul></div></div>
<div class="dialog-foot"><button class="btn btn-secondary" type="button">Cancelar</button><button class="btn btn-primary" type="button">Bloquear</button></div>
</div>"""
pagina("bloquear.html", "Bloquear horario", "Bloquear horario con conflicto", con_dialogo(fondo_sillon, bloq))

# 10. WhatsApp marcado + toast
pagina("pendientes-wa-me.html", "Agenda", "Pendientes de WhatsApp tras marcar uno",
       toolbar(TIT_DIA) + workspace(grilla(CAB_SILLON, cols_sillon, "Agenda del martes 24 de noviembre por sillón"), panel_wa(menos=True))
       + '<div class="toast" role="status">Recordatorio de Paciente Ficticio 11 marcado como enviado.</div>')

# 11. Conflicto al dar turno (RN-02)
conflicto = dar_turno.replace('<div class="dialog-foot">', '<div class="alert a-danger" role="alert"><svg><use href="#i-alert"/></svg><div><strong>La Dra. Ana Ejemplo ya tiene un turno en ese horario (RN-02).</strong><p>Está ocupada de 11:30 a 12:00 con otro paciente. Elegí otro horario de la lista.</p></div></div><div class="dialog-foot">', 1)
conflicto = conflicto.replace('value="Ficticio 3"', 'value="Paciente Ficticio 3" aria-expanded="false"').replace('<ul id="res"', '<ul hidden id="res"')
pagina("dar-turno-conflicto.html", "Dar turno", "Conflicto de solapamiento al dar turno", con_dialogo(fondo_sillon, conflicto))

# 12. Estados: cargando, vacío, error de red, sin permiso
def estado(icono, titulo, texto, boton=""):
    return f'<div class="agenda-wrap"><div class="state-box" role="status">{icono}<h2>{titulo}</h2><p>{texto}</p>{boton}</div></div>'
pagina("estado-cargando.html", "Agenda", "Estado: cargando",
       toolbar(TIT_DIA) + workspace(estado('<div class="spinner" aria-hidden="true"></div>', "Cargando agenda…", "Un momento."), panel_wa()))
pagina("estado-vacio.html", "Agenda", "Estado: día sin turnos",
       toolbar("Miércoles 25 de noviembre") + workspace(estado('<svg><use href="#i-empty"/></svg>', "No hay turnos para este día.", "Podés dar un turno o elegir otra fecha.", '<button class="btn btn-primary" type="button"><svg class="icon"><use href="#i-plus"/></svg>Dar turno</button>'), panel_wa()))
pagina("estado-error.html", "Agenda", "Estado: error de red",
       toolbar(TIT_DIA) + workspace(estado('<svg><use href="#i-wifi"/></svg>', "No pudimos cargar la agenda.", "Revisá la conexión y probá de nuevo.", '<button class="btn btn-primary" type="button">Reintentar</button>'), panel_wa()))
pagina("estado-sin-permiso.html", "Agenda", "Estado: acción sin permiso",
       toolbar(TIT_DIA, modo="profesional") + workspace(grilla(CAB_PROF, cols_prof, "Agenda"), panel_detalle())
       + '<div class="toast" role="alert" style="background:var(--color-danger)">No tenés permiso para hacer esto.</div>')

# 13. Vista del odontólogo
pagina("odontologo.html", "Mi agenda", "Vista del odontólogo",
       toolbar(TIT_DIA, odontologo=True) + workspace(grilla([("Dra. Ana Ejemplo", "Sillones 1 y 2", False)], [columna(ANA, sel="Paciente Ficticio 2")], "Mi agenda del martes 24 de noviembre"), panel_detalle(odontologo=True)),
       usuario="Dra. Ana Ejemplo", rol="Odontóloga")

# Índice
paginas = [
    ("login.html", "Login", "Inicio de sesión"), ("login-error.html", "Login · error", "Credenciales inválidas"), ("login-vencida.html", "Login · sesión vencida", "Aviso al volver"),
    ("agenda-dia-sillon.html", "Día por sillón", "Con pendientes de WhatsApp"), ("agenda-dia-profesional.html", "Día por profesional", "Con detalle de turno"), ("agenda-semana.html", "Semana de un recurso", "Dra. Ana Ejemplo"),
    ("dar-turno-buscar.html", "Dar turno · buscar", "Búsqueda y huecos libres"), ("dar-turno-alta.html", "Dar turno · alta rápida", "DNI existente (RN-35)"), ("dar-turno-conflicto.html", "Dar turno · conflicto", "Solapamiento (RN-02)"),
    ("turno-cancelar.html", "Cancelar turno", "Confirmación"), ("reprogramar.html", "Reprogramar", "Elegir hueco"), ("bloquear.html", "Bloquear horario", "Conflicto con turnos (RN-31)"),
    ("pendientes-wa-me.html", "WhatsApp", "Marcado como enviado"), ("odontologo.html", "Vista del odontólogo", "Su agenda y sus acciones"), ("estado-cargando.html", "Estado · cargando", "Indicador"),
    ("estado-vacio.html", "Estado · vacío", "Día sin turnos"), ("estado-error.html", "Estado · error de red", "Reintentar"), ("estado-sin-permiso.html", "Estado · sin permiso", "403"),
]
links = "".join(f'<a href="{a}"><b>{t}</b><span>{d}</span></a>' for a, t, d in paginas)
html = head("Mockups C-15", "Índice") + f'<main id="contenido" class="index"><div><h1>Mockups C-15 · Agenda de recepción</h1><p class="muted">Approval: pending · Design system revisión 1 · 1440 × 900 · Datos ficticios · Capturas en <code>previews/</code></p></div><nav class="index-grid" aria-label="Pantallas">{links}</nav></main>\n</body>\n</html>\n'
(OUT / "index.html").write_text(html, encoding="utf-8")
print(len(paginas), "pantallas")
