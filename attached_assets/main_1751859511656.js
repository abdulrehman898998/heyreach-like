const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { runAutomation } = require('./automation/index');
const { runFacebookAutomation } = require('./automation/facebookIndex');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('ui/index.html');
}

ipcMain.on('start-automation', (event, config) => {
  // Determine which platform to use based on config
  const platform = config.platform || 'instagram';
  
  if (platform === 'facebook') {
    runFacebookAutomation(config, (logMsg) => {
      event.sender.send('log-message', logMsg);
    });
  } else {
    // Default to Instagram
    runAutomation(config, (logMsg) => {
      event.sender.send('log-message', logMsg);
    });
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});