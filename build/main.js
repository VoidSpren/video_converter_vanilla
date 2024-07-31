"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = require("node:path");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const original_fs_1 = require("original-fs");
const DEFAULTCONVERTIONCONFIG = {
    height: 720,
    bitrate: 2000,
    fps: 30,
    cbr: false,
    minorSideRes: true,
    trail: "_copy"
};
const DEFAULTCONFIG = {
    ...DEFAULTCONVERTIONCONFIG,
    directory: process.cwd()
};
const CONFIGFILEPATH = "config.json";
let saveDirectory = process.cwd();
let currentCommand = null;
let processCancelled = false;
const configInfo = new Promise((res) => {
    (0, original_fs_1.readFile)(CONFIGFILEPATH, { encoding: "utf-8" }, (err, data) => {
        if (err) {
            (0, original_fs_1.writeFile)(CONFIGFILEPATH, JSON.stringify(DEFAULTCONFIG), { encoding: "utf-8" }, (err) => {
                if (err)
                    console.log(err);
                ;
                res(DEFAULTCONFIG);
            });
        }
        else {
            const rawData = JSON.parse(data);
            let configData = rawData;
            if (!configData.height || !isFinite(configData.height) || isNaN(configData.height)) {
                configData.height = DEFAULTCONFIG.height;
            }
            if (!configData.bitrate || !isFinite(configData.bitrate) || isNaN(configData.bitrate)) {
                configData.bitrate = DEFAULTCONFIG.bitrate;
            }
            if (!configData.fps || !isFinite(configData.fps) || isNaN(configData.fps)) {
                configData.fps = DEFAULTCONFIG.fps;
            }
            if (typeof (configData.cbr) !== "boolean") {
                configData.cbr = DEFAULTCONFIG.cbr;
            }
            configData.trail = configData.trail ?? DEFAULTCONFIG.trail;
            if (!configData.directory) {
                configData.directory = DEFAULTCONFIG.directory;
            }
            else {
                saveDirectory = configData.directory;
            }
            console.log(configData);
            res(configData);
        }
    });
});
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
        if (!config[i])
            return;
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
        console.log(config[i].height, config[i].width, config[i].minorSideRes, aspectRatio, config[i].minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio));
        if (config[i].height) {
            if (config[i].minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio)) {
                if (aspectRatio > 1) {
                    command.size(`?x${config[i].height}`);
                }
                else {
                    command.size(`${config[i].height}x?`);
                }
            }
            else if (!config[i].width) {
                command.size(`?x${config[i].height}`);
            }
            else {
                command.size(`${config[i].width}x${config[i].height}`);
            }
        }
        else if (config[i].width) {
            command.size(`${config[i].width}x?`);
        }
        if (config[i].bitrate) {
            command.videoBitrate(`${config[i].bitrate}k`, config[i].cbr);
        }
        if (config[i].fps !== undefined) {
            // typescrpit bug: config[i] & config[i].fps both have been cheched to exist, it still does not compile
            // bugfix ?? 30 so typexript doesn't complain (should never default to 30, as it's never undefined in this section)
            command.fps(config[i].fps ?? 30);
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
        width: 1000,
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
    electron_1.ipcMain.handle("appData", async () => {
        const finalConfigInfo = await configInfo;
        return {
            filename: electron_1.app.getAppPath(),
            dirname: finalConfigInfo.directory ?? saveDirectory,
            configInfo: finalConfigInfo
        };
    });
    electron_1.ipcMain.on("process-videos", (ev, info) => {
        const appInfo = {
            ...info.config[0],
            directory: saveDirectory
        };
        (0, original_fs_1.writeFile)(CONFIGFILEPATH, JSON.stringify(appInfo), { encoding: "utf-8" }, (err) => { if (err)
            console.log(err); });
        proccessVideos(info, (info) => win.webContents.send("process-info", info + "\n"), () => win.webContents.send("process-end"));
    });
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
