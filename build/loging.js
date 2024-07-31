"use strict";
const loggerResizer = document.getElementById("loggerResizer");
const logger = document.getElementById("logger");
const lastLine = document.getElementById("lastLine");
const textDisplay = document.getElementById("textDisplay");
const clear = document.getElementById("clear");
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
clear.addEventListener("click", ev => {
    ev.preventDefault();
    textDisplay.textContent = "";
});
// let wasOnBottom = false;
// textDisplay.addEventListener("scroll", (ev) => {
//   console.log(textDisplay.scrollHeight, textDisplay.scrollTop, textDisplay.clientHeight);
//   wasOnBottom = textDisplay.scrollHeight - textDisplay.scrollTop === textDisplay.clientHeight;
// })
window.electron.onProcessInfo(info => {
    console.log(textDisplay.scrollHeight, textDisplay.scrollTop, textDisplay.clientHeight);
    // if(!(textDisplay.scrollHeight - textDisplay.scrollTop === textDisplay.clientHeight) && wasOnBottom){
    //     textDisplay.scrollTo({top: textDisplay.clientHeight});
    // }
    textDisplay.textContent += info;
    lastLine.textContent = info;
});
