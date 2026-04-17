import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { createDesktopPlatform } from './platform/main/create-desktop-platform';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const rendererName =
  typeof MAIN_WINDOW_VITE_NAME !== 'undefined' ? MAIN_WINDOW_VITE_NAME : 'main_window';
const rendererDevServerUrl =
  typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'
    ? MAIN_WINDOW_VITE_DEV_SERVER_URL
    : undefined;

let mainWindow: BrowserWindow | null = null;
let platform: ReturnType<typeof createDesktopPlatform> | null = null;

async function loadRenderer(browserWindow: BrowserWindow) {
  if (rendererDevServerUrl) {
    await browserWindow.loadURL(rendererDevServerUrl);
  } else {
    await browserWindow.loadFile(path.join(__dirname, `../renderer/${rendererName}/index.html`));
  }
}

async function createWindow() {
  if (!platform) {
    throw new Error('Desktop platform must be created after app is ready.');
  }

  const persistedState = await platform.windowState.getState('main');

  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    height: persistedState.bounds.height,
    width: persistedState.bounds.width,
    x: persistedState.bounds.x,
    y: persistedState.bounds.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  platform.windowState.track('main', mainWindow);
  platform.commands.attachToWindow(mainWindow);

  mainWindow.on('close', (event) => {
    if (!mainWindow) {
      return;
    }

    event.preventDefault();

    void platform.documents.confirmBeforeClose(mainWindow).then((shouldClose) => {
      if (!shouldClose || !mainWindow) {
        return;
      }

      const targetWindow = mainWindow;
      mainWindow = null;
      targetWindow.destroy();
    });
  });

  if (persistedState.isMaximized) {
    mainWindow.maximize();
  }

  if (persistedState.isFullScreen) {
    mainWindow.setFullScreen(true);
  }

  await loadRenderer(mainWindow);
  platform.installMenu();

  if (await platform.shouldOpenDevToolsOnLaunch()) {
    mainWindow.webContents.openDevTools();
  }

  await platform.maybeReopenLastDocument(mainWindow);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  platform = createDesktopPlatform(() => mainWindow);
  void createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
