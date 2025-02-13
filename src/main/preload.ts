// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

// Define the structure of the API exposed to the renderer
interface API {
  sendLogin: (login: string, password: string) => void;
  onLoginSuccess: (callback: () => void) => void;
  onLoginFailure: (callback: () => void) => void;
}

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

// Expose the API to the renderer process in a secure way
contextBridge.exposeInMainWorld('api', {
  sendLogin: (login: string, password: string) => {
    console.debug('Enviando login-attempt ao processo principal');
    ipcRenderer.send('login-attempt', { login, password });
  },

  onLoginSuccess: (callback: () => void) => {
    console.log('Escutando login-success');
    ipcRenderer.on('login-success', () => callback());
  },

  onLoginFailure: (callback: () => void) => {
    console.log('Escutando login-failure');
    ipcRenderer.on('login-failure', () => callback());
  },
} as API);

export type ElectronHandler = typeof electronHandler;
