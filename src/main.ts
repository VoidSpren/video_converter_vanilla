import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { dirname, basename, extname, sep} from "node:path";
import Ffmpeg, {FfmpegCommand} from "fluent-ffmpeg";
import { ConvertionConfig } from "./types";


let saveDirectory = process.cwd();
let currentCommand: FfmpegCommand | null = null;
let processCancelled: boolean = false;

async function selectDirectory() {
  const {canceled, filePaths} = await dialog.showOpenDialog({properties:["openDirectory"]});
  if(!canceled){
    saveDirectory = filePaths[0];
    return filePaths[0];
  }
  return saveDirectory;
}

const cancelProcess = () => {
  if(currentCommand){
    processCancelled = true;
    currentCommand.kill("SIGKILL");
  }
}

const proccessVideos = async ({paths, config}: {paths: string[], config: ConvertionConfig}, sendInfo: (info:string) => void, ended: () => void) => {
  if(!paths) return;

  let savePaths: string[] = [];
  for(let i = 0; i < paths.length; i++){
    const path = paths[i];

    if(processCancelled) break;
    const ext = extname(path);
    const filename = basename(path, ext);

    sendInfo(`processing: ${path}`);

    let resolver: (value: boolean | PromiseLike<boolean>) => void;
    const promise = new Promise<boolean>(res => resolver = res);
    
    let resolverAspectRatio: (value: number | PromiseLike<number>) => void;
    let promiseAspectRatio = new Promise<number>(res => resolverAspectRatio = res);


    Ffmpeg.ffprobe(path, (err, data) => {
      for(let stream of data.streams){
        if(stream.codec_type === "video"){
          if(stream.width && stream.height){
            resolverAspectRatio(stream.width/stream.height);
          }
          break;
        }
      }
    })

    let aspectRatio = await promiseAspectRatio;

    const command = Ffmpeg(path);
    currentCommand = command;
    
    console.log(config.height, config.width, config.minorSideRes, aspectRatio, config.minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio));

    if(config.height){
      if(config.minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio)){
        if(aspectRatio > 1){
          command.size(`?x${config.height}`);
        }else{
          command.size(`${config.height}x?`);
        }
      }
      else if(!config.width){
        command.size(`?x${config.height}`);
      }else{
        command.size(`${config.width}x${config.height}`);
      }
    }else if(config.width){
      command.size(`${config.width}x?`);
    }

    if(config.bitrate){
      command.videoBitrate(`${config.bitrate}k`, config.cbr);
    }

    if(config.fps){
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
      sendInfo(`progress: ${i+1}/${paths.length} ${path} %${progress.percent}`);
    })

    const savePath = `${saveDirectory}${sep}${filename}_copy${ext}`;
    command.save(savePath);
    const result = await promise;

    savePaths.push(savePath);
    sendInfo(`${result?"guardado":"archivo fallido"} en: ${savePath}`);
  }

  if(savePaths.length > 0) sendInfo("archivos creados en:");
  for(let path of savePaths){
    sendInfo(`  ${path}`);
  }
  ended();
  processCancelled = false;
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: __dirname + "/preload.js"
    }
  });

  

  win.loadFile(__dirname + '/index.html');
  return win;
}

app.whenReady().then(() => {
  const win = createWindow();

  ipcMain.handle("selectDir", selectDirectory);

  saveDirectory = dirname(app.getAppPath());
  ipcMain.handle("appData", () => ({filename: app.getAppPath(), dirname: saveDirectory}))

  ipcMain.on("process-videos", (ev, info: {paths: string[], config: ConvertionConfig}) => 
    proccessVideos(info,
      (info) => win.webContents.send("process-info", info+"\n"),
      () => win.webContents.send("process-end")
    )
  );

  ipcMain.on("cancel-process", cancelProcess);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
