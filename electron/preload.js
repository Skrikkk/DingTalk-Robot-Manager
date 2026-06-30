const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("robotDesktop", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  chooseFiles: () => ipcRenderer.invoke("dialog:chooseFiles"),
  chooseIcon: () => ipcRenderer.invoke("dialog:chooseIcon")
});
