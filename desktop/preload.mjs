import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("vericrateDesktop", {
  selectProjectDirectory: () => ipcRenderer.invoke("vericrate:select-project-directory"),
  platform: process.platform
});
