let appVersion = '1.0.20';
try {
  const pkg = require('../package.json');
  if (pkg?.version) appVersion = pkg.version;
} catch (e) {}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion,
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  showNativeNotification: (payload) => ipcRenderer.invoke('app:show-notification', payload),
  focusWindow: () => ipcRenderer.invoke('app:focus-window'),
  onWindowFocus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('window:focus', handler);
    return () => ipcRenderer.removeListener('window:focus', handler);
  },
  onUpdaterStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },
  onUpdaterProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  }
});
