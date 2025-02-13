import { Page } from 'puppeteer';

abstract class InfinitePage {
  abstract page: Page;

  abstract closeWarnings(): void;
  abstract roundManager(): void;
  abstract cardMonitor(): void;
  abstract keepAlive(): void;

}

export default InfinitePage;
