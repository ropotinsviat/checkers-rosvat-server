import config from "./config/index.js";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import gameService from "./services/game-service.js";
import roomService from "./services/room-service.js";
import parseDataForPlayer from "./utils/parseDataForPlayer.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (token) {
      const { user } = jwt.verify(token, config.tokenSecret);
      socket.user = user;
    }
  } catch {}
  next();
});

const queue = [];

io.on("connection", (socket) => {
  const startGame = async (p2, p1) => {
    const id1 = (p1.user && p1.user.userId) || null;
    const id2 = (p2.user && p2.user.userId) || null;
    const { token1, token2 } = await roomService.createPlayers(id1, id2);
    p1.emit("setPlayerToken", { playerToken: token1 });
    p2.emit("setPlayerToken", { playerToken: token2 });
  };

  const proposeDraw = (gameId, playerId) => {
    return new Promise((resolve) => {
      const socketsInRoom = io.sockets.adapter.rooms.get(gameId);
      if (socketsInRoom)
        for (const socketId of socketsInRoom) {
          const socket = io.sockets.sockets.get(socketId);

          if (socket.playerId === playerId) {
            socket.emit("draw", (callback) => {
              resolve(callback);
            });
            return;
          }
        }
      resolve(false);
    });
  };

  const proposePlayAgain = async (gameId) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ agreed: false }), 10000);

      const socketsInRoom = io.sockets.adapter.rooms.get(gameId);

      if (!socketsInRoom || !socketsInRoom.size)
        return resolve({ agreed: false });

      const playerPromises = [];
      const sockets = [];

      for (const socketId of socketsInRoom) {
        const socket = io.sockets.sockets.get(socketId);
        sockets.push(socket);

        playerPromises.push(
          new Promise((res) =>
            socket.emit("playAgain", (callback) => {
              res(callback);
              if (!callback) resolve({ agreed: false });
            })
          )
        );
      }

      Promise.all(playerPromises).then((responses) =>
        resolve({ agreed: responses.every(Boolean), sockets })
      );
    });
  };

  socket.on("playOnline", async () => {
    for (let i = 0; i < queue.length; i++)
      if (
        queue[i] === socket ||
        (queue[i].user &&
          socket.user &&
          queue[i].user.userId === socket.user.userId)
      )
        return console.log("lol");

    queue.push(socket);

    while (queue.length >= 2) await startGame(queue.pop(), queue.pop());
  });

  socket.on("join", async (data, callback) => {
    try {
      const { playerId } = await jwt.verify(
        data.playerToken,
        config.tokenSecret
      );

      const gameId = await gameService.getGameIdForPlayer(playerId);
      const gameData = await gameService.getGameData(gameId);

      socket.playerId = playerId;
      socket.join(gameId);

      callback({ isWhite: gameData.player1_id === playerId });

      socket.emit("getGameData", parseDataForPlayer(gameData));
    } catch (err) {
      console.error("Error when tried to join " + err);
      callback({ error: err });
    }
  });

  socket.on("move", async (data) => {
    try {
      const gameData = await gameService.move(socket.playerId, data.move);
      const update = parseDataForPlayer(gameData);

      let winner;

      if (data.draw) {
        if (
          (gameData.turn && gameData.player1_id === socket.playerId) ||
          (!gameData.turn && gameData.player2_id === socket.playerId)
        ) {
          const playerIdToAsk =
            gameData.player1_id === socket.playerId
              ? gameData.player2_id
              : gameData.player1_id;
          const agreed = await proposeDraw(gameData.game_id, playerIdToAsk);
          if (agreed) winner = null;
        }
      } else if (data.surrender) {
        winner = gameData.player1_id === socket.playerId ? 0 : 1;
      } else if (update.white.timer > update.timeLimit) {
        winner = 0;
      } else if (update.black.timer > update.timeLimit) {
        winner = 1;
      } else if (update.movesInfo.moves.length < 1) {
        winner = update.turn ? 0 : 1;
      }
      if (winner !== undefined) {
        update.aftermath = winner
          ? "White won!"
          : winner === 0
          ? "Black won!"
          : "Draw!";

        await gameService.endGame(gameData.game_id, winner);
      }

      io.to(gameData.game_id).emit("getGameData", update);

      if (winner !== undefined) {
        const { agreed, sockets } = await proposePlayAgain(gameData.game_id);
        if (agreed) {
          io.in(gameData.game_id).socketsLeave(gameData.game_id);
          return await startGame(...sockets);
        } else io.to(gameData.game_id).emit("leave");
        io.in(gameData.game_id).socketsLeave(gameData.game_id);
      }
    } catch (err) {
      console.error("Error when tried to make move " + err);
    }
  });

  socket.on("disconnect", async () => {
    const idx = queue.indexOf(socket);
    if (idx !== -1) queue.splice(idx, 1);
  });
});

export { app, io, server };
