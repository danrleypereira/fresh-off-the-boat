import puppeteer, { Browser, Page } from 'puppeteer';

export class Puppeteer {
  private browserConfig = {
    headless: false,
    args: ['--start-maximized', '--allow-geolocation'],
    executablePath: '/usr/bin/google-chrome', // Options: chromium, firefox, microsoft-edge, google-chrome
  };

  async createBrowser(): Promise<Browser> {
    return await puppeteer.launch(this.browserConfig);
  }

  async getPage(
    browser: Browser,
    resolution: { width: number; height: number },
  ): Promise<Page> {
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({
      width: resolution.width || 1920,
      height: resolution.height ? resolution.height - 150 : 920,
      deviceScaleFactor: 1,
    });
    return page;
  }

  async configureGeolocation(browser: Browser, page: Page): Promise<void> {
    const context = browser.defaultBrowserContext();
    // await context.overridePermissions(
    //   'https://identitysso.betfair.bet.br/view/geolocation-required?redirectMethod=GET&product=gaming&url=https%3A%2F% 2Fcasino.betfair.bet.br%2F',
    //   ['geolocation']
    // );
    // await context.overridePermissions('https://casino.betfair.bet.br/', ['geolocation']);

    await context.overridePermissions(
      'https://casinogames.sportingbet.bet.br/games.html?gameVariantName=evoossliveinfinitebj&langId=pt_BR&channelId=WC&invokerProduct=CASINO&pageNumber=4&gamePosition=1&brandId=SBBRAZIL&lobbyType=LiveCasino&ip=201.7.43.25&mode=real&ssoKey=loZPab2z_pVww-Fx5vRnEaKcKowKs67Wfws1IOiqhkzYJ9sbFUCSnKSJsorwU_QaW6xmCUtcTxge4ZdhONGvMDYe-A4cr181oR-2EzovyBPLGSS7pQcuuct950NlemGCysrW-sIuN_tpdDXke079CQ2X58DVghLew3D1RKGmf8-Q7HJ97CKW0UXg5nZQRKfEdoVtNwpY0GnsqUV5IInMe6_YrkGPyrq3r7irjti-ikc&lobbyURL=https:%2F%2Fcasino.sportingbet.bet.br%2Fpt-br%2Flivecasino%3Fq%3D1&pLang=pt-br&frontend=sr&currency=BRL&launchType=IL&isDesktopContainer=true&coinGame=false&geoPollingUrl=https:%2F%2Fcasino.sportingbet.bet.br%2Fgeolocation%2Fappintegration.plugin.5.2.0.js%3F.box%3D1%26geoguard.channelId%3DWC%26geoguard.label%3Dsbbetbr%26geoguard.environment%3Dprod%26geoguard.lang%3Dpt%26geoguard.plcIdentifier%3Dgchtml5%26geoguard.gdsHost%3Dhttps:%2F%2Fgds.sportingbet.bet.br&isGeoGuardEnabled=true&clickTimeStamp=1738965161765&launchSource=casino_portal&=&catId=globalsearch&subcatId=&rowNumber=&colNumber=1&iconSize=',
      ['geolocation'],
    );
    await context.overridePermissions(
      'https://casino.sportingbet.bet.br/pt-br/livecasino?q=1',
      ['geolocation'],
    );

    await page.setGeolocation({
      latitude: -15.7942, // Brasília
      longitude: -47.8822,
      accuracy: 100,
    });

    console.log('Geolocalização configurada com sucesso.');
  }
}
