const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
   onInitMarmiton: (callback) => ipcRenderer.on('onInit-marmiton', (_event, value) => callback(value)),
   marmitonMsg: (value) => ipcRenderer.invoke('marmiton-msg', value),
   marmitonSave: (value) => ipcRenderer.invoke('marmiton-save', value),
   quit: () => ipcRenderer.send('marmiton-quit'),
});
