const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  openExternal: (url) => ipcRenderer.invoke('open:external', url),
  copy: (text) => ipcRenderer.invoke('clipboard:write', text),
  exportData: (data) => ipcRenderer.invoke('data:export', data),
  importData: () => ipcRenderer.invoke('data:import'),
  captureSite: (id, url) => ipcRenderer.invoke('sites:capture', { id, url }),
  listApps: () => ipcRenderer.invoke('apps:list'),
  appIcon: (appPath) => ipcRenderer.invoke('apps:icon', appPath),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  onUpdate: (cb) => ipcRenderer.on('update:available', (_e, update) => cb(update)),
  setAppearance: (appearance) => ipcRenderer.invoke('appearance:set', appearance),
  setIcon: (dataUrl) => ipcRenderer.invoke('icon:set', dataUrl),
});
