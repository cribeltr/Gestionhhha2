/* =========================================================================
 * MP 2026 · excel.js
 * Importación de la planilla (Pasos 1, 3, 4) y exportaciones (Paso 11).
 * Usa SheetJS (XLSX) cargado vía CDN. Si no está disponible, las
 * funciones de importación se deshabilitan con aviso (degradación elegante).
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const C = MP.const;
  const Store = MP.store;
  const Excel = MP.excel = {};

  Excel.disponible = function () { return typeof global.XLSX !== "undefined"; };

  // Índice de columna (letra → 0-based). "B"->1, "AE"->30
  function colIdx(letter) {
    let n = 0;
    for (let i = 0; i < letter.length; i++) n = n * 26 + (letter.charCodeAt(i) - 64);
    return n - 1;
  }

  // Lee celda de una fila (array) por letra de columna.
  function cell(row, letter) {
    const v = row[colIdx(letter)];
    return v === undefined || v === null ? "" : v;
  }

  /* ----- Mapeo de meses ↔ columnas (Pasos 3 y 4) --------------------- */
  // PMP_2026 programación: T–AE (un valor por mes)
  const PMP_MES_COLS = ["T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE"];
  // Registro_MP-2026: cada mes ocupa dos columnas (Programa P, Resultado R)
  const REG_MES_COLS = [
    { p: "T", r: "U" }, { p: "V", r: "W" }, { p: "X", r: "Y" }, { p: "Z", r: "AA" },
    { p: "AB", r: "AC" }, { p: "AD", r: "AE" }, { p: "AF", r: "AG" }, { p: "AH", r: "AI" },
    { p: "AJ", r: "AK" }, { p: "AL", r: "AM" }, { p: "AN", r: "AO" }, { p: "AP", r: "AQ" },
  ];

  function normPrograma(v) {
    const s = U.asText(v).toUpperCase();
    return C.PROGRAMA_VALIDOS.includes(s) ? s : "";
  }
  function normResultado(v) {
    let s = U.asText(v);
    // Normaliza variantes comunes de "Si" y "Si-RA".
    const up = s.toUpperCase();
    if (up === "SI") return "Si";
    if (up === "SI-RA" || up === "SIRA") return "Si-RA";
    if (C.RESULTADO_VALIDOS.includes(s)) return s;
    // case-insensitive match
    const m = C.RESULTADO_VALIDOS.find((x) => x.toUpperCase() === up);
    return m || "";
  }

  /* =====================================================================
   * Importar planilla completa.
   * Lee la hoja PMP_2026 (equipos + programación) y, si existe,
   * Registro_MP-2026 (programa/resultado por mes).
   * ===================================================================== */
  Excel.importarPlanilla = function (arrayBuffer) {
    if (!Excel.disponible()) throw new Error("La librería de Excel (SheetJS) no está disponible. Conéctese a internet o use la importación por respaldo JSON.");
    const wb = global.XLSX.read(arrayBuffer, { type: "array" });

    const hojaPMP = encontrarHoja(wb, ["PMP_2026", "PMP 2026", "PMP", "Programación", "Programacion"]);
    if (!hojaPMP) throw new Error("No se encontró la hoja PMP_2026 en el archivo.");

    const rows = global.XLSX.utils.sheet_to_json(wb.Sheets[hojaPMP], {
      header: 1, raw: false, defval: "", blankrows: false,
    });

    // Encabezados fila 7 (índice 6); datos desde fila 8 (índice 7).
    const equipos = [];
    let id = 0;
    for (let i = 7; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      // Saltar filas totalmente vacías en el bloque de datos.
      const equipoNombre = U.asText(cell(row, "E"));
      const serie = U.asText(cell(row, "L"));
      const inv = U.asText(cell(row, "D"));
      if (!equipoNombre && !serie && !inv) continue;

      id++;
      const eq = {
        id: id,
        nCarpeta: U.asText(cell(row, "C")),
        nInventario: inv,                       // texto, ceros a la izq.
        equipo: equipoNombre,
        servicio: U.asText(cell(row, "F")),
        unidad: U.asText(cell(row, "G")),
        ubicacion: U.asText(cell(row, "H")),
        procedencia: U.asText(cell(row, "I")),
        marca: U.asText(cell(row, "J")),
        modelo: U.asText(cell(row, "K")),
        serie: serie,                           // texto, ceros a la izq.
        anioInstalacion: U.asText(cell(row, "M")),
        vidaUtilResidual: U.asText(cell(row, "N")),
        clasificacion: U.asText(cell(row, "O")),
        enuBaja: U.asText(cell(row, "P")),
        programacion: {},
        registro: {},
      };
      // Programación por mes (T–AE) — Paso 3
      C.MESES.forEach((mes, idx) => {
        const v = normPrograma(cell(row, PMP_MES_COLS[idx]));
        if (v) eq.programacion[mes.key] = v;
      });
      equipos.push(eq);
    }

    if (equipos.length === 0) throw new Error("No se leyeron equipos. Verifique que los datos estén desde la fila 8.");

    // Hoja de registro (opcional)
    const hojaReg = encontrarHoja(wb, ["Registro_MP-2026", "Registro_MP_2026", "Registro MP 2026", "Registro", "Registro_MP"]);
    let registrosLeidos = 0;
    if (hojaReg) {
      const rrows = global.XLSX.utils.sheet_to_json(wb.Sheets[hojaReg], {
        header: 1, raw: false, defval: "", blankrows: false,
      });
      const porSerie = {}, porInv = {};
      equipos.forEach((e) => {
        if (e.serie) porSerie[e.serie] = e;
        if (e.nInventario) porInv[e.nInventario] = e;
      });
      for (let i = 7; i < rrows.length; i++) {
        const row = rrows[i];
        if (!row || row.length === 0) continue;
        const serie = U.asText(cell(row, "L"));
        const inv = U.asText(cell(row, "D"));
        const eq = porSerie[serie] || porInv[inv];
        if (!eq) continue;
        REG_MES_COLS.forEach((mc, idx) => {
          const p = normPrograma(cell(row, mc.p));
          const r = normResultado(cell(row, mc.r));
          if (p || r) {
            eq.registro[C.MESES[idx].key] = { programa: p, resultado: r };
            registrosLeidos++;
          }
        });
        const obs = U.asText(cell(row, "AR"));
        if (obs) eq.observacionPlanilla = obs;
      }
    }

    // Reconciliación Oficial/Borrador (Paso 4): borradores que reaparecen
    // en la planilla recargada pasan a Oficial.
    reconciliarBorradores(equipos);

    Store.db.equipos = equipos;
    Store.db.meta.ultimaCarga = new Date().toISOString();
    if (!Store.db.meta.creado) Store.db.meta.creado = new Date().toISOString();
    Store.commit();

    return { equipos: equipos.length, registros: registrosLeidos, conRegistro: !!hojaReg };
  };

  function reconciliarBorradores(equiposNuevos) {
    const idx = {};
    equiposNuevos.forEach((e) => {
      const k = U.equipoKey(e);
      idx[k] = e;
    });
    Store.db.mantenciones.forEach((m) => {
      if (m.tipoRegistro !== "Borrador") return;
      const eq = idx[m.equipoKey];
      if (!eq) return;
      const mesKey = U.mesKeyFromISO(m.fecha);
      const reg = eq.registro[mesKey];
      if (reg && (reg.programa || reg.resultado)) {
        m.tipoRegistro = "Oficial"; // pasó a estar en la planilla
      }
    });
  }

  function encontrarHoja(wb, candidatos) {
    const nombres = wb.SheetNames;
    for (const c of candidatos) {
      const hit = nombres.find((n) => n.trim().toLowerCase() === c.trim().toLowerCase());
      if (hit) return hit;
    }
    // coincidencia parcial
    for (const c of candidatos) {
      const hit = nombres.find((n) => U.norm(n).indexOf(U.norm(c)) >= 0);
      if (hit) return hit;
    }
    return null;
  }

  /* =====================================================================
   * Exportaciones (Paso 11)
   * ===================================================================== */
  // Marca las columnas que deben conservar ceros a la izquierda como texto.
  function aoaToSheetConTexto(aoa, colsTexto) {
    const ws = global.XLSX.utils.aoa_to_sheet(aoa);
    // Forzar formato texto en columnas indicadas (índices 0-based).
    const range = global.XLSX.utils.decode_range(ws["!ref"]);
    (colsTexto || []).forEach((ci) => {
      for (let r = 1; r <= range.e.r; r++) {
        const addr = global.XLSX.utils.encode_cell({ r, c: ci });
        const cellRef = ws[addr];
        if (cellRef) { cellRef.t = "s"; cellRef.z = "@"; cellRef.v = U.asText(cellRef.v); }
      }
    });
    return ws;
  }

  // Exporta una DataTable genérica (columnas visibles, filas filtradas).
  Excel.exportTable = function (visibleCols, rows, displayText, nombre) {
    if (!Excel.disponible()) { MP.ui.toast("Excel no disponible (sin conexión a SheetJS).", "warn"); return; }
    const header = visibleCols.map((c) => c.group ? (c.group + " · " + c.label) : c.label);
    const aoa = [header];
    rows.forEach((r) => aoa.push(visibleCols.map((c) => displayText(r, c))));
    // columnas texto: serie / inventario
    const colsTexto = [];
    visibleCols.forEach((c, i) => {
      if (/serie|inventario/i.test(c.key) || /serie|inventario/i.test(c.label)) colsTexto.push(i);
    });
    const ws = aoaToSheetConTexto(aoa, colsTexto);
    const wb = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(wb, ws, "Datos");
    global.XLSX.writeFile(wb, (nombre || "export") + "_" + U.todayISO() + ".xlsx");
  };

  // Descargar todos los registros (Paso 11) — un libro con varias hojas.
  Excel.descargarTodo = function () {
    if (!Excel.disponible()) { MP.ui.toast("Excel no disponible (sin conexión a SheetJS).", "warn"); return; }
    const wb = global.XLSX.utils.book_new();

    // Hoja Equipos
    const eqHead = ["ID", "N° Carpeta", "N° Inventario", "Equipo", "Servicio", "Unidad",
      "Ubicación", "Procedencia", "Marca", "Modelo", "Serie", "Año Instalación",
      "Vida Útil Residual", "Clasificación", "ENU/Baja"];
    const eqAoa = [eqHead];
    Store.db.equipos.forEach((e) => eqAoa.push([
      e.id, e.nCarpeta, e.nInventario, e.equipo, e.servicio, e.unidad, e.ubicacion,
      e.procedencia, e.marca, e.modelo, e.serie, e.anioInstalacion, e.vidaUtilResidual,
      e.clasificacion, e.enuBaja,
    ]));
    global.XLSX.utils.book_append_sheet(wb, aoaToSheetConTexto(eqAoa, [2, 10]), "Equipos");

    // Hoja Mantenciones (app)
    const mHead = ["Equipo", "Serie", "N° Inventario", "Fecha", "Mes", "Programación",
      "Ejecutor", "Resultado", "Estado equipo", "Tipo registro", "Observaciones"];
    const mAoa = [mHead];
    Store.db.mantenciones.forEach((m) => {
      const eq = Store.equipoByKey(m.equipoKey) || {};
      mAoa.push([eq.equipo || "", eq.serie || "", eq.nInventario || "", m.fecha,
        U.mesNombre(U.mesKeyFromISO(m.fecha)), m.programacion, m.ejecutor, m.resultado,
        m.estadoEquipo, m.tipoRegistro, m.observaciones]);
    });
    global.XLSX.utils.book_append_sheet(wb, aoaToSheetConTexto(mAoa, [1, 2]), "Mantenciones");

    // Hoja Pendientes
    const pHead = ["Equipo", "Serie", "N° Inventario", "Tipo", "Estado", "Urgencia",
      "Compromiso", "Días atraso", "Responsable Admin.", "Responsable Ejec.", "Descripción", "Completado"];
    const pAoa = [pHead];
    Store.db.pendientes.forEach((p) => {
      const eq = Store.equipoByKey(p.equipoKey) || {};
      pAoa.push([eq.equipo || "", eq.serie || "", eq.nInventario || "", p.tipo,
        Store.estadoPendiente(p), Store.urgenciaPendiente(p), p.fechaCompromiso,
        Store.diasAtraso(p), p.responsableAdmin, p.responsableEjecutivo, p.descripcion,
        p.fechaCompletado || ""]);
    });
    global.XLSX.utils.book_append_sheet(wb, aoaToSheetConTexto(pAoa, [1, 2]), "Pendientes");

    // Hoja Correctivo
    const cHead = ["Folio SIGEM", "Equipo", "Serie", "N° Inventario", "Tipo", "Fecha documento",
      "Técnico", "Etapa", "Estado evento", "Fecha cierre", "Días ciclo"];
    const cAoa = [cHead];
    Store.db.expedientes.forEach((x) => {
      const eq = Store.equipoByKey(x.equipoKey) || {};
      cAoa.push([x.folioSigem, eq.equipo || "", eq.serie || "", eq.nInventario || "",
        x.tipoEvento, x.fechaDocumento, x.tecnico, Store.etapaExpediente(x), x.estadoEvento,
        x.fechaCierre || "", Store.diasCicloExpediente(x)]);
    });
    global.XLSX.utils.book_append_sheet(wb, aoaToSheetConTexto(cAoa, [2, 3]), "Correctivo");

    global.XLSX.writeFile(wb, "Registros_MP2026_" + U.todayISO() + ".xlsx");
  };

})(window);
