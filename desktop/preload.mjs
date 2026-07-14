import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agentproofDesktop", {
  selectProjectDirectory: () => ipcRenderer.invoke("agentproof:select-project-directory"),
  platform: process.platform
});
