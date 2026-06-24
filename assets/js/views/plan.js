/* =========================================================================
 * MP 2026 · plan.js  —  Paso 13: Vista Plan de Mantenimiento
 * Una fila por evento de mantención (equipo y mes) uniendo programación
 * PMP, registro de la planilla y mantenciones de la app.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const C = MP.const;
  const el = U.el;
  const Store = MP.store;

  MP.views = MP.views || {};
  MP.views.plan = function (container) {
    container.appendChild(el("div", { class: "view-head" }, [
      el("h2", {}, "Plan de Mantenimiento"),
      el("p", { class: "view-sub" }, "Una fila por equipo y mes, uniendo programación PMP, registro de planilla y app."),
    ]));

    const rows = [];
    Store.equipos().forEach((eq) => {
      const key = U.equipoKey(eq);
      const mant = Store.mantencionesDe(key);
      C.MESES.forEach((mes) => {
        const prog = (eq.programacion && eq.programacion[mes.key]) || "";
        const reg = (eq.registro && eq.registro[mes.key]) || {};
        const mApp = mant.filter((m) => U.mesKeyFromISO(m.fecha) === mes.key);
        if (!prog && !reg.programa && !reg.resultado && mApp.length === 0) return;

        // Programa: prevalece planilla; si no, programación PMP; si no, de la app
        const programa = reg.programa || prog || (mApp[0] && mApp[0].programacion) || "";
        // Resultado: prevalece planilla (Paso 4); si no, app
        const resultado = reg.resultado || (mApp[0] && mApp[0].resultado) || "";
        const fechaApp = mApp.length ? mApp.map((m) => m.fecha).sort().slice(-1)[0] : "";
        const registroTipo = mApp.length ? mApp[0].tipoRegistro : (reg.resultado ? "Oficial" : "");
        let origen = "";
        if ((reg.programa || reg.resultado) && mApp.length) origen = "Planilla + App";
        else if (reg.programa || reg.resultado || prog) origen = "Planilla";
        else if (mApp.length) origen = "App";

        rows.push({
          _key: key,
          id: eq.id, nCarpeta: eq.nCarpeta, nInventario: eq.nInventario, equipo: eq.equipo,
          servicio: eq.servicio, unidad: eq.unidad, ubicacion: eq.ubicacion, procedencia: eq.procedencia,
          marca: eq.marca, modelo: eq.modelo, serie: eq.serie,
          mes: mes.nombre, _mesNum: mes.num, programa, resultado,
          fechaEjecucion: fechaApp, registro: registroTipo, origen,
        });
      });
    });
    rows.sort((a, b) => a.equipo.localeCompare(b.equipo) || (a._mesNum - b._mesNum));

    const cols = [
      { key: "id", label: "ID", align: "right", defaultVisible: false },
      { key: "nCarpeta", label: "N° Carpeta", defaultVisible: false },
      { key: "nInventario", label: "N° Inventario" },
      { key: "equipo", label: "Equipo" },
      { key: "servicio", label: "Servicio" },
      { key: "unidad", label: "Unidad", defaultVisible: false },
      { key: "ubicacion", label: "Ubicación", defaultVisible: false },
      { key: "procedencia", label: "Procedencia", defaultVisible: false },
      { key: "marca", label: "Marca", defaultVisible: false },
      { key: "modelo", label: "Modelo", defaultVisible: false },
      { key: "serie", label: "Serie" },
      { key: "mes", label: "Mes" },
      { key: "programa", label: "Programa", align: "center", render: (r) => r.programa ? el("span", { class: "code-pill" }, r.programa) : el("span", { class: "muted" }, "—"), text: (r) => r.programa },
      { key: "resultado", label: "Resultado", align: "center", render: (r) => r.resultado ? el("span", { class: "code-pill res" }, r.resultado) : el("span", { class: "muted" }, "—"), text: (r) => r.resultado },
      { key: "fechaEjecucion", label: "Fecha ejec. (app)", render: (r) => el("span", {}, r.fechaEjecucion ? U.fmtDate(r.fechaEjecucion) : "—"), text: (r) => r.fechaEjecucion },
      { key: "registro", label: "Registro", align: "center", render: (r) => r.registro ? el("span", { class: "tag " + (r.registro === "Borrador" ? "tag-draft" : "tag-official") }, r.registro) : el("span", { class: "muted" }, "—"), text: (r) => r.registro },
      { key: "origen", label: "Origen" },
    ];

    const dt = MP.ui.DataTable({
      columns: cols, rows, storageKey: "plan", exportName: "PlanMantenimiento_MP2026",
      onRowClick: (r) => MP.views.detalle(r._key),
      emptyText: "Sin eventos de mantención. Cargue la planilla o registre mantenciones.",
    });
    container.appendChild(dt.root);
  };
})(window);
