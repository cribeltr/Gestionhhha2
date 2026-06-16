/* =========================================================================
 * MP 2026 · correctivo.js  —  Paso 15: Vista global de Mantenimiento Correctivo
 * Una fila por expediente (folio SIGEM), uniendo la OT con sus avances.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const el = U.el;
  const Store = MP.store;

  MP.views = MP.views || {};
  MP.views.correctivo = function (container) {
    container.appendChild(el("div", { class: "view-head" }, [
      el("h2", {}, "Mantenimiento Correctivo"),
      el("p", { class: "view-sub" }, "Una fila por expediente (folio SIGEM). Clic para abrir la ficha del equipo."),
    ]));

    const exps = Store.db.expedientes;
    const detenidos = exps.filter((x) => x.estadoEvento !== "Cerrado" && x.estadoEquipo === "No Operativo");
    const abiertos = exps.filter((x) => x.estadoEvento !== "Cerrado");
    const cerrados = exps.filter((x) => x.estadoEvento === "Cerrado");
    const cicloMedio = (() => {
      const c = cerrados.map((x) => Store.diasCicloExpediente(x)).filter((d) => d !== null);
      return c.length ? Math.round(c.reduce((a, b) => a + b, 0) / c.length) + " d" : "—";
    })();

    container.appendChild(MP.views._metricas([
      ["Expedientes", exps.length, "neutral"],
      ["Abiertos", abiertos.length, "warn"],
      ["Equipo detenido", detenidos.length, "bad"],
      ["Cerrados", cerrados.length, "ok"],
      ["Ciclo medio", cicloMedio, "info"],
    ]));

    let idc = 0;
    const rows = exps.map((x) => {
      const eq = Store.equipoByKey(x.equipoKey) || {};
      const ultEmpresa = (() => {
        const envio = (x.avances || []).slice().reverse().find((a) => a.datos && a.datos.empresa);
        if (envio) return envio.datos.empresa;
        if (x.ordenCompra) return (x.informeTecnico && x.informeTecnico.empresa) || "";
        return (x.informeTecnico && x.informeTecnico.empresa) || "";
      })();
      return {
        _x: x, _key: x.equipoKey, _serie: eq.serie || "", _inv: eq.nInventario || "",
        idc: ++idc, equipo: eq.equipo || "(sin equipo)", tipo: x.tipoEvento, folio: x.folioSigem,
        fechaDoc: x.fechaDocumento, tecnico: x.tecnico, empresa: ultEmpresa,
        estado: x.estadoEvento === "Cerrado" ? "Cerrado" : Store.etapaExpediente(x),
        dias: Store.diasCicloExpediente(x),
        _abierto: x.estadoEvento !== "Cerrado",
      };
    });
    rows.sort((a, b) => (Number(b._abierto) - Number(a._abierto)) || (b.dias - a.dias));

    const cols = [
      { key: "idc", label: "ID", align: "right" },
      { key: "equipo", label: "Equipo" },
      { key: "tipo", label: "Tipo" },
      { key: "folio", label: "Folio SIGEM" },
      { key: "fechaDoc", label: "Fecha documento", render: (r) => el("span", {}, U.fmtDate(r.fechaDoc)), text: (r) => r.fechaDoc },
      { key: "tecnico", label: "Técnico" },
      { key: "empresa", label: "Empresa" },
      { key: "estado", label: "Estado / Etapa", render: (r) => el("span", { class: "chip " + (r._abierto ? "warn" : "ok") }, r.estado), text: (r) => r.estado },
      { key: "dias", label: "Días ciclo", align: "right", text: (r) => String(r.dias) },
      // columnas ocultas para búsqueda global por serie / inventario
      { key: "_serie", label: "Serie", defaultVisible: false },
      { key: "_inv", label: "N° Inventario", defaultVisible: false },
    ];

    const dt = MP.ui.DataTable({
      columns: cols, rows, storageKey: "correctivo", exportName: "Correctivo_MP2026",
      onRowClick: (r) => MP.views.detalle(r._key),
      rowClass: (r) => r._x.estadoEquipo === "No Operativo" && r._abierto ? "row-bad" : "",
      emptyText: "Sin expedientes correctivos.",
    });
    container.appendChild(dt.root);
  };
})(window);
