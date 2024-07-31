"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fileTarget = document.getElementById("fileTarget");
const fileInput = document.getElementById("fileInput");
const dirInput = document.getElementById("dirInput");
const dirOut = document.getElementById("dirOut");
const convert = document.getElementById("convert");
let fileStore = [];
const addFileNameToTarget = (name, path) => {
    const div = document.createElement("div");
    const p = document.createElement("p");
    const button = document.createElement("button");
    div.title = path;
    div.classList.add("fileListElement");
    p.textContent = name;
    button.textContent = "X";
    button.addEventListener("click", ev => {
        ev.preventDefault();
        deleteFile(path);
    });
    div.append(p, button);
    fileTarget.append(div);
};
const addFilesOnce = (file) => {
    if (fileStore.every(stored => file.path !== stored.path)) {
        addFiles(file);
    }
};
const addFiles = (file) => {
    fileStore.push(file);
    addFileNameToTarget(file.name, file.path);
    convert.textContent = "Convertir";
};
const deleteFile = (path) => {
    const index = fileStore.findIndex(file => file.path === path);
    if (index > -1) {
        fileStore.splice(index, 1);
        setFiles(fileStore);
    }
};
const setFiles = (files) => {
    const aux = files !== fileStore;
    if (aux)
        fileStore = files.map(file => ({ path: file.path, name: file.name }));
    fileTarget.textContent = "";
    for (let file of fileStore) {
        addFileNameToTarget(file.name, file.path);
    }
    if (fileStore.length > 0)
        convert.textContent = "Convertir";
    else
        convert.textContent = "Guardar configuración";
};
function prevent(ev) { ev.preventDefault(); }
fileTarget.addEventListener("dragover", prevent);
fileTarget.addEventListener("dragenter", prevent);
fileTarget.addEventListener("drop", (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer) {
        for (let file of ev.dataTransfer.files) {
            console.log(file);
            if (file.type.includes("video/")) {
                addFilesOnce(file);
            }
        }
    }
});
fileInput.addEventListener("change", (ev) => {
    ev.preventDefault();
    console.log(fileInput);
    if (fileInput.files && fileInput.files.length > 0) {
        for (let file of fileInput.files) {
            addFilesOnce(file);
        }
    }
});
dirInput.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const path = await window.electron.selectDir();
    dirOut.textContent = path;
    dirOut.title = path;
});
const bitrateInput = document.getElementById("bitrateInput");
const cbrInput = document.getElementById("cbrInput");
const resSelect = document.getElementById("resSelect");
const fpsSelect = document.getElementById("fpsSelect");
const trailInput = document.getElementById("trailInput");
const cancel = document.getElementById("cancel");
//TODO: setup configuration through config file in html
window.electron.app().then(appConfig => {
    const { filename, dirname } = appConfig;
    dirOut.textContent = dirname;
    dirOut.title = dirname;
    let configuration = appConfig.configInfo;
    console.log(configuration);
    if (configuration.height)
        resSelect.value = configuration.height.toString();
    if (configuration.fps)
        fpsSelect.value = configuration.fps.toString();
    if (configuration.bitrate)
        bitrateInput.valueAsNumber = configuration.bitrate;
    if (configuration.cbr)
        cbrInput.checked = configuration.cbr;
    trailInput.value = configuration.trail ?? trailInput.value;
    convert.addEventListener("click", ev => {
        ev.preventDefault();
        configuration = {
            height: parseInt(resSelect.options.item(resSelect.selectedIndex)?.value),
            bitrate: bitrateInput.valueAsNumber,
            fps: parseInt(fpsSelect.options.item(fpsSelect.selectedIndex)?.value),
            cbr: Boolean(cbrInput.value),
            minorSideRes: true,
            trail: trailInput.value
        };
        const arr = (fileStore.length > 0) ? Array(fileStore.length).fill(configuration) : [configuration];
        window.electron.processVideos({ paths: fileStore.map(file => file.path), config: arr });
        cancel.style.display = "block";
    });
});
cancel.addEventListener("click", ev => {
    ev.preventDefault();
    window.electron.cancelProcess();
});
const progress = document.getElementById("progress");
window.electron.onProcessInfo((info) => {
    progress.textContent = info;
});
window.electron.onProcessEnd(() => {
    cancel.style.display = "none";
    progress.textContent = "";
});
