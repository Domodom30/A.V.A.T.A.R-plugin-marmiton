const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
   onInitMarmiton: (callback) => ipcRenderer.on('onInit-marmiton', (_event, config, resultat) => callback(config, resultat)),
   marmitonMsg: (value) => ipcRenderer.invoke('marmiton-msg', value),
   scrapeRecipe: (value) => ipcRenderer.invoke('marmiton-recette', value),
   recalculateIngredients: (recettes, nbperson) => ipcRenderer.invoke('marmiton-calcul', recettes, nbperson),
   quit: () => ipcRenderer.send('marmiton-quit'),
});
