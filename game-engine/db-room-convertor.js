import { getAttacks, getMovesForPlayer } from "./move-counter.js";
const relevants = [
  null,

  { color: true, king: false, beaten: false },
  { color: false, king: false, beaten: false },
  { color: true, king: true, beaten: false },
  { color: false, king: true, beaten: false },

  { color: true, king: false, beaten: true },
  { color: false, king: false, beaten: true },
  { color: true, king: true, beaten: true },
  { color: false, king: true, beaten: true },
];

function getArrayBoardFromString(stringBoard) {
  const arrayBoard = [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];

  for (let i = 0; i < 32; i++) {
    const row = 7 - Math.floor(i / 4);
    const col = 7 - (2 * (i % 4) + (row % 2));
    arrayBoard[row][col] =
      relevants[stringBoard[i]] && Object.assign({}, relevants[stringBoard[i]]);
  }

  return arrayBoard;
}

function getStringBoardFromArray(arrayBoard) {
  const stringBoard = new Array(32).fill(0);

  for (let i = 0; i < 32; i++) {
    const row = 7 - Math.floor(i / 4);
    const col = 7 - (2 * (i % 4) + (row % 2));

    const piece = arrayBoard[row][col];
    if (piece) {
      const pieceIndex = relevants.findIndex(
        (p) =>
          p &&
          p.color === piece.color &&
          p.king === piece.king &&
          p.beaten === piece.beaten
      );
      stringBoard[i] = pieceIndex;
    } else stringBoard[i] = 0;
  }

  return stringBoard.join("");
}

function getMovesInfo(board, color, lastAttack) {
  if (!lastAttack) return getMovesForPlayer(board, color);

  return {
    attack: true,
    moves: [
      {
        position: [Number(lastAttack[0]), Number(lastAttack[1])],
        moves: getAttacks(
          board,
          color,
          Number(lastAttack[0]),
          Number(lastAttack[1])
        ),
      },
    ],
  };
}

export { getArrayBoardFromString, getStringBoardFromArray, getMovesInfo };
