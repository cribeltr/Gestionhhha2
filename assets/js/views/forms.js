/* =========================================================================
 * MP 2026 · forms.js
 * Formularios de captura: Mantenimiento Preventivo (Paso 8),
 * Pendientes (Paso 9) y Mantenimiento Correctivo (Paso 10),
 * más los formularios de "Registrar avance" del expediente.
 *
 * Autoguardado de borrador (mejora continua): mientras se completa un
 * formulario, los valores se persisten en localStorage. Si la pestaña se
 * cierra o se navega sin guardar, al reabrir el mismo formulario se ofrece
 * recuperar lo escrito. El borrador se descarta al Guardar o Cancelar.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const C = MP.const;
  const el = U.el;
  const Store = MP.store;
  const UI = MP.ui;
  const F = MP.forms = {};

  /* ----- Helpers de campos ------------------------------------------- */
  function field(label, control, hint) {
    return el("div", { class: "field" }, [
      el("label", { class: "field-label" }, label),
      control,
      hint ? el("div", { class: "field-hint", html: hint }) : null,
    ]);
  }
  function input(attrs) { return el("input", Object.assign({ class: "ctrl" }, attrs)); }
  function textarea(attrs) { return el("textarea", Object.assign({ class: "ctrl", rows: 3 }, attrs)); }
  function select(opciones, valor, attrs) {
    const s = el("select", Object.assign({ class: "ctrl" }, attrs || {}));
    s.appendChild(el("option", { value: "" }, "— Seleccionar —"));
    opciones.forEach((o) => {
      const val = typeof o === "object" ? o.value : o;
      const txt = typeof o === "object" ? o.label : o;
      s.appendChild(el("option", { value: val, selected: val === valor }, txt));
    });
    return s;
  }
  function segmented(opciones, valor, onChange) {
    const wrap = el("div", { class: "segmented" });
    let current = valor;
    opciones.forEach((o) => {
      const b = el("button", { type: "button", class: "seg" + (o === current ? " active" : "") }, o);
      b.addEventListener("click", () => {
        current = o;
        wrap.querySelectorAll(".seg").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        onChange && onChange(current);
      });
      wrap.appendChild(b);
    });
    wrap.getValue = () => current;
    return wrap;
  }
  F._field = field; F._input = input; F._select = select; F._segmented = segmented; F._textarea = textarea;

  /* ----- Autoguardado de borradores ---------------------------------- */
  F._draftKey = function (kind, ctx) { return "mp2026_draft_" + kind + "_" + (ctx || ""); };
  F._loadDraft = function (key) {
    try { const r = JSON.parse(localStorage.getItem(key) || "null"); return r ? r.data : null; }
    catch (e) { return null; }
  };
  F._saveDraft = function (key, data) {
    try { localStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data })); } catch (e) {}
  };
  F._clearDraft = function (key) { try { localStorage.removeItem(key); } catch (e) {} };

  // Conecta el autoguardado a un cuerpo de modal; devuelve un control con
  // .save() manual y un flag para detenerlo al descartar.
  function wireAutosave(body, key, collect) {
    const ctl = { stopped: false };
    const save = () => { if (!ctl.stopped) F._saveDraft(key, collect()); };
    body.addEventListener("input", save, true);
    body.addEventListener("change", save, true);
    ctl.save = save;
    return ctl;
  }

  function draftNote(onDiscard) {
    return el("div", { class: "draft-note" }, [
      el("span", {}, "📝 Se recuperó un borrador sin guardar de una sesión anterior."),
      UI.btn("Descartar borrador", "ghost sm", onDiscard),
    ]);
  }

  /* =====================================================================
   * Paso 8 — Mantenimiento Preventivo
   * ===================================================================== */
  F.preventivo = function (equipoKey, onSaved) {
    const eq = Store.equipoByKey(equipoKey);
    if (!eq) return;

    const key = F._draftKey("preventivo", equipoKey);
    const draft = F._loadDraft(key);
    const g = (n, fb) => (draft && n in draft) ? draft[n] : fb;

    const fFecha = input({ type: "date", value: g("fecha", U.todayISO()) });
    const fProg = select(C.PROGRAMA_VALIDOS.map((p) => ({ value: p, label: p + " — " + C.PROGRAMA[p] })), g("programacion", ""));
    const fEjec = select(C.EJECUTORES, g("ejecutor", ""));
    const fRes = select(C.RESULTADO_VALIDOS.map((r) => ({ value: r, label: r + " — " + C.RESULTADO[r] })), g("resultado", ""));
    const fObs = textarea({ placeholder: "Observaciones (opcional)" }); fObs.value = g("observaciones", "");
    let estadoEquipo = g("estadoEquipo", "Operativo");
    const fEstado = segmented(["Operativo", "No Operativo"], estadoEquipo, (v) => { estadoEquipo = v; auto && auto.save(); });
    const gestionCb = el("input", { type: "checkbox" }); gestionCb.checked = !!g("gestion", false);
    const fGestion = el("label", { class: "switch" }, [gestionCb, el("span", {}, "Generar pendiente asociado")]);
    let tipoReg = g("tipoReg", "Oficial");
    const fTipo = segmented(["Oficial", "Borrador"], tipoReg, (v) => { tipoReg = v; auto && auto.save(); });

    const collect = () => ({
      fecha: fFecha.value, programacion: fProg.value, ejecutor: fEjec.value,
      resultado: fRes.value, observaciones: fObs.value, estadoEquipo: fEstado.getValue(),
      gestion: gestionCb.checked, tipoReg: fTipo.getValue(),
    });

    const hintProg = el("div", { class: "field-hint" });
    function actualizarSugerencia() {
      const mesKey = U.mesKeyFromISO(fFecha.value);
      const progPlanilla = (eq.programacion && eq.programacion[mesKey]) || "";
      const mesesProg = C.MESES.filter((m) => eq.programacion && eq.programacion[m.key])
        .map((m) => m.nombre + " (" + eq.programacion[m.key] + ")");
      if (progPlanilla) {
        hintProg.innerHTML = "📌 La planilla indica <b>" + progPlanilla + "</b> para " +
          U.mesNombre(mesKey) + ". " + (mesesProg.length ? "Meses programados: " + mesesProg.join(", ") + "." : "");
        if (!fProg.value) fProg.value = progPlanilla;
      } else {
        hintProg.innerHTML = "Sin programación en la planilla para " + U.mesNombre(mesKey) + "." +
          (mesesProg.length ? " Meses programados del equipo: " + mesesProg.join(", ") + "." : "");
      }
    }
    fFecha.addEventListener("change", actualizarSugerencia);
    setTimeout(actualizarSugerencia, 0);

    const note = draft ? draftNote(() => { F._clearDraft(key); if (auto) auto.stopped = true; m.close(); F.preventivo(equipoKey, onSaved); }) : null;
    const form = el("div", { class: "form-grid" }, [
      note,
      field("Fecha de la mantención", fFecha),
      field("Programación", fProg, "Sugerida según la planilla; puede cambiarla."),
      hintProg,
      field("Ejecutor", fEjec),
      field("Resultado", fRes),
      field("Observaciones", fObs),
      field("Estado del equipo", fEstado),
      field("Gestión pendiente", fGestion, "Si se marca, se crea un pendiente vinculado (tipo y plazo según la causal)."),
      field("Tipo de registro", fTipo),
    ]);

    const t0 = Date.now();
    const m = UI.modal({
      title: "Mantenimiento Preventivo · " + eq.equipo + " (" + (eq.serie || eq.nInventario) + ")",
      size: "md", body: form,
      footer: [
        UI.btn("Cancelar", "ghost", () => { auto.stopped = true; F._clearDraft(key); MP.grabacion.notarFormulario("preventivo", "cancelado", Date.now() - t0); m.close(); }),
        UI.btn("Guardar", "primary", () => {
          if (!fFecha.value) { UI.toast("Ingrese la fecha.", "warn"); return; }
          if (!fRes.value) { UI.toast("Seleccione un resultado.", "warn"); return; }
          Store.guardarMantencion({
            equipoKey, fecha: fFecha.value, programacion: fProg.value, ejecutor: fEjec.value,
            resultado: fRes.value, observaciones: fObs.value, estadoEquipo,
            gestionPendiente: gestionCb.checked, tipoRegistro: tipoReg,
          });
          auto.stopped = true; F._clearDraft(key);
          MP.grabacion.notarFormulario("preventivo", "guardado", Date.now() - t0);
          UI.toast("Mantención preventiva guardada (" + tipoReg + ").", "ok");
          m.close(); onSaved && onSaved();
        }),
      ],
    });
    const auto = wireAutosave(m.body, key, collect);
  };

  /* =====================================================================
   * Paso 9 — Pendiente
   * ===================================================================== */
  F.pendiente = function (equipoKey, onSaved, existente) {
    const eq = equipoKey ? Store.equipoByKey(equipoKey) : null;
    const p = existente || {};

    const key = F._draftKey("pendiente", (equipoKey || "global") + "_" + (existente ? existente.id : "new"));
    const draft = F._loadDraft(key);
    const g = (n, fb) => (draft && n in draft) ? draft[n] : fb;

    const fFecha = input({ type: "date", value: g("fechaCompromiso", p.fechaCompromiso || U.todayISO()) });
    const quick = el("div", { class: "quick-dates" }, [
      UI.btn("Hoy", "chip", () => { fFecha.value = U.todayISO(); auto && auto.save(); }),
      UI.btn("3 días", "chip", () => { fFecha.value = U.addDays(U.todayISO(), 3); auto && auto.save(); }),
      UI.btn("1 semana", "chip", () => { fFecha.value = U.addDays(U.todayISO(), 7); auto && auto.save(); }),
    ]);
    const fTipo = select(C.TIPOS_PENDIENTE, g("tipo", p.tipo));
    const fDesc = textarea({ placeholder: "Descripción (opcional)" }); fDesc.value = g("descripcion", p.descripcion || "");
    const fAdmin = select(C.EJECUTORES, g("responsableAdmin", p.responsableAdmin || "Cristián Beltrán Oviedo"));
    const fEjec = select(C.EJECUTORES, g("responsableEjecutivo", p.responsableEjecutivo));

    const tareas = (g("tareas", null) || (p.tareas || [])).map((t) => ({ texto: t.texto, hecha: !!t.hecha }));
    const tareasList = el("div", { class: "tareas-list" });
    function renderTareas() {
      tareasList.innerHTML = "";
      tareas.forEach((t, i) => {
        const cb = el("input", { type: "checkbox" }); cb.checked = !!t.hecha;
        cb.addEventListener("change", () => { t.hecha = cb.checked; auto && auto.save(); });
        tareasList.appendChild(el("div", { class: "tarea-row" }, [
          cb, el("span", { class: "tarea-txt" + (t.hecha ? " done" : "") }, t.texto),
          UI.btn("✕", "icon-btn", () => { tareas.splice(i, 1); renderTareas(); auto && auto.save(); }),
        ]));
      });
    }
    renderTareas();
    const nuevaTarea = input({ placeholder: "Nueva tarea…" });
    const addTareaFn = () => { if (nuevaTarea.value.trim()) { tareas.push({ texto: nuevaTarea.value.trim(), hecha: false }); nuevaTarea.value = ""; renderTareas(); auto && auto.save(); } };
    nuevaTarea.addEventListener("keydown", (e) => { if (e.key === "Enter") addTareaFn(); });
    const addTarea = el("div", { class: "add-tarea" }, [nuevaTarea, UI.btn("+ Agregar", "ghost sm", addTareaFn)]);

    const fGestion = textarea({ placeholder: "Registrar una gestión / actualización (opcional)" });
    fGestion.value = g("gestionNueva", "");

    const collect = () => ({
      fechaCompromiso: fFecha.value, tipo: fTipo.value, descripcion: fDesc.value,
      responsableAdmin: fAdmin.value, responsableEjecutivo: fEjec.value,
      tareas: tareas.map((t) => ({ texto: t.texto, hecha: t.hecha })), gestionNueva: fGestion.value,
    });

    const note = draft ? draftNote(() => { F._clearDraft(key); if (auto) auto.stopped = true; m.close(); F.pendiente(equipoKey, onSaved, existente); }) : null;
    const form = el("div", { class: "form-grid" }, [
      note,
      field("Fecha de compromiso", el("div", {}, [fFecha, quick])),
      field("Tipo de pendiente", fTipo),
      field("Descripción", fDesc),
      field("Tareas", el("div", {}, [tareasList, addTarea])),
      field("Responsable Administrativo", fAdmin),
      field("Responsable Ejecutivo", fEjec),
      field("Gestión asociada", fGestion),
    ]);

    const t0 = Date.now();
    const m = UI.modal({
      title: (existente ? "Editar pendiente" : "Nuevo pendiente") + (eq ? " · " + eq.equipo : ""),
      size: "md", body: form,
      footer: [
        UI.btn("Cancelar", "ghost", () => { auto.stopped = true; F._clearDraft(key); MP.grabacion.notarFormulario("pendiente", "cancelado", Date.now() - t0); m.close(); }),
        UI.btn("Guardar", "primary", () => {
          const data = {
            id: p.id, equipoKey: equipoKey || p.equipoKey,
            fechaCompromiso: fFecha.value, tipo: fTipo.value, descripcion: fDesc.value,
            tareas, responsableAdmin: fAdmin.value, responsableEjecutivo: fEjec.value,
            gestiones: p.gestiones || [], enEspera: p.enEspera || null,
            fechaCompletado: p.fechaCompletado || null, origen: p.origen || "manual",
          };
          if (existente) Store.guardarPendiente(data);
          else Store.crearPendiente(data);
          if (fGestion.value.trim()) {
            const target = existente ? p.id : Store.db.pendientes[Store.db.pendientes.length - 1].id;
            Store.agregarGestion(target, fGestion.value.trim());
          }
          auto.stopped = true; F._clearDraft(key);
          MP.grabacion.notarFormulario("pendiente", "guardado", Date.now() - t0);
          UI.toast("Pendiente guardado.", "ok");
          m.close(); onSaved && onSaved();
        }),
      ],
    });
    const auto = wireAutosave(m.body, key, collect);
  };

  /* =====================================================================
   * Paso 10 — Mantenimiento Correctivo (apertura de expediente / evento)
   * ===================================================================== */
  F.correctivo = function (equipoKey, onSaved) {
    const eq = Store.equipoByKey(equipoKey);
    if (!eq) return;

    const key = F._draftKey("correctivo", equipoKey);
    const draft = F._loadDraft(key);
    const g = (n, fb) => (draft && n in draft) ? draft[n] : fb;

    const fTipoEvento = select(C.TIPOS_EVENTO, g("tipoEvento", "Orden de Trabajo"));
    const fReq = textarea({ placeholder: "Requerimiento (opcional)" }); fReq.value = g("requerimiento", "");
    const fFecha = input({ type: "date", value: g("fechaDocumento", U.todayISO()) });
    const fFolio = input({ placeholder: "Folio de Solicitud SIGEM", value: g("folio", "") });
    const fTec = select(C.EJECUTORES, g("tecnico", ""));
    let estadoEq = g("estadoEquipo", "No Operativo");
    const fEstado = segmented(C.ESTADOS_EQUIPO_CORR, estadoEq, (v) => { estadoEq = v; actualizarCrit(); auto && auto.save(); });
    const fCompra = select(C.TIPOS_COMPRA, g("tipoCompra", ""));

    const tdBox = el("div", { class: "subform hidden" });
    const tdNum = input({ placeholder: "N° informe técnico", value: g("tdNum", "") });
    const tdFecha = input({ type: "date", value: g("tdFecha", "") });
    const tdResp = select(C.EJECUTORES, g("tdResp", ""));
    const tdEmpresa = select(C.EMPRESAS, g("tdEmpresa", ""));
    tdBox.appendChild(el("div", { class: "subform-title" }, "Informe técnico (Trato Directo)"));
    tdBox.appendChild(el("div", { class: "form-grid" }, [
      field("N° informe técnico", tdNum), field("Fecha informe", tdFecha),
      field("Responsable informe", tdResp), field("Empresa", tdEmpresa),
    ]));
    function toggleTD() { tdBox.classList.toggle("hidden", fCompra.value !== "Trato Directo"); }
    fCompra.addEventListener("change", toggleTD);

    const ocNum = input({ placeholder: "N° orden de compra", value: g("ocNum", "") });
    const ocFecha = input({ type: "date", value: g("ocFecha", "") });
    const ocDesc = textarea({ placeholder: "Descripción de la OC (opcional)" }); ocDesc.value = g("ocDesc", "");

    const gestionCb = el("input", { type: "checkbox" }); gestionCb.checked = !!g("gestion", false);
    const fGestion = el("label", { class: "switch" }, [gestionCb, el("span", {}, "Generar pendiente asociado")]);
    let tipoReg = g("tipoReg", "Oficial");
    const fTipoReg = segmented(["Oficial", "Borrador"], tipoReg, (v) => { tipoReg = v; auto && auto.save(); });

    const critHint = el("div", { class: "field-hint" });
    function actualizarCrit() {
      critHint.innerHTML = estadoEq === "No Operativo"
        ? "⚠️ <b>Flujo crítico</b>: se medirán los días de detención y se creará un pendiente con las tareas del ciclo."
        : "Flujo normal: se mide el ciclo administrativo del expediente.";
    }
    setTimeout(() => { actualizarCrit(); toggleTD(); }, 0);

    const collect = () => ({
      tipoEvento: fTipoEvento.value, requerimiento: fReq.value, fechaDocumento: fFecha.value,
      folio: fFolio.value, tecnico: fTec.value, estadoEquipo: fEstado.getValue(), tipoCompra: fCompra.value,
      tdNum: tdNum.value, tdFecha: tdFecha.value, tdResp: tdResp.value, tdEmpresa: tdEmpresa.value,
      ocNum: ocNum.value, ocFecha: ocFecha.value, ocDesc: ocDesc.value,
      gestion: gestionCb.checked, tipoReg: fTipoReg.getValue(),
    });

    const note = draft ? draftNote(() => { F._clearDraft(key); if (auto) auto.stopped = true; m.close(); F.correctivo(equipoKey, onSaved); }) : null;
    const form = el("div", { class: "form-grid" }, [
      note,
      field("Tipo de evento", fTipoEvento),
      field("Requerimiento", fReq),
      field("Fecha del documento", fFecha),
      field("Folio de Solicitud SIGEM", fFolio),
      field("Técnico asignado", fTec),
      field("Estado del equipo", fEstado), critHint,
      field("Tipo de compra", fCompra),
      tdBox,
      el("div", { class: "subform-title" }, "Orden de compra (opcional)"),
      el("div", { class: "form-grid" }, [field("N° orden de compra", ocNum), field("Fecha OC", ocFecha)]),
      field("Descripción OC", ocDesc),
      field("Gestión pendiente", fGestion),
      field("Tipo de registro", fTipoReg),
    ]);

    const t0 = Date.now();
    const m = UI.modal({
      title: "Mantenimiento Correctivo · " + eq.equipo,
      size: "lg", body: form,
      footer: [
        UI.btn("Cancelar", "ghost", () => { auto.stopped = true; F._clearDraft(key); MP.grabacion.notarFormulario("correctivo", "cancelado", Date.now() - t0); m.close(); }),
        UI.btn("Abrir expediente", "primary", () => {
          if (!fFolio.value.trim()) { UI.toast("Ingrese el folio SIGEM.", "warn"); return; }
          Store.crearExpediente({
            equipoKey, tipoEvento: fTipoEvento.value, requerimiento: fReq.value,
            fechaDocumento: fFecha.value, folioSigem: fFolio.value.trim(), tecnico: fTec.value,
            estadoEquipo: estadoEq, tipoCompra: fCompra.value,
            informeTecnico: fCompra.value === "Trato Directo" && tdNum.value
              ? { numero: tdNum.value, fecha: tdFecha.value, responsable: tdResp.value, empresa: tdEmpresa.value } : null,
            ordenCompra: ocNum.value ? { numero: ocNum.value, fecha: ocFecha.value, descripcion: ocDesc.value } : null,
            gestionPendiente: gestionCb.checked, tipoRegistro: tipoReg,
          });
          auto.stopped = true; F._clearDraft(key);
          MP.grabacion.notarFormulario("correctivo", "guardado", Date.now() - t0);
          UI.toast("Expediente correctivo abierto.", "ok");
          m.close(); onSaved && onSaved();
        }),
      ],
    });
    const auto = wireAutosave(m.body, key, collect);
  };

  /* =====================================================================
   * Registrar avance del expediente (Paso 10/12)
   * ===================================================================== */
  const AVANCES = [
    { tipo: "evaluacion", label: "Evaluación técnica" },
    { tipo: "cotizacion_solicitada", label: "Cotización solicitada" },
    { tipo: "cotizacion_recibida", label: "Cotización recibida" },
    { tipo: "informe_tecnico", label: "Informe técnico" },
    { tipo: "oc_emitida", label: "OC emitida" },
    { tipo: "oc_enviada", label: "OC enviada al proveedor" },
    { tipo: "envio_st", label: "Envío a Servicio Técnico" },
    { tipo: "retorno_st", label: "Retorno de Servicio Técnico" },
    { tipo: "visita_ejecucion", label: "Visita / Ejecución realizada" },
    { tipo: "cierre", label: "Cierre del expediente" },
  ];
  F._avancesCatalogo = AVANCES;

  F.registrarAvance = function (expId, tipoSugerido, onSaved) {
    const x = Store.db.expedientes.find((e) => e.id === expId);
    if (!x) return;

    const fTipo = select(AVANCES.map((a) => ({ value: a.tipo, label: a.label })), tipoSugerido);
    const fFecha = input({ type: "date", value: U.todayISO() });
    const dyn = el("div", { class: "form-grid" });

    function renderDyn() {
      dyn.innerHTML = "";
      const t = fTipo.value;
      if (t === "envio_st") {
        const emp = select(C.EMPRESAS); const num = input({ placeholder: "N° de envío (obligatorio)" });
        const desc = textarea({ placeholder: "Descripción (opcional)" });
        dyn._get = () => ({ empresa: emp.value, numeroEnvio: num.value, descripcion: desc.value });
        dyn._valid = () => emp.value && num.value.trim();
        dyn.appendChild(field("Empresa de destino", emp));
        dyn.appendChild(field("N° de envío", num));
        dyn.appendChild(field("Descripción", desc));
      } else if (t === "retorno_st") {
        const ultimoEnvio = (x.avances || []).slice().reverse().find((a) => a.tipo === "envio_st");
        const emp = select(C.EMPRESAS, ultimoEnvio && ultimoEnvio.datos ? ultimoEnvio.datos.empresa : "");
        const folio = input({ placeholder: "Folio de retorno (obligatorio)" });
        const quien = input({ placeholder: "Persona de la empresa (opcional)" });
        let estado = "Operativo";
        const seg = segmented(["Operativo", "No Operativo"], "Operativo", (v) => estado = v);
        dyn._get = () => ({ empresa: emp.value, folioRetorno: folio.value, quien: quien.value, estadoEquipo: estado });
        dyn._valid = () => folio.value.trim();
        dyn.appendChild(field("Folio Orden de Trabajo", el("div", { class: "readonly-val" }, x.folioSigem)));
        dyn.appendChild(field("Empresa", emp));
        dyn.appendChild(field("Folio de retorno", folio));
        dyn.appendChild(field("Quién lo envió", quien));
        dyn.appendChild(field("¿Cómo quedó el equipo?", seg));
      } else if (t === "visita_ejecucion") {
        let estado = "Operativo";
        const seg = segmented(["Operativo", "No Operativo"], "Operativo", (v) => estado = v);
        const nota = textarea({ placeholder: "Nota / respaldo (opcional)" });
        dyn._get = () => ({ estadoEquipo: estado, nota: nota.value });
        dyn._valid = () => true;
        dyn.appendChild(field("¿Cómo quedó el equipo?", seg));
        dyn.appendChild(field("Nota", nota));
      } else if (t === "cierre") {
        let estado = x.estadoEquipo || "Operativo";
        const seg = segmented(["Operativo", "No Operativo"], estado, (v) => estado = v);
        const nota = textarea({ placeholder: "Nota de cierre (opcional)" });
        dyn._get = () => ({ estadoEquipo: estado, nota: nota.value });
        dyn._valid = () => true;
        dyn.appendChild(field("Estado final del equipo", seg));
        dyn.appendChild(field("Nota de cierre", nota));
      } else {
        const num = input({ placeholder: "N° / referencia (opcional)" });
        const emp = select(C.EMPRESAS);
        const nota = textarea({ placeholder: "Detalle (opcional)" });
        dyn._get = () => ({ numero: num.value, empresa: emp.value, nota: nota.value });
        dyn._valid = () => true;
        dyn.appendChild(field("N° / referencia", num));
        if (t === "cotizacion_solicitada" || t === "cotizacion_recibida" || t === "oc_enviada")
          dyn.appendChild(field("Empresa / proveedor", emp));
        dyn.appendChild(field("Detalle", nota));
      }
      validarCronologia();
    }
    const cronoHint = el("div", { class: "field-hint" });
    function validarCronologia() {
      const ult = (x.avances || []).map((a) => a.fechaReal).filter(Boolean).sort();
      const ultima = ult[ult.length - 1];
      if (ultima && fFecha.value < ultima) {
        cronoHint.innerHTML = "⚠️ La fecha es anterior al último hito (" + U.fmtDate(ultima) + "). Verifique el orden cronológico.";
      } else cronoHint.innerHTML = "";
    }
    fTipo.addEventListener("change", renderDyn);
    fFecha.addEventListener("change", validarCronologia);
    setTimeout(renderDyn, 0);

    const body = el("div", {}, [
      el("div", { class: "form-grid" }, [
        field("Tipo de avance", fTipo),
        field("Fecha real del hecho", fFecha),
      ]),
      cronoHint, dyn,
    ]);

    const m = UI.modal({
      title: "Registrar avance · Folio " + x.folioSigem,
      size: "md", body,
      footer: [
        UI.btn("Cancelar", "ghost", () => m.close()),
        UI.btn("Registrar", "primary", () => {
          if (dyn._valid && !dyn._valid()) { UI.toast("Complete los campos obligatorios.", "warn"); return; }
          Store.registrarAvance(expId, {
            tipo: fTipo.value, fechaReal: fFecha.value, datos: dyn._get ? dyn._get() : {},
          });
          UI.toast("Avance registrado.", "ok");
          m.close(); onSaved && onSaved();
        }),
      ],
    });
  };

})(window);
