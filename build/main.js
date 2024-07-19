"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = require("node:path");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
let saveDirectory = process.cwd();
let currentCommand = null;
let processCancelled = false;
async function selectDirectory() {
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (!canceled) {
        saveDirectory = filePaths[0];
        return filePaths[0];
    }
    return saveDirectory;
}
const cancelProcess = () => {
    if (currentCommand) {
        processCancelled = true;
        currentCommand.kill("SIGKILL");
    }
};
const proccessVideos = async ({ paths, config }, sendInfo, ended) => {
    if (!paths)
        return;
    let savePaths = [];
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        if (processCancelled)
            break;
        const ext = (0, node_path_1.extname)(path);
        const filename = (0, node_path_1.basename)(path, ext);
        sendInfo(`processing: ${path}`);
        let resolver;
        const promise = new Promise(res => resolver = res);
        let resolverAspectRatio;
        let promiseAspectRatio = new Promise(res => resolverAspectRatio = res);
        fluent_ffmpeg_1.default.ffprobe(path, (err, data) => {
            for (let stream of data.streams) {
                if (stream.codec_type === "video") {
                    if (stream.width && stream.height) {
                        resolverAspectRatio(stream.width / stream.height);
                    }
                    break;
                }
            }
        });
        let aspectRatio = await promiseAspectRatio;
        const command = (0, fluent_ffmpeg_1.default)(path);
        currentCommand = command;
        console.log(config.height, config.width, config.minorSideRes, aspectRatio, config.minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio));
        if (config.height) {
            if (config.minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio)) {
                if (aspectRatio > 1) {
                    command.size(`?x${config.height}`);
                }
                else {
                    command.size(`${config.height}x?`);
                }
            }
            else if (!config.width) {
                command.size(`?x${config.height}`);
            }
            else {
                command.size(`${config.width}x${config.height}`);
            }
        }
        else if (config.width) {
            command.size(`${config.width}x?`);
        }
        if (config.bitrate) {
            command.videoBitrate(`${config.bitrate}k`, config.cbr);
        }
        if (config.fps) {
            command.fps(config.fps);
        }
        command.on("start", () => sendInfo("start"));
        command.on("end", () => {
            sendInfo("ended");
            resolver(Promise.resolve(true));
        });
        command.on("error", () => {
            sendInfo("error or canceled");
            resolver(Promise.resolve(false));
        });
        command.on("progress", (progress) => {
            sendInfo(`progress: ${i + 1}/${paths.length} ${path} %${progress.percent}`);
        });
        const savePath = `${saveDirectory}${node_path_1.sep}${filename}_copy${ext}`;
        command.save(savePath);
        const result = await promise;
        savePaths.push(savePath);
        sendInfo(`${result ? "guardado" : "archivo fallido"} en: ${savePath}`);
    }
    if (savePaths.length > 0)
        sendInfo("archivos creados en:");
    for (let path of savePaths) {
        sendInfo(`  ${path}`);
    }
    ended();
    processCancelled = false;
};
const createWindow = () => {
    const win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    });
    win.loadFile(__dirname + '/index.html');
    return win;
};
electron_1.app.whenReady().then(() => {
    const win = createWindow();
    electron_1.ipcMain.handle("selectDir", selectDirectory);
    saveDirectory = (0, node_path_1.dirname)(electron_1.app.getAppPath());
    electron_1.ipcMain.handle("appData", () => ({ filename: electron_1.app.getAppPath(), dirname: saveDirectory }));
    electron_1.ipcMain.on("process-videos", (ev, info) => proccessVideos(info, (info) => win.webContents.send("process-info", info + "\n"), () => win.webContents.send("process-end")));
    electron_1.ipcMain.on("cancel-process", cancelProcess);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
