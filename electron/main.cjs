const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow = null;

// Ensure single application instance
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
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Güncellemeler kontrol ediliyor...');
    sendToWindow('updater:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Yeni sürüm bulundu:', info.version);
    sendToWindow('updater:status', { 
      status: 'available', 
      version: info.version, 
      releaseNotes: info.releaseNotes 
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Sürüm güncel.');
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
    console.log('[AutoUpdater] Güncelleme indirildi:', info.version);
    sendToWindow('updater:status', { 
      status: 'downloaded', 
      version: info.version,
      releaseNotes: info.releaseNotes 
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater Error]:', err?.message);
    sendToWindow('updater:status', { status: 'error', error: err?.message });
  });

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { status: 'dev_mode' };
    return await autoUpdater.checkForUpdates();
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'İnzar Turizm - Umre Tarife & Teklif Yönetim Sistemi',
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5180');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();

    // Check for updates after window displays (production only)
    if (!isDev) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.warn('[AutoUpdater Initial Check Failed]:', err?.message);
        });
      }, 3000);

      // Periodic check every 2 hours
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
