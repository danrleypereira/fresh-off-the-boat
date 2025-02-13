import path from 'path';
import { app, BrowserWindow, shell, ipcMain, screen } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
// @ts-ignore
import { Puppeteer } from '../lib/puppeteer.ts';
import GameSettings from '../lib/gameSettings';
import BotController from '../lib/botController';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let currentBrowser: any = null;
let currentPage: any = null;
let screenResolution: { width: number; height: number } | null = null;
const CHECK_INTERVAL = 15 * 60 * 1000;
const RECHECK_INTERVAL = 60 * 1000;


const getScreenResolution = (): { width: number; height: number } => {
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  return {
    width: display.bounds.width,
    height: display.bounds.height,
  };
};


async function startGame(casino: string, gameMode: string) {
  screenResolution = getScreenResolution();
  const puppeteer = new Puppeteer();

  try {
    currentBrowser = await puppeteer.createBrowser();
    currentPage = await puppeteer.getPage(currentBrowser, screenResolution);

    const gameSettings = new GameSettings(currentPage);
    await gameSettings.gameSetup(casino, gameMode);
    await gameSettings.gamePlay(gameMode);

    scheduleRestart(casino, gameMode);

  } catch (error) {
    console.error('Error during initial game setup:', error);
  }
}

function scheduleRestart(casino: string, gameMode: string) {
  setTimeout(async function attemptRestart() {
    const botController = new BotController(currentPage)

    if (botController.isPlayerActive) {
      console.log('Player is active, delaying restart...');
      setTimeout(attemptRestart, RECHECK_INTERVAL);
      return;
    }

    console.log('Restarting game...');

    try {
      const puppeteer = new Puppeteer();
      const newBrowser = await puppeteer.createBrowser();
      const newPage = await puppeteer.getPage(newBrowser, screenResolution);

      const newGameSettings = new GameSettings(newPage);
      await newGameSettings.gameSetup(casino, gameMode);
      await newGameSettings.gamePlay(gameMode);

      if (currentBrowser) {
        await currentBrowser.close();
      }

      currentBrowser = newBrowser;
      currentPage = newPage;

      setTimeout(attemptRestart, CHECK_INTERVAL);
    } catch (error) {
      console.error('Error during restart process:', error);

      setTimeout(attemptRestart, RECHECK_INTERVAL);
    }
  }, CHECK_INTERVAL);
}


ipcMain.on(
  'login-attempt',
  async (event, { login, password }: { login: string; password: string }) => {
    console.log(`Recebido login-attempt com: ${login} ${password}`);

    if ((login === 'admin' && password === 'admin') || true) {
      console.log('Login bem-sucedido.');
      const casino = 'betfair';
      const gameMode = 'infiniteBetfair';

      await startGame(casino, gameMode);

      event.reply('login-success');
    } else {
    }
  },
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name: string) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
