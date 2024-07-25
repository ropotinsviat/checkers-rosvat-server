import {
  getArrayBoardFromString,
  getMovesInfo,
} from "../game-engine/db-room-convertor.js";

export default function parseDataForPlayer(gameData) {
  const board = getArrayBoardFromString(gameData.board);

  const movesInfo = getMovesInfo(
    board,
    gameData.turn === 1,
    gameData.attack_square
  );

  const gameDataForPlayer = {
    board,
    white: {
      name: gameData.player1_name,
      timer: gameData.white_timer,
    },
    black: {
      name: gameData.player2_name,
      timer: gameData.black_timer,
    },
    turn: gameData.turn,
    timeLimit: gameData.time_limit,
    movesInfo,
  };

  if (gameData.end_time !== null)
    gameDataForPlayer.aftermath = gameData.winner_color
      ? "Black lost!"
      : gameData.winner_color === 0
      ? "White lost!"
      : "Draw!";

  return gameDataForPlayer;
}
