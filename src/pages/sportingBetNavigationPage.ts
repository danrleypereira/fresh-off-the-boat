import CasinoPage from './casinoPage';
import { Page } from 'puppeteer';

class SportingBetNavigationPage extends CasinoPage {
  public page: Page;
  public url: string = 'https://casino.sportingbet.bet.br/pt-br/games'

  constructor(page: Page) {
    super()
    this.page = page;
    this.page.goto(this.url, { waitUntil: 'networkidle2' });
  }

  private selectors = {
    acceptCookiesButton: '#onetrust-accept-btn-handler',
    enterButton: 'body > vn-app > vn-dynamic-layout-slot.slot.slot-single.slot-header > vn-header > header > nav > vn-header-section.navbar-wrapper-right > vn-h-button:nth-child(3) > vn-menu-item > a',
    loginInput: '#userId',
    passwordInput: '#password > input',
    loginButton: '#login > form > fieldset > section > div.form-element > button',
    searchGameInput: '#search-input',
    searchGameButton: 'li.tab-nav-item',
    infiniteBlackjackButton: 'div.imagetitle:nth-child(1)',
  };


  async beforeLogin(): Promise<void> {
    await this.hardWait(10000)
    await this.page.waitForSelector(this.selectors.acceptCookiesButton);
    await this.page.click(this.selectors.acceptCookiesButton);
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.waitForSelector(this.selectors.enterButton);
    await this.page.click(this.selectors.enterButton);

    await this.page.waitForSelector(this.selectors.loginInput);
    await this.page.type(this.selectors.loginInput, username);

    await this.page.waitForSelector(this.selectors.passwordInput);
    await this.page.type(this.selectors.passwordInput, password);

    await this.page.waitForSelector(this.selectors.loginButton);
    await this.page.click(this.selectors.loginButton);
  }

  async searchGame(): Promise<void> {
    await this.hardWait(7500)
    await this.page.waitForSelector(this.selectors.searchGameButton);
    await this.hardWait(2500)
    await this.page.click(this.selectors.searchGameButton);

    await this.page.waitForSelector(this.selectors.searchGameInput);
    await this.page.type(this.selectors.searchGameInput, 'INFINITE');
  }

  async selectGame(): Promise<void> {
        await this.hardWait(5000)
        await this.page.waitForSelector(this.selectors.infiniteBlackjackButton);
        await this.page.click(this.selectors.infiniteBlackjackButton);
  }

  hardWait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

export default SportingBetNavigationPage;
