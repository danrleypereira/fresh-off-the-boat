import puppeteer, { Page } from 'puppeteer';
import InfinitePage from './infinitePage';

class SportingBetInfinitePage extends InfinitePage {
  public page: Page;


  private selectors = {
    closeWarningButton: '#root > div > div > div.content--6d02a > div.window--70896 > div > div > h3 > a',
  };


  constructor(page: Page) {
    super()
    this.page = page;
  }


  public async getValidatedFirstIframeContent(intervalTime: number, waitForSelector: string): Promise<puppeteer.Frame | null> {
      const firstFrame = await this.getIframeContent('#vendor-evoossliveinfinitebj', intervalTime);  //#vendor-evoossliveinfinitebj
      if (!firstFrame) return null;
      await firstFrame.waitForSelector(waitForSelector, {timeout: 40000});
      return firstFrame;
  }

  public async getValidatedSecondIframeContent(intervalTime: number, waitForSelector: string): Promise<puppeteer.Frame | null> {
    try {
      await this.hardWait(5000)
      const firstFrame = await this.getIframeContent('#vendor-evoossliveinfinitebj', intervalTime);
      if (!firstFrame) throw new Error('Primeiro iframe não encontrado.');

      await this.hardWait(5000)
      const secondFrame = await this.getIframeContent('body > div.loader-frame-container > div.games-container > iframe', intervalTime);  //body > div.loader-frame-container > div.games-container > iframe
      if (!secondFrame) return null;

      await this.hardWait(5000)
      await secondFrame.waitForSelector(waitForSelector, {timeout: 40000});
      return secondFrame;
    } catch (error) {
      return null;
    }
  }

  public async getIframeContent(
    selector: string,
    timeout: number,
    parentFrame?: Page | puppeteer.Frame,
  ): Promise<puppeteer.Frame | null> {
    try {
      const frame = parentFrame ?? this.page;
      // await new Promise((resolve) => setTimeout(resolve, timeout));

      const iframeElement = await frame.$(selector);
      if (!iframeElement) {
        console.warn(`Iframe não encontrado para o seletor: ${selector}`);
        return null;
      }

      const iframeContent = await iframeElement.contentFrame();
      if (!iframeContent || iframeContent.isDetached()) {
        console.warn(`Frame desconectado ou inacessível para o seletor: ${selector}`);
        return null;
      }

      return iframeContent;
    } catch (error) {
      return null;
    }
  }

  async closeWarnings(): Promise<void> {
    await this.hardWait(10000)
    const secondFrame = await this.getValidatedSecondIframeContent(2000, this.selectors.closeWarningButton);
    await secondFrame.waitForSelector(this.selectors.closeWarningButton);
    await secondFrame.click(this.selectors.closeWarningButton);
  }

  async roundManager(): Promise<void> {

  }


  cardMonitor(): void {

  }


  keepAlive(): void {

  }

  hardWait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

}
export default SportingBetInfinitePage;
