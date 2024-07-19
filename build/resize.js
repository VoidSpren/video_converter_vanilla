"use strict";
const loggerResizer = document.getElementById("loggerResizer");
const logger = document.getElementById("logger");
const textDisplay = document.getElementById("textDisplay");
let initialHeight = parseInt(window.getComputedStyle(logger).height);
let startMouseHeight = 0;
const doResize = (ev) => {
    const newHeight = (initialHeight - (ev.clientY - startMouseHeight));
    logger.style.height = newHeight > 10 ? (newHeight.toString() + "px") : "10px";
};
const stopResize = (ev) => {
    document.body.style.userSelect = "";
    window.removeEventListener("mouseup", stopResize);
    window.removeEventListener("mousemove", doResize);
};
loggerResizer.addEventListener("mousedown", (ev) => {
    initialHeight = parseInt(window.getComputedStyle(logger).height);
    startMouseHeight = ev.clientY;
    document.body.style.userSelect = "none";
    window.addEventListener("mouseup", stopResize);
    window.addEventListener("mousemove", doResize);
});
window.electron.onProcessInfo(info => {
    textDisplay.textContent += info;
});
