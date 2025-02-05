import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { nanoid } from "nanoid";

// Function to handle room creation and joining
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
  const [disabledSquares, setDisabledSquares] = useState(Array(9).fill(false)); // Track which squares are disabled
  const [player, setPlayer] = useState(null); // 'X' or 'O' for current player

  useEffect(() => {
    if (roomId) {
      const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSquares(data.squares);
          setXIsNext(data.xIsNext);
          setDisabledSquares(data.squares.map((square) => square !== null)); // Sync disabled squares with Firestore
        }
      }, (error) => {
        console.error("Error fetching room data: ", error);
      });

      return () => unsubscribe();
    }
  }, [roomId]);

  const handleClick = async (i) => {
    // Prevent clicking if the square is already filled or if it's the wrong player's turn
    if (!roomId || squares[i] || calculateWinner(squares) || (xIsNext && player !== "X") || (!xIsNext && player !== "O")) return;

    const newSquares = [...squares];
    newSquares[i] = xIsNext ? "X" : "O";

    // Disable the clicked square
    const newDisabledSquares = [...disabledSquares];
    newDisabledSquares[i] = true;
    setDisabledSquares(newDisabledSquares);

    try {
      await setDoc(doc(db, "rooms", roomId), {
        squares: newSquares,
        xIsNext: !xIsNext,
      }, { merge: true });
    } catch (error) {
      console.error("Error updating room data: ", error);
    }
  };

  const createRoom = async () => {
    const id = nanoid(4).toUpperCase(); // Generates a 4-letter room ID
    try {
      await setDoc(doc(db, "rooms", id), {
        squares: Array(9).fill(null),
        xIsNext: true,
      });
      setRoomId(id);
      setSquares(Array(9).fill(null)); // Reset the board
      setXIsNext(true); // Start with 'X'
      setDisabledSquares(Array(9).fill(false)); // Reset disabled squares
      setPlayer("X"); // Assign 'X' to the first player
    } catch (error) {
      console.error("Error creating room: ", error);
    }
  };

  const joinRoom = async () => {
    if (!inputRoomId) return;
    try {
      const docSnap = await getDoc(doc(db, "rooms", inputRoomId.toUpperCase()));
      if (docSnap.exists()) {
        setRoomId(inputRoomId.toUpperCase());
        setPlayer("O"); // Assign 'O' to the second player
      } else {
        alert("Room not found!");
      }
    } catch (error) {
      console.error("Error joining room: ", error);
    }
  };

  const leaveRoom = () => {
    setRoomId("");
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setDisabledSquares(Array(9).fill(false)); // Reset disabled squares when leaving
    setPlayer(null); // Reset player state when leaving the room
  };

  const winner = calculateWinner(squares);
  const status = winner ? `Winner: ${winner}` : `Next player: ${xIsNext ? "X" : "O"}`;

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
    </div>
  );
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

export default TicTacToe;
