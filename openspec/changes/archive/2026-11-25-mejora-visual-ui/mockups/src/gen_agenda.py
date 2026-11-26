# Genera los mockups de la agenda de recepcion (datos ficticios) e inserta el sprite comun.
INI = 9 * 60
ST = {'confirmado': ('i-check', 'Confirmado'), 'reservado': ('i-res', 'Reservado'), 'atendido': ('i-dot', 'Atendido')}


def fila(h, m):
    return (h * 60 + m - INI) // 15 + 1


def hhmm(minutos):
    return f"{minutos // 60:02d}:{minutos % 60:02d}"


def turno(nombre, prest, h, m, dur, estado, otro):
    n = dur // 15
    ini = hhmm(h * 60 + m)
    fin = hhmm(h * 60 + m + dur)
    ic, tx = ST[estado]
    det = f"{prest} · {ini} a {fin} · {otro}"
    st = f'<span class="st"><svg><use href="#{ic}"/></svg>{tx}</span>'
    cls = f"cell-appt {estado}" + (" compact" if n <= 3 else "")
    body = f'<b>{nombre}</b>{st}' if n <= 2 else f'<b>{nombre}</b><span>{det}</span>{st}'
    return (f'<button class="{cls}" type="button" style="--s:{fila(h, m)};--n:{n}" '
            f'aria-label="{ini}, {nombre}, {prest}, {tx}" title="{det}">{body}</button>')


def cerrado(h1, h2):
    return f'<div class="closed" style="--s:{fila(h1, 0)};--n:{(h2 - h1) * 4}">Fuera de horario</div>'


def bloqueo(h, m, dur, motivo, quien):
    ini = hhmm(h * 60 + m)
    fin = hhmm(h * 60 + m + dur)
    return (f'<button class="cell-block" type="button" style="--s:{fila(h, m)};--n:{dur // 15}" '
            f'aria-label="Bloqueado de {ini} a {fin}, {motivo}, {quien}"><b>Bloqueado</b> · {ini} a {fin}<br>{motivo}</button>')


col1 = [cerrado(13, 15), turno('Carla Prueba', 'Consulta/control', 9, 0, 30, 'confirmado', 'Ana Ejemplo'),
        turno('Paciente Ficticio 3', 'Limpieza', 10, 0, 45, 'reservado', 'Ana Ejemplo'),
        turno('Paciente Ficticio 6', 'Consulta/control', 12, 0, 30, 'atendido', 'Ana Ejemplo'),
        bloqueo(16, 30, 60, 'Capacitación', 'Sillón 1')]
col2 = [cerrado(13, 15), turno('Diego Modelo', 'Extracción simple', 11, 0, 60, 'confirmado', 'Bruno Muestra'),
        turno('Paciente Ficticio 4', 'Endodoncia', 15, 0, 90, 'reservado', 'Bruno Muestra'),
        turno('Paciente Ficticio 5', 'Consulta/control', 17, 30, 30, 'reservado', 'Bruno Muestra')]
col3 = [cerrado(13, 15), turno('Paciente Ficticio 7', 'Limpieza', 9, 30, 45, 'confirmado', 'Ana Ejemplo'),
        turno('Paciente Ficticio 8', 'Consulta/control', 15, 30, 30, 'reservado', 'Ana Ejemplo')]
cols = [('Sillón 1', 'Ana Ejemplo', col1), ('Sillón 2', 'Bruno Muestra', col2), ('Sillón 3', 'Ana Ejemplo', col3)]
horas = ''.join(f'<span>{hhmm(INI + i * 30)}</span>' for i in range(20))
grid = (f'<div class="agenda" style="--cols:{len(cols)}">'
        '<div class="ag-head corner">Hora</div>'
        + ''.join(f'<div class="ag-head">{t}<small>{s}</small></div>' for t, s, _ in cols)
        + f'<div class="ag-times">{horas}</div>'
        + ''.join('<div class="ag-col">' + ''.join(c) + '</div>' for _, _, c in cols) + '</div>')

sprite = open('src/sprite.inc', encoding='utf-8').read()
tpl = open('src/agenda.tpl.html', encoding='utf-8').read().replace('{{GRID}}', grid).replace('{{SPRITE}}', sprite)
for nombre, nota in [('recepcion-agenda.html', 'Mockup · recepción, agenda del día (escritorio)'),
                     ('recepcion-agenda-movil.html', 'Mockup · recepción, agenda del día (celular)')]:
    open(nombre, 'w', encoding='utf-8').write(tpl.replace('{{NOTA}}', nota))
for nombre in ['portada.html', 'reserva-paso-1.html']:
    try:
        open(nombre, 'w', encoding='utf-8').write(open('src/' + nombre, encoding='utf-8').read().replace('{{SPRITE}}', sprite))
    except FileNotFoundError:
        pass
