/* =========================================================================
 * MP 2026 · detalle.js  —  Paso 7: Vista de detalle del equipo
 * Datos copiables, historial unificado por mes, pendientes y expedientes
 * correctivos con línea de tiempo. Tres botones de acción.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const C = MP.const;
  const el = U.el;
  const Store = MP.store;
  const UI = MP.ui;

  function copiable(label, valor) {
    const v = U.asText(valor);
    const cell = el("div", { class: "kv", title: "Clic para copiar" }, [
      el("div", { class: "kv-label" }, label),
      el("div", { class: "kv-value" }, v || "—"),
    ]);
    cell.addEventListener("click", () => {
      if (!v) return;
      navigator.clipboard && navigator.clipboard.writeText(v);
      cell.classList.add("copied");
      UI.toast("Copiado: " + v, "ok");
      setTimeout(() => cell.classList.remove("copied"), 600);
    });
    return cell;
  }

  MP.views = MP.views || {};
  MP.views.detalle = function (equipoKey) {
    const eq = Store.equipoByKey(equipoKey);
    if (!eq) { UI.toast("Equipo no encontrado.", "warn"); return; }

    const body = el("div", { class: "detalle" });
    const m = UI.modal({ title: eq.equipo + " — " + (eq.serie || eq.nInventario), size: "xl", body });

    function render() {
      body.innerHTML = "";
      const est = Store.estadoEquipo(equipoKey);
      const pendientes = Store.pendientesDe(equipoKey);
      const expedientes = Store.expedientesDe(equipoKey);

      // Encabezado con estado
      body.appendChild(el("div", { class: "detalle-top" }, [
        MP.views._chipEstado(est.estado),
        el("span", { class: "muted" }, est.dias === null ? "" : ("· " + est.dias + " días en estado")),
        el("span", { class: "muted" }, "· Última actualización: " +
          (Store.ultimaActualizacion(equipoKey) ? U.fmtDate(Store.ultimaActualizacion(equipoKey)) : "—")),
      ]));

      // Botones de acción (Paso 7)
      body.appendChild(el("div", { class: "detalle-actions" }, [
        UI.btn("🛠 Mantenimiento Preventivo", "primary", () => MP.forms.preventivo(equipoKey, render)),
        UI.btn("📋 Pendientes", "secondary", () => MP.forms.pendiente(equipoKey, render)),
        UI.btn("🔧 Mantenimiento Correctivo", "secondary", () => MP.forms.correctivo(equipoKey, render)),
      ]));

      // Datos del equipo (copiables)
      body.appendChild(el("h4", { class: "sec-title" }, "Datos del equipo"));
      body.appendChild(el("div", { class: "kv-grid" }, [
        copiable("ID", eq.id), copiable("N° Carpeta", eq.nCarpeta), copiable("N° Inventario", eq.nInventario),
        copiable("Equipo", eq.equipo), copiable("Servicio", eq.servicio), copiable("Unidad", eq.unidad),
        copiable("Ubicación", eq.ubicacion), copiable("Procedencia", eq.procedencia), copiable("Marca", eq.marca),
        copiable("Modelo", eq.modelo), copiable("Serie", eq.serie), copiable("Año Instalación", eq.anioInstalacion),
        copiable("Vida Útil Residual", eq.vidaUtilResidual), copiable("Clasificación", eq.clasificacion),
        copiable("ENU/Baja", eq.enuBaja),
      ]));

      // Historial de mantenciones unificado (una fila por mes)
      body.appendChild(el("h4", { class: "sec-title" }, "Historial de mantenciones " + new Date().getFullYear()));
      body.appendChild(historialUnificado(eq, equipoKey, render));

      // Pendientes
      body.appendChild(el("h4", { class: "sec-title" }, "Pendientes (" + pendientes.length + ")"));
      body.appendChild(pendientesMini(pendientes, render));

      // Expedientes correctivos con línea de tiempo
      body.appendChild(el("h4", { class: "sec-title" }, "Mantenimiento correctivo (" + expedientes.length + ")"));
      expedientes.forEach((x) => body.appendChild(expedienteCard(x, render)));
      if (expedientes.length === 0) body.appendChild(el("p", { class: "muted" }, "Sin expedientes correctivos."));
    }

    function historialUnificado(eq, key, onChange) {
      const mant = Store.mantencionesDe(key);
      const tbl = el("table", { class: "mini-table" });
      tbl.appendChild(el("thead", {}, el("tr", {}, [
        el("th", {}, "Mes"), el("th", {}, "Programa (planilla)"), el("th", {}, "Resultado (planilla)"),
        el("th", {}, "Registros app"), el("th", {}, ""),
      ])));
      const tb = el("tbody");
      C.MESES.forEach((mes) => {
        const prog = (eq.programacion && eq.programacion[mes.key]) || "";
        const reg = (eq.registro && eq.registro[mes.key]) || {};
        const mApp = mant.filter((x) => U.mesKeyFromISO(x.fecha) === mes.key);
        // Mostrar solo meses con algo
        if (!prog && !reg.programa && !reg.resultado && mApp.length === 0) return;
        const appCell = el("td", {}, mApp.map((x) =>
          el("div", { class: "mant-app" }, [
            el("span", { class: "tag " + (x.tipoRegistro === "Borrador" ? "tag-draft" : "tag-official") }, x.tipoRegistro),
            " " + U.fmtDate(x.fecha) + " · " + (x.programacion || "") + "/" + (x.resultado || "") + " · " + (x.ejecutor || ""),
          ])));
        tb.appendChild(el("tr", {}, [
          el("td", {}, mes.nombre),
          el("td", {}, prog ? el("span", { class: "code-pill" }, prog) : el("span", { class: "muted" }, "—")),
          el("td", {}, reg.resultado ? el("span", { class: "code-pill res" }, reg.resultado) : el("span", { class: "muted" }, "—")),
          appCell,
          el("td", {}),
        ]));
      });
      tbl.appendChild(tb);
      if (tb.children.length === 0) return el("p", { class: "muted" }, "Sin programación ni registros este año.");
      return tbl;
    }

    function pendientesMini(pendientes, onChange) {
      if (pendientes.length === 0) return el("p", { class: "muted" }, "Sin pendientes.");
      const wrap = el("div", { class: "pend-mini-list" });
      pendientes.forEach((p) => {
        const urg = Store.urgenciaPendiente(p);
        wrap.appendChild(el("div", { class: "pend-mini urg-" + U.norm(urg).replace(/\s/g, "-") }, [
          el("div", { class: "pend-mini-main" }, [
            el("span", { class: "chip " + (urg === "Completado" ? "ok" : urg === "Atrasado" ? "bad" : "warn") }, urg),
            el("b", {}, " " + p.tipo),
            el("div", { class: "muted" }, (p.descripcion || "") + " · Compromiso: " + U.fmtDate(p.fechaCompromiso) +
              " · " + Store.estadoPendiente(p)),
          ]),
          el("div", { class: "pend-mini-actions" }, [
            !p.fechaCompletado ? UI.btn("✓ Completar", "ghost sm", () => { Store.completarPendiente(p.id); onChange(); }) : null,
            UI.btn("Editar", "ghost sm", () => MP.forms.pendiente(p.equipoKey, onChange, p)),
          ]),
        ]));
      });
      return wrap;
    }

    function expedienteCard(x, onChange) {
      const etapa = Store.etapaExpediente(x);
      const card = el("div", { class: "exp-card" });
      card.appendChild(el("div", { class: "exp-head" }, [
        el("div", {}, [
          el("b", {}, "Folio " + x.folioSigem),
          el("span", { class: "chip " + (x.estadoEvento === "Cerrado" ? "ok" : "warn") }, " " + x.estadoEvento),
          el("span", { class: "chip neutral" }, etapa),
        ]),
        el("div", { class: "muted" }, x.tipoEvento + " · " + x.tecnico + " · " +
          Store.diasCicloExpediente(x) + " días de ciclo"),
      ]));
      if (x.requerimiento) card.appendChild(el("div", { class: "muted exp-req" }, "“" + x.requerimiento + "”"));

      // Registro en un clic: siguiente paso (Paso 12)
      card.appendChild(el("div", { class: "exp-quick" }, siguientePaso(x, onChange)));

      // Línea de tiempo
      const tl = el("div", { class: "timeline" });
      const avances = (x.avances || []).slice().sort((a, b) => (a.fechaReal || "").localeCompare(b.fechaReal || ""));
      // apertura
      tl.appendChild(timelineItem("Apertura — " + x.estadoEquipo, x.fechaDocumento, null, null, null));
      avances.forEach((a) => {
        const lbl = (MP.forms._avancesCatalogo.find((c) => c.tipo === a.tipo) || { label: a.tipo }).label;
        const det = detalleAvance(a);
        tl.appendChild(timelineItem(lbl, a.fechaReal, a.fechaRegistro, a.fechaCorreccion, det, () => {
          UI.confirm("¿Eliminar este avance de la bitácora?", () => { Store.eliminarAvance(x.id, a.id); onChange(); }, { danger: true, okText: "Eliminar" });
        }));
      });
      card.appendChild(tl);

      card.appendChild(el("div", { class: "exp-foot" }, [
        UI.btn("+ Registrar avance", "secondary sm", () => MP.forms.registrarAvance(x.id, "", onChange)),
        x.estadoEvento !== "Cerrado" ? UI.btn("Cerrar expediente", "ghost sm", () =>
          MP.forms.registrarAvance(x.id, "cierre", onChange)) : null,
      ]));
      return card;
    }

    function siguientePaso(x, onChange) {
      if (x.estadoEvento === "Cerrado") return el("span", { class: "muted" }, "Expediente cerrado el " + U.fmtDate(x.fechaCierre));
      const etapa = Store.etapaExpediente(x);
      let tipo = "evaluacion", label = "Evaluación técnica";
      if (etapa === C.ETAPAS_CORR.EN_ST) { tipo = "retorno_st"; label = "Registrar retorno de S.T."; }
      else if (etapa === C.ETAPAS_CORR.RETORNADO_OK) { tipo = "cierre"; label = "Cerrar expediente"; }
      else if (etapa === C.ETAPAS_CORR.RETORNADO_NOK) { tipo = "evaluacion", label = "Re-evaluar"; }
      else if (etapa === C.ETAPAS_CORR.COMPRA) { tipo = "oc_enviada"; label = "OC enviada al proveedor"; }
      else if (etapa === C.ETAPAS_CORR.ESPERA) { tipo = "visita_ejecucion"; label = "Visita / Ejecución realizada"; }
      else if (etapa === C.ETAPAS_CORR.EJECUCION) { tipo = "cierre"; label = "Cerrar expediente"; }
      else { tipo = "cotizacion_solicitada"; label = "Solicitar cotización"; }
      return el("div", {}, [
        el("span", { class: "muted" }, "Siguiente paso sugerido: "),
        UI.btn("▶ " + label + " (" + U.fmtDate(U.todayISO()) + ")", "primary sm",
          () => MP.forms.registrarAvance(x.id, tipo, onChange)),
      ]);
    }

    function detalleAvance(a) {
      const d = a.datos || {};
      const parts = [];
      if (d.numero) parts.push("N° " + d.numero);
      if (d.numeroEnvio) parts.push("Envío " + d.numeroEnvio);
      if (d.folioRetorno) parts.push("Retorno " + d.folioRetorno);
      if (d.empresa) parts.push(d.empresa);
      if (d.estadoEquipo) parts.push("→ " + d.estadoEquipo);
      if (d.quien) parts.push("(" + d.quien + ")");
      if (d.nota) parts.push(d.nota);
      if (d.descripcion) parts.push(d.descripcion);
      return parts.join(" · ");
    }

    function timelineItem(titulo, fechaReal, fechaReg, fechaCorr, detalle, onDel) {
      return el("div", { class: "tl-item" }, [
        el("div", { class: "tl-dot" }),
        el("div", { class: "tl-body" }, [
          el("div", { class: "tl-title" }, [
            el("b", {}, titulo), " ", el("span", { class: "tl-date" }, U.fmtDate(fechaReal)),
            fechaCorr ? el("span", { class: "tl-corr" }, " (corregido " + U.fmtDate(fechaCorr) + ")") : null,
            onDel ? el("button", { class: "icon-btn tl-del no-rowclick", title: "Eliminar avance", onclick: onDel }, "✕") : null,
          ]),
          detalle ? el("div", { class: "muted tl-det" }, detalle) : null,
          fechaReg && fechaReg !== fechaReal ? el("div", { class: "tl-reg" }, "Registrado: " + U.fmtDate(fechaReg)) : null,
        ]),
      ]);
    }

    render();
  };
})(window);
