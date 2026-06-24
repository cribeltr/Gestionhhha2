/* =========================================================================
 * MP 2026 · equipos.js  —  Paso 2: Vista de equipos
 * Tabla con columnas de la base + 4 calculadas (Estado, Días en estado,
 * Última actualización, Pendientes), filtros tipo Excel y filas abribles.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const el = U.el;
  const Store = MP.store;

  function chipEstado(estado) {
    const cls = estado === "Operativo" ? "ok" : estado === "Servicio Técnico" ? "warn" : "bad";
    return el("span", { class: "chip estado-" + cls }, estado);
  }

  MP.views = MP.views || {};
  MP.views.equipos = function (container) {
    const equipos = Store.equipos();

    if (equipos.length === 0) {
      container.appendChild(el("div", { class: "empty-state" }, [
        el("div", { class: "empty-ico" }, "📭"),
        el("h2", {}, "Sin equipos cargados"),
        el("p", {}, "Importe la planilla ProgramaciónMP2026 (hoja PMP_2026) o cargue datos de demostración desde la pestaña «Datos»."),
        MP.ui.btn("Ir a Datos", "primary", () => MP.app.go("datos")),
      ]));
      return;
    }

    // Filas con calculados
    const rows = equipos.map((e) => {
      const key = U.equipoKey(e);
      const est = Store.estadoEquipo(key);
      const pend = Store.pendientesAbiertosDe(key);
      const corr = Store.expedientesDe(key).filter((x) => x.estadoEvento !== "Cerrado").length;
      return {
        _corr: corr,
        _eq: e, _key: key,
        id: e.id, nCarpeta: e.nCarpeta, nInventario: e.nInventario, equipo: e.equipo,
        servicio: e.servicio, unidad: e.unidad, ubicacion: e.ubicacion, procedencia: e.procedencia,
        marca: e.marca, modelo: e.modelo, serie: e.serie, anioInstalacion: e.anioInstalacion,
        vidaUtilResidual: e.vidaUtilResidual, clasificacion: e.clasificacion, enuBaja: e.enuBaja,
        _estado: est.estado, _dias: est.dias, _ultima: Store.ultimaActualizacion(key),
        _pend: pend.length,
      };
    });

    const cols = [
      { key: "id", label: "ID", align: "right", defaultVisible: false },
      { key: "nCarpeta", label: "N° Carpeta", defaultVisible: false },
      { key: "nInventario", label: "N° Inventario" },
      { key: "equipo", label: "Equipo" },
      { key: "servicio", label: "Servicio" },
      { key: "unidad", label: "Unidad", defaultVisible: false },
      { key: "ubicacion", label: "Ubicación", defaultVisible: false },
      { key: "procedencia", label: "Procedencia", defaultVisible: false },
      { key: "marca", label: "Marca" },
      { key: "modelo", label: "Modelo", defaultVisible: false },
      { key: "serie", label: "Serie" },
      { key: "anioInstalacion", label: "Año Inst.", defaultVisible: false, align: "right" },
      { key: "vidaUtilResidual", label: "Vida Útil Res.", defaultVisible: false, align: "right" },
      { key: "clasificacion", label: "Clasificación", defaultVisible: false },
      { key: "enuBaja", label: "ENU/Baja", defaultVisible: false },
      { key: "_estado", label: "Estado", text: (r) => r._estado + (r._corr > 0 ? " · correctivo" : ""),
        render: (r) => {
          const wrap = el("span", { class: "estado-cell" }, [chipEstado(r._estado)]);
          if (r._corr > 0) wrap.appendChild(el("span", { class: "corr-badge", title: r._corr + " expediente(s) correctivo(s) abierto(s) — clic en la fila para verlos" }, "🔧" + r._corr));
          return wrap;
        } },
      { key: "_corr", label: "Correctivo abierto", align: "center", defaultVisible: false,
        render: (r) => r._corr > 0 ? el("span", { class: "chip warn" }, r._corr) : el("span", { class: "muted" }, "0"),
        text: (r) => String(r._corr) },
      { key: "_dias", label: "Días en estado", align: "right",
        render: (r) => el("span", {}, r._dias === null ? "—" : r._dias + " d"), text: (r) => r._dias === null ? "" : String(r._dias) },
      { key: "_ultima", label: "Última actualización",
        render: (r) => el("span", {}, r._ultima ? U.fmtDate(r._ultima) : "—"), text: (r) => r._ultima || "" },
      { key: "_pend", label: "Pendientes", align: "center",
        render: (r) => r._pend > 0 ? el("span", { class: "chip warn" }, r._pend) : el("span", { class: "muted" }, "0"),
        text: (r) => String(r._pend) },
    ];

    const dt = MP.ui.DataTable({
      columns: cols, rows, storageKey: "equipos", exportName: "Equipos_MP2026",
      onRowClick: (r) => MP.views.detalle(r._key),
      rowClass: (r) => r._estado === "No Operativo" ? "row-bad" : r._estado === "Servicio Técnico" ? "row-warn" : "",
    });
    container.appendChild(el("div", { class: "view-head" }, [
      el("h2", {}, "Equipos"),
      el("p", { class: "view-sub" }, equipos.length + " equipos · clic en una fila para ver el detalle."),
    ]));
    container.appendChild(dt.root);
  };

  MP.views._chipEstado = chipEstado;
})(window);
