/* =========================================================================
 * MP 2026 · pendientes.js  —  Paso 9: Bandeja de gestión de pendientes
 * Tabla tipo Excel, métricas de cabecera, acciones rápidas por fila,
 * filas expandibles con tareas, bitácora y caja de gestión.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const el = U.el;
  const Store = MP.store;
  const UI = MP.ui;

  const URGENCIA_ORDEN = { "Atrasado": 0, "Hoy": 1, "Esta semana": 2, "Próximo": 3, "En espera": 4, "Completado": 5 };

  MP.views = MP.views || {};
  MP.views.pendientes = function (container) {
    const todos = Store.db.pendientes;

    container.appendChild(el("div", { class: "view-head" }, [
      el("h2", {}, "Bandeja de Pendientes"),
      el("p", { class: "view-sub" }, "Gestión de pendientes con urgencia, tareas y bitácora."),
    ]));

    // Métricas de cabecera
    const abiertos = todos.filter((p) => !p.fechaCompletado);
    const atrasados = abiertos.filter((p) => Store.urgenciaPendiente(p) === "Atrasado");
    const enEspera = abiertos.filter((p) => p.enEspera);
    const compSemana = todos.filter((p) => p.fechaCompletado && U.daysBetween(p.fechaCompletado, U.todayISO()) <= 7);
    const completados = todos.filter((p) => p.fechaCompletado);
    const tmedio = (() => {
      const res = completados.map((p) => U.daysBetween(p.createdAt ? p.createdAt.slice(0, 10) : p.fechaCompromiso, p.fechaCompletado)).filter((d) => d !== null && d >= 0);
      if (!res.length) return "—";
      return Math.round(res.reduce((a, b) => a + b, 0) / res.length) + " d";
    })();

    container.appendChild(metricas([
      ["Abiertos", abiertos.length, "neutral"],
      ["Atrasados", atrasados.length, "bad"],
      ["En espera", enEspera.length, "warn"],
      ["Completados (semana)", compSemana.length, "ok"],
      ["Tiempo medio resolución", tmedio, "neutral"],
    ]));

    const rows = todos.map((p) => {
      const eq = Store.equipoByKey(p.equipoKey) || {};
      const urg = Store.urgenciaPendiente(p);
      return {
        _p: p, _eq: eq,
        equipo: eq.equipo || "(sin equipo)", serie: eq.serie || "", nInventario: eq.nInventario || "",
        servicio: eq.servicio || "", tipo: p.tipo, urgencia: urg, estado: Store.estadoPendiente(p),
        compromiso: p.fechaCompromiso, atraso: Store.diasAtraso(p),
        tareas: (p.tareas || []).filter((t) => t.hecha).length + "/" + (p.tareas || []).length,
        responsables: [p.responsableAdmin, p.responsableEjecutivo].filter(Boolean).join(" / "),
        espera: p.enEspera ? p.enEspera.motivo : "",
        ultimaGestion: (p.gestiones && p.gestiones.length) ? U.fmtDate(p.gestiones[p.gestiones.length - 1].fecha) : "",
        completado: p.fechaCompletado || "",
      };
    });
    // Orden por urgencia por defecto
    rows.sort((a, b) => (URGENCIA_ORDEN[a.urgencia] - URGENCIA_ORDEN[b.urgencia]) || (a.atraso < b.atraso ? 1 : -1));

    const cols = [
      { key: "equipo", label: "Equipo" },
      { key: "serie", label: "Serie" },
      { key: "nInventario", label: "N° Inventario" },
      { key: "servicio", label: "Servicio" },
      { key: "tipo", label: "Tipo" },
      { key: "urgencia", label: "Urgencia", render: (r) => chipUrg(r.urgencia), text: (r) => r.urgencia },
      { key: "estado", label: "Estado gestión" },
      { key: "compromiso", label: "Compromiso", render: (r) => el("span", {}, U.fmtDate(r.compromiso)), text: (r) => r.compromiso },
      { key: "atraso", label: "Días atraso", align: "right", text: (r) => String(r.atraso) },
      { key: "tareas", label: "Tareas", align: "center" },
      { key: "responsables", label: "Responsables", defaultVisible: false },
      { key: "espera", label: "En espera de", defaultVisible: false },
      { key: "ultimaGestion", label: "Última gestión", defaultVisible: false },
      { key: "completado", label: "Completado", defaultVisible: false, render: (r) => el("span", {}, r.completado ? U.fmtDate(r.completado) : "—"), text: (r) => r.completado },
      { key: "_acc", label: "Acciones", filterable: false, sortable: false, render: (r) => accionesRapidas(r._p) },
    ];

    const toolbarExtra = [UI.btn("+ Nuevo pendiente", "primary sm", () => MP.forms.pendiente(null, () => MP.app.render()))];

    const dt = UI.DataTable({
      columns: cols, rows, storageKey: "pendientes", exportName: "Pendientes_MP2026",
      toolbarExtra,
      rowClass: (r) => "urg-row-" + U.norm(r.urgencia).replace(/\s/g, "-"),
      onRowClick: (r) => toggleExpand(r._p, dt),
      emptyText: "No hay pendientes registrados.",
    });
    container.appendChild(dt.root);

    function accionesRapidas(p) {
      const wrap = el("div", { class: "row-actions no-rowclick" });
      if (!p.fechaCompletado) {
        wrap.appendChild(UI.btn("✓", "icon-btn", () => {
          const abiertas = (p.tareas || []).filter((t) => !t.hecha).length;
          if (abiertas > 0) UI.confirm("Quedan <b>" + abiertas + "</b> tarea(s) sin marcar. ¿Completar de todos modos?", () => { Store.completarPendiente(p.id); MP.app.render(); });
          else { Store.completarPendiente(p.id); MP.app.render(); }
        }, { title: "Completar" }));
        wrap.appendChild(UI.btn("+1", "icon-btn", () => { Store.posponerPendiente(p.id, 1); MP.app.render(); }, { title: "Posponer 1 día" }));
        wrap.appendChild(UI.btn("+3", "icon-btn", () => { Store.posponerPendiente(p.id, 3); MP.app.render(); }, { title: "Posponer 3 días" }));
        wrap.appendChild(UI.btn("+7", "icon-btn", () => { Store.posponerPendiente(p.id, 7); MP.app.render(); }, { title: "Posponer 7 días" }));
        if (p.enEspera) wrap.appendChild(UI.btn("▶", "icon-btn", () => { Store.reanudarPendiente(p.id); MP.app.render(); }, { title: "Reanudar" }));
        else wrap.appendChild(UI.btn("⏸", "icon-btn", () => {
          promptMotivo((motivo) => { Store.marcarEnEspera(p.id, motivo); MP.app.render(); });
        }, { title: "Marcar en espera" }));
      }
      return wrap;
    }

    function toggleExpand(p, dt) {
      // Abre un modal de gestión en línea (equivalente a desplegar la fila).
      const eq = Store.equipoByKey(p.equipoKey) || {};
      const body = el("div", { class: "pend-expand" });
      const mm = UI.modal({ title: "Pendiente · " + (eq.equipo || "") + " · " + p.tipo, size: "lg", body });

      function renderExp() {
        body.innerHTML = "";
        body.appendChild(el("div", { class: "muted" }, "Compromiso: " + U.fmtDate(p.fechaCompromiso) +
          " · " + Store.estadoPendiente(p) + " · " + Store.urgenciaPendiente(p) +
          (p.enEspera ? " · En espera: " + p.enEspera.motivo : "")));
        if (p.descripcion) body.appendChild(el("p", {}, p.descripcion));

        // Tareas marcables
        body.appendChild(el("h4", { class: "sec-title" }, "Tareas"));
        const tl = el("div", { class: "tareas-list" });
        (p.tareas || []).forEach((t) => {
          const cb = el("input", { type: "checkbox" }); cb.checked = !!t.hecha;
          cb.addEventListener("change", () => {
            t.hecha = cb.checked; Store.commit();
            if (cb.checked && (p.tareas || []).every((x) => x.hecha) && !p.fechaCompletado) {
              UI.confirm("Todas las tareas están marcadas. ¿Completar el pendiente?", () => { Store.completarPendiente(p.id); mm.close(); MP.app.render(); });
            }
          });
          tl.appendChild(el("div", { class: "tarea-row" }, [cb, el("span", { class: "tarea-txt" + (t.hecha ? " done" : "") }, t.texto)]));
        });
        if ((p.tareas || []).length === 0) tl.appendChild(el("p", { class: "muted" }, "Sin tareas."));
        body.appendChild(tl);

        // Bitácora de gestión
        body.appendChild(el("h4", { class: "sec-title" }, "Bitácora de gestión"));
        const bit = el("div", { class: "bitacora" });
        (p.gestiones || []).slice().reverse().forEach((g) =>
          bit.appendChild(el("div", { class: "bit-item" }, [el("span", { class: "bit-date" }, U.fmtDate(g.fecha)), " " + g.texto])));
        if ((p.gestiones || []).length === 0) bit.appendChild(el("p", { class: "muted" }, "Sin gestiones."));
        body.appendChild(bit);

        // Caja de gestión
        const ta = el("textarea", { class: "ctrl", rows: 2, placeholder: "Registrar una gestión…" });
        body.appendChild(el("div", { class: "gestion-box" }, [ta,
          UI.btn("Registrar", "secondary sm", () => { if (ta.value.trim()) { Store.agregarGestion(p.id, ta.value.trim()); ta.value = ""; renderExp(); MP.app.render(); } })]));

        // Footer acciones
        body.appendChild(el("div", { class: "modal-foot inline" }, [
          UI.btn("Editar pendiente", "ghost", () => { mm.close(); MP.forms.pendiente(p.equipoKey, () => MP.app.render(), p); }),
          !p.fechaCompletado ? UI.btn("✓ Completar", "primary", () => {
            const abiertas = (p.tareas || []).filter((t) => !t.hecha).length;
            const done = () => { Store.completarPendiente(p.id); mm.close(); MP.app.render(); };
            if (abiertas > 0) UI.confirm("Quedan <b>" + abiertas + "</b> tarea(s) sin marcar. ¿Completar igual?", done);
            else done();
          }) : null,
          UI.btn("Eliminar", "danger ghost", () => UI.confirm("¿Eliminar este pendiente?", () => { Store.eliminarPendiente(p.id); mm.close(); MP.app.render(); }, { danger: true, okText: "Eliminar" })),
        ]));
      }
      renderExp();
    }

    function promptMotivo(cb) {
      const ta = el("textarea", { class: "ctrl", rows: 2, placeholder: "Motivo de la espera (de quién/qué se espera)…" });
      const mm = UI.modal({ title: "Marcar en espera", size: "sm", body: ta, footer: [
        UI.btn("Cancelar", "ghost", () => mm.close()),
        UI.btn("Confirmar", "primary", () => { mm.close(); cb(ta.value.trim() || "Sin especificar"); }),
      ] });
    }
  };

  function chipUrg(urg) {
    const cls = urg === "Atrasado" ? "bad" : urg === "Hoy" ? "warn" : urg === "Completado" ? "ok" : urg === "En espera" ? "neutral" : "info";
    return el("span", { class: "chip " + cls }, urg);
  }

  function metricas(items) {
    return el("div", { class: "metrics" }, items.map(([label, val, cls]) =>
      el("div", { class: "metric metric-" + cls }, [
        el("div", { class: "metric-val" }, String(val)),
        el("div", { class: "metric-label" }, label),
      ])));
  }
  MP.views._metricas = metricas;
})(window);
