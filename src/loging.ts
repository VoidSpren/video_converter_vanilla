const loggerResizer = document.getElementById("loggerResizer") as HTMLDivElement;
const logger = document.getElementById("logger") as HTMLDivElement;
const lastLine = document.getElementById("lastLine") as HTMLDivElement;
const textDisplay = document.getElementById("textDisplay") as HTMLPreElement;
const clear = document.getElementById("clear") as HTMLButtonElement;

let initialHeight = parseInt(window.getComputedStyle(logger).height);
let startMouseHeight = 0;

const doResize = (ev: MouseEvent) => {
  const newHeight = (initialHeight - (ev.clientY - startMouseHeight));
  logger.style.height = newHeight > 10? (newHeight.toString() + "px"): "10px"
}
const stopResize = (ev: MouseEvent) => {
  document.body.style.userSelect = "";
  window.removeEventListener("mouseup", stopResize);
  window.removeEventListener("mousemove", doResize);
}

loggerResizer.addEventListener("mousedown", (ev) => {
  initialHeight = parseInt(window.getComputedStyle(logger).height);
  startMouseHeight = ev.clientY;

  document.body.style.userSelect = "none";

  window.addEventListener("mouseup", stopResize)
  window.addEventListener("mousemove", doResize)
})

clear.addEventListener("click", ev => {
  ev.preventDefault();

  textDisplay.textContent = "";
})

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
})
