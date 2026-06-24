/* =========================================================================
 * MP 2026 · grabacion.js
 * Paso 14 — Grabación de sesión para mejora continua.
 * Registra localmente la interacción (clics, escritura, navegación,
 * apertura de formularios, filtros, desplazamiento, foco y tiempos)
 * SIN enviar nada fuera del computador. Al detener, descarga un .json.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;

  const Rec = MP.grabacion = {};
  let activa = false;
  let eventos = [];
  let inicio = 0;
  let ultimoClickTarget = null;
  let clicksRepetidos = 0;
  let tiempoFueraFoco = 0;
  let foraDesde = 0;
  let vistaActual = null;
  let vistaDesde = 0;
  const tiempoPorVista = {};
  const handlers = {};

  function t() { return Date.now() - inicio; }

  function log(tipo, datos) {
    if (!activa) return;
    eventos.push(Object.assign({ t: t(), tipo }, datos || {}));
  }

  Rec.activa = function () { return activa; };

  Rec.notarVista = function (vista) {
    if (!activa) return;
    const ahora = Date.now();
    if (vistaActual) tiempoPorVista[vistaActual] = (tiempoPorVista[vistaActual] || 0) + (ahora - vistaDesde);
    vistaActual = vista; vistaDesde = ahora;
    log("navegacion", { vista });
  };

  Rec.notarFormulario = function (nombre, resultado, duracionMs) {
    log("formulario", { nombre, resultado, duracionMs });
  };

  Rec.start = function () {
    if (activa) return;
    activa = true; eventos = []; inicio = Date.now();
    tiempoFueraFoco = 0; clicksRepetidos = 0;
    vistaActual = MP.app ? MP.app.vistaActual : null; vistaDesde = Date.now();
    Object.keys(tiempoPorVista).forEach((k) => delete tiempoPorVista[k]);

    handlers.click = (e) => {
      const tgt = e.target;
      const desc = describir(tgt);
      if (ultimoClickTarget === desc) clicksRepetidos++; else clicksRepetidos = 0;
      ultimoClickTarget = desc;
      log("click", { objetivo: desc, repetido: clicksRepetidos > 0, x: e.clientX, y: e.clientY });
    };
    handlers.input = (e) => {
      const tgt = e.target;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.tagName === "SELECT")) {
        log("escritura", { objetivo: describir(tgt), largo: (tgt.value || "").length });
      }
    };
    let scrollTO;
    handlers.scroll = () => {
      clearTimeout(scrollTO);
      scrollTO = setTimeout(() => log("desplazamiento", { y: Math.round(global.scrollY) }), 150);
    };
    handlers.blur = () => { foraDesde = Date.now(); log("foco", { estado: "fuera" }); };
    handlers.focus = () => {
      if (foraDesde) { tiempoFueraFoco += Date.now() - foraDesde; foraDesde = 0; }
      log("foco", { estado: "dentro" });
    };
    handlers.beforeunload = (e) => {
      if (activa) { e.preventDefault(); e.returnValue = ""; return ""; }
    };

    document.addEventListener("click", handlers.click, true);
    document.addEventListener("input", handlers.input, true);
    global.addEventListener("scroll", handlers.scroll, true);
    global.addEventListener("blur", handlers.blur);
    global.addEventListener("focus", handlers.focus);
    global.addEventListener("beforeunload", handlers.beforeunload);

    log("inicio", { ua: navigator.userAgent });
    MP.ui.toast("Grabación iniciada (solo local).", "info");
  };

  Rec.stop = function () {
    if (!activa) return;
    activa = false;
    if (vistaActual) tiempoPorVista[vistaActual] = (tiempoPorVista[vistaActual] || 0) + (Date.now() - vistaDesde);
    if (foraDesde) { tiempoFueraFoco += Date.now() - foraDesde; foraDesde = 0; }

    document.removeEventListener("click", handlers.click, true);
    document.removeEventListener("input", handlers.input, true);
    global.removeEventListener("scroll", handlers.scroll, true);
    global.removeEventListener("blur", handlers.blur);
    global.removeEventListener("focus", handlers.focus);
    global.removeEventListener("beforeunload", handlers.beforeunload);

    const duracionTotal = Date.now() - inicio;
    const resumen = {
      _app: "MP2026-grabacion", fecha: new Date().toISOString(),
      duracionMs: duracionTotal,
      tiempoActivoMs: duracionTotal - tiempoFueraFoco,
      tiempoFueraFocoMs: tiempoFueraFoco,
      tiempoPorVistaMs: tiempoPorVista,
      totalEventos: eventos.length,
      clics: eventos.filter((e) => e.tipo === "click").length,
      clicsRepetidos: eventos.filter((e) => e.tipo === "click" && e.repetido).length,
      formularios: eventos.filter((e) => e.tipo === "formulario"),
      eventos,
    };
    const blob = new Blob([JSON.stringify(resumen, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = U.el("a", { href: url, download: "grabacion_MP2026_" + U.todayISO() + "_" + Date.now() + ".json" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    MP.ui.toast("Grabación detenida y descargada (" + eventos.length + " eventos).", "ok");
  };

  Rec.toggle = function () { activa ? Rec.stop() : Rec.start(); };

  function describir(tgt) {
    if (!tgt || !tgt.tagName) return "documento";
    let d = tgt.tagName.toLowerCase();
    if (tgt.id) d += "#" + tgt.id;
    else if (tgt.className && typeof tgt.className === "string") {
      const c = tgt.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".");
      if (c) d += "." + c;
    }
    const txt = (tgt.textContent || "").trim().slice(0, 24);
    if (txt && (tgt.tagName === "BUTTON" || tgt.tagName === "A")) d += " «" + txt + "»";
    return d;
  }

})(window);
