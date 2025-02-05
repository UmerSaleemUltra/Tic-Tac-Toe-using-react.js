import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { nanoid } from "nanoid";

const speak = (message) => {
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.pitch = 1;
  utterance.rate = 1;
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
      <Square key={i} value={square} onClick={() => onClick(i)} disabled={disabledSquares[i]} />
    ))}
  </div>
);

const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6], // Diagonals
  ];

  for (let [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a]; // Return 'X' or 'O' if there's a winner
    }
  }
  return null;
};

const TicTacToe = () => {
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [disabledSquares, setDisabledSquares] = useState(Array(9).fill(false));
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [player, setPlayer] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");

  useEffect(() => {
    if (roomId) {
      const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSquares(data.squares);
          setXIsNext(data.xIsNext);
          setWinner(data.winner);
          setGameOver(Boolean(data.winner));
          setOpponentName(data[player === "X" ? "O_name" : "X_name"] || "Opponent");

          if (data.winner) {
            speak(`${data.winner} wins the game!`);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [roomId, player]);

  const handleClick = async (i) => {
    if (!roomId || squares[i] || gameOver || (xIsNext && player === "O") || (!xIsNext && player === "X")) return;

    const newSquares = [...squares];
    newSquares[i] = xIsNext ? "X" : "O";

    const winner = calculateWinner(newSquares);
    if (winner) {
      setWinner(winner);
      setGameOver(true);
      speak(`${winner} wins the game!`);
    }

    setDisabledSquares((prev) => {
      const updated = [...prev];
      updated[i] = true;
      return updated;
    });

    await setDoc(doc(db, "rooms", roomId), {
      squares: newSquares,
      xIsNext: !xIsNext,
      winner: winner || null,
    }, { merge: true });
  };

  const createRoom = async () => {
    if (!playerName) return alert("Please enter your name first");
    const id = nanoid(4).toUpperCase();
    await setDoc(doc(db, "rooms", id), {
      squares: Array(9).fill(null),
      xIsNext: true,
      X_name: playerName,
      winner: null,
    });
    setRoomId(id);
    setPlayer("X");
    speak("Room created. Share your room ID to play.");
  };

  const joinRoom = async () => {
    if (!inputRoomId || !playerName) return alert("Enter room ID and your name");
    const docSnap = await getDoc(doc(db, "rooms", inputRoomId.toUpperCase()));
    if (docSnap.exists()) {
      setRoomId(inputRoomId.toUpperCase());
      setPlayer("O");
      await setDoc(doc(db, "rooms", inputRoomId.toUpperCase()), { O_name: playerName }, { merge: true });
      speak("You have joined the room.");
    } else {
      alert("Room not found!");
      speak("Room not found. Try again.");
    }
  };

  const status = winner ? `Winner: ${winner}` : gameOver ? "Game Over" : `Next player: ${xIsNext ? "X" : "O"}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-6">
      <h1 className="text-4xl font-bold mb-4 text-gray-700">Tic-Tac-Toe</h1>
      <div className="mb-4 text-2xl font-semibold text-gray-800">{status}</div>
      <Board squares={squares} onClick={handleClick} disabledSquares={disabledSquares} />
      {!roomId ? (
        <div className="mt-6 space-y-4 flex flex-col items-center">
          <input
            type="text"
            className="px-4 py-2 border rounded-lg text-center"
            placeholder="Enter Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md" onClick={createRoom}>
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
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md" onClick={joinRoom}>
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <p className="text-xl font-semibold">Room ID: <span className="font-bold text-blue-700">{roomId}</span></p>
          <p className="text-lg font-semibold">Opponent: {opponentName}</p>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;
