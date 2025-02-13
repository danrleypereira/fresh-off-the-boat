import { Page } from 'puppeteer';
import { GameData } from '../lib/botController';

abstract class InfinitePage {
  abstract page: Page;

  abstract closeWarnings(): void;
  abstract roundManager(profile: string, gameMode: string, betValue: string): void;
  abstract cardMonitor(): void;
  abstract keepAlive(): void;

  abstract selectBet(betValue: string): void;
  abstract playerMove(gameData: GameData): void;

}

export default InfinitePage;
