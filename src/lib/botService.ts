import fetch from 'node-fetch';
import { GameData } from './botController';

export class BotService {

  async dataCollector(gameData: GameData) {
    try {
      const formattedData = {
        round_number: gameData.roundNumber || 0,
        game_id: gameData.gameId?.trim() || `game_${Date.now()}`,
        profile: gameData.profile || "",
        player_hand: gameData.playerHand || { cards: [], value: 0 },
        dealer_hand: gameData.dealerHand || { cards: [], value: 0 },
        revealed_cards: gameData.revealedCards || [],
        player_wins: gameData.playerWins || 0,
        dealer_wins: gameData.dealerWins || 0,
        ties: gameData.ties || 0,
        round_result: gameData.roundResult?.trim() || "Pending",
        player_win_rate: gameData.playerWinRate?.trim() || "0.00%",
        dealer_win_rate: gameData.dealerWinRate?.trim() || "0.00%",
        tie_rate: gameData.tieRate?.trim() || "0.00%",
        last_20_results: gameData.last20Results || [],
        last_20_win_rate: gameData.last20WinRate?.trim() || "0.00%",
      };

      console.log("[DEBUG] Sending game data:", JSON.stringify(formattedData, null, 2));

      const response = await fetch('http://localhost:8000/api/game-data/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        throw new Error(`Failed to send game data: ${response.statusText}`);
      }

      console.log('[Success] Game data sent successfully.');
    } catch (error) {
      console.error('[Error] Failed to send game data:', error);
    }
  }

  async getStrategy(): Promise<string> {
    try {
      const response = await fetch('http://localhost:8000/api/strategy/');
      const data = await response.json();
      return data.strategy;
    } catch (error) {
      console.error("[Error] Failed to get strategy:", error);
      return "SKIP";
    }
  }

  async decideAction(gameData: GameData): Promise<string> {
    try {
      const response = await fetch('http://localhost:8000/api/action/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });

      const data = await response.json();
      return data.action;
    } catch (error) {
      console.error("[Error] Failed to get action decision:", error);
      return "STAND";
    }
  }
}
