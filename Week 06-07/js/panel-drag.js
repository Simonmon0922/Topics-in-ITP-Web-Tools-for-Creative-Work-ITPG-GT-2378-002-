// panel-drag.js — drag panels by their title (h2) to reorder them left/right.
// Pure layout; never touches state. Order persists in localStorage.
const KEY = "anicur-panel-order";

export function initPanelDrag() {
  const container = document.getElementById("panels");

  // restore the previous arrangement
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (Array.isArray(saved)) {
    for (const id of saved) {
      const panel = document.getElementById(id);
      if (panel) container.appendChild(panel);
    }
  }

  const saveOrder = () => {
    const order = [...container.querySelectorAll(".panel")].map((p) => p.id);
    localStorage.setItem(KEY, JSON.stringify(order));
  };

  for (const panel of container.querySelectorAll(".panel")) {
    const header = panel.querySelector("h2");
    header.classList.add("drag-handle");
    header.addEventListener("pointerdown", (down) => {
      if (down.button !== 0) return;
      down.preventDefault();
      panel.classList.add("dragging");

      const move = (ev) => {
        // First panel (in document order) that is "behind" the pointer: pointer
        // above its row, or same row and left of its midline → insert before it;
        // none → move to the end.
        const after = [...container.querySelectorAll(".panel:not(.dragging)")].find((s) => {
          const r = s.getBoundingClientRect();
          return (
            ev.clientY < r.top || (ev.clientY < r.bottom && ev.clientX < r.left + r.width / 2)
          );
        });
        if (after !== panel.nextElementSibling || after === undefined)
          container.insertBefore(panel, after ?? null);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        panel.classList.remove("dragging");
        saveOrder();
      };
      // Listeners live on window: insertBefore detaches and re-inserts the panel
      // (title included), which implicitly releases pointer capture — a pointerup
      // listener on the title itself could be lost at that moment.
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  }
}
