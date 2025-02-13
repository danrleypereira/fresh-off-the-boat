import puppeteer, { Page } from 'puppeteer';
import InfinitePage from './infinitePage';
import BotController, { GameData } from '../lib/botController';
import { BotService } from '../lib/botService';

class BetfairInfinitePage extends InfinitePage {
  public page: Page;

  public isPlayerActive = false;

  public gameOver = false;

  public monitoringInterval: NodeJS.Timeout | null = null;

  public fakeBetInterval: NodeJS.Timeout | null = null;

  public isResetInProgress: boolean = false;

  public roundCounter = 0;

  public cardCounter: number = 0;

  public stopCounter = false;

  public previousDealerCards: { cardRole: string; isAppearing: boolean }[] = [];

  public previousPlayerCards: (string | null)[] = [];

  public revealedCards: string[] = [];

  public playerWins = 0;

  public dealerWins = 0;

  public ties = 0;

  public totalRounds = 0;

  public last20Results: string[] = [];

  public last20WinRate: string = '0.00%';

  public gameData: Partial<GameData> = {
    roundNumber: 0,
    playerHand: { cards: [], value: 0 },
    dealerHand: { cards: [], value: 0 },
    revealedCards: [],
    playerWins: 0,
    dealerWins: 0,
    ties: 0,
    roundResult: '',
  };

  public selectors = {
    closeWarningButton:
      'body > div.alert-container.show > div.alert-header.info > div.btn-alert-close.show',
    closeInfoButton:
      '#root > div > div > div.content--6d02a > div.window--70896 > div > div > h3 > a',
    betButton: 'div.betSpot--216d1:nth-child(3)',
    undoBetButton: 'button[data-role="undo-button"]',
    videoElement: 'video',
    hitButton: '.hit--53956 > div:nth-child(1)',
    standButton: '.stand--8b053 > div:nth-child(1)',
    gameFrame1: 'body > div:nth-child(2) > div > div:nth-child(1) > iframe',
    gameFrame2: '#game-client-iframe-id',
    gameFrame3: '.games-container > iframe:nth-child(1)',
    minBetEnabledClass: 'enabled--7ca22',
    minBetButtonSelector: 'div.betSpot--216d1:nth-child(3)',
    undoBetButtonSelector: 'button[data-role="undo-button"]',
    undoBetEnabledClass: 'buttonRoot--3bd4d',
    disabledClass: 'perspectiveIdle--f435b',
    betButton10:
      '/html/body/div[4]/div/div/div[2]/div[4]/div/div[4]/div/div[2]/div/div[3]',
    betButton25:
      '/html/body/div[4]/div/div/div[2]/div[4]/div/div[4]/div/div[2]/div/div[3]',
    betButton125:
      '/html/body/div[4]/div/div/div[2]/div[4]/div/div[4]/div/div[2]/div/div[3]',
    betButton500:
      '/html/body/div[4]/div/div/div[2]/div[4]/div/div[4]/div/div[2]/div/div[3]',
    betButton2500:
      '/html/body/div[4]/div/div/div[2]/div[4]/div/div[4]/div/div[2]/div/div[3]',
  };

  constructor(page: Page) {
    super();
    this.page = page;
  }

  async closeWarnings(): Promise<void> {
    await this.hardWait(2000);
    try {
      const firstFrame = await this.getValidatedFirstIframeContent(
        2000,
        this.selectors.closeWarningButton,
      );
      await firstFrame.waitForSelector(this.selectors.closeWarningButton);
      await firstFrame.click(this.selectors.closeWarningButton);

      const thirdFrame = await this.getValidatedThirdIframeContent(
        2000,
        this.selectors.closeInfoButton,
      );
      await thirdFrame.waitForSelector(this.selectors.closeInfoButton);
      await thirdFrame.click(this.selectors.closeInfoButton);
    } catch (error) {}
  }

