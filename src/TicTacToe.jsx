import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { nanoid } from "nanoid";

const Square = ({ value, onClick }) => (
  <button
    className="w-24 h-24 bg-white border-4 border-gray-400 text-4xl font-bold flex items-center justify-center shadow-lg rounded-md hover:bg-gray-200 transition-all"
    onClick={onClick}
  >
    {value}
  </button>
);

const Board = ({ squares, onClick }) => (
  <div className="grid grid-cols-3 gap-3">
    {squares.map((square, i) => (
      <Square key={i} value={square} onClick={() => onClick(i)} />
    ))}
  </div>
);

const TicTacToe = () => {
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  // Listen for room updates from Firestore
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

  // Voice announcement: speak when there is a winner.
  useEffect(() => {
    const winner = calculateWinner(squares);
    if (winner) {
      speakStatus(`Winner is ${winner}`);
    }
    // You can also uncomment the following lines if you'd like
    // automatic announcements for the next player when no winner yet:
    // else {
    //   speakStatus(`Next player is ${xIsNext ? "X" : "O"}`);
    // }
  }, [squares, xIsNext]);

  const handleClick = async (i) => {
    if (!roomId || squares[i] || calculateWinner(squares)) return;
    const newSquares = [...squares];
    newSquares[i] = xIsNext ? "X" : "O";

    // Update the game state in Firestore so all players see the change
    await setDoc(
      doc(db, "rooms", roomId),
      {
        squares: newSquares,
        xIsNext: !xIsNext,
      },
      { merge: true }
    );
  };

  const createRoom = async () => {
    const id = nanoid(4).toUpperCase(); // Generates a 4-letter room ID
    await setDoc(doc(db, "rooms", id), {
      squares: Array(9).fill(null),
      xIsNext: true,
    });
    setRoomId(id);
  };

  const joinRoom = async () => {
    if (!inputRoomId) return;
    const docSnap = await getDoc(doc(db, "rooms", inputRoomId.toUpperCase()));
    if (docSnap.exists()) {
      setRoomId(inputRoomId.toUpperCase());
    } else {
      alert("Room not found!");
    }
  };

  const leaveRoom = () => {
    setRoomId("");
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  };

  // Restart the game by resetting the board in Firestore
  const restartGame = async () => {
    if (!roomId) return;
    await setDoc(
      doc(db, "rooms", roomId),
      {
        squares: Array(9).fill(null),
        xIsNext: true,
      },
      { merge: true }
    );
    // Optional: announce the restart via voice
    speakStatus("The game has been restarted. Next player is X.");
  };

  // Function to use Web Speech API to speak text aloud
  const speakStatus = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.log("Speech synthesis not supported in this browser.");
    }
  };

  const winner = calculateWinner(squares);
  const status = winner
    ? `Winner: ${winner}`
    : `Next player: ${xIsNext ? "X" : "O"}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-6">
      <h1 className="text-4xl font-bold mb-4 text-gray-700">Tic-Tac-Toe</h1>
      <div className="mb-4 text-2xl font-semibold text-gray-800">{status}</div>
      <Board squares={squares} onClick={handleClick} />

      {roomId ? (
        <div className="mt-6 text-center space-y-4">
          <p className="text-xl font-semibold">
            Room ID:{" "}
            <span className="font-bold text-blue-700">{roomId}</span>
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-all"
              onClick={() => speakStatus(status)}
            >
              Speak Status
            </button>
            <button
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg font-bold shadow-md hover:bg-yellow-700 transition-all"
              onClick={restartGame}
            >
              Restart Game
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all"
              onClick={leaveRoom}
            >
              Leave Room
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4 flex flex-col items-center">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all"
            onClick={createRoom}
          >
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
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-all"
              onClick={joinRoom}
            >
              Join Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to determine if there is a winner
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

export default TicTacToe;
