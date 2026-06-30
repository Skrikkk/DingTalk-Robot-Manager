const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    frame: false,
    title: "Robot Manager",
    backgroundColor: "#f5f7fb",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("window:minimize", () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.handle("window:maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.handle("window:close", () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle("dialog:chooseFiles", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title: "选择需要发送的附件",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Common files", extensions: ["pdf", "xlsx", "xls", "csv", "docx", "png", "jpg", "jpeg", "zip"] },
      { name: "All files", extensions: ["*"] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("dialog:chooseIcon", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title: "选择机器人图标",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"] },
      { name: "All files", extensions: ["*"] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});