  async roundManager(
    profile: string,
    gameMode: string,
    betValue: string,
  ): Promise<void> {
    console.log('Iniciando o contador de rodadas...');
    const disabledClass: string = 'perspectiveIdle--f435b';
    let intervalTime = 1500;

    if (this.monitoringInterval) {
      console.log('Parando contador de rodadas anterior...');
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.stopCounter = false;
    let isRoundInProgress = false;

    const checkButtonAndCountRound = async () => {
      try {
        const thirdFrame = await this.getValidatedThirdIframeContent(
          intervalTime,
          this.selectors.minBetButtonSelector,
        );
        if (!thirdFrame) return;

        const isButtonEnabled = await thirdFrame.evaluate(
          (selector, disabledClass) => {
            const betButton = document.querySelector(selector);
            return betButton && !betButton.classList.contains(disabledClass);
          },
          this.selectors.minBetButtonSelector,
          disabledClass,
        );

        if (isButtonEnabled && !isRoundInProgress) {
          this.roundCounter++;
          this.gameOver = true;
          await this.evaluateRoundOutcome(profile);
          console.log(`Rodada nº ${this.roundCounter} sendo iniciada`);
          isRoundInProgress = true;
          const botController = new BotController(this.page);
          await botController.play(gameMode, betValue);
        } else if (!isButtonEnabled && isRoundInProgress) {
          isRoundInProgress = false;
          this.gameOver = false;
          console.log(
            'Período de apostas encerrado, aguardando próxima rodada.',
          );
        }
      } catch (error) {
        console.error('Erro ao verificar o estado do botão de rodada:', error);
      }

      if (!this.stopCounter) {
        this.monitoringInterval = setTimeout(
          checkButtonAndCountRound,
          intervalTime,
        );
      }
    };

    await checkButtonAndCountRound();
  }

  cardMonitor(intervalTime = 2000): void {
    if (this.monitoringInterval) {
      console.log('Monitoramento já está ativo.');
      return;
    }

    console.log('Iniciando monitoramento contínuo das cartas...');
    this.monitoringInterval = setInterval(async () => {
      await this.captureDealerAndPlayerCards();
    }, intervalTime);
  }

  keepAlive(): void {
    const intervalTime = 5 * 60 * 1000;

    this.fakeBetInterval = setInterval(async () => {
      if (this.isResetInProgress) {
        console.log('Reset em progresso. Ciclo de apostas falsas pausado.');
        return;
      }

      console.log(
        'Verificando se o período de apostas está inativo para realizar aposta falsa...',
      );
      try {
        const isBettingInactive = await this.isBettingPeriodInactive();

        if (isBettingInactive) {
          console.log(
            'Período de apostas inativo. Executando aposta falsa para manter a conexão ativa...',
          );
          await this.clickMinBetButton();
          await this.clickUndoBetButton();
          console.log('Aposta falsa realizada com sucesso.');
        } else {
          console.log('Período de apostas ativo. Aposta falsa não realizada.');
        }
      } catch (error) {
        console.error(
          'Erro ao realizar a verificação ou a aposta falsa:',
          error,
        );
      }
    }, intervalTime);
  }

  public async getValidatedFirstIframeContent(
    intervalTime: number,
    waitForSelector: string,
  ): Promise<puppeteer.Frame | null> {
    const firstFrame = await this.getIframeContent('.iframe', intervalTime);
    if (!firstFrame) return null;

    await firstFrame.waitForSelector(waitForSelector, { timeout: 40000 });
    return firstFrame;
  }

  public async getValidatedThirdIframeContent(
    intervalTime: number,
    waitForSelector: string,
  ): Promise<puppeteer.Frame | null> {
    try {
      const firstFrame = await this.getIframeContent('.iframe', intervalTime);
      if (!firstFrame) throw new Error('Primeiro iframe não encontrado.');

      const secondFrame = await this.getIframeContent(
        '#game-client-iframe-id',
        intervalTime,
        firstFrame,
      );
      if (!secondFrame) throw new Error('Segundo iframe não encontrado.');

      const thirdFrame = await this.getIframeContent(
        '.games-container > iframe:nth-child(1)',
        intervalTime,
        secondFrame,
      );
      if (!thirdFrame) throw new Error('Terceiro iframe não encontrado.');

      await thirdFrame.waitForSelector(waitForSelector, { timeout: 120000 });
      return thirdFrame;
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
      await new Promise((resolve) => setTimeout(resolve, timeout));

      const iframeElement = await frame.$(selector);
      if (!iframeElement) {
        console.warn(`Iframe não encontrado para o seletor: ${selector}`);
        return null;
      }

      const iframeContent = await iframeElement.contentFrame();
      if (!iframeContent || iframeContent.isDetached()) {
        console.warn(
          `Frame desconectado ou inacessível para o seletor: ${selector}`,
        );
        return null;
      }

      return iframeContent;
    } catch (error) {
      return null;
    }
  }

  async captureDealerAndPlayerCards(): Promise<void> {
    const dealerCardsSelector = '[data-role="dealer-virtual-cards"]';
    const playerCardSelectors = [
      'div.desktop--953ab:nth-child(11) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)',
      'div.desktop--953ab:nth-child(11) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)',
      'div.desktop--953ab:nth-child(11) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)',
      'div.desktop--953ab:nth-child(11) > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)',
      'div.desktop--953ab:nth-child(11) > div:nth-child(5) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)',
      'div.desktop--953ab:nth-child(11) > div:nth-child(6) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)',
    ];

    try {
      const thirdFrame = await this.getValidatedThirdIframeContent(
        3000,
        dealerCardsSelector,
      );
      if (!thirdFrame) return;

      const dealerCards = await thirdFrame.evaluate(() => {
        const cards: { cardRole: string; isAppearing: boolean }[] = [];
        const dealerCardElements = document.querySelectorAll(
          '[data-role^="card-"]',
        );

        dealerCardElements.forEach((element) => {
          const cardCodeElement = element
            .querySelector('[data-role^="card-"]')
            ?.getAttribute('data-role');
          const isAppearing = element.classList.contains('isAppearing--1c157');

          if (cardCodeElement) {
            cards.push({
              cardRole: cardCodeElement,
              isAppearing,
            });
          }
        });
        return cards;
      });

      const playerCards = await Promise.all(
        playerCardSelectors.map(async (selector) => {
          const cardElement = await thirdFrame.$(selector);
          return cardElement
            ? await cardElement.evaluate((el) => el.getAttribute('data-role'))
            : null;
        }),
      );

      const hasDealerCardsChanged =
        JSON.stringify(dealerCards) !==
        JSON.stringify(this.previousDealerCards);
      const hasPlayerCardsChanged =
        JSON.stringify(playerCards) !==
        JSON.stringify(this.previousPlayerCards);

      if (hasDealerCardsChanged || hasPlayerCardsChanged) {
        this.previousDealerCards = dealerCards;
        this.previousPlayerCards = playerCards;

        dealerCards.forEach((card) => {
          console.log(`Carta do dealer revelada: ${card.cardRole}`);
        });

        console.log(
          'Cartas do dealer capturadas:',
          dealerCards.filter((card) => card.cardRole !== null),
        );
        console.log(
          'Cartas do jogador capturadas:',
          playerCards.filter((card) => card !== null),
        );
      }
    } catch (error) {
      console.error(
        'Erro ao capturar as cartas do dealer ou do jogador:',
        error,
      );
    }
  }

  async clickMinBetButton(): Promise<void> {
    const maxAttempts = 100;
    const delay = 2000;

    try {
      const thirdFrame = await this.getValidatedThirdIframeContent(
        2000,
        this.selectors.minBetButtonSelector,
      );
      if (!thirdFrame) return;

      let attempt = 0;
      let isButtonEnabled = false;

      while (!isButtonEnabled && attempt < maxAttempts) {
        attempt++;

        isButtonEnabled = await thirdFrame.evaluate(
          (selector, enabledClass) => {
            const betButton = document.querySelector(selector);
            if (betButton) {
              return betButton.querySelector(`.${enabledClass}`) !== null;
            }
            return false;
          },
          this.selectors.minBetButtonSelector,
          this.selectors.minBetEnabledClass,
        );

        if (isButtonEnabled) {
          await thirdFrame.click(this.selectors.minBetButtonSelector);
          console.log('Aposta mínima realizada');
          return;
        }
        console.log(
          `Tentativa ${attempt}: Botão ainda desabilitado. Tentando novamente...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (!isButtonEnabled) {
        console.log(
          'Botão de aposta mínima permaneceu desabilitado após várias tentativas.',
        );
      }
    } catch (error) {
      console.error(`Erro ao clicar no botão de aposta mínima: ${error}`);
    }
  }

  async clickUndoBetButton(): Promise<void> {
    const maxAttempts = 100;
    const delay = 1000;

    try {
      const thirdFrame = await this.getValidatedThirdIframeContent(
        500,
        this.selectors.undoBetButtonSelector,
      );
      if (!thirdFrame) return;

      let attempt = 0;
      let isButtonEnabled = false;

      while (!isButtonEnabled && attempt < maxAttempts) {
        attempt++;

        isButtonEnabled = await thirdFrame.evaluate(
          (undoBetButtonSelector, undoBetEnabledClass) => {
            const undoButton = document.querySelector(undoBetButtonSelector);
            if (undoButton) {
              return undoButton.classList.contains(undoBetEnabledClass);
            }
            return false;
          },
          this.selectors.undoBetButtonSelector,
          this.selectors.undoBetEnabledClass,
        );

        if (isButtonEnabled) {
          await thirdFrame.click(this.selectors.undoBetButtonSelector);
          console.log('Aposta desfeita');
          return;
        }
        console.log(
          `Tentativa ${attempt}: Botão de desfazer ainda desabilitado. Tentando novamente...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (!isButtonEnabled) {
        console.log(
          'Botão de desfazer permaneceu desabilitado após várias tentativas.',
        );
      }
    } catch (error) {
      console.error(`Erro ao clicar no botão de desfazer aposta: ${error}`);
    }
  }

  async isBettingPeriodInactive(): Promise<boolean> {
    try {
      const thirdFrame = await this.getValidatedThirdIframeContent(
        5000,
        this.selectors.minBetButtonSelector,
      );
      if (!thirdFrame) return false;

      const isInactive = await thirdFrame.evaluate(
        (minBetButtonSelector, disabledClass) => {
          const betButton = document.querySelector(minBetButtonSelector);
          return betButton && betButton.classList.contains(disabledClass);
        },
        this.selectors.minBetButtonSelector,
        this.selectors.disabledClass,
      );

      return isInactive;
    } catch (error) {
      console.error(
        'Erro ao verificar o estado do botão de aposta mínima:',
        error,
      );
      return false;
    }
  }

  async evaluateRoundOutcome(profile: string): Promise<void> {
    const playerCards = this.previousPlayerCards.filter(
      (card) => card !== null,
    ) as string[];
    const dealerCards = this.previousDealerCards
      .map((card) => card.cardRole)
      .filter((role) => role !== null) as string[];

    const playerHandValue = await this.calculateHandValue(playerCards);
    const dealerHandValue = await this.calculateHandValue(dealerCards);
    const result = await this.determineRoundWinner(playerCards, dealerCards);

    const outcome = result.includes('Player wins')
      ? 'Win'
      : result.includes('Empate')
        ? 'Tie'
        : 'Loss';

    this.last20Results.push(outcome);
    if (this.last20Results.length > 20) {
      this.last20Results.shift();
    }

    const winsLast20 = this.last20Results.filter((r) => r === 'Win').length;
    this.last20WinRate = (
      (winsLast20 / this.last20Results.length) *
      100
    ).toFixed(2);

    const botController = new BotController(this.page);
    await botController.updateGameData({
      roundNumber: this.roundCounter,
      gameId: this.gameData.gameId ?? `game_${Date.now()}`,
      profile: profile,
      playerHand: { cards: playerCards, value: playerHandValue },
      dealerHand: { cards: dealerCards, value: dealerHandValue },
      revealedCards: [...this.revealedCards],
      playerWins: this.playerWins,
      dealerWins: this.dealerWins,
      ties: this.ties,
      playerWinRate:
        ((this.playerWins / this.totalRounds) * 100).toFixed(2) + '%',
      dealerWinRate:
        ((this.dealerWins / this.totalRounds) * 100).toFixed(2) + '%',
      tieRate: ((this.ties / this.totalRounds) * 100).toFixed(2) + '%',
      roundResult: result,
      last20Results: [...this.last20Results],
      last20WinRate: this.last20WinRate + '%',
    });
  }

  getCardValue(card: string): number {
    const valueMap: { [key: string]: number } = {
      'card-S2': 2,
      'card-S3': 3,
      'card-S4': 4,
      'card-S5': 5,
      'card-S6': 6,
      'card-S7': 7,
      'card-S8': 8,
      'card-S9': 9,
      'card-S10': 10,
      'card-SK': 10,
      'card-SQ': 10,
      'card-SJ': 10,
      'card-SA': 11,
      'card-H2': 2,
      'card-H3': 3,
      'card-H4': 4,
      'card-H5': 5,
      'card-H6': 6,
      'card-H7': 7,
      'card-H8': 8,
      'card-H9': 9,
      'card-H10': 10,
      'card-HK': 10,
      'card-HQ': 10,
      'card-HJ': 10,
      'card-HA': 11,
      'card-C2': 2,
      'card-C3': 3,
      'card-C4': 4,
      'card-C5': 5,
      'card-C6': 6,
      'card-C7': 7,
      'card-C8': 8,
      'card-C9': 9,
      'card-C10': 10,
      'card-CK': 10,
      'card-CQ': 10,
      'card-CJ': 10,
      'card-CA': 11,
      'card-D2': 2,
      'card-D3': 3,
      'card-D4': 4,
      'card-D5': 5,
      'card-D6': 6,
      'card-D7': 7,
      'card-D8': 8,
      'card-D9': 9,
      'card-D10': 10,
      'card-DK': 10,
      'card-DQ': 10,
      'card-DJ': 10,
      'card-DA': 11,
    };

    return valueMap[card] || 0;
  }

  async calculateHandValue(cards: string[]): Promise<number> {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      const cardValue = await this.getCardValue(card);
      total += cardValue;
      if (cardValue === 11) aces++;
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  async determineRoundWinner(
    playerCards: string[],
    dealerCards: string[],
  ): Promise<string> {
    const result = await this.originalDetermineRoundWinner(
      playerCards,
      dealerCards,
    );

    this.gameData = {
      roundNumber: this.roundCounter,
      playerHand: {
        cards: playerCards,
        value: await this.calculateHandValue(playerCards),
      },
      dealerHand: {
        cards: dealerCards,
        value: await this.calculateHandValue(dealerCards),
      },
      revealedCards: this.revealedCards,
      playerWins: this.playerWins,
      dealerWins: this.dealerWins,
      ties: this.ties,
      roundResult: result,
    };

    return result;
  }

  async originalDetermineRoundWinner(
    playerCards: string[],
    dealerCards: string[],
  ): Promise<string> {
    const valueMap: { [key: string]: number } = {
      'card-S2': 2,
      'card-S3': 3,
      'card-S4': 4,
      'card-S5': 5,
      'card-S6': 6,
      'card-S7': 7,
      'card-S8': 8,
      'card-S9': 9,
      'card-S10': 10,
      'card-SK': 10,
      'card-SQ': 10,
      'card-SJ': 10,
      'card-SA': 11,
      'card-H2': 2,
      'card-H3': 3,
      'card-H4': 4,
      'card-H5': 5,
      'card-H6': 6,
      'card-H7': 7,
      'card-H8': 8,
      'card-H9': 9,
      'card-H10': 10,
      'card-HK': 10,
      'card-HQ': 10,
      'card-HJ': 10,
      'card-HA': 11,
      'card-C2': 2,
      'card-C3': 3,
      'card-C4': 4,
      'card-C5': 5,
      'card-C6': 6,
      'card-C7': 7,
      'card-C8': 8,
      'card-C9': 9,
      'card-C10': 10,
      'card-CK': 10,
      'card-CQ': 10,
      'card-CJ': 10,
      'card-CA': 11,
      'card-D2': 2,
      'card-D3': 3,
      'card-D4': 4,
      'card-D5': 5,
      'card-D6': 6,
      'card-D7': 7,
      'card-D8': 8,
      'card-D9': 9,
      'card-D10': 10,
      'card-DK': 10,
      'card-DQ': 10,
      'card-DJ': 10,
      'card-DA': 11,
    };

    function calculateHandValue(cards: string[]): number {
      let sum = 0;
      let aces = 0;

      cards.forEach((card) => {
        const value = valueMap[card];
        if (value === 11) aces += 1;
        sum += value;
      });

      while (sum > 21 && aces > 0) {
        sum -= 10;
        aces -= 1;
      }

      return sum;
    }

    const playerTotal = calculateHandValue(playerCards);
    const dealerTotal = calculateHandValue(dealerCards);

    console.log(
      `Mão do jogador: ${playerCards.join(', ')} | Soma: ${playerTotal}`,
    );
    console.log(
      `Mão do dealer: ${dealerCards.join(', ')} | Soma: ${dealerTotal}`,
    );

    const playerBlackjack = playerTotal === 21 && playerCards.length === 2;
    const dealerBlackjack = dealerTotal === 21 && dealerCards.length === 2;

    let result: string;
    if (playerBlackjack && dealerBlackjack) {
      result = 'Empate';
      this.ties++;
    } else if (playerBlackjack) {
      result = 'Player wins by Blackjack';
      this.playerWins++;
    } else if (dealerBlackjack) {
      result = 'Dealer wins by Blackjack';
      this.dealerWins++;
    } else if (playerTotal > 21) {
      result = 'Dealer wins by player bust';
      this.dealerWins++;
    } else if (dealerTotal > 21) {
      result = 'Player wins by dealer bust';
      this.playerWins++;
    } else if (playerTotal > dealerTotal) {
      result = 'Player wins';
      this.playerWins++;
    } else if (dealerTotal > playerTotal) {
      result = 'Dealer wins';
      this.dealerWins++;
    } else {
      result = 'Empate';
      this.ties++;
    }

    this.totalRounds++;

    const playerWinRate = ((this.playerWins / this.totalRounds) * 100).toFixed(
      2,
    );
    const dealerWinRate = ((this.dealerWins / this.totalRounds) * 100).toFixed(
      2,
    );
    const tieRate = ((this.ties / this.totalRounds) * 100).toFixed(2);

    console.log(`Resultado da rodada: ${result}`);
    console.log(`Vitórias do Player: ${playerWinRate}%`);
    console.log(`Vitórias do Dealer: ${dealerWinRate}%`);
    console.log(`Empates: ${tieRate}%`);
    console.log(`Total de rodadas: ${this.totalRounds}`);

    this.updateRevealedCards(playerCards, dealerCards);

    return result;
  }

  public async resetRoundLogic() {
    this.playerWins = 0;
    this.dealerWins = 0;
    this.ties = 0;
    this.totalRounds = 0;
    this.last20Results = [];
    this.last20WinRate = '0,00%';

    console.log('Lógica de rodada foi reiniciada.');
  }

  private updateRevealedCards(
    playerCards: string[],
    dealerCards: string[],
  ): void {
    this.revealedCards.push(...playerCards, ...dealerCards);
    console.log(`Total de cartas já reveladas: ${this.revealedCards.length}`);
    console.log(`Cartas reveladas: ${this.revealedCards.join(', ')}`);
  }

  async playerMove(gameData: GameData) {
    const botService = new BotService();

    if (!this.isPlayerActive) {
      console.log('⏭️ Skipping move: Player did not place a bet.');
      return;
    }

    const action = await botService.decideAction(gameData);

    if (action === 'HIT') {
      console.log('🃏 AI says HIT. Clicking hit button...');
      await this.page.click(this.selectors.hitButton);
    } else {
      console.log('✋ AI says STAND. Clicking stand button...');
      await this.page.click(this.selectors.standButton);
    }

    this.isPlayerActive = false;
  }

  async selectBet(betValue: string) {
    const botService = new BotService();

    if (this.gameOver) {
      const strategy = await botService.getStrategy();
      let betButton = '';

      if (strategy === 'PLAY') {
        console.log('✅ Strategy says PLAY. Placing bet...');

        if (betValue === '5') betButton = this.selectors.minBetButtonSelector;
        else if (betValue === '10') betButton = this.selectors.betButton10;
        else if (betValue === '25') betButton = this.selectors.betButton25;
        else if (betValue === '125') betButton = this.selectors.betButton125;
        else if (betValue === '500') betButton = this.selectors.betButton500;
        else if (betValue === '2500') betButton = this.selectors.betButton2500;

        if (betButton) {
          await this.page.waitForSelector(betButton);
          await this.page.click(betButton);
          console.log(`🎰 Bet placed: ${betValue}`);

          this.isPlayerActive = true;
        }
      } else {
        console.log('🚫 Strategy says SKIP. Waiting for next round...');
        this.isPlayerActive = false;
      }
    } else {
      console.log('🚫 Game is running...');
    }
  }

  hardWait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

export default BetfairInfinitePage;
