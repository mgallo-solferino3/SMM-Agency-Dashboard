const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  restore: () => ipcRenderer.send('widget:restore'),
  dragStart: () => ipcRenderer.send('widget:drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('widget:drag-move', { dx, dy }),
  dragEnd: () => ipcRenderer.send('widget:drag-end'),
  getIcon: () => ipcRenderer.invoke('widget:icon'),
  onIcon: (cb) => ipcRenderer.on('widget:icon', (_e, dataUrl) => cb(dataUrl)),
});
