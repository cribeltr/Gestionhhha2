/* =========================================================================
 * MP 2026 · app.js  —  Enrutador, navegación e inicialización.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const el = U.el;
  const Store = MP.store;
  const UI = MP.ui;

  const App = MP.app = {};
  App.vistaActual = "equipos";

  const NAV = [
    { id: "equipos", label: "Equipos", ico: "📊" },
    { id: "plan", label: "Plan de Mantenimiento", ico: "🗓️" },
    { id: "pendientes", label: "Pendientes", ico: "📋" },
    { id: "operatividad", label: "Operatividad", ico: "🚨" },
    { id: "correctivo", label: "Correctivo", ico: "🔧" },
    { id: "datos", label: "Datos", ico: "⚙️" },
  ];

  App.go = function (id) {
    App.vistaActual = id;
    if (MP.grabacion.activa()) MP.grabacion.notarVista(id);
    if (location.hash !== "#" + id) location.hash = id;
    App.render();
  };

  App.render = function () {
    // Nav activo
    document.querySelectorAll(".nav-item").forEach((n) =>
      n.classList.toggle("active", n.dataset.id === App.vistaActual));
    // Badge de pendientes
    const abiertos = Store.db.pendientes.filter((p) => !p.fechaCompletado).length;
    const badge = document.getElementById("pend-badge");
    if (badge) { badge.textContent = abiertos; badge.style.display = abiertos ? "" : "none"; }

    const main = document.getElementById("view");
    main.innerHTML = "";
    const fn = MP.views[App.vistaActual];
    if (fn) {
      try { fn(main); }
      catch (e) { console.error(e); main.appendChild(el("div", { class: "error-box" }, "Error al renderizar: " + e.message)); }
    }
  };

  function buildShell() {
    const app = document.getElementById("app");

    // Barra superior
    const grabBtn = el("button", { id: "grab-btn", class: "topbar-btn", title: "Grabar sesión (Paso 14)" }, [
      el("span", { class: "rec-dot" }), el("span", { id: "grab-label" }, "Grabar"),
    ]);
    grabBtn.addEventListener("click", () => {
      MP.grabacion.toggle();
      const on = MP.grabacion.activa();
      grabBtn.classList.toggle("recording", on);
      document.getElementById("grab-label").textContent = on ? "Detener" : "Grabar";
    });

    const topbar = el("header", { class: "topbar" }, [
      el("div", { class: "brand" }, [
        el("span", { class: "brand-logo" }, "✚"),
        el("div", {}, [
          el("div", { class: "brand-title" }, "Gestión MP 2026"),
          el("div", { class: "brand-sub" }, "Mantenciones Preventivas de Equipos"),
        ]),
      ]),
      el("div", { class: "topbar-actions" }, [
        grabBtn,
        el("button", { class: "topbar-btn", title: "Descargar registros", onclick: () => MP.excel.descargarTodo() }, "⬇ Exportar"),
        el("button", { class: "topbar-btn", title: "Respaldo y datos", onclick: () => App.go("datos") }, "⚙ Datos"),
      ]),
    ]);

    // Navegación lateral
    const nav = el("nav", { class: "sidebar" }, NAV.map((n) => {
      const item = el("a", { class: "nav-item", "data-id": n.id, href: "#" + n.id }, [
        el("span", { class: "nav-ico" }, n.ico),
        el("span", { class: "nav-label" }, n.label),
        n.id === "pendientes" ? el("span", { id: "pend-badge", class: "nav-badge" }, "0") : null,
      ]);
      item.addEventListener("click", (e) => { e.preventDefault(); App.go(n.id); });
      return item;
    }));

    const main = el("main", { class: "main" }, el("div", { id: "view", class: "view" }));

    app.appendChild(topbar);
    app.appendChild(el("div", { class: "layout" }, [nav, main]));
  }

  App.init = function () {
    buildShell();
    const cargado = Store.load();
    if (!cargado || Store.db.equipos.length === 0) {
      // Primera vez: cargar demo para que el usuario vea el sistema funcionando.
      MP.seed();
    }
    // Aviso de pendientes atrasados al abrir (Paso 9).
    const atrasados = Store.db.pendientes.filter((p) => !p.fechaCompletado && MP.store.urgenciaPendiente(p) === "Atrasado");
    if (atrasados.length) setTimeout(() => UI.toast("⚠️ Tiene " + atrasados.length + " pendiente(s) atrasado(s).", "warn"), 800);

    Store.onChange(() => App.render());

    const hash = (location.hash || "").replace("#", "");
    App.vistaActual = NAV.some((n) => n.id === hash) ? hash : "equipos";
    window.addEventListener("hashchange", () => {
      const h = (location.hash || "").replace("#", "");
      if (NAV.some((n) => n.id === h) && h !== App.vistaActual) { App.vistaActual = h; App.render(); }
    });

    App.render();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", App.init);
  else App.init();

})(window);
