import { Page } from 'puppeteer';
import CasinoPage from './casinoPage';

class BetfairNavigationPage extends CasinoPage {
  public page: Page;
  public url: string = 'https://casino.betfair.bet.br/'

  constructor(page: Page) {
    super()
    this.page = page;
    this.page.goto(this.url, { waitUntil: 'networkidle2' });
  }

  private selectors = {
    acceptCookiesButton: '#onetrust-reject-all-handler',
    overlay: '.onetrust-pc-dark-filter',
    loginInput: '#ssc-liu',
    passwordInput: '#ssc-lipw',
    loginButton: '#ssc-lis',
    searchGameButton: '#root > div > nav > div.ribbon-component.double-navigation > div.wrapper.main-navigation > div.search-bar-container > div',
    searchGameInput: '#search-field',
    blackjackClassicButton: '.grid-2 > div:nth-child(1)',
    infiniteBlackjackButton: '#root > div > div.search-container.desktop > div > div.search-scroll-container > div > div.search-results-container > div.games-container > div > div > div > section',
    closeWarningButton: 'body > div.alert-container.show > div.alert-header.info > div.btn-alert-close.show',
    closeInfoButton: '#root > div > div > div.content--6d02a > div.window--70896 > div > div > h3 > a',
  };

  async beforeLogin(): Promise<void> {
    await this.hardWait(10000)
    await this.page.waitForSelector(this.selectors.acceptCookiesButton);
    await this.page.click(this.selectors.acceptCookiesButton);
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.waitForSelector(this.selectors.loginInput);
    await this.page.type(this.selectors.loginInput, username);

    await this.page.waitForSelector(this.selectors.passwordInput);
    await this.page.type(this.selectors.passwordInput, password);

    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.page.waitForSelector(this.selectors.loginButton);
    await this.page.click(this.selectors.loginButton);
  }

  async searchGame(): Promise<void> {
    await this.hardWait(5000)
    await this.page.waitForSelector(this.selectors.searchGameButton);
    await this.page.click(this.selectors.searchGameButton);

    await this.page.waitForSelector(this.selectors.searchGameInput);
    await this.page.type(this.selectors.searchGameInput, 'INFINITE');
  }

  async selectGame(): Promise<void> {
    await this.page.waitForSelector(this.selectors.infiniteBlackjackButton);
    await this.page.click(this.selectors.infiniteBlackjackButton);
  }

  hardWait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

export default BetfairNavigationPage;
