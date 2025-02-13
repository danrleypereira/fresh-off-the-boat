import { Page } from 'puppeteer';
import BotController from './botController';

export default class GameSettings {
  public page: Page;


  constructor(page: Page) {
    this.page = page;
  }

  async gameSetup(casino: string, gameMode: string) {
    const botController = new BotController(this.page);
    await botController.casinoNavigation(casino);
    await botController.startMonitor(gameMode);
  }

  async gamePlay(gameMode: string) {
    const botController = new BotController(this.page);


  }
}


