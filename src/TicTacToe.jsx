"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"

const TicTacToe = () => {
  const [playerName, setPlayerName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [squares, setSquares] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [player, setPlayer] = useState(null)
  const [opponentName, setOpponentName] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [tie, setTie] = useState(false)
  const [inputRoomId, setInputRoomId] = useState("")
  const [disabledSquares, setDisabledSquares] = useState(Array(9).fill(false))

  const speak = (message) => {
    const msg = new SpeechSynthesisUtterance(message)
    window.speechSynthesis.speak(msg)
  }

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
    ]
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const createRoom = async () => {
    if (!playerName) return alert("Please enter your name first")
    try {
      const response = await axios.post("http://localhost:3000/api/create-room", {
        playerName,
      })
      const { roomId } = response.data
      setRoomId(roomId)
      setPlayer("X")
      speak(`Room created. Your player is X. Room ID is ${roomId}`)
    } catch (error) {
      console.error("Error creating room:", error)
      alert("Failed to create room")
    }
  }

  const joinRoom = async () => {
    if (!inputRoomId || !playerName) return alert("Enter room ID and your name")
    try {
      const response = await axios.post("http://localhost:3000/api/join-room", {
        roomId: inputRoomId.toUpperCase(),
        playerName,
      })
      setRoomId(inputRoomId.toUpperCase())
      setPlayer("O")
      speak(`Joined room ${inputRoomId}. Your player is O`)
    } catch (error) {
      console.error("Error joining room:", error)
      alert("Room not found!")
    }
  }

  const handleClick = async (i) => {
    if (!roomId || squares[i] || gameOver || (xIsNext && player === "O") || (!xIsNext && player === "X")) return

    const newSquares = [...squares]
    newSquares[i] = xIsNext ? "X" : "O"

    const currentWinner = calculateWinner(newSquares)
    const isTie = !currentWinner && newSquares.every((square) => square !== null)

    let winnerName = null
    if (currentWinner) {
      winnerName = currentWinner === player ? playerName : opponentName
      setWinner(winnerName)
      setGameOver(true)
      speak(`${winnerName} wins the game!`)
    } else if (isTie) {
      setTie(true)
      setGameOver(true)
      speak("It's a tie!")
    }

    setDisabledSquares((prev) => {
      const updated = [...prev]
      updated[i] = true
      return updated
    })

    try {
      await axios.post("http://localhost:3000/api/update-room", {
        roomId,
        squares: newSquares,
        xIsNext: !xIsNext,
        winner: currentWinner || null,
        winnerName: winnerName || null,
        tie: isTie,
      })
      setSquares(newSquares)
      setXIsNext(!xIsNext)
    } catch (error) {
      console.error("Error updating room:", error)
      alert("Failed to update room")
    }
  }

  const restartGame = async () => {
    try {
      await axios.post("http://localhost:3000/api/restart-room", { roomId })
      setSquares(Array(9).fill(null))
      setXIsNext(true)
      setGameOver(false)
      setWinner(null)
      setTie(false)
      setDisabledSquares(Array(9).fill(false))
      speak("Game restarted")
    } catch (error) {
      console.error("Error restarting game:", error)
      alert("Failed to restart game")
    }
  }

  useEffect(() => {
    let intervalId
    if (roomId) {
      const fetchRoomState = async () => {
        try {
          const response = await axios.get(`http://localhost:3000/api/room/${roomId}`)
          const roomData = response.data
          setSquares(roomData.squares)
          setXIsNext(roomData.xIsNext)
          setWinner(roomData.winnerName || null)
          setTie(roomData.tie)
          setGameOver(Boolean(roomData.winnerName || roomData.tie))
          setOpponentName(roomData[player === "X" ? "O_name" : "X_name"] || "Opponent")
        } catch (error) {
          console.error("Error fetching room data:", error)
        }
      }
      fetchRoomState()
      intervalId = setInterval(fetchRoomState, 2000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [roomId, player])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <h1 className="text-6xl font-extrabold mb-8 text-white text-center">
        Tic <span className="text-yellow-300">Tac</span> Toe
      </h1>

      <AnimatePresence mode="wait">
        {!roomId ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-xl shadow-2xl space-y-6 w-full max-w-md"
          >
            <input
              className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              onClick={createRoom}
            >
              Create Room
            </button>
            <div className="flex space-x-4">
              <input
                className="flex-grow p-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                type="text"
                placeholder="Enter room ID"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
              />
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                onClick={joinRoom}
              >
                Join
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white p-8 rounded-xl shadow-2xl space-y-6 w-full max-w-md"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">
                Room ID: <span className="text-indigo-600">{roomId}</span>
              </h2>
              <h3 className="text-lg">
                Player:{" "}
                <span className="font-medium text-green-600">
                  {playerName} ({player})
                </span>
              </h3>
              <h3 className="text-lg">
                Opponent:
                {opponentName ? (
                  <span className="font-medium text-red-600">{opponentName}</span>
                ) : (
                  <span className="text-yellow-600 animate-pulse">Waiting for opponent...</span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {squares.map((square, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-20 h-20 text-4xl font-bold rounded-lg flex items-center justify-center transition duration-300 ease-in-out
                    ${
                      square === "X"
                        ? "bg-indigo-500 text-white"
                        : square === "O"
                          ? "bg-purple-500 text-white"
                          : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  onClick={() => handleClick(index)}
                  disabled={disabledSquares[index] || gameOver}
                >
                  {square && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {square}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>

            {gameOver && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center space-y-4"
              >
                {winner ? (
                  <h2 className="text-3xl font-bold text-indigo-600">Winner: {winner}</h2>
                ) : tie ? (
                  <h2 className="text-3xl font-bold text-yellow-600">It's a Tie!</h2>
                ) : null}
                <button
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  onClick={restartGame}
                >
                  Play Again
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TicTacToe

