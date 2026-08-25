const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.warn('[AutoUpdater module load failed]:', e.message);
}

let mainWindow = null;

// Catch unexpected errors
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]:', error);
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function setupAutoUpdater() {
  if (!autoUpdater) return;

  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      sendToWindow('updater:status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      sendToWindow('updater:status', { 
        status: 'available', 
        version: info.version, 
        releaseNotes: info.releaseNotes 
      });
    });

    autoUpdater.on('update-not-available', () => {
      sendToWindow('updater:status', { status: 'up-to-date' });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      sendToWindow('updater:progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      sendToWindow('updater:status', { 
        status: 'downloaded', 
        version: info.version,
        releaseNotes: info.releaseNotes 
      });
    });

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater Notice]:', err?.message);
      sendToWindow('updater:status', { status: 'error', error: err?.message });
    });

    ipcMain.handle('updater:check', async () => {
      if (!app.isPackaged || !autoUpdater) return { status: 'dev_mode' };
      try {
        return await autoUpdater.checkForUpdates();
      } catch (err) {
        return { status: 'error', error: err.message };
      }
    });

    ipcMain.handle('updater:install', () => {
      if (autoUpdater) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  } catch (err) {
    console.warn('[AutoUpdater Setup Failed]:', err.message);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../icon.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'İnzar Turizm - Umre Tarife & Teklif Yönetim Sistemi',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5180');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();

    if (!isDev && autoUpdater) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.warn('[AutoUpdater Initial Check Failed]:', err?.message);
        });
      }, 3000);

      setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => {});
      }, 2 * 60 * 60 * 1000);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
