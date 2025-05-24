const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess" });
});

io.on("connection", (uniqueSocket) => {
  console.log("User connected:", uniqueSocket.id);

  if (!players.white) {
    players.white = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "b");
  } else {
    uniqueSocket.emit("spectatorRole");
  }

  // Send current board state to new connection
  uniqueSocket.emit("boardState", chess.fen());

  uniqueSocket.on("disconnect", () => {
    if (uniqueSocket.id === players.white) {
      delete players.white;
    } else if (uniqueSocket.id === players.black) {
      delete players.black;
    }
    console.log("User disconnected:", uniqueSocket.id);
  });

  uniqueSocket.on("move", (move) => {
    console.log("Move received:", move);

    try {
      if (chess.turn() === "w" && uniqueSocket.id !== players.white) {
        uniqueSocket.emit("error", "It's not your turn");
        return;
      }
      if (chess.turn() === "b" && uniqueSocket.id !== players.black) {
        uniqueSocket.emit("error", "It's not your turn");
        return;
      }

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid move:", move);
        uniqueSocket.emit("error", "Invalid move");
      }
    } catch (err) {
      console.log("Error:", err);
      uniqueSocket.emit("error", "Server error processing move");
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
