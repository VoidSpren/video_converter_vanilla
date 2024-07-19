import { ConvertionConfig } from "./types";

const fileTarget = document.getElementById("fileTarget") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const dirInput = document.getElementById("dirInput") as HTMLButtonElement;
const dirOut = document.getElementById("dirOut") as HTMLParagraphElement;


let fileStore: {path:string, name:string}[] = [];


window.electron.app().then((app) => {
  const {filename, dirname} = app;
  dirOut.textContent = dirname;
  console.log(app);
});

const addFileNameToTarget = (name: string, path: string) => {
  const div = document.createElement("div");
  const p = document.createElement("p");
  const button = document.createElement("button");

  div.title = path;
  div.classList.add("fileListElement");

  p.textContent = name;

  button.textContent = "X"
  button.addEventListener("click", ev => {
    ev.preventDefault();
    deleteFile(path);
  })

  div.append(p, button);

  fileTarget.append(div);
}

const addFilesOnce = (file: {path:string, name:string}) => {
  if(fileStore.every(stored => file.path !== stored.path)){
    addFiles(file);
  }
}

const addFiles = (file: {path:string, name:string}) => {
  fileStore.push(file);
  addFileNameToTarget(file.name, file.path);
}

const deleteFile = (path: string) => {
  const index = fileStore.findIndex(file => file.path === path);
  if(index > -1){
    fileStore.splice(index,1);
    setFiles(fileStore);
  }
}

const setFiles = (files: {path:string, name:string}[]) => {
  const aux = files !== fileStore;
  if(aux) fileStore = files.map(file => ({path:file.path, name:file.name}));
  fileTarget.textContent = "";
  for(let file of fileStore){
    addFileNameToTarget(file.name, file.path);
  }
}

function prevent(ev:Event){ev.preventDefault();}
fileTarget.addEventListener("dragover", prevent);
fileTarget.addEventListener("dragenter", prevent);
fileTarget.addEventListener("drop", (ev) => {
  ev.preventDefault();
  if(ev.dataTransfer){
    for(let file of ev.dataTransfer.files){
      console.log(file);
      if(file.type.includes("video/")){
        addFilesOnce(file);
      }
    }
  }
})


fileInput.addEventListener("change", (ev) => {
  ev.preventDefault();
  console.log(fileInput);
  if(fileInput.files && fileInput.files.length > 0){
    for(let file of fileInput.files){
      addFilesOnce(file);
    }
  }
})

dirInput.addEventListener("click", async ev => {
  ev.preventDefault();

  const path: string = await window.electron.selectDir();

  dirOut.textContent = "directorio: "+path;
})


const bitrateInput = document.getElementById("bitrateInput") as HTMLInputElement;
const cbrInput = document.getElementById("cbrInput") as HTMLInputElement;
const resSelect = document.getElementById("resSelect") as HTMLSelectElement;
const fpsSelect = document.getElementById("fpsSelect") as HTMLSelectElement;
const convert = document.getElementById("convert") as HTMLButtonElement;
const cancel = document.getElementById("cancel") as HTMLButtonElement;

const logger = document.getElementById("logger") as HTMLDivElement;


let configuration: ConvertionConfig = {
  height: 720,
  bitrate: 4000,
  fps: 30,
  cbr: false,
  minorSideRes: true
}

convert.addEventListener("click", ev => {
  ev.preventDefault();

  let bitrate: number = parseInt(bitrateInput.value);
  if(isNaN(bitrate)){
    bitrate = 4000;
    bitrateInput.value = "4000";
  }

  configuration = {
    height: parseInt(resSelect.options.item(resSelect.selectedIndex)?.value as string),
    bitrate: bitrate,
    fps: parseInt(fpsSelect.options.item(fpsSelect.selectedIndex)?.value as string),
    cbr: Boolean(cbrInput.value),
    minorSideRes: true
  }

  window.electron.processVideos({paths:fileStore.map(file => file.path), config: configuration});

  let actualHeight = parseInt(window.getComputedStyle(logger).height);
  if(actualHeight < 70)
    logger.style.height = "70px";
  cancel.style.display = "block";
})

cancel.addEventListener("click", ev => {
  ev.preventDefault();

  window.electron.cancelProcess();
});

const progress = document.getElementById("progress") as HTMLParagraphElement;

window.electron.onProcessInfo((info: string) => {
  progress.textContent = info;
})

window.electron.onProcessEnd(() => {
  cancel.style.display = "none";
  progress.textContent = "";
})
