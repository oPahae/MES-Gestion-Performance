const path = require("path");
const { app, BrowserWindow } = require("electron");

function createWindow() {

    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.maximize();

    win.loadURL("https://mesperformance.vercel.app");

    win.webContents.on("did-fail-load", () => {
        win.loadFile(path.join(__dirname, "offline.html"));
    });

}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    app.quit();
});