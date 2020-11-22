const { app, BrowserWindow, ipcMain } = require('electron')

const Alert = require("electron-alert");

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  })

  win.loadFile('src/index.html')
  win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('alert', async (event, args) => {
  const { message, type } = args

  let alert = new Alert()

  let swalOptions = {
    text: message,
    type,
    showCancelButton: false
  }
  
  const a = await alert.fireFrameless(swalOptions, null, true, false)
  event.sender.send('remove-alert')
})
