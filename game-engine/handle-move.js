import { getAttacks, getMovesForPlayer } from "./move-counter.js";

export function handleMove(board, color, move) {
  let beated = false;

  let i1 = move.from[0];
  let j1 = move.from[1];
  let i2 = move.to[0];
  let j2 = move.to[1];

  board[i2][j2] = board[i1][j1];
  board[i1][j1] = 0;

  if ((i2 === 0 && board[i2][j2].color) || (i2 === 7 && !board[i2][j2].color))
    board[i2][j2].king = true;

  let difI = i2 > i1 ? 1 : -1,
    difJ = j2 > j1 ? 1 : -1;

  for (i1 += difI, j1 += difJ; i1 !== i2 && j1 !== j2; i1 += difI, j1 += difJ)
    if (board[i1][j1] && board[i1][j1].color !== color && !board[i1][j1].beaten)
      beated = board[i1][j1].beaten = true;

  if (beated) {
    const nextAttacks = getAttacks(board, color, move.to[0], move.to[1]);

    if (nextAttacks.length > 0)
      return {
        board: board,
        turn: color,
        movesInfo: {
          attack: true,
          moves: [
            {
              position: [move.to[0], move.to[1]],
              moves: nextAttacks,
            },
          ],
        },
      };

    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++)
        if (board[i][j] && board[i][j].beaten) board[i][j] = 0;
  }

  return {
    board: board,
    turn: !color,
    movesInfo: getMovesForPlayer(board, !color),
  };
}
