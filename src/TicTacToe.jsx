import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { nanoid } from "nanoid";
import { FaSmileBeam, FaTimesCircle, FaCircleNotch, FaUser } from 'react-icons/fa'; // Example icon imports


const speak = (message) => {
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.pitch = 1;
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
};

const Square = ({ value, onClick, disabled }) => (
  <button
    className="w-full h-0 pb-[100%] bg-white border-4 border-gray-400 text-4xl font-bold flex items-center justify-center shadow-lg rounded-md hover:bg-gray-200 transition-all relative"
    onClick={onClick}
    disabled={disabled}
  >
    <span className="absolute inset-0 flex items-center justify-center">{value}</span>
  </button>
);

const Board = ({ squares, onClick, disabledSquares }) => (
  <div className="grid grid-cols-3 gap-2 w-full max-w-xs sm:max-w-sm md:max-w-md">
    {squares.map((square, i) => (
      <Square key={i} value={square} onClick={() => onClick(i)} disabled={disabledSquares[i]} />
    ))}
  </div>
);

const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (const [a, b, c] of lines) {
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
  const [tie, setTie] = useState(false);
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
          setTie(data.tie);
          setGameOver(Boolean(data.winner || data.tie));
          setOpponentName(data[player === "X" ? "O_name" : "X_name"] || "Opponent");

          if (data.winner) {
            speak(`${data.winnerName} wins the game!`);
          } else if (data.tie) {
            speak("Game Tied! No one wins.");
          }
        }
      });
      return () => unsubscribe();
    }
  }, [roomId, player]);

  const handleClick = async (i) => {
    // Prevent moves if roomId is not set, square is already taken, game is over, or it's not the player's turn.
    if (!roomId || squares[i] || gameOver || (xIsNext && player === "O") || (!xIsNext && player === "X")) return;

    const newSquares = [...squares];
    newSquares[i] = xIsNext ? "X" : "O";

    const currentWinner = calculateWinner(newSquares);
    const isTie = !currentWinner && newSquares.every((square) => square !== null);

    let winnerName = null;
    if (currentWinner) {
      winnerName = currentWinner === "X" ? (player === "X" ? playerName : opponentName) : (player === "O" ? playerName : opponentName);
      setWinner(currentWinner);
      setGameOver(true);
      speak(`${winnerName} wins the game!`);
    } else if (isTie) {
      setTie(true);
      setGameOver(true);
      speak("Game Tied! No one wins.");
    }

    setDisabledSquares((prev) => {
      const updated = [...prev];
      updated[i] = true;
      return updated;
    });

    await setDoc(
      doc(db, "rooms", roomId),
      {
        squares: newSquares,
        xIsNext: !xIsNext,
        winner: currentWinner || null,
        winnerName: winnerName || null,
        tie: isTie,
      },
      { merge: true }
    );
  };

  const createRoom = async () => {
    if (!playerName) return alert("Please enter your name first");
    const id = nanoid(4).toUpperCase();
    await setDoc(doc(db, "rooms", id), {
      squares: Array(9).fill(null),
      xIsNext: true,
      X_name: playerName,
      winner: null,
      tie: false,
    });
    setRoomId(id);
    setPlayer("X");
    speak("Room created. Share your room ID to play.");
  };

  const joinRoom = async () => {
    if (!inputRoomId || !playerName) return alert("Enter room ID and your name");
    const roomRef = doc(db, "rooms", inputRoomId.toUpperCase());
    const docSnap = await getDoc(roomRef);
    if (docSnap.exists()) {
      setRoomId(inputRoomId.toUpperCase());
      setPlayer("O");
      await setDoc(roomRef, { O_name: playerName }, { merge: true });
      speak("You have joined the room.");
    } else {
      alert("Room not found!");
      speak("Room not found. Try again.");
    }
  };

  const restartGame = async () => {
    const newSquares = Array(9).fill(null);
    setSquares(newSquares);
    setDisabledSquares(Array(9).fill(false));
    setGameOver(false);
    setWinner(null);
    setTie(false);

    await setDoc(doc(db, "rooms", roomId), {
      squares: newSquares,
      xIsNext: true,
      winner: null,
      tie: false,
      winnerName: null,
    }, { merge: true });

    speak("Game restarted!");
  };

  const status = winner
  ? `Winner: ${winner === "X" ? (player === "X" ? playerName : opponentName) : (player === "O" ? playerName : opponentName)}`
  : tie
    ? "Game Tied!"
    : gameOver
      ? "Game Over"
      : `Next player: ${xIsNext ? "X" : "O"}`;

// Determine the appropriate icon based on the status
const statusIcon = winner
  ? <FaTimesCircle className="text-green-500" />  // Icon for winner
  : tie
    ? <FaSmileBeam className="text-yellow-500" />  // Icon for tie
    : gameOver
      ? <FaCircleNotch className="text-gray-500" />  // Icon for game over
      : <FaUser className="text-blue-500" />;  // Icon for next player



  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-200 to-blue-300 p-6 sm:p-8">
    <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-gray-800 drop-shadow-lg">
      Tic-Tac-Toe
    </h1>
  
    <div className="status-container flex items-center justify-center space-x-3 mb-6">
      {statusIcon}
      <span className="text-lg sm:text-xl font-medium text-gray-700">{status}</span>
    </div>
  
    <Board squares={squares} onClick={handleClick} disabledSquares={disabledSquares} />
  
    {!roomId ? (
      <div className="mt-8 space-y-6 flex flex-col items-center w-full max-w-md">
        <input
          type="text"
          className="px-5 py-3 border-2 border-blue-500 rounded-xl text-center w-full placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition duration-300 w-full"
          onClick={createRoom}
        >
          Create Room
        </button>
  
        <div className="mt-6 space-y-6 flex flex-col items-center w-full">
          <input
            type="text"
            className="px-5 py-3 border-2 border-green-500 rounded-xl text-center w-full placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="Enter Room ID"
            maxLength="4"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
          />
          <button
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold shadow-lg hover:bg-green-700 transition duration-300 w-full"
            onClick={joinRoom}
          >
            Join Room
          </button>
        </div>
      </div>
    ) : (
      <div className="mt-8 text-center space-y-4">
        <p className="text-lg sm:text-xl font-semibold">
          Room ID: <span className="font-bold text-blue-700">{roomId}</span>
        </p>
        <p className="text-md sm:text-lg font-medium text-gray-600">
          Opponent: {opponentName}
        </p>
        <button
          className="mt-6 px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold shadow-lg hover:bg-orange-700 transition duration-300 w-full"
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
