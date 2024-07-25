const directions = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function validIJ(i, j) {
  return i >= 0 && i < 8 && j >= 0 && j < 8;
}
function validMove(board, i, j) {
  return validIJ(i, j) && !board[i][j];
}
function validAttack(board, color, i, j) {
  return board[i][j] && board[i][j].color !== color && !board[i][j].beaten;
}
function getMoves(board, i, j) {
  const moves = [];

  if (!board[i][j].king) {
    if (board[i][j].color) {
      if (validMove(board, i - 1, j - 1)) moves.push([i - 1, j - 1]);
      if (validMove(board, i - 1, j + 1)) moves.push([i - 1, j + 1]);
    } else {
      if (validMove(board, i + 1, j - 1)) moves.push([i + 1, j - 1]);
      if (validMove(board, i + 1, j + 1)) moves.push([i + 1, j + 1]);
    }
  } else {
    for (const diff of directions) {
      let newRow = i + diff[0];
      let newCol = j + diff[1];

      while (validMove(board, newRow, newCol)) {
        moves.push([newRow, newCol]);
        newRow += diff[0];
        newCol += diff[1];
      }
    }
  }

  return moves;
}

function getAttacks(board, color, i, j) {
  let moves = [];

  for (const diff of directions) {
    let newRow = i + diff[0];
    let newCol = j + diff[1];

    if (!board[i][j].king) {
      if (
        validMove(board, newRow + diff[0], newCol + diff[1]) &&
        validAttack(board, color, newRow, newCol)
      )
        moves.push([newRow + diff[0], newCol + diff[1]]);
    } else {
      let positions = [];
      let afterAttackPositions = [];
      let beated;

      while (validMove(board, newRow, newCol)) {
        newRow += diff[0];
        newCol += diff[1];
      }
      if (
        validIJ(newRow, newCol) &&
        validAttack(board, color, newRow, newCol)
      ) {
        beated = [newRow, newCol];

        while (validMove(board, newRow + diff[0], newCol + diff[1])) {
          newRow += diff[0];
          newCol += diff[1];

          positions.push([newRow, newCol]);
        }
      }

      positions.forEach((move) => {
        board[beated[0]][beated[1]].beaten = true;

        if (hasAfterAttack(board, color, move[0], move[1])) {
          afterAttackPositions.push(move);
        }

        board[beated[0]][beated[1]].beaten = false;
      });

      if (afterAttackPositions.length > 0) {
        moves.push(...afterAttackPositions);
      } else if (positions.length > 0) {
        moves.push(...positions);
      }
    }
  }

  return moves;
}

function getMovesForPlayer(board, color) {
  let moves = [];
  let wasAttack = false;

  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (board[i][j]?.color === color) {
        const attacks = getAttacks(board, color, i, j);

        if (wasAttack) {
          if (attacks.length > 0) {
            moves.push({ position: [i, j], moves: attacks });
          }
        } else if (attacks.length > 0) {
          wasAttack = true;
          moves = [{ position: [i, j], moves: attacks }];
        } else {
          const checkerMoves = getMoves(board, i, j);
          if (checkerMoves.length)
            moves.push({
              position: [i, j],
              moves: checkerMoves,
            });
        }
      }

  return { attack: wasAttack, moves: moves };
}

function hasAfterAttack(board, color, i, j) {
  for (const diff of directions) {
    let newRow = i + diff[0];
    let newCol = j + diff[1];

    while (validMove(board, newRow, newCol)) {
      newRow += diff[0];
      newCol += diff[1];
    }
    if (
      validMove(board, newRow + diff[0], newCol + diff[1]) &&
      validAttack(board, color, newRow, newCol)
    )
      return true;
  }

  return false;
}

export { getAttacks, getMovesForPlayer };
