import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { nanoid } from "nanoid";

// Function to speak a message using SpeechSynthesis API
const speak = (message) => {
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.pitch = 1; // Set pitch for clarity
  utterance.rate = 1; // Set rate of speech
  window.speechSynthesis.speak(utterance);
};

const Square = ({ value, onClick, disabled }) => (
  <button 
    className="w-24 h-24 bg-white border-4 border-gray-400 text-4xl font-bold flex items-center justify-center shadow-lg rounded-md hover:bg-gray-200 transition-all"
    onClick={onClick}
    disabled={disabled}
  >
    {value}
  </button>
);

const Board = ({ squares, onClick, disabledSquares }) => (
  <div className="grid grid-cols-3 gap-3">
    {squares.map((square, i) => (
      <Square 
        key={i} 
        value={square} 
        onClick={() => onClick(i)} 
        disabled={disabledSquares[i]} 
      />
    ))}
  </div>
);

const TicTacToe = () => {
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true); // True for 'X' turn, False for 'O' turn
  const [isFirstMove, setIsFirstMove] = useState(true); // Track if it's the first move
  const [disabledSquares, setDisabledSquares] = useState(Array(9).fill(false)); // Track which squares are disabled
  const [gameOver, setGameOver] = useState(false); // Track if the game is over
  const [winner, setWinner] = useState(null); // Store the winner

  useEffect(() => {
    if (roomId) {
      const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSquares(data.squares);
          setXIsNext(data.xIsNext);
        }
      });
      return () => unsubscribe();
    }
  }, [roomId]);

  const handleClick = async (i) => {
    // Prevent clicking if the square is already filled, the game is over, or it's not the player's turn
    if (!roomId || squares[i] || gameOver) return;

    const newSquares = [...squares];
    newSquares[i] = xIsNext ? "X" : "O";

    // Disable the clicked square
    const newDisabledSquares = [...disabledSquares];
    newDisabledSquares[i] = true;
    setDisabledSquares(newDisabledSquares);

    await setDoc(doc(db, "rooms", roomId), {
      squares: newSquares,
      xIsNext: !xIsNext,
    }, { merge: true });

    // Speak for the first move
    if (isFirstMove) {
      const soundMessage = `It's Player ${xIsNext ? "X" : "O"}'s turn.`;
      speak(soundMessage); // Announce the first move
      setIsFirstMove(false); // Set first move as complete
    } else {
      const soundMessage = `Player ${xIsNext ? "X" : "O"} made a move.`;
      speak(soundMessage); // Announce subsequent moves
    }
  };

  const createRoom = async () => {
    const id = nanoid(4).toUpperCase(); // Generates a 4-letter room ID
    await setDoc(doc(db, "rooms", id), {
      squares: Array(9).fill(null),
      xIsNext: true,
    });
    setRoomId(id);
    speak("Room created. Share your room ID to play."); // Announce when room is created
  };

  const joinRoom = async () => {
    if (!inputRoomId) return;
    const docSnap = await getDoc(doc(db, "rooms", inputRoomId.toUpperCase()));
    if (docSnap.exists()) {
      setRoomId(inputRoomId.toUpperCase());
      speak("You have joined the room."); // Announce when a player joins
    } else {
      alert("Room not found!");
      speak("Room not found. Try again."); // Announce room not found
    }
  };

  const leaveRoom = async () => {
    if (!roomId) return;
    setSquares(Array(9).fill(null)); // Reset the board
    setDisabledSquares(Array(9).fill(false)); // Enable all squares
    setGameOver(true);
    setWinner(xIsNext ? "O" : "X"); // Declare the other player as the winner
    await setDoc(doc(db, "rooms", roomId), {
      squares: Array(9).fill(null),
      xIsNext: true,
    }, { merge: true });
    setRoomId(""); // Clear room ID
    speak(`${xIsNext ? "Player X" : "Player O"} has left the game. You win!`); // Announce the winner if player leaves
  };

  const restartGame = () => {
    setSquares(Array(9).fill(null)); // Reset the board
    setDisabledSquares(Array(9).fill(false)); // Enable all squares
    setGameOver(false); // Reset game over state
    setWinner(null); // Clear winner
    setXIsNext(true); // Start with 'X' again
    speak("Game restarted. Player X starts."); // Announce the restart
  };

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  // Check for winner after every move
  useEffect(() => {
    const winner = calculateWinner(squares);
    if (winner) {
      setGameOver(true);
      setWinner(winner);
      speak(`Player ${winner} wins!`); // Announce the winner
    } else if (!squares.includes(null)) {
      setGameOver(true); // Tie when all squares are filled and no winner
      setWinner("Tie");
      speak("It's a tie!"); // Announce tie
    }
  }, [squares]);

  const status = winner ? (winner === "Tie" ? "It's a tie!" : `Winner: ${winner}`) : `Next player: ${xIsNext ? "X" : "O"}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-6">
      <h1 className="text-4xl font-bold mb-4 text-gray-700">Tic-Tac-Toe</h1>
      <div className="mb-4 text-2xl font-semibold text-gray-800">{status}</div>
      <Board squares={squares} onClick={handleClick} disabledSquares={disabledSquares} />
      {!roomId ? (
        <div className="mt-6 space-y-4 flex flex-col items-center">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all" onClick={createRoom}>
            Create Room
          </button>
          <div className="flex space-x-2">
            <input
              type="text"
              className="px-4 py-2 border rounded-lg text-center uppercase"
              placeholder="Enter Room ID"
              maxLength="4"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            />
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-all" onClick={joinRoom}>
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <p className="text-xl font-semibold">Room ID: <span className="font-bold text-blue-700">{roomId}</span></p>
          <button className="mt-3 px-6 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>
      )}
      {gameOver && (
        <div className="mt-6">
          <button
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-bold shadow-md hover:bg-yellow-700 transition-all"
            onClick={restartGame}
          >
            Restart Game
          </button>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;
