import { Page } from 'puppeteer';

abstract class CasinoPage {
  abstract page: Page;
  abstract url: string;

  abstract beforeLogin(): void;
  abstract login(username: string, password: string): void;
  abstract searchGame(): void;
  abstract selectGame(): void;
}

export default CasinoPage;
