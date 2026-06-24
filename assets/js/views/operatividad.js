/* =========================================================================
 * MP 2026 · operatividad.js  —  Paso 12: Tablero de Operatividad
 * Lista permanente de equipos que requieren atención, con último estado,
 * última gestión, días transcurridos y "registro en un clic".
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const C = MP.const;
  const el = U.el;
  const Store = MP.store;
  const UI = MP.ui;

  MP.views = MP.views || {};
  MP.views.operatividad = function (container) {
    container.appendChild(el("div", { class: "view-head" }, [
      el("h2", {}, "Tablero de Operatividad"),
      el("p", { class: "view-sub" }, "El último estado vale más que el detalle: equipos que requieren atención, ordenados por criticidad."),
    ]));

    const items = [];
    Store.equipos().forEach((eq) => {
      const key = U.equipoKey(eq);
      const est = Store.estadoEquipo(key);
      const exps = Store.expedientesDe(key);
      const expAbierto = exps.find((x) => x.estadoEvento !== "Cerrado");
      // Marcado FS/NU en planilla sin resolución posterior
      const eventos = Store.eventosEstado(key);
      const ultimo = eventos[eventos.length - 1];
      const fsNuPlanilla = ultimo && ultimo.origen === "Planilla" &&
        (ultimo.detalle.indexOf("Fuera de Servicio") >= 0 || ultimo.detalle.indexOf("No Ubicable") >= 0);

      const requiere = est.estado === C.ESTADO.NO_OPERATIVO ||
        est.estado === C.ESTADO.SERVICIO_TECNICO || !!expAbierto || fsNuPlanilla;
      if (!requiere) return;

      // Criticidad
      let crit = 3;
      if (est.estado === C.ESTADO.NO_OPERATIVO) crit = 1;
      else if (est.estado === C.ESTADO.SERVICIO_TECNICO) crit = 2;
      if (eq.clasificacion && /crítico/i.test(eq.clasificacion)) crit -= 0.5;

      items.push({
        eq, key, est, expAbierto, fsNuPlanilla, crit,
        ultimaGestion: ultimaGestionDe(key),
      });
    });

    items.sort((a, b) => (a.crit - b.crit) || ((b.est.dias || 0) - (a.est.dias || 0)));

    // Métricas
    container.appendChild(MP.views._metricas([
      ["Requieren atención", items.length, "neutral"],
      ["No Operativos", items.filter((i) => i.est.estado === C.ESTADO.NO_OPERATIVO).length, "bad"],
      ["En Servicio Técnico", items.filter((i) => i.est.estado === C.ESTADO.SERVICIO_TECNICO).length, "warn"],
      ["Expedientes abiertos", items.filter((i) => i.expAbierto).length, "info"],
    ]));

    if (items.length === 0) {
      container.appendChild(el("div", { class: "empty-state" }, [
        el("div", { class: "empty-ico" }, "✅"),
        el("h2", {}, "Todo operativo"),
        el("p", {}, "Ningún equipo requiere atención en este momento."),
      ]));
      return;
    }

    const list = el("div", { class: "oper-list" });
    items.forEach((it) => list.appendChild(card(it)));
    container.appendChild(list);

    function card(it) {
      const eq = it.eq;
      const c = el("div", { class: "oper-card crit-" + Math.ceil(it.crit) });
      c.appendChild(el("div", { class: "oper-main" }, [
        el("div", { class: "oper-title" }, [
          MP.views._chipEstado(it.est.estado),
          el("b", {}, " " + eq.equipo),
          el("span", { class: "muted" }, " · " + eq.servicio + " · " + (eq.serie || eq.nInventario)),
        ]),
        el("div", { class: "oper-sub muted" }, [
          it.est.dias !== null ? (it.est.dias + " días en estado") : "",
          it.expAbierto ? " · Folio " + it.expAbierto.folioSigem + " (" + Store.etapaExpediente(it.expAbierto) + ")" : "",
          it.fsNuPlanilla ? " · marcado en planilla sin resolución" : "",
          it.ultimaGestion ? " · Última gestión: " + it.ultimaGestion : "",
        ].filter(Boolean).join("")),
      ]));
      const acc = el("div", { class: "oper-actions" });
      // Registro en un clic
      if (it.expAbierto) {
        const x = it.expAbierto;
        const etapa = Store.etapaExpediente(x);
        let tipo = "evaluacion", label = "Registrar evaluación";
        if (etapa === C.ETAPAS_CORR.EN_ST) { tipo = "retorno_st"; label = "Registrar retorno"; }
        else if (etapa === C.ETAPAS_CORR.RETORNADO_OK || etapa === C.ETAPAS_CORR.EJECUCION) { tipo = "cierre"; label = "Cerrar"; }
        else if (etapa === C.ETAPAS_CORR.ESPERA) { tipo = "visita_ejecucion"; label = "Visita / Ejecución"; }
        acc.appendChild(UI.btn("▶ " + label, "primary sm", () => MP.forms.registrarAvance(x.id, tipo, () => MP.app.render())));
      } else {
        acc.appendChild(UI.btn("🔧 Abrir correctivo", "secondary sm", () => MP.forms.correctivo(it.key, () => MP.app.render())));
      }
      acc.appendChild(UI.btn("Ver ficha", "ghost sm", () => MP.views.detalle(it.key)));
      c.appendChild(acc);
      return c;
    }

    function ultimaGestionDe(key) {
      const upd = Store.ultimaActualizacion(key);
      return upd ? U.fmtDate(upd) : "";
    }
  };
})(window);
