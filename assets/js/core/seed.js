/* =========================================================================
 * MP 2026 · seed.js
 * Datos de demostración que simulan escenarios reales de un hospital,
 * para poder probar el flujo completo sin cargar una planilla.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const Store = MP.store;

  function eq(o) {
    return Object.assign({
      programacion: {}, registro: {},
      nCarpeta: "", procedencia: "Compra", anioInstalacion: "", vidaUtilResidual: "",
      clasificacion: "Crítico", enuBaja: "",
    }, o);
  }

  MP.seed = function () {
    const equipos = [
      eq({ id: 1, nCarpeta: "C-001", nInventario: "00039", equipo: "Ventilador Mecánico", servicio: "UCI Adulto",
        unidad: "Cama 3", ubicacion: "3er piso", marca: "Dräger", modelo: "Evita V500", serie: "ASKB-0021",
        anioInstalacion: "2019", vidaUtilResidual: "4", clasificacion: "Crítico",
        programacion: { ene: "X", abr: "X", jul: "X", oct: "X" },
        registro: { ene: { programa: "X", resultado: "Si" }, abr: { programa: "X", resultado: "C3" } } }),
      eq({ id: 2, nCarpeta: "C-002", nInventario: "00104", equipo: "Monitor de Signos Vitales", servicio: "UCI Adulto",
        unidad: "Cama 5", ubicacion: "3er piso", marca: "Philips", modelo: "IntelliVue MX450", serie: "DE-00782",
        anioInstalacion: "2021", vidaUtilResidual: "6", clasificacion: "Crítico",
        programacion: { feb: "X", may: "X", ago: "X", nov: "X" },
        registro: { feb: { programa: "X", resultado: "Si" }, may: { programa: "X", resultado: "Si" } } }),
      eq({ id: 3, nCarpeta: "C-003", nInventario: "00210", equipo: "Bomba de Infusión", servicio: "Pabellón Central",
        unidad: "Quirófano 2", ubicacion: "2do piso", marca: "B. Braun", modelo: "Infusomat Space", serie: "BBR-1187",
        anioInstalacion: "2018", vidaUtilResidual: "3", clasificacion: "Crítico",
        programacion: { mar: "X", sep: "X" },
        registro: { mar: { programa: "X", resultado: "C2" } } }),
      eq({ id: 4, nCarpeta: "C-004", nInventario: "00311", equipo: "Desfibrilador", servicio: "Urgencias",
        unidad: "Reanimación", ubicacion: "1er piso", marca: "Zoll", modelo: "R Series", serie: "ZOL-0455",
        anioInstalacion: "2020", vidaUtilResidual: "5", clasificacion: "Crítico",
        programacion: { ene: "X", jul: "X" },
        registro: { ene: { programa: "X", resultado: "Si" } } }),
      eq({ id: 5, nCarpeta: "C-005", nInventario: "00420", equipo: "Electrocardiógrafo", servicio: "Cardiología",
        unidad: "Box 4", ubicacion: "2do piso", marca: "GE", modelo: "MAC 2000", serie: "GE-90112",
        anioInstalacion: "2017", vidaUtilResidual: "2", clasificacion: "No crítico",
        programacion: { abr: "X", oct: "X" },
        registro: { abr: { programa: "X", resultado: "NU" } } }),
      eq({ id: 6, nCarpeta: "C-006", nInventario: "00501", equipo: "Incubadora Neonatal", servicio: "Neonatología",
        unidad: "UCIN Cama 1", ubicacion: "4to piso", marca: "Atom", modelo: "Incu i", serie: "ATM-0033",
        anioInstalacion: "2022", vidaUtilResidual: "8", clasificacion: "Crítico",
        programacion: { mar: "X", jun: "X", sep: "X", dic: "X" },
        registro: { mar: { programa: "X", resultado: "Si" }, jun: { programa: "X", resultado: "Si" } } }),
      eq({ id: 7, nCarpeta: "C-007", nInventario: "00615", equipo: "Máquina de Anestesia", servicio: "Pabellón Central",
        unidad: "Quirófano 1", ubicacion: "2do piso", marca: "Dräger", modelo: "Fabius Plus", serie: "ASKD-1190",
        anioInstalacion: "2016", vidaUtilResidual: "1", clasificacion: "Crítico",
        programacion: { feb: "X", ago: "X" },
        registro: { feb: { programa: "X", resultado: "FS" } } }),
      eq({ id: 8, nCarpeta: "C-008", nInventario: "00702", equipo: "Ecógrafo", servicio: "Imagenología",
        unidad: "Sala Eco 1", ubicacion: "1er piso", marca: "Mindray", modelo: "DC-70", serie: "MDR-2204",
        anioInstalacion: "2021", vidaUtilResidual: "7", clasificacion: "No crítico",
        programacion: { may: "X", nov: "X" }, registro: {} }),
      eq({ id: 9, nCarpeta: "C-009", nInventario: "00810", equipo: "Bomba de Infusión", servicio: "Medicina Interna",
        unidad: "Cama 12", ubicacion: "5to piso", marca: "B. Braun", modelo: "Perfusor Space", serie: "BBR-2290",
        anioInstalacion: "2019", vidaUtilResidual: "4", clasificacion: "Crítico",
        programacion: { ene: "X", jul: "X" },
        registro: { ene: { programa: "X", resultado: "Si" } } }),
      eq({ id: 10, nCarpeta: "C-010", nInventario: "00915", equipo: "Aspirador de Secreciones", servicio: "Urgencias",
        unidad: "Box 2", ubicacion: "1er piso", marca: "Cami", modelo: "Aspeed", serie: "CAM-0078",
        anioInstalacion: "2015", vidaUtilResidual: "0", clasificacion: "No crítico", enuBaja: "ENU",
        programacion: { jun: "X" }, registro: {} }),
    ];

    Store.db.equipos = equipos;
    Store.db.meta = { creado: new Date().toISOString(), ultimaCarga: null, demo: true };

    const k = (serie) => "S:" + serie;

    // Mantenciones registradas en la app (Paso 8)
    Store.db.mantenciones = [
      { id: U.uid("mant"), equipoKey: k("DE-00782"), fecha: "2026-05-12", programacion: "X",
        ejecutor: "Cristina Rozas Urrutia", resultado: "Si", observaciones: "Sin novedades.",
        estadoEquipo: "Operativo", gestionPendiente: false, tipoRegistro: "Oficial",
        createdAt: "2026-05-12T10:00:00Z" },
      { id: U.uid("mant"), equipoKey: k("ATM-0033"), fecha: "2026-06-04", programacion: "X",
        ejecutor: "Daniel Díaz Neira", resultado: "Si", observaciones: "Calibración OK.",
        estadoEquipo: "Operativo", gestionPendiente: false, tipoRegistro: "Borrador",
        createdAt: "2026-06-04T09:30:00Z" },
      { id: U.uid("mant"), equipoKey: k("BBR-1187"), fecha: "2026-03-20", programacion: "X",
        ejecutor: "Marco Ulloa", resultado: "C2", observaciones: "Equipo en servicio técnico, se reprograma al reintegro.",
        estadoEquipo: "No Operativo", gestionPendiente: true, tipoRegistro: "Oficial",
        createdAt: "2026-03-20T11:00:00Z", _pendienteGenerado: true },
    ];

    // Pendientes (Paso 9) — incluye uno atrasado y uno en espera
    Store.db.pendientes = [
      { id: U.uid("pend"), equipoKey: k("BBR-1187"), fechaCompromiso: "2026-06-10",
        tipo: "Reprogramación Mantención Preventiva",
        descripcion: "Reprogramar MP al reintegro del equipo desde servicio técnico (C2).",
        tareas: [{ texto: "Confirmar retorno del equipo", hecha: true }, { texto: "Agendar nueva fecha de MP", hecha: false }],
        responsableAdmin: "Cristián Beltrán Oviedo", responsableEjecutivo: "Marco Ulloa",
        gestiones: [{ fecha: "2026-04-01", texto: "Se contacta a servicio técnico para estado.", ts: "2026-04-01T12:00:00Z" }],
        enEspera: null, fechaCompletado: null, origen: "preventivo", createdAt: "2026-03-20T11:05:00Z" },
      { id: U.uid("pend"), equipoKey: k("GE-90112"), fechaCompromiso: "2026-06-20",
        tipo: "Otro", descripcion: "Ubicar equipo reportado como No Ubicable en planilla (abril).",
        tareas: [{ texto: "Consultar a jefatura de Cardiología", hecha: false }],
        responsableAdmin: "Cristián Beltrán Oviedo", responsableEjecutivo: "Ignacio Berner Bergara",
        gestiones: [], enEspera: { motivo: "Esperando respuesta de jefatura de servicio" },
        fechaCompletado: null, origen: "manual", createdAt: "2026-05-02T08:00:00Z" },
      { id: U.uid("pend"), equipoKey: k("ASKB-0021"), fechaCompromiso: "2026-05-15",
        tipo: "Protocolo Externo de Mantenimiento",
        descripcion: "Espera de repuestos para ventilador (C3).",
        tareas: [{ texto: "Solicitar cotización repuesto", hecha: true }, { texto: "Emitir orden de compra", hecha: false }],
        responsableAdmin: "Cristián Beltrán Oviedo", responsableEjecutivo: "Carlos Bahamondes Seguel",
        gestiones: [{ fecha: "2026-04-15", texto: "Cotización solicitada al proveedor.", ts: "2026-04-15T10:00:00Z" }],
        enEspera: null, fechaCompletado: null, origen: "preventivo", createdAt: "2026-04-12T10:00:00Z" },
    ];

    // Expediente correctivo completo (Paso 10/15) — equipo No Operativo con ciclo
    const expId = U.uid("exp");
    Store.db.expedientes = [{
      id: expId, folioSigem: "SIGEM-2026-0488", equipoKey: k("ASKD-1190"),
      tipoEvento: "Orden de Trabajo", requerimiento: "Falla en mezclador de gases, equipo no enciende.",
      fechaDocumento: "2026-02-10", tecnico: "Carlos Bahamondes Seguel", estadoEquipo: "No Operativo",
      tipoCompra: "Trato Directo",
      informeTecnico: { numero: "IT-2026-031", fecha: "2026-02-20", responsable: "Carlos Bahamondes Seguel", empresa: "Dräger Medical" },
      ordenCompra: { numero: "OC-7781", fecha: "2026-02-28", descripcion: "Repuesto mezclador de gases + visita técnica." },
      estadoEvento: "Abierto", fechaCierre: null,
      gestionPendiente: true, tipoRegistro: "Oficial", pendienteId: null,
      createdAt: "2026-02-10T09:00:00Z",
      avances: [
        { id: U.uid("av"), tipo: "evaluacion", fechaReal: "2026-02-12", fechaRegistro: "2026-02-12", datos: { nota: "Se requiere repuesto, compra por trato directo." } },
        { id: U.uid("av"), tipo: "cotizacion_solicitada", fechaReal: "2026-02-14", fechaRegistro: "2026-02-14", datos: { empresa: "Dräger Medical" } },
        { id: U.uid("av"), tipo: "cotizacion_recibida", fechaReal: "2026-02-18", fechaRegistro: "2026-02-18", datos: { numero: "COT-9921", fecha: "2026-02-18" } },
        { id: U.uid("av"), tipo: "informe_tecnico", fechaReal: "2026-02-20", fechaRegistro: "2026-02-20", datos: { numero: "IT-2026-031" } },
        { id: U.uid("av"), tipo: "oc_emitida", fechaReal: "2026-02-28", fechaRegistro: "2026-02-28", datos: { numero: "OC-7781" } },
        { id: U.uid("av"), tipo: "oc_enviada", fechaReal: "2026-03-01", fechaRegistro: "2026-03-01", datos: { empresa: "Dräger Medical" } },
        { id: U.uid("av"), tipo: "envio_st", fechaReal: "2026-03-10", fechaRegistro: "2026-03-10", datos: { empresa: "Dräger Medical", numeroEnvio: "ENV-3321" } },
      ],
    }];

    Store.commit();
  };

})(window);
