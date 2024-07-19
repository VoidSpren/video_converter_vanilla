import { ipcRenderer, contextBridge } from "electron";
import { ConvertionConfig } from "./types";

let app: {filename:string, dirname:string};

contextBridge.exposeInMainWorld('electron', {
  selectDir: (): Promise<string> => ipcRenderer.invoke('selectDir'),
  processVideos: (info: {paths: string[], config: ConvertionConfig}) => ipcRenderer.send("process-videos", info),
  cancelProcess: () => ipcRenderer.send("cancel-process"),
  onProcessInfo: (callback: (info:string) => void) => {ipcRenderer.on("process-info", (ev, info: string) => callback(info))},
  onProcessEnd: (callback: () => void) => {ipcRenderer.on("process-end", (ev) => callback())},
  app: async () => {
    if(!app){
      app = await ipcRenderer.invoke("appData");
    }
    return app;
  }
})