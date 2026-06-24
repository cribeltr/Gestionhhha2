/* =========================================================================
 * MP 2026 · store.js
 * Capa de datos: estado en memoria, persistencia en localStorage,
 * y derivaciones (estado del equipo, etapas de expediente, pendientes).
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const C = MP.const;

  const KEY = "mp2026_db_v1";

  const DB = {
    equipos: [],          // Paso 1
    mantenciones: [],     // Paso 8 (registradas en la app)
    pendientes: [],       // Paso 9
    expedientes: [],      // Paso 10 / 15 (correctivo)
    meta: { creado: null, ultimaCarga: null },
  };

  const Store = MP.store = {};
  const listeners = [];

  Store.db = DB;

  Store.onChange = function (fn) { listeners.push(fn); };
  Store.emit = function () { listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); };

  /* ----- Persistencia ------------------------------------------------- */
  Store.save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        equipos: DB.equipos, mantenciones: DB.mantenciones,
        pendientes: DB.pendientes, expedientes: DB.expedientes, meta: DB.meta,
      }));
    } catch (e) { console.error("No se pudo guardar", e); }
  };

  Store.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      DB.equipos = data.equipos || [];
      DB.mantenciones = data.mantenciones || [];
      DB.pendientes = data.pendientes || [];
      DB.expedientes = data.expedientes || [];
      DB.meta = data.meta || { creado: null, ultimaCarga: null };
      return true;
    } catch (e) { console.error("No se pudo cargar", e); return false; }
  };

  Store.commit = function () { Store.save(); Store.emit(); };

  Store.reset = function () {
    DB.equipos = []; DB.mantenciones = []; DB.pendientes = []; DB.expedientes = [];
    DB.meta = { creado: new Date().toISOString(), ultimaCarga: null };
    Store.commit();
  };

  /* ----- Backup / Restauración (Paso 11) ------------------------------ */
  Store.exportBackup = function () {
    return JSON.stringify({
      _app: "MP2026", _version: 1, _fecha: new Date().toISOString(),
      equipos: DB.equipos, mantenciones: DB.mantenciones,
      pendientes: DB.pendientes, expedientes: DB.expedientes, meta: DB.meta,
    }, null, 2);
  };

  Store.importBackup = function (json) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    if (!data || !Array.isArray(data.equipos)) throw new Error("Respaldo inválido");
    DB.equipos = data.equipos || [];
    DB.mantenciones = data.mantenciones || [];
    DB.pendientes = data.pendientes || [];
    DB.expedientes = data.expedientes || [];
    DB.meta = data.meta || { creado: null, ultimaCarga: null };
    Store.commit();
  };

  /* ----- Accesores ---------------------------------------------------- */
  Store.equipos = function () { return DB.equipos; };

  Store.equipoByKey = function (key) {
    return DB.equipos.find((e) => U.equipoKey(e) === key) || null;
  };

  Store.mantencionesDe = function (key) {
    return DB.mantenciones.filter((m) => m.equipoKey === key);
  };

  Store.pendientesDe = function (key) {
    return DB.pendientes.filter((p) => p.equipoKey === key);
  };

  Store.expedientesDe = function (key) {
    return DB.expedientes.filter((x) => x.equipoKey === key);
  };

  /* =====================================================================
   * Mantenciones preventivas (Paso 8)
   * =================================================================== */
  Store.guardarMantencion = function (m) {
    if (!m.id) {
      m.id = U.uid("mant");
      m.createdAt = new Date().toISOString();
      DB.mantenciones.push(m);
    } else {
      const i = DB.mantenciones.findIndex((x) => x.id === m.id);
      if (i >= 0) DB.mantenciones[i] = Object.assign(DB.mantenciones[i], m);
      else DB.mantenciones.push(m);
    }
    // Generación automática de pendiente (Paso 8: Gestión pendiente Sí).
    if (m.gestionPendiente && !m._pendienteGenerado) {
      Store._generarPendienteDeMantencion(m);
      m._pendienteGenerado = true;
    }
    Store.commit();
    return m;
  };

  Store._generarPendienteDeMantencion = function (m) {
    const esCausal = /^C[1-8]$/.test(m.resultado || "");
    const tipo = esCausal ? "Reprogramación Mantención Preventiva" : "Otro";
    const reprograma30 = C.CAUSALES_REPROGRAMA_30.includes(m.resultado);
    const fechaCompromiso = reprograma30 ? U.addDays(m.fecha || U.todayISO(), 30)
      : U.addDays(U.todayISO(), 7);
    Store.crearPendiente({
      equipoKey: m.equipoKey,
      tipo,
      descripcion: esCausal
        ? "Generado automáticamente desde mantención preventiva (" + m.resultado + "): " +
          (C.CAUSALES[m.resultado] || "")
        : "Generado automáticamente desde mantención preventiva.",
      fechaCompromiso,
      origen: "preventivo",
      vinculoMantencionId: m.id,
    });
  };

  Store.eliminarMantencion = function (id) {
    DB.mantenciones = DB.mantenciones.filter((m) => m.id !== id);
    Store.commit();
  };

  /* =====================================================================
   * Pendientes (Paso 9)
   * =================================================================== */
  Store.crearPendiente = function (p) {
    const nuevo = Object.assign({
      id: U.uid("pend"),
      equipoKey: "",
      fechaCompromiso: U.todayISO(),
      tipo: "Otro",
      descripcion: "",
      tareas: [],
      responsableAdmin: "Cristián Beltrán Oviedo",
      responsableEjecutivo: "",
      gestiones: [],
      enEspera: null,        // { motivo }
      fechaCompletado: null,
      origen: "manual",
      vinculoMantencionId: null,
      createdAt: new Date().toISOString(),
    }, p);
    DB.pendientes.push(nuevo);
    Store.commit();
    return nuevo;
  };

  Store.guardarPendiente = function (p) {
    const i = DB.pendientes.findIndex((x) => x.id === p.id);
    if (i >= 0) DB.pendientes[i] = Object.assign(DB.pendientes[i], p);
    else { p.id = p.id || U.uid("pend"); DB.pendientes.push(p); }
    Store.commit();
    return p;
  };

  Store.eliminarPendiente = function (id) {
    DB.pendientes = DB.pendientes.filter((p) => p.id !== id);
    Store.commit();
  };

  Store.agregarGestion = function (pid, texto) {
    const p = DB.pendientes.find((x) => x.id === pid);
    if (!p) return;
    p.gestiones = p.gestiones || [];
    p.gestiones.push({ fecha: U.todayISO(), texto: texto, ts: new Date().toISOString() });
    Store.commit();
  };

  Store.completarPendiente = function (pid, gestion) {
    const p = DB.pendientes.find((x) => x.id === pid);
    if (!p) return;
    p.fechaCompletado = U.todayISO();
    p.enEspera = null;
    Store.agregarGestion(pid, gestion || "Pendiente completado.");
  };

  Store.posponerPendiente = function (pid, dias) {
    const p = DB.pendientes.find((x) => x.id === pid);
    if (!p) return;
    p.fechaCompromiso = U.addDays(p.fechaCompromiso, dias);
    Store.agregarGestion(pid, "Compromiso pospuesto " + dias + " día(s) → " + U.fmtDate(p.fechaCompromiso));
  };

  Store.marcarEnEspera = function (pid, motivo) {
    const p = DB.pendientes.find((x) => x.id === pid);
    if (!p) return;
    p.enEspera = { motivo: motivo || "Sin especificar" };
    Store.agregarGestion(pid, "En espera de un tercero: " + (motivo || ""));
  };

  Store.reanudarPendiente = function (pid) {
    const p = DB.pendientes.find((x) => x.id === pid);
    if (!p) return;
    p.enEspera = null;
    Store.agregarGestion(pid, "Espera finalizada, gestión reanudada.");
  };

  // Estado de gestión deducido automáticamente (Paso 9).
  Store.estadoPendiente = function (p) {
    if (p.fechaCompletado) return "Completado";
    if (p.enEspera) return "En espera";
    const tareasMarcadas = (p.tareas || []).some((t) => t.hecha);
    if ((p.gestiones || []).length > 0 || tareasMarcadas) return "En gestión";
    return "Nuevo";
  };

  Store.urgenciaPendiente = function (p) {
    if (p.fechaCompletado) return "Completado";
    if (p.enEspera) return "En espera";
    const dias = U.daysBetween(U.todayISO(), p.fechaCompromiso); // futuro positivo
    if (dias === null) return "Próximo";
    if (dias < 0) return "Atrasado";
    if (dias === 0) return "Hoy";
    if (dias <= 7) return "Esta semana";
    return "Próximo";
  };

  Store.diasAtraso = function (p) {
    if (p.fechaCompletado || p.enEspera) return 0;
    const d = U.daysBetween(p.fechaCompromiso, U.todayISO());
    return d > 0 ? d : 0;
  };

  /* =====================================================================
   * Expedientes correctivos (Paso 10 / 15)
   * =================================================================== */
  Store.crearExpediente = function (x) {
    const nuevo = Object.assign({
      id: U.uid("exp"),
      folioSigem: "",
      equipoKey: "",
      tipoEvento: "Orden de Trabajo",
      requerimiento: "",
      fechaDocumento: U.todayISO(),
      tecnico: "",
      estadoEquipo: "No Operativo",
      tipoCompra: "",
      informeTecnico: null,   // { numero, fecha, responsable, empresa }
      ordenCompra: null,      // { numero, fecha, descripcion }
      estadoEvento: "Abierto",
      fechaCierre: null,
      avances: [],            // bitácora auditable
      gestionPendiente: false,
      tipoRegistro: "Oficial",
      pendienteId: null,
      createdAt: new Date().toISOString(),
    }, x);
    DB.expedientes.push(nuevo);
    // Flujo crítico: equipo No Operativo crea pendiente con tareas del ciclo.
    if (nuevo.estadoEquipo === "No Operativo") {
      const pend = Store.crearPendiente({
        equipoKey: nuevo.equipoKey,
        tipo: "Protocolo Externo de Mantenimiento",
        descripcion: "Ciclo correctivo (flujo crítico) — Folio " + (nuevo.folioSigem || "s/folio"),
        fechaCompromiso: U.addDays(U.todayISO(), 7),
        origen: "correctivo",
        tareas: [
          { texto: "Solicitar cotización al proveedor", hecha: false },
          { texto: "Recibir cotización (n° y fecha)", hecha: false },
          { texto: "Elaborar informe técnico", hecha: false },
          { texto: "Emitir orden de compra", hecha: false },
          { texto: "Enviar orden de compra al proveedor", hecha: false },
        ],
      });
      nuevo.pendienteId = pend.id;
    }
    Store.commit();
    return nuevo;
  };

  Store.guardarExpediente = function (x) {
    const i = DB.expedientes.findIndex((e) => e.id === x.id);
    if (i >= 0) DB.expedientes[i] = Object.assign(DB.expedientes[i], x);
    else DB.expedientes.push(x);
    Store.commit();
    return x;
  };

  Store.eliminarExpediente = function (id) {
    DB.expedientes = DB.expedientes.filter((x) => x.id !== id);
    Store.commit();
  };

  // Registrar avance (bitácora auditable, Paso 10 / 12).
  Store.registrarAvance = function (expId, avance) {
    const x = DB.expedientes.find((e) => e.id === expId);
    if (!x) return null;
    const a = Object.assign({
      id: U.uid("av"),
      tipo: "nota",
      fechaReal: U.todayISO(),
      fechaRegistro: U.todayISO(),
      fechaCorreccion: null,
      datos: {},
    }, avance);
    x.avances = x.avances || [];
    x.avances.push(a);
    if (a.tipo === "cierre") {
      x.estadoEvento = "Cerrado";
      x.fechaCierre = a.fechaReal;
    }
    Store.commit();
    return a;
  };

  Store.corregirAvance = function (expId, avId, cambios) {
    const x = DB.expedientes.find((e) => e.id === expId);
    if (!x) return;
    const a = (x.avances || []).find((v) => v.id === avId);
    if (!a) return;
    Object.assign(a, cambios);
    a.fechaCorreccion = U.todayISO();
    Store.commit();
  };

  Store.eliminarAvance = function (expId, avId) {
    const x = DB.expedientes.find((e) => e.id === expId);
    if (!x) return;
    x.avances = (x.avances || []).filter((v) => v.id !== avId);
    if (!x.avances.some((v) => v.tipo === "cierre")) {
      x.estadoEvento = "Abierto"; x.fechaCierre = null;
    }
    Store.commit();
  };

  // Etapa actual del expediente = último hito registrado (Paso 12).
  Store.etapaExpediente = function (x) {
    if (x.estadoEvento === "Cerrado") return C.ETAPAS_CORR.CERRADO;
    const av = (x.avances || []).slice().sort(
      (a, b) => (a.fechaReal || "").localeCompare(b.fechaReal || ""));
    const ultimo = av[av.length - 1];
    if (!ultimo) return C.ETAPAS_CORR.APERTURA;
    switch (ultimo.tipo) {
      case "envio_st": return C.ETAPAS_CORR.EN_ST;
      case "retorno_st":
        return (ultimo.datos && ultimo.datos.estadoEquipo === "Operativo")
          ? C.ETAPAS_CORR.RETORNADO_OK : C.ETAPAS_CORR.RETORNADO_NOK;
      case "cotizacion_solicitada":
      case "cotizacion_recibida": return C.ETAPAS_CORR.COMPRA;
      case "informe_tecnico":
      case "oc_emitida": return C.ETAPAS_CORR.COMPRA;
      case "oc_enviada": return C.ETAPAS_CORR.ESPERA;
      case "visita_ejecucion": return C.ETAPAS_CORR.EJECUCION;
      case "evaluacion": return C.ETAPAS_CORR.EVALUACION;
      default: return C.ETAPAS_CORR.EVALUACION;
    }
  };

  Store.diasCicloExpediente = function (x) {
    const fin = x.fechaCierre || U.todayISO();
    return U.daysBetween(x.fechaDocumento, fin);
  };

  /* =====================================================================
   * Línea de tiempo unificada de eventos de estado por equipo (Paso 2/12)
   * Devuelve eventos { fecha, estado, origen, detalle } ordenados.
   * =================================================================== */
  Store.eventosEstado = function (key) {
    const eventos = [];
    const eq = Store.equipoByKey(key);

    // Mantenciones de la app
    Store.mantencionesDe(key).forEach((m) => {
      if (m.estadoEquipo) {
        eventos.push({
          fecha: m.fecha, estado: m.estadoEquipo, origen: "Preventivo (app)",
          detalle: "Mantención " + (m.programacion || "") + " · " + (m.resultado || ""),
        });
      }
    });

    // Resultados de planilla con impacto en operatividad (FS/NU/Baja)
    if (eq && eq.registro) {
      C.MESES.forEach((mes) => {
        const reg = eq.registro[mes.key];
        if (!reg || !reg.resultado) return;
        const r = reg.resultado;
        let estado = null, detalle = "";
        if (r === "FS") { estado = C.ESTADO.NO_OPERATIVO; detalle = "Fuera de Servicio (planilla)"; }
        else if (r === "NU") { estado = C.ESTADO.NO_OPERATIVO; detalle = "No Ubicable (planilla)"; }
        else if (r === "Baja") { estado = C.ESTADO.NO_OPERATIVO; detalle = "Dado de Baja (planilla)"; }
        if (estado) {
          eventos.push({
            fecha: U.lastDayOfMonthISO(2026, mes.num), estado, origen: "Planilla",
            detalle,
          });
        }
      });
    }

    // Avances correctivos
    Store.expedientesDe(key).forEach((x) => {
      eventos.push({
        fecha: x.fechaDocumento, estado: x.estadoEquipo,
        origen: "Correctivo (apertura)", detalle: "Folio " + (x.folioSigem || ""),
      });
      (x.avances || []).forEach((a) => {
        if (a.tipo === "envio_st") {
          eventos.push({ fecha: a.fechaReal, estado: C.ESTADO.SERVICIO_TECNICO,
            origen: "Correctivo", detalle: "Envío a servicio técnico" });
        } else if (a.tipo === "retorno_st" || a.tipo === "visita_ejecucion") {
          const est = (a.datos && a.datos.estadoEquipo) || C.ESTADO.OPERATIVO;
          eventos.push({ fecha: a.fechaReal, estado: est,
            origen: "Correctivo", detalle: a.tipo === "retorno_st" ? "Retorno servicio técnico" : "Visita / Ejecución" });
        } else if (a.tipo === "cierre") {
          eventos.push({ fecha: a.fechaReal, estado: x.estadoEquipo,
            origen: "Correctivo", detalle: "Cierre del expediente" });
        }
      });
    });

    return eventos
      .filter((e) => e.fecha && e.estado)
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  };

  // Estado actual del equipo + días en estado + última actualización (Paso 2).
  Store.estadoEquipo = function (key) {
    const eventos = Store.eventosEstado(key);
    if (!eventos.length) {
      return { estado: C.ESTADO.OPERATIVO, desde: null, dias: null, asumido: true };
    }
    const ultimo = eventos[eventos.length - 1];
    // Inicio de la racha del estado actual.
    let desde = ultimo.fecha;
    for (let i = eventos.length - 1; i >= 0; i--) {
      if (eventos[i].estado === ultimo.estado) desde = eventos[i].fecha;
      else break;
    }
    return {
      estado: ultimo.estado,
      desde,
      dias: U.daysBetween(desde, U.todayISO()),
      asumido: false,
    };
  };

  Store.ultimaActualizacion = function (key) {
    let max = null;
    const upd = (iso) => { if (iso && (!max || iso > max)) max = iso; };
    Store.mantencionesDe(key).forEach((m) => { upd(m.fecha); upd((m.createdAt || "").slice(0, 10)); });
    Store.pendientesDe(key).forEach((p) => {
      upd(p.fechaCompromiso);
      (p.gestiones || []).forEach((g) => upd(g.fecha));
      upd(p.fechaCompletado);
    });
    Store.expedientesDe(key).forEach((x) => {
      upd(x.fechaDocumento); upd(x.fechaCierre);
      (x.avances || []).forEach((a) => upd(a.fechaReal));
    });
    return max;
  };

  Store.pendientesAbiertosDe = function (key) {
    return Store.pendientesDe(key).filter((p) => !p.fechaCompletado);
  };

})(window);
