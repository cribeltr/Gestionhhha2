/* =========================================================================
 * MP 2026 · utils.js
 * Constantes del dominio y utilidades transversales.
 * Basado en la especificación "Flujo Sistema Gestión MP 2026".
 * ========================================================================= */
(function (global) {
  "use strict";

  const MP = global.MP || (global.MP = {});

  /* ----- Meses (claves internas y etiquetas) -------------------------- */
  const MESES = [
    { key: "ene", label: "Ene", nombre: "Enero", num: 1 },
    { key: "feb", label: "Feb", nombre: "Febrero", num: 2 },
    { key: "mar", label: "Mar", nombre: "Marzo", num: 3 },
    { key: "abr", label: "Abr", nombre: "Abril", num: 4 },
    { key: "may", label: "May", nombre: "Mayo", num: 5 },
    { key: "jun", label: "Jun", nombre: "Junio", num: 6 },
    { key: "jul", label: "Jul", nombre: "Julio", num: 7 },
    { key: "ago", label: "Ago", nombre: "Agosto", num: 8 },
    { key: "sep", label: "Sep", nombre: "Septiembre", num: 9 },
    { key: "oct", label: "Oct", nombre: "Octubre", num: 10 },
    { key: "nov", label: "Nov", nombre: "Noviembre", num: 11 },
    { key: "dic", label: "Dic", nombre: "Diciembre", num: 12 },
  ];

  /* ----- Códigos de Programación (Paso 3) ----------------------------- */
  const PROGRAMA = {
    X: "Mantención Preventiva Programada",
    R: "Mantención Preventiva Reprogramada",
    RA: "Mantención Preventiva Reprogramada de Año Anterior",
    PM: "Puesta en Marcha",
  };
  const PROGRAMA_VALIDOS = ["X", "R", "RA", "PM"];

  /* ----- Códigos de Resultado (Paso 5) -------------------------------- */
  const RESULTADO = {
    Si: "Mantención Preventiva Realizada",
    C1: "Reprogramada — Imposibilidad de desocupar el equipo del paciente por indicación clínica",
    C2: "Reprogramada — Equipo en servicio técnico",
    C3: "Reprogramada — Equipo no operativo, a la espera de repuestos o accesorios",
    C4: "Reprogramada — Equipo en préstamo a otro hospital o institución",
    C5: "Reprogramada — No disponibilidad de horas hombre del funcionario SEC por alta carga laboral",
    C6: "Reprogramada — No disponibilidad de horas hombre del servicio técnico externo",
    C7: "Reprogramada — Ausencia justificada del funcionario SEC superior a 15 días",
    C8: "Reprogramada — Contingencia hospitalaria",
    "Si-RA": "Mantención de Año Anterior Realizada",
    FS: "Fuera de Servicio",
    No: "No Realizada",
    NU: "No Ubicable",
    Baja: "Equipo Dado de Baja",
  };
  const RESULTADO_VALIDOS = [
    "Si", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8",
    "Si-RA", "FS", "No", "NU", "Baja",
  ];

  /* ----- Causales de reprogramación (Paso 6) -------------------------- */
  const CAUSALES = {
    C1: "Imposibilidad de desocupar el equipo del paciente por indicación clínica",
    C2: "Equipo en servicio técnico",
    C3: "Equipo no operativo, a la espera de repuestos o accesorios",
    C4: "Equipo en préstamo a otro hospital o institución",
    C5: "No disponibilidad de horas hombre del funcionario SEC por alta carga laboral",
    C6: "No disponibilidad de horas hombre del servicio técnico externo",
    C7: "Ausencia justificada del funcionario SEC superior a 15 días",
    C8: "Contingencia hospitalaria",
  };
  // C2,C3,C4 -> sin nueva fecha (se registra en el mes real de ejecución).
  // C1,C5,C6,C7,C8 -> reprogramar dentro de 30 días.
  const CAUSALES_REPROGRAMA_30 = ["C1", "C5", "C6", "C7", "C8"];
  const CAUSALES_SIN_FECHA = ["C2", "C3", "C4"];

  /* ----- Ejecutores (Paso 8) ------------------------------------------ */
  const EJECUTORES = [
    "Carlos Bahamondes Seguel",
    "Cristián Beltrán Oviedo",
    "Cristina Rozas Urrutia",
    "Daniel Díaz Neira",
    "Ignacio Berner Bergara",
    "Macarena Toledo",
    "Marco Ulloa",
    "Matías Soazo Garrido",
    "Ricardo Matus Aroca",
    "Tito Millapán Riquelme",
    "Personal Externo",
  ];

  /* ----- Tipos de pendiente (Paso 9) ---------------------------------- */
  const TIPOS_PENDIENTE = [
    "Reprogramación Mantención Preventiva",
    "Protocolo Interno de Mantenimiento",
    "Protocolo Externo de Mantenimiento",
    "Pauta de Monitoreo Diario",
    "Imprimir Documento",
    "Otro",
  ];

  /* ----- Mantenimiento correctivo (Paso 10) --------------------------- */
  const TIPOS_EVENTO = ["Orden de Trabajo", "Reporte de Servicio"];
  const ESTADOS_EQUIPO_CORR = ["Operativo", "No Operativo", "Servicio Técnico"];
  const TIPOS_COMPRA = ["Trato Directo", "Compra Ágil"];
  const EMPRESAS = [
    "Medtronic Chile",
    "Draeger Medical",
    "Philips Healthcare",
    "GE HealthCare",
    "Biomédica Austral Ltda.",
    "Servicio Técnico Biomédico Regional",
    "Equipos Médicos del Sur SpA",
  ];

  /* ----- Etapas del expediente correctivo (Paso 10 — flujo OT) -------- */
  const ETAPAS_CORR = {
    APERTURA: "Apertura",
    EVALUACION: "Evaluación técnica",
    COMPRA: "Gestión de compra",
    ESPERA: "Espera y recepción",
    EN_ST: "En servicio técnico externo · esperando retorno",
    RETORNADO_OK: "Retornado · por cerrar",
    RETORNADO_NOK: "Retornado sin reparar · evaluar",
    EJECUCION: "Ejecución",
    CERRADO: "Cerrado",
  };

  /* ----- Estados de equipo (Paso 2 / 12) ------------------------------ */
  const ESTADO = {
    OPERATIVO: "Operativo",
    NO_OPERATIVO: "No Operativo",
    SERVICIO_TECNICO: "Servicio Técnico",
  };

  MP.const = {
    MESES, PROGRAMA, PROGRAMA_VALIDOS, RESULTADO, RESULTADO_VALIDOS,
    CAUSALES, CAUSALES_REPROGRAMA_30, CAUSALES_SIN_FECHA,
    EJECUTORES, TIPOS_PENDIENTE, TIPOS_EVENTO, ESTADOS_EQUIPO_CORR,
    TIPOS_COMPRA, EMPRESAS, ETAPAS_CORR, ESTADO,
  };

  /* =====================================================================
   * Utilidades
   * =================================================================== */
  const U = MP.util = {};

  U.uid = function (prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 8);
  };

  // Lee un valor conservando ceros a la izquierda (Serie / N° Inventario).
  U.asText = function (v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  };

  U.todayISO = function () {
    const d = new Date();
    return U.dateToISO(d);
  };

  U.dateToISO = function (d) {
    if (!d) return "";
    if (typeof d === "string") return d.slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  U.parseISO = function (s) {
    if (!s) return null;
    const parts = String(s).slice(0, 10).split("-");
    if (parts.length !== 3) return null;
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  };

  U.fmtDate = function (s) {
    const d = U.parseISO(s);
    if (!d || isNaN(d)) return "";
    return String(d.getDate()).padStart(2, "0") + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  };

  U.daysBetween = function (aISO, bISO) {
    const a = U.parseISO(aISO), b = U.parseISO(bISO || U.todayISO());
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  };

  U.addDays = function (iso, n) {
    const d = U.parseISO(iso) || new Date();
    d.setDate(d.getDate() + n);
    return U.dateToISO(d);
  };

  U.mesKeyFromISO = function (iso) {
    const d = U.parseISO(iso);
    if (!d) return null;
    return MESES[d.getMonth()].key;
  };

  U.mesNombre = function (key) {
    const m = MESES.find((x) => x.key === key);
    return m ? m.nombre : key;
  };

  U.lastDayOfMonthISO = function (year, monthNum) {
    const d = new Date(year, monthNum, 0);
    return U.dateToISO(d);
  };

  // Escapa HTML para inyección segura en innerHTML.
  U.esc = function (s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  // Crea un elemento DOM con atributos e hijos.
  U.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children !== null && children !== undefined) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === "string" || typeof c === "number"
          ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  };

  // Clave única de equipo: Serie o, en su defecto, N° Inventario (Paso 1).
  U.equipoKey = function (eq) {
    if (!eq) return "";
    const serie = U.asText(eq.serie);
    if (serie) return "S:" + serie;
    const inv = U.asText(eq.nInventario);
    if (inv) return "I:" + inv;
    return "ID:" + U.asText(eq.id);
  };

  // Normaliza texto para búsqueda (sin acentos, minúsculas).
  U.norm = function (s) {
    return U.asText(s).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  };

})(window);
