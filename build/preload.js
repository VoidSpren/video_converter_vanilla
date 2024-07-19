"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
let app;
electron_1.contextBridge.exposeInMainWorld('electron', {
    selectDir: () => electron_1.ipcRenderer.invoke('selectDir'),
    processVideos: (info) => electron_1.ipcRenderer.send("process-videos", info),
    cancelProcess: () => electron_1.ipcRenderer.send("cancel-process"),
    onProcessInfo: (callback) => { electron_1.ipcRenderer.on("process-info", (ev, info) => callback(info)); },
    onProcessEnd: (callback) => { electron_1.ipcRenderer.on("process-end", (ev) => callback()); },
    app: async () => {
        if (!app) {
            app = await electron_1.ipcRenderer.invoke("appData");
        }
        return app;
    }
});
