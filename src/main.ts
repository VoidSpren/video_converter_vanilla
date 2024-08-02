import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { dirname, basename, extname, sep} from "node:path";
import Ffmpeg, {FfmpegCommand} from "fluent-ffmpeg";
import { AppConfig, AppInfo, ConvertionConfig } from "./types";
import { readFile, writeFile } from "original-fs";

const DEFAULTCONVERTIONCONFIG: ConvertionConfig = {
  height: 720,
  bitrate: 2000,
  fps: 30,
  cbr: false,
  minorSideRes: true,
  trail: "_copy"
};

const DEFAULTCONFIG: AppConfig = {
  ...DEFAULTCONVERTIONCONFIG,
  directory: process.cwd()
};
const CONFIGFILEPATH = "config.json";

let saveDirectory = process.cwd();
let currentCommand: FfmpegCommand | null = null;
let processCancelled: boolean = false;


const configInfo = new Promise<AppConfig>((res) => {
  readFile(CONFIGFILEPATH, {encoding: "utf-8"}, (err, data) => {
    if(err){
      writeFile(CONFIGFILEPATH, JSON.stringify(DEFAULTCONFIG), {encoding: "utf-8"}, (err) => {
        if(err) console.log(err);;
        res(DEFAULTCONFIG);
      })
    }else{
      const rawData = JSON.parse(data);
      
      let configData = rawData as AppConfig;
      
      if(!configData.height || !isFinite(configData.height) || isNaN(configData.height)){
        configData.height = DEFAULTCONFIG.height;
      }
      if(!configData.bitrate || !isFinite(configData.bitrate) || isNaN(configData.bitrate)){
        configData.bitrate = DEFAULTCONFIG.bitrate;
      }
      if(!configData.fps || !isFinite(configData.fps) || isNaN(configData.fps)){
        configData.fps = DEFAULTCONFIG.fps;
      }
      if(typeof(configData.cbr) !== "boolean"){
        configData.cbr = DEFAULTCONFIG.cbr;
      }

      configData.trail = configData.trail ?? DEFAULTCONFIG.trail;

      if(!configData.directory){
        configData.directory = DEFAULTCONFIG.directory;
      }else{
        saveDirectory = configData.directory;
      }

      console.log(configData);

      res(configData);
    }
  })
});

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

const proccessVideos = async ({paths, config}: {paths: string[], config: ConvertionConfig[]}, sendInfo: (info:string) => void, ended: () => void) => {
  if(!paths) return;

  let savePaths: string[] = [];
  for(let i = 0; i < paths.length; i++){
    if(!config[i]) return;
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
    
    console.log(config[i].height, config[i].width, config[i].minorSideRes, aspectRatio, config[i].minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio));

    if(config[i].height){
      if(config[i].minorSideRes && aspectRatio && !isNaN(aspectRatio) && isFinite(aspectRatio)){
        if(aspectRatio > 1){
          command.size(`?x${config[i].height}`);
        }else{
          command.size(`${config[i].height}x?`);
        }
      }
      else if(!config[i].width){
        command.size(`?x${config[i].height}`);
      }else{
        command.size(`${config[i].width}x${config[i].height}`);
      }
    }else if(config[i].width){
      command.size(`${config[i].width}x?`);
    }

    if(config[i].bitrate){
      command.videoBitrate(`${config[i].bitrate}k`, config[i].cbr);
    }

    if(config[i].fps !== undefined){
      // typescrpit bug: config[i] & config[i].fps both have been cheched to exist, it still does not compile
      // bugfix ?? 30 so typexript doesn't complain (should never default to 30, as it's never undefined in this section)
      command.fps(config[i].fps ?? 30);
    }



    command.on("start", () => sendInfo(`start: ${i+1}/${paths.length} ${path} %0`));
    command.on("end", () => {
      sendInfo(`ended: ${i+1}/${paths.length} ${path} %100`);
      resolver(Promise.resolve(true));
    });
    command.on("error", () => {
      sendInfo(`error/canceled:  ${i+1}/${paths.length} ${path} %?`);
      resolver(Promise.resolve(false));
    });
    command.on("progress", (progress) => {
      sendInfo(`progress: ${i+1}/${paths.length} ${path} %${progress.percent}`);
    })

    const savePath = `${saveDirectory}${sep}${filename}_copy${ext}`;
    command.save(savePath);
    const result = await promise;

    savePaths.push(savePath);
    sendInfo(`${result?"guardado":"archivo fallido"} en: ${i+1}/${paths.length} ${savePath}`);
  }

  if(savePaths.length > 0) sendInfo("archivos creados en:");
  for(let path of savePaths){
    sendInfo(`    ${path}`);
  }
  ended();
  processCancelled = false;
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
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
  ipcMain.handle("appData", async (): Promise<AppInfo> => {
    const finalConfigInfo = await configInfo;
    return {
      filename: app.getAppPath(),
      dirname: finalConfigInfo.directory ?? saveDirectory,
      configInfo: finalConfigInfo
    }
  })

  ipcMain.on("process-videos", (ev, info: {paths: string[], config: ConvertionConfig[]}) => 
    {
      const appInfo: AppConfig = {
        ...info.config[0],
        directory: saveDirectory
      };

      writeFile(CONFIGFILEPATH, 
        JSON.stringify(appInfo),
        {encoding: "utf-8"},
        (err) => {if(err) console.log(err);}
      );
      proccessVideos(info,
        (info) => win.webContents.send("process-info", info+"\n"),
        () => win.webContents.send("process-end")
      );
    }
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
