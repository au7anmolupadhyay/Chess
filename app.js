const express = require('express');
const socket = require('socket.io');
const http = require('http');
const {Chess} = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess(); 

let players = {};
let currentPlayer = "W";

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname + '/public')));

app.get('/', (req, res) => {
    res.render('index', {title: 'Chess'});
});

io.on('connection', (uniqueSocket) => {
    console.log('User connected', uniqueSocket.id);

    if(!players.white){
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    }
    else if(!players.black){
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    }
    else{
        uniqueSocket.emit("spectatorRole");
    }

    uniqueSocket.on("disconnect", function(){
        if(uniqueSocket.id === players.white){
            delete players.white;
        }
        else if(uniqueSocket.id === players.black){
            delete players.black;
        }
    });

    uniqueSocket.on("move", (move)=>{
        try{
            if(chess.turn()==="w" && uniqueSocket.id !== players.white){
                uniqueSocket.emit("error", "It's not your turn");
                return;
            }
            else if(chess.turn()==="b" && uniqueSocket.id !== players.black){
                uniqueSocket.emit("error", "It's not your turn");
                return;
            }

            const result = chess.move(move);
            if(result){
                currentPlayer = chess.turn();
                io.emit("move", move); // io.emit means sbko broadcast krega
                io.emit("boardState", chess.fen())
            }
            else{
                console.log("Invald move: ", move);
                uniqueSocket.emit("Invalid move: ", move);  // here why uniqueSocket.emit? because we want to send error to the user who made the move, not to all the users.
            }
        }
        catch(err){
            console.log("Error: ", err);
            uniqueSocket.emit("Error, Invalid move: ", move);
        }
    });
});
    

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
