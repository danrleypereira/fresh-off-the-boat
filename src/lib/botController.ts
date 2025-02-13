import { Page } from 'puppeteer';
import BetfairCasinoPage from '../pages/betfairCasinoPage';
import SportingBetNavigationPage from '../pages/sportingBetNavigationPage';
import BetfairInfinitePage from '../pages/betfairInfinitePage';
import CasinoPage from '../pages/casinoPage';
import InfinitePage from '../pages/infinitePage';
import SportingBetInfinitePage from '../pages/sportingBetInfinitePage';
import { BotService } from './botService';

export interface GameData {
  roundNumber: number;
  gameId : string;
  profile: string;
  playerHand: {
    cards: string[];
    value: number;
  };
  dealerHand: {
    cards: string[];
    value: number;
  };
  revealedCards: string[];
  playerWins: number;
  dealerWins: number;
  ties: number;
  roundResult: string;
  playerWinRate: string;
  dealerWinRate: string;
  tieRate: string;
  last20Results: string[];
  last20WinRate: string;
}

export default class BotController {
  public page: Page;
  gameData: GameData;
  public isPlayerActive = false;

  private casinos = {
    betfair: {
      url: 'https://casino.betfair.bet.br/',
      email: 'woodyrocha@hotmail.com',
      password: '27~>y+*^e8ZUQ_}',
    },
    sportingBet: {
      url: 'https://casino.sportingbet.bet.br/pt-br/livecasino',
      email: 'woodyrocha@hotmail.com',
      password: '@Woody399042',
    },
  };

  constructor(page: Page) {
    this.page = page;
    this.gameData = {
      roundNumber: 0,
      profile: "",
      playerHand: { cards: [], value: 0 },
      dealerHand: { cards: [], value: 0 },
      revealedCards: [],
      playerWins: 0,
      dealerWins: 0,
      ties: 0,
      roundResult: "",
      playerWinRate: "",
      dealerWinRate: "",
      tieRate: "",
      last20Results: [],
      last20WinRate: "",
      gameId: "",
    };
  }

  public async casinoNavigation(casino: string): Promise<void> {
    let login: string = '';
    let password: string = '';
    let casinoPage: CasinoPage;

    try {
      if (casino === 'betfair') {
        casinoPage = new BetfairCasinoPage(this.page);
        login = this.casinos.betfair.email;
        password = this.casinos.betfair.password;
      } else if (casino === 'sportingBet') {
        casinoPage = new SportingBetNavigationPage(this.page);
        login = this.casinos.sportingBet.email;
        password = this.casinos.sportingBet.password;
      } else {
        throw new Error('Unsupported casino or game mode type.');
      }

      await casinoPage.beforeLogin();
      await casinoPage.login(login, password);
      await casinoPage.searchGame();
      await casinoPage.selectGame();

    } catch (error) {
      console.error('[Error] Error during Casino navigation:', error);
      throw error;
    }
  }

  async startMonitor(gameMode: string, profile: string, betValue: string) {
    let infinitePage: InfinitePage;

    try {
      if (gameMode === 'infiniteBetfair') {
        infinitePage = new BetfairInfinitePage(this.page);

      } else if (gameMode === 'infiniteSportingBet') {
        infinitePage = new SportingBetInfinitePage(this.page);

      } else {
        throw new Error('Unsupported casino or game mode type.');
      }

      infinitePage.closeWarnings();
      infinitePage.roundManager(profile, gameMode, betValue);
      infinitePage.cardMonitor();
      infinitePage.keepAlive();

    } catch (error) {
      console.error('[Erro] Falha ao iniciar o ciclo do jogo:', error);
    }
  }

  public async updateGameData(updatedData: Partial<GameData>): Promise<void> {
    this.gameData = {
      ...this.gameData,
      ...updatedData,
      roundNumber: updatedData.roundNumber ?? this.gameData.roundNumber,
      playerHand: updatedData.playerHand ?? this.gameData.playerHand,
      dealerHand: updatedData.dealerHand ?? this.gameData.dealerHand,
      gameId: updatedData.gameId ?? this.gameData.gameId ?? `game_${Date.now()}`,
    };

    console.table(this.gameData);

    if (this.gameData.roundResult) {
      console.log("[INFO] Round finished, sending data to server...");
      const botService = new BotService();
      await botService.dataCollector(this.gameData);
    } else {
      console.warn("[WARNING] Round result is missing. Skipping data send.");
    }
  }

  async play(gameMode: string, betValue: string) {
    let infinitePage: InfinitePage;

    try {
      if (gameMode === 'infiniteBetfair') {
        infinitePage = new BetfairInfinitePage(this.page);
      } else if (gameMode === 'infiniteSportingBet') {
        infinitePage = new SportingBetInfinitePage(this.page);
      } else {
        throw new Error('Unsupported casino or game mode type.');
      }

      infinitePage.selectBet(betValue);

      if (infinitePage.isPlayerActive) {
        infinitePage.playerMove(this.gameData);
      }

    } catch (error) {
      console.error('[Error] Error during play execution:', error);
      throw error;
    }
  }
}
