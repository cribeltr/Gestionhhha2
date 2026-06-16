/* =========================================================================
 * MP 2026 · datos.js  —  Pasos 1 y 11
 * Importar planilla (PMP_2026 / Registro_MP-2026), descargar registros,
 * respaldo (backup) y restauración, datos de demostración.
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const el = U.el;
  const Store = MP.store;
  const UI = MP.ui;

  MP.views = MP.views || {};
  MP.views.datos = function (container) {
    container.appendChild(el("div", { class: "view-head" }, [
      el("h2", {}, "Datos y Respaldo"),
      el("p", { class: "view-sub" }, "Cargar la base de equipos, exportar registros y gestionar respaldos."),
    ]));

    const meta = Store.db.meta || {};
    const resumen = el("div", { class: "data-summary" }, [
      stat("Equipos", Store.db.equipos.length),
      stat("Mantenciones (app)", Store.db.mantenciones.length),
      stat("Pendientes", Store.db.pendientes.length),
      stat("Expedientes correctivos", Store.db.expedientes.length),
      stat("Última carga", meta.ultimaCarga ? U.fmtDate(meta.ultimaCarga) : "—"),
    ]);
    container.appendChild(resumen);

    const grid = el("div", { class: "cards-grid" });

    /* --- Importar planilla (Paso 1, 3, 4) --- */
    grid.appendChild(card("📥", "Cargar planilla de equipos",
      "Importa la base desde el archivo ProgramaciónMP2026 (hojas PMP_2026 y Registro_MP-2026). Encabezados en la fila 7, datos desde la fila 8. Serie y N° Inventario se conservan como texto.",
      [(() => {
        const inp = el("input", { type: "file", accept: ".xlsx,.xls", class: "hidden" });
        inp.addEventListener("change", () => {
          const f = inp.files[0]; if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const res = MP.excel.importarPlanilla(reader.result);
              UI.toast("Cargados " + res.equipos + " equipos" + (res.conRegistro ? " y " + res.registros + " registros." : "."), "ok");
              MP.app.go("equipos");
            } catch (e) { UI.toast("Error: " + e.message, "warn"); console.error(e); }
          };
          reader.readAsArrayBuffer(f);
          inp.value = "";
        });
        const btn = UI.btn("Seleccionar archivo .xlsx", "primary", () => {
          if (!MP.excel.disponible()) { UI.toast("SheetJS no disponible (sin conexión). Use respaldo JSON.", "warn"); return; }
          inp.click();
        });
        return el("div", {}, [btn, inp]);
      })()]));

    /* --- Datos de demostración --- */
    grid.appendChild(card("🧪", "Datos de demostración",
      "Carga un conjunto de equipos y registros de ejemplo que simulan escenarios reales (operativos, no operativos, en servicio técnico, pendientes atrasados y un expediente correctivo).",
      [UI.btn("Cargar demo", "secondary", () => {
        UI.confirm("Esto reemplazará los datos actuales por el conjunto de demostración. ¿Continuar?", () => {
          MP.seed(); UI.toast("Datos de demostración cargados.", "ok"); MP.app.go("equipos");
        });
      })]));

    /* --- Descargar todos los registros (Paso 11) --- */
    grid.appendChild(card("⬇️", "Descargar todos los registros",
      "Exporta equipos, mantenciones, pendientes y correctivo a un archivo Excel, conservando Serie y N° Inventario como texto con sus ceros a la izquierda.",
      [UI.btn("Descargar Excel", "secondary", () => MP.excel.descargarTodo())]));

    /* --- Backup (Paso 11) --- */
    grid.appendChild(card("💾", "Respaldo (backup)",
      "Genera un respaldo completo de los datos de la aplicación en formato JSON, que permite restaurar la información en caso de pérdida o reinstalación.",
      [
        UI.btn("Generar respaldo", "secondary", () => {
          const blob = new Blob([Store.exportBackup()], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = el("a", { href: url, download: "backup_MP2026_" + U.todayISO() + ".json" });
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          UI.toast("Respaldo generado.", "ok");
        }),
        (() => {
          const inp = el("input", { type: "file", accept: ".json", class: "hidden" });
          inp.addEventListener("change", () => {
            const f = inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
              UI.confirm("Restaurar reemplazará todos los datos actuales. ¿Continuar?", () => {
                try { Store.importBackup(r.result); UI.toast("Respaldo restaurado.", "ok"); MP.app.go("equipos"); }
                catch (e) { UI.toast("Respaldo inválido: " + e.message, "warn"); }
              });
            };
            r.readAsText(f); inp.value = "";
          });
          const btn = UI.btn("Restaurar respaldo", "ghost", () => inp.click());
          return el("div", {}, [btn, inp]);
        })(),
      ]));

    /* --- Borrar todo --- */
    grid.appendChild(card("🗑️", "Reiniciar datos",
      "Elimina todos los datos almacenados en este navegador. Esta acción no se puede deshacer.",
      [UI.btn("Borrar todo", "danger ghost", () => {
        UI.confirm("¿Borrar <b>todos</b> los datos de la aplicación?", () => { Store.reset(); UI.toast("Datos borrados.", "ok"); MP.app.render(); }, { danger: true, okText: "Borrar todo" });
      })]));

    container.appendChild(grid);

    function stat(label, val) {
      return el("div", { class: "data-stat" }, [el("b", {}, String(val)), el("span", {}, label)]);
    }
    function card(ico, titulo, desc, acciones) {
      return el("div", { class: "data-card" }, [
        el("div", { class: "data-card-ico" }, ico),
        el("h3", {}, titulo),
        el("p", { class: "muted" }, desc),
        el("div", { class: "data-card-actions" }, acciones),
      ]);
    }
  };
})(window);
