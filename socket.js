import config from "./config/index.js";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import gameService from "./services/game-service.js";
import roomService from "./services/room-service.js";
import parseDataForPlayer from "./utils/parseDataForPlayer.js";
import validator from "./utils/validator.js";
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
  } catch (err) {
    console.error("Error occurred while socket auth " + err);
  }
  next();
});

const queue = [],
  replay = [];

io.on("connection", (socket) => {
  const startGame = async (p2, p1, gameId) => {
    const id1 = (p1.user && p1.user.userId) || null;
    const id2 = (p2.user && p2.user.userId) || null;
    const { token1, token2 } = await roomService.createPlayers(
      id1,
      id2,
      gameId
    );
    p1.emit("setPlayerToken", { playerToken: token1 });
    p2.emit("setPlayerToken", { playerToken: token2 });
  };

  const proposePlayAgain = async (gameId, player1Id, player2Id) => {
    const socketsInRoom = io.sockets.adapter.rooms.get(gameId);
    let p1, p2;
    if (socketsInRoom)
      for (const socketId of socketsInRoom) {
        const socket = io.sockets.sockets.get(socketId);

        if (socket.playerId === player1Id) p1 = socket;
        else if (socket.playerId === player2Id) p2 = socket;

        if (p1 && p2) {
          const replayItem = [{ socket: p1 }, { socket: p2 }];
          replay.push(replayItem);

          setTimeout(() => {
            const idx = replay.indexOf(replayItem);
            if (idx !== -1) replay.splice(idx, 1);
          }, 10000);

          break;
        }
      }
  };

  const proposeDraw = (gameId, playerId) => {
    return new Promise((resolve) => {
      const socketsInRoom = io.sockets.adapter.rooms.get(gameId);
      if (socketsInRoom) {
        for (const socketId of socketsInRoom) {
          const socket = io.sockets.sockets.get(socketId);

          if (socket.playerId === playerId) {
            socket.emit("draw", (callback) => {
              resolve(callback);
            });
            return;
          }
        }
      }
      resolve(false);
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

      const role = gameData.player1_id === playerId ? "white" : "black";

      callback({ role });

      socket.emit("getGameData", parseDataForPlayer(gameData));
    } catch (err) {
      console.error("Error when tried to join " + err);
      callback({ error: err });
    }
  });

  socket.on("ready", async (data) => {
    try {
      const gameData = await roomService.setReady(socket.playerId, data.ready);
      io.to(gameData.game_id).emit("getGameData", parseDataForPlayer(gameData));
    } catch (err) {
      console.error("Error when tried to ready " + err);
    }
  });
  // gameAction
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

        await gameService.endGame(
          gameData.game_id,
          winner,
          gameData.user1_id,
          gameData.user2_id
        );

        await proposePlayAgain(
          gameData.game_id,
          gameData.player1_id,
          gameData.player2_id
        );
      }

      io.to(gameData.game_id).emit("getGameData", update);

      if (winner !== undefined)
        io.in(gameData.game_id).socketsLeave(gameData.game_id);
    } catch (err) {
      console.error("Error when tried to make move " + err);
    }
  });

  socket.on("replay", async () => {
    try {
      for (let i = 0; i < replay.length; i++)
        if (replay[i][0].socket === socket) {
          replay[i][0].wantReplay = true;
          if (replay[i][0].wantReplay && replay[i][1].wantReplay)
            return await startGame(replay[i][0].socket, replay[i][1].socket);
        } else if (replay[i][1].socket === socket) {
          replay[i][1].wantReplay = true;
          if (replay[i][0].wantReplay && replay[i][1].wantReplay)
            return await startGame(replay[i][0].socket, replay[i][1].socket);
        }
    } catch (err) {
      console.error("Error when tried to replay " + err);
    }
  });

  socket.on("createRoom", async (data, callback) => {
    try {
      if (!data || typeof data !== "object") throw new Error("Incorrect data");

      validator.checkName(data.name);
      validator.checkPassword(data.password);
      validator.checkTimeLimit(data.timeLimit);

      const { gameId, roomId } = await roomService.createRoom(
        data.name,
        data.password,
        data.timeLimit
      );
      socket.roomId = roomId;
      callback(true);
    } catch (err) {
      console.log(err.message);
      socket.emit("alert", { message: err.message });
    }
  });

  socket.on("joinRoom", async (data) => {
    try {
      if (!data || typeof data !== "object") throw new Error("Incorrect data");

      validator.checkName(data.name);
      validator.checkPassword(data.password);

      const { gameId, roomId } = await roomService.findRoom(
        data.name,
        data.password
      );
      const owner = Array.from(io.sockets.sockets.values()).find(
        (s) => s.roomId === roomId
      );
      if (owner) {
        delete owner.roomId;
        startGame(socket, owner, gameId);
      } else throw new Error("Owner deleted the room!");
    } catch (err) {
      socket.emit("alert", { message: err.message });
    }
  });

  socket.on("disconnect", async () => {
    if (socket.roomId) {
      await roomService.deleteRoom(socket.roomId);
      console.log("user disconected and room deleted");
    }
    const idx = queue.indexOf(socket);
    if (idx !== -1) queue.splice(idx, 1);
  });
});

export { app, io, server };
