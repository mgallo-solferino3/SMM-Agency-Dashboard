// Clic = riapre l'app; trascinamento = sposta il widget
const bubble = document.getElementById('bubble');
const DRAG_THRESHOLD = 4;
let start = null;
let dragging = false;

bubble.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  start = { x: e.screenX, y: e.screenY };
  dragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (!start) return;
  const dx = e.screenX - start.x;
  const dy = e.screenY - start.y;
  if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
  if (!dragging) {
    dragging = true;
    window.widget.dragStart();
  }
  window.widget.dragMove(dx, dy);
});

window.addEventListener('mouseup', () => {
  if (!start) return;
  if (dragging) window.widget.dragEnd();
  else window.widget.restore();
  start = null;
  dragging = false;
});

// Icona scelta nelle impostazioni (null = quella originale)
const icon = document.getElementById('icon');
const DEFAULT_ICON = icon.getAttribute('src');
const setIcon = (dataUrl) => { icon.src = dataUrl || DEFAULT_ICON; };
window.widget.getIcon().then(setIcon);
window.widget.onIcon(setIcon);
