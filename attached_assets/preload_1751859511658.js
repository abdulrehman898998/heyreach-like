const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startAutomation: (config) => ipcRenderer.send('start-automation', config),
  onLogMessage: (callback) => ipcRenderer.on('log-message', (event, message) => callback(message))
});