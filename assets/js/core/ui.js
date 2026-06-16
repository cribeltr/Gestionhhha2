/* =========================================================================
 * MP 2026 · ui.js
 * Componentes de interfaz reutilizables: toast, modal y DataTable
 * (tabla tipo Excel con filtros por columna, búsqueda global, selector
 *  de columnas, paginación y exportación).
 * ========================================================================= */
(function (global) {
  "use strict";
  const MP = global.MP;
  const U = MP.util;
  const el = U.el;
  const UI = MP.ui = {};

  /* ----- Toasts ------------------------------------------------------- */
  UI.toast = function (msg, tipo) {
    let cont = document.getElementById("toast-cont");
    if (!cont) {
      cont = el("div", { id: "toast-cont", class: "toast-cont" });
      document.body.appendChild(cont);
    }
    const t = el("div", { class: "toast toast-" + (tipo || "info") }, msg);
    cont.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3600);
  };

  /* ----- Modal -------------------------------------------------------- */
  UI.modal = function (opts) {
    opts = opts || {};
    const overlay = el("div", { class: "modal-overlay" });
    const box = el("div", { class: "modal-box " + (opts.size || "") });
    const head = el("div", { class: "modal-head" }, [
      el("h3", { text: opts.title || "" }),
      el("button", { class: "modal-x", title: "Cerrar", onclick: close }, "✕"),
    ]);
    const body = el("div", { class: "modal-body" });
    if (typeof opts.body === "string") body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(head); box.appendChild(body);
    if (opts.footer) {
      const foot = el("div", { class: "modal-foot" });
      (Array.isArray(opts.footer) ? opts.footer : [opts.footer]).forEach((f) => foot.appendChild(f));
      box.appendChild(foot);
    }
    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => { if (e.target === overlay && opts.dismissable !== false) close(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    function close() { overlay.remove(); document.body.style.overflow = ""; if (opts.onClose) opts.onClose(); }
    const api = { close, overlay, body };
    return api;
  };

  UI.confirm = function (msg, onYes, opts) {
    opts = opts || {};
    const m = UI.modal({
      title: opts.title || "Confirmar",
      size: "sm",
      body: el("p", { class: "confirm-msg", html: msg }),
      footer: [
        el("button", { class: "btn ghost", onclick: () => m.close() }, opts.cancelText || "Cancelar"),
        el("button", { class: "btn " + (opts.danger ? "danger" : "primary"),
          onclick: () => { m.close(); onYes && onYes(); } }, opts.okText || "Confirmar"),
      ],
    });
    return m;
  };

  /* ----- Botón utilitario -------------------------------------------- */
  UI.btn = function (label, cls, onClick, attrs) {
    return el("button", Object.assign({ class: "btn " + (cls || ""), onclick: onClick }, attrs || {}), label);
  };

  /* =====================================================================
   * DataTable — tabla tipo Excel reutilizable.
   *
   * config = {
   *   columns: [{ key, label, group?, render?(row,val), value?(row),
   *               filterable=true, sortable=true, defaultVisible=true,
   *               className?, align? }],
   *   rows: [...objetos],
   *   rowClass?: (row)=>string,
   *   onRowClick?: (row)=>void,
   *   pageSize?: number (def 25),
   *   exportName?: string,
   *   storageKey?: string  (recuerda columnas visibles)
   *   toolbarExtra?: [DOMNode]  (botones extra a la izquierda)
   *   emptyText?: string
   * }
   * ===================================================================== */
  UI.DataTable = function (config) {
    const cols = config.columns.map((c) => Object.assign({
      filterable: true, sortable: true, defaultVisible: true,
    }, c));
    const state = {
      rows: config.rows || [],
      filters: {},          // key -> Set de valores permitidos
      sort: { key: null, dir: 1 },
      page: 1,
      pageSize: config.pageSize || 25,
      search: "",
      visible: {},
    };
    // Visibilidad inicial (persistida si hay storageKey).
    cols.forEach((c) => { state.visible[c.key] = c.defaultVisible !== false; });
    if (config.storageKey) {
      try {
        const saved = JSON.parse(localStorage.getItem("dt_cols_" + config.storageKey) || "null");
        if (saved) cols.forEach((c) => { if (c.key in saved) state.visible[c.key] = saved[c.key]; });
      } catch (e) {}
    }

    const root = el("div", { class: "dt" });

    function valueOf(row, c) {
      const v = c.value ? c.value(row) : row[c.key];
      return v === null || v === undefined ? "" : v;
    }
    function displayText(row, c) {
      // Texto plano para búsqueda/filtros (no HTML).
      if (c.text) return U.asText(c.text(row));
      return U.asText(valueOf(row, c));
    }

    function filteredRows() {
      let rows = state.rows.slice();
      // Filtros por columna
      Object.keys(state.filters).forEach((k) => {
        const set = state.filters[k];
        if (!set || set.size === 0) return;
        const c = cols.find((x) => x.key === k);
        rows = rows.filter((r) => set.has(displayText(r, c)));
      });
      // Búsqueda global
      const q = U.norm(state.search);
      if (q) {
        rows = rows.filter((r) =>
          cols.some((c) => U.norm(displayText(r, c)).indexOf(q) >= 0));
      }
      // Orden
      if (state.sort.key) {
        const c = cols.find((x) => x.key === state.sort.key);
        rows.sort((a, b) => {
          const va = displayText(a, c), vb = displayText(b, c);
          const na = parseFloat(va), nb = parseFloat(vb);
          let cmp;
          if (!isNaN(na) && !isNaN(nb) && va.trim() !== "" && vb.trim() !== "") cmp = na - nb;
          else cmp = va.localeCompare(vb, "es", { numeric: true });
          return cmp * state.sort.dir;
        });
      }
      return rows;
    }

    let lastFiltered = [];

    function render() {
      root.innerHTML = "";
      const visibleCols = cols.filter((c) => state.visible[c.key]);
      const rows = filteredRows();
      lastFiltered = rows;

      /* Toolbar */
      const toolbar = el("div", { class: "dt-toolbar" });
      (config.toolbarExtra || []).forEach((n) => toolbar.appendChild(n));
      const search = el("input", { class: "dt-search", type: "search",
        placeholder: "🔍 Búsqueda global…", value: state.search });
      // Re-renderiza y restaura el foco/caret para no perder la escritura
      // continua (la tabla se reconstruye en cada tecla).
      search.addEventListener("input", () => {
        state.search = search.value; state.page = 1;
        render();
        const fresh = root.querySelector(".dt-search");
        if (fresh) { fresh.focus(); const n = fresh.value.length; try { fresh.setSelectionRange(n, n); } catch (e) {} }
      });
      toolbar.appendChild(search);

      const count = el("span", { class: "dt-count" },
        rows.length + " de " + state.rows.length + " registros");
      toolbar.appendChild(count);

      const spacer = el("span", { class: "dt-spacer" });
      toolbar.appendChild(spacer);

      // Selector de columnas
      const colBtn = UI.btn("⚙ Columnas", "ghost sm", (e) => openColChooser(e.currentTarget));
      toolbar.appendChild(colBtn);

      // Exportar
      if (config.exportName !== false) {
        toolbar.appendChild(UI.btn("⬇ Exportar", "ghost sm", () => {
          MP.excel.exportTable(visibleCols, rows, displayText, config.exportName || "tabla");
        }));
      }
      // Limpiar filtros
      toolbar.appendChild(UI.btn("✕ Limpiar", "ghost sm", () => {
        state.filters = {}; state.search = ""; state.sort = { key: null, dir: 1 }; state.page = 1; render();
      }));

      root.appendChild(toolbar);

      /* Tabla */
      const wrap = el("div", { class: "dt-scroll" });
      const table = el("table", { class: "dt-table" });

      // ¿Hay grupos? (para Plan de Mantenimiento con meses)
      const hasGroups = visibleCols.some((c) => c.group);
      const thead = el("thead");
      if (hasGroups) {
        const trG = el("tr", { class: "dt-grouprow" });
        let i = 0;
        while (i < visibleCols.length) {
          const g = visibleCols[i].group || null;
          let span = 1;
          while (i + span < visibleCols.length && (visibleCols[i + span].group || null) === g) span++;
          trG.appendChild(el("th", { colspan: span, class: g ? "dt-group" : "" }, g || ""));
          i += span;
        }
        thead.appendChild(trG);
      }

      const trH = el("tr");
      visibleCols.forEach((c) => {
        const th = el("th", { class: (c.className || "") + (c.align ? " ta-" + c.align : "") });
        const wrapTh = el("div", { class: "th-inner" });
        const lab = el("span", { class: "th-label", text: c.label });
        if (c.sortable) {
          lab.style.cursor = "pointer";
          lab.addEventListener("click", () => {
            if (state.sort.key === c.key) state.sort.dir *= -1;
            else { state.sort.key = c.key; state.sort.dir = 1; }
            render();
          });
          if (state.sort.key === c.key) lab.textContent += state.sort.dir > 0 ? " ▲" : " ▼";
        }
        wrapTh.appendChild(lab);
        if (c.filterable) {
          const active = state.filters[c.key] && state.filters[c.key].size > 0;
          const fb = el("button", { class: "th-filter" + (active ? " active" : ""), title: "Filtrar" }, "▾");
          fb.addEventListener("click", (e) => { e.stopPropagation(); openColFilter(c, fb); });
          wrapTh.appendChild(fb);
        }
        th.appendChild(wrapTh);
        trH.appendChild(th);
      });
      thead.appendChild(trH);
      table.appendChild(thead);

      const tbody = el("tbody");
      const start = (state.page - 1) * state.pageSize;
      const pageRows = rows.slice(start, start + state.pageSize);
      if (pageRows.length === 0) {
        tbody.appendChild(el("tr", {}, el("td", { colspan: visibleCols.length, class: "dt-empty" },
          config.emptyText || "Sin registros que coincidan con los filtros.")));
      }
      pageRows.forEach((row) => {
        const tr = el("tr", { class: config.rowClass ? config.rowClass(row) : "" });
        if (config.onRowClick) {
          tr.classList.add("clickable");
          tr.addEventListener("click", (e) => {
            if (e.target.closest(".no-rowclick")) return;
            config.onRowClick(row);
          });
        }
        visibleCols.forEach((c) => {
          const td = el("td", { class: (c.className || "") + (c.align ? " ta-" + c.align : "") });
          const content = c.render ? c.render(row, valueOf(row, c)) : valueOf(row, c);
          if (content instanceof Node) td.appendChild(content);
          else if (c.html) td.innerHTML = c.html(row);
          else td.textContent = U.asText(content);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      root.appendChild(wrap);

      /* Paginación */
      const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const pag = el("div", { class: "dt-pag" });
      pag.appendChild(UI.btn("«", "ghost sm", () => { state.page = 1; render(); }, { disabled: state.page === 1 }));
      pag.appendChild(UI.btn("‹", "ghost sm", () => { state.page = Math.max(1, state.page - 1); render(); }, { disabled: state.page === 1 }));
      pag.appendChild(el("span", { class: "dt-pageinfo" }, "Página " + state.page + " / " + totalPages));
      pag.appendChild(UI.btn("›", "ghost sm", () => { state.page = Math.min(totalPages, state.page + 1); render(); }, { disabled: state.page === totalPages }));
      pag.appendChild(UI.btn("»", "ghost sm", () => { state.page = totalPages; render(); }, { disabled: state.page === totalPages }));
      const sizeSel = el("select", { class: "dt-pagesize" },
        [10, 25, 50, 100, 250].map((n) => el("option", { value: n, selected: n === state.pageSize }, n + " / pág.")));
      sizeSel.addEventListener("change", () => { state.pageSize = +sizeSel.value; state.page = 1; render(); });
      pag.appendChild(sizeSel);
      root.appendChild(pag);
    }

    /* ----- Popover de filtro de columna (estilo Excel) --------------- */
    function openColFilter(c, anchor) {
      closePopovers();
      const distinct = Array.from(new Set(state.rows.map((r) => displayText(r, c))))
        .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
      const current = state.filters[c.key] || new Set(distinct);
      const pop = el("div", { class: "dt-pop" });
      pop.addEventListener("click", (e) => e.stopPropagation());

      // Orden
      const ord = el("div", { class: "dt-pop-sort" }, [
        UI.btn("▲ Orden A→Z", "ghost sm", () => { state.sort = { key: c.key, dir: 1 }; closePopovers(); render(); }),
        UI.btn("▼ Orden Z→A", "ghost sm", () => { state.sort = { key: c.key, dir: -1 }; closePopovers(); render(); }),
      ]);
      pop.appendChild(ord);

      const sb = el("input", { class: "dt-pop-search", type: "search", placeholder: "Buscar valor…" });
      pop.appendChild(sb);

      const list = el("div", { class: "dt-pop-list" });
      const selectAll = el("label", { class: "dt-pop-item all" }, [
        (() => { const cb = el("input", { type: "checkbox" }); cb.checked = current.size === distinct.length;
          cb.addEventListener("change", () => {
            list.querySelectorAll("input[data-v]").forEach((i) => {
              if (i.parentElement.style.display !== "none") i.checked = cb.checked;
            });
          }); return cb; })(),
        el("span", {}, "(Seleccionar todo)"),
      ]);
      list.appendChild(selectAll);
      distinct.forEach((v) => {
        const cb = el("input", { type: "checkbox", "data-v": v });
        cb.checked = current.has(v);
        list.appendChild(el("label", { class: "dt-pop-item" }, [cb, el("span", {}, v === "" ? "(vacío)" : v)]));
      });
      sb.addEventListener("input", () => {
        const q = U.norm(sb.value);
        list.querySelectorAll(".dt-pop-item:not(.all)").forEach((it) => {
          it.style.display = U.norm(it.textContent).indexOf(q) >= 0 ? "" : "none";
        });
      });
      pop.appendChild(list);

      const foot = el("div", { class: "dt-pop-foot" }, [
        UI.btn("Aplicar", "primary sm", () => {
          const chosen = new Set();
          list.querySelectorAll("input[data-v]").forEach((i) => { if (i.checked) chosen.add(i.getAttribute("data-v")); });
          if (chosen.size === distinct.length) delete state.filters[c.key];
          else state.filters[c.key] = chosen;
          state.page = 1; closePopovers(); render();
        }),
        UI.btn("Quitar filtro", "ghost sm", () => { delete state.filters[c.key]; closePopovers(); render(); }),
      ]);
      pop.appendChild(foot);

      document.body.appendChild(pop);
      positionPop(pop, anchor);
    }

    function openColChooser(anchor) {
      closePopovers();
      const pop = el("div", { class: "dt-pop" });
      pop.addEventListener("click", (e) => e.stopPropagation());
      pop.appendChild(el("div", { class: "dt-pop-title" }, "Columnas visibles"));
      const list = el("div", { class: "dt-pop-list" });
      cols.forEach((c) => {
        const cb = el("input", { type: "checkbox" });
        cb.checked = state.visible[c.key];
        cb.addEventListener("change", () => {
          state.visible[c.key] = cb.checked;
          if (config.storageKey) localStorage.setItem("dt_cols_" + config.storageKey, JSON.stringify(state.visible));
        });
        list.appendChild(el("label", { class: "dt-pop-item" }, [cb, el("span", {}, c.label)]));
      });
      pop.appendChild(list);
      pop.appendChild(el("div", { class: "dt-pop-foot" }, [
        UI.btn("Aplicar", "primary sm", () => { closePopovers(); render(); }),
      ]));
      document.body.appendChild(pop);
      positionPop(pop, anchor);
    }

    function positionPop(pop, anchor) {
      const r = anchor.getBoundingClientRect();
      pop.style.position = "fixed";
      pop.style.top = Math.min(r.bottom + 4, window.innerHeight - 360) + "px";
      pop.style.left = Math.min(r.left, window.innerWidth - 280) + "px";
      setTimeout(() => document.addEventListener("click", closePopovers, { once: true }), 0);
    }
    function closePopovers() {
      document.querySelectorAll(".dt-pop").forEach((p) => p.remove());
    }

    render();
    return {
      root,
      setRows(rows) { state.rows = rows; state.page = 1; render(); },
      getFiltered() { return lastFiltered; },
      refresh: render,
    };
  };

})(window);
