#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Transforma un respaldo del esquema v2 (HHHA) al formato del programa
   construido en este repositorio (Store.importBackup)."""
import json, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/7ba4d509-c92c-545c-8e37-a97703fea855/0ff7f19c-Respaldo_GMP2026_20260616.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'dist/Backup_GestionMP2026_restaurable.json'

MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

def mes_key(m):
    try: m = int(m)
    except: return None
    return MESES[m] if 0 <= m < 12 else None

def to_iso(s):
    """Convierte fechas DD-MM-YYYY[, hora] o YYYY-MM-DD a ISO YYYY-MM-DD."""
    if not s: return ''
    s = str(s).strip()
    s = s.split(',')[0].strip()              # descarta la hora
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', s)
    if m: return m.group(0)
    m = re.match(r'^(\d{1,2})-(\d{1,2})-(\d{4})$', s)
    if m:
        d, mo, y = m.groups()
        return f'{y}-{int(mo):02d}-{int(d):02d}'
    return s

def iso_dt(s):
    """Devuelve un timestamp ISO completo para createdAt."""
    if not s: return None
    s = str(s)
    if 'T' in s: return s
    d = to_iso(s)
    return (d + 'T00:00:00.000Z') if d else None

AVANCE_MAP = {
    'Evaluación técnica': 'evaluacion',
    'Cotización solicitada': 'cotizacion_solicitada',
    'Cotización recibida': 'cotizacion_recibida',
    'Informe técnico emitido': 'informe_tecnico',
    'Informe técnico': 'informe_tecnico',
    'OC emitida': 'oc_emitida',
    'OC enviada': 'oc_enviada',
    'OC enviada al proveedor': 'oc_enviada',
    'Envío a Servicio Técnico': 'envio_st',
    'Retorno de Servicio Técnico': 'retorno_st',
    'Visita / Ejecución realizada': 'visita_ejecucion',
    'Cierre del expediente': 'cierre',
    'Cierre': 'cierre',
}

def main():
    d = json.load(open(SRC, encoding='utf-8'))

    # --- mapa theirKey -> myKey (S:serie | I:inventario | ID:id) ---
    keymap = {}
    equipos = []
    for e in d.get('equipos', []):
        serie = (e.get('serie') or '').strip()
        inv   = (e.get('inventario') or '').strip()
        eid   = str(e.get('id') or '').strip()
        if serie:   mykey = 'S:' + serie
        elif inv:   mykey = 'I:' + inv
        else:       mykey = 'ID:' + eid
        keymap[e.get('key')] = mykey

        prog = {}
        for mk, code in (e.get('prog') or {}).items():
            k = mes_key(mk)
            if k and code: prog[k] = code

        equipos.append({
            'id': e.get('id'),
            'nCarpeta': e.get('carpeta', ''),
            'nInventario': inv,
            'equipo': e.get('equipo', ''),
            'servicio': e.get('servicio', ''),
            'unidad': e.get('unidad', ''),
            'ubicacion': e.get('ubicacion', ''),
            'procedencia': e.get('procedencia', ''),
            'marca': e.get('marca', ''),
            'modelo': e.get('modelo', ''),
            'serie': serie,
            'anioInstalacion': e.get('anio', ''),
            'vidaUtilResidual': e.get('vidaUtil', ''),
            'clasificacion': e.get('clasificacion', ''),
            'enuBaja': e.get('enu', ''),
            'observacionPlanilla': e.get('regObs', ''),
            'programacion': prog,
            'registro': {},
        })

    eq_by_mykey = {}
    for eq in equipos:
        # recomputar la misma clave que usa la app
        if eq['serie']: k = 'S:' + eq['serie']
        elif eq['nInventario']: k = 'I:' + eq['nInventario']
        else: k = 'ID:' + str(eq['id'])
        eq_by_mykey[k] = eq

    def mk(theirkey):
        return keymap.get(theirkey, theirkey)

    # --- registros -> equipo.registro{} ---
    reg_count = 0
    for r in d.get('registros', []):
        k = mk(r.get('equipoKey'))
        eq = eq_by_mykey.get(k)
        if not eq: continue
        mkk = mes_key(r.get('mes'))
        if not mkk: continue
        prog = r.get('programa', '') or ''
        res = r.get('resultado', '') or ''
        if prog or res:
            eq['registro'][mkk] = {'programa': prog, 'resultado': res}
            reg_count += 1

    # --- manuales -> mantenciones ---
    mantenciones = []
    for m in d.get('manuales', []):
        mantenciones.append({
            'id': m.get('id'),
            'equipoKey': mk(m.get('equipoKey')),
            'fecha': to_iso(m.get('fecha')),
            'programacion': m.get('programacion', ''),
            'ejecutor': m.get('ejecutor', ''),
            'resultado': m.get('resultado', ''),
            'observaciones': m.get('observaciones', ''),
            'estadoEquipo': m.get('estadoEquipo', ''),
            'gestionPendiente': bool(m.get('gestionPendiente')),
            'tipoRegistro': m.get('tipoRegistro', 'Oficial'),
            'createdAt': iso_dt(m.get('creado')),
            '_pendienteGenerado': True,   # evita regeneración
        })

    # --- pendientes ---
    pendientes = []
    for p in d.get('pendientes', []):
        fc = to_iso(p.get('fechaCompletado')) or None
        if (p.get('estado') == 'Completado') and not fc:
            fc = to_iso(p.get('actualizado')) or None
        gestiones = []
        for g in (p.get('gestiones') or []):
            gestiones.append({
                'fecha': to_iso(g.get('fecha')),
                'texto': g.get('texto', ''),
                'ts': iso_dt(g.get('fecha')),
            })
        en_espera = None
        if p.get('estado') == 'En espera':
            en_espera = {'motivo': p.get('motivoEspera', 'Sin especificar')}
        origen = 'preventivo' if 'Reprogramación' in (p.get('tipo') or '') else 'manual'
        pendientes.append({
            'id': p.get('id'),
            'equipoKey': mk(p.get('equipoKey')),
            'fechaCompromiso': to_iso(p.get('fechaCompromiso')),
            'tipo': p.get('tipo', 'Otro'),
            'descripcion': p.get('descripcion', ''),
            'tareas': [{'texto': t.get('texto',''), 'hecha': bool(t.get('hecha'))}
                       for t in (p.get('tareas') or [])],
            'responsableAdmin': p.get('respAdmin', 'Cristián Beltrán Oviedo'),
            'responsableEjecutivo': p.get('respEjec', ''),
            'gestiones': gestiones,
            'enEspera': en_espera,
            'fechaCompletado': fc,
            'origen': origen,
            'vinculoMantencionId': None,
            'createdAt': iso_dt(p.get('creado')),
        })

    # --- correctivos -> expedientes ---
    expedientes = []
    unknown_av = set()
    for c in d.get('correctivos', []):
        informe = None
        if c.get('informeTecnicoNum') or c.get('informeTecnicoFecha'):
            informe = {
                'numero': c.get('informeTecnicoNum', ''),
                'fecha': to_iso(c.get('informeTecnicoFecha')),
                'responsable': c.get('informeTecnicoResp', ''),
                'empresa': c.get('empresa', ''),
            }
        oc = None
        if c.get('ordenCompraNum') or c.get('ordenCompraFecha'):
            oc = {
                'numero': c.get('ordenCompraNum', ''),
                'fecha': to_iso(c.get('ordenCompraFecha')),
                'descripcion': c.get('ordenCompraDesc', ''),
            }
        avances = []
        for a in (c.get('avances') or []):
            tipo = AVANCE_MAP.get(a.get('tipo'))
            if not tipo:
                unknown_av.add(a.get('tipo')); tipo = 'evaluacion'
            datos = {}
            if a.get('informeNum'): datos['numero'] = a['informeNum']
            if a.get('responsable'): datos['responsable'] = a['responsable']
            if a.get('ocNum'): datos['numero'] = a['ocNum']
            if a.get('ocDesc'): datos['descripcion'] = a['ocDesc']
            if a.get('numeroEnvio'): datos['numeroEnvio'] = a['numeroEnvio']
            if a.get('empresa'): datos['empresa'] = a['empresa']
            if a.get('estadoEquipoVisita'): datos['estadoEquipo'] = a['estadoEquipoVisita']
            if a.get('estadoEquipoCierre'): datos['estadoEquipo'] = a['estadoEquipoCierre']
            if a.get('detalle'): datos['nota'] = a['detalle']
            avances.append({
                'id': a.get('id'),
                'tipo': tipo,
                'fechaReal': to_iso(a.get('fecha')),
                'fechaRegistro': to_iso(a.get('registrado')),
                'fechaCorreccion': None,
                'datos': datos,
            })
        expedientes.append({
            'id': c.get('id'),
            'folioSigem': c.get('folioSigem', ''),
            'equipoKey': mk(c.get('equipoKey')),
            'tipoEvento': c.get('tipoEvento', 'Orden de Trabajo'),
            'requerimiento': c.get('requerimiento', ''),
            'fechaDocumento': to_iso(c.get('fechaDocumento')),
            'tecnico': c.get('tecnico', ''),
            'estadoEquipo': c.get('estadoEquipo', ''),
            'tipoCompra': c.get('tipoCompra', ''),
            'informeTecnico': informe,
            'ordenCompra': oc,
            'estadoEvento': c.get('estadoEvento', 'Abierto'),
            'fechaCierre': to_iso(c.get('fechaCierre')) or None,
            'avances': avances,
            'gestionPendiente': bool(c.get('gestionPendiente')),
            'tipoRegistro': c.get('tipoRegistro', 'Oficial'),
            'pendienteId': None,
            'createdAt': iso_dt(c.get('creado')),
        })

    out = {
        '_app': 'MP2026', '_version': 1,
        '_fecha': d.get('fecha'),
        '_origen': 'Convertido desde respaldo HHHA v2 (' + (d.get('meta',{}).get('archivo','') or '') + ')',
        'equipos': equipos,
        'mantenciones': mantenciones,
        'pendientes': pendientes,
        'expedientes': expedientes,
        'meta': {
            'creado': d.get('fecha'),
            'ultimaCarga': iso_dt(d.get('meta', {}).get('fechaCarga')) or d.get('fecha'),
            'archivoOrigen': d.get('meta', {}).get('archivo', ''),
            'empresas': d.get('empresas', []),
        },
    }

    import os
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print('Equipos:', len(equipos))
    print('Registros plegados:', reg_count)
    print('Mantenciones:', len(mantenciones))
    print('Pendientes:', len(pendientes))
    print('Expedientes:', len(expedientes))
    if unknown_av: print('AVANCES no mapeados (->evaluacion):', unknown_av)
    print('Archivo:', OUT)

if __name__ == '__main__':
    main()
