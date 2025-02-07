"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { XIcon, ImageIcon as OIcon } from "lucide-react"

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
  const [isSpectator, setIsSpectator] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const chatContainerRef = useRef(null)

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
      const response = await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/create-room", {
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

  const leaveRoom = async () => {
    try {
      await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/leave-room", { roomId, player })
      resetGameState()
      speak("You have left the room")
    } catch (error) {
      console.error("Error leaving room:", error)
      alert("Failed to leave room")
    }
  }

  const resetGameState = () => {
    setRoomId("")
    setPlayer(null)
    setSquares(Array(9).fill(null))
    setXIsNext(true)
    setGameOver(false)
    setWinner(null)
    setTie(false)
    setDisabledSquares(Array(9).fill(false))
    setIsSpectator(false)
    setMessages([])
    setOpponentName(null)
  }

  const joinRoom = async () => {
    if (!inputRoomId || !playerName) return alert("Enter room ID and your name")
    try {
      const response = await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/join-room", {
        roomId: inputRoomId.toUpperCase(),
        playerName,
      })
      if (response.data.error) {
        alert(response.data.error)
        return
      }
      setRoomId(inputRoomId.toUpperCase())
      setPlayer("O")
      speak(`Joined room ${inputRoomId}. Your player is O`)
    } catch (error) {
      console.error("Error joining room:", error)
      alert("Failed to join room. Please try again.")
    }
  }

  const joinAsSpectator = async () => {
    if (!inputRoomId) return alert("Enter room ID")
    try {
      const response = await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/join-room", {
        roomId: inputRoomId.toUpperCase(),
        isSpectator: true,
      })
      if (response.data.error) {
        alert(response.data.error)
        return
      }
      setRoomId(inputRoomId.toUpperCase())
      setIsSpectator(true)
      speak(`Joined room ${inputRoomId} as a spectator`)
    } catch (error) {
      console.error("Error joining room as spectator:", error)
      alert("Failed to join room as spectator. Please try again.")
    }
  }

  const handleClick = async (i) => {
    if (!roomId || squares[i] || gameOver || (xIsNext && player !== "X") || (!xIsNext && player !== "O")) return

    const newSquares = [...squares]
    newSquares[i] = player

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

    setSquares(newSquares)
    setXIsNext(!xIsNext)

    try {
      await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/update-room", {
        roomId,
        squares: newSquares,
        xIsNext: !xIsNext,
        winner: currentWinner || null,
        winnerName: winnerName || null,
        tie: isTie,
      })
    } catch (error) {
      console.error("Error updating room:", error)
      alert("Failed to update room")
    }
  }

  const restartGame = async () => {
    try {
      await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/restart-room", { roomId })
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

  const sendMessage = async () => {
    if (!inputMessage.trim()) return
    try {
      await axios.post("https://tic-tac-toe-backend-eta.vercel.app/api/send-message", {
        roomId,
        playerName: isSpectator ? "Spectator" : playerName,
        message: inputMessage,
      })
      setInputMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message")
    }
  }

  useEffect(() => {
    let intervalId
    if (roomId) {
      const fetchRoomState = async () => {
        try {
          const response = await axios.get(`https://tic-tac-toe-backend-eta.vercel.app/api/room/${roomId}`)
          const roomData = response.data
          setSquares(roomData.squares)
          setXIsNext(roomData.xIsNext)
          setWinner(roomData.winnerName || null)
          setTie(roomData.tie)
          setGameOver(Boolean(roomData.winnerName || roomData.tie))
          setOpponentName(roomData[player === "X" ? "O_name" : "X_name"] || "Opponent")
          setMessages(roomData.messages || [])
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatContainerRef.current]) //Corrected dependency

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <h1 className="text-6xl font-extrabold mb-8 text-white text-center">
        Tic <span className="text-yellow-300">Tac</span> Toe
      </h1>

      <AnimatePresence mode="wait">
        {!roomId ? (
          <LobbyView
            playerName={playerName}
            setPlayerName={setPlayerName}
            inputRoomId={inputRoomId}
            setInputRoomId={setInputRoomId}
            createRoom={createRoom}
            joinRoom={joinRoom}
            joinAsSpectator={joinAsSpectator}
          />
        ) : (
          <GameView
            isSpectator={isSpectator}
            roomId={roomId}
            playerName={playerName}
            player={player}
            opponentName={opponentName}
            squares={squares}
            gameOver={gameOver}
            handleClick={handleClick}
            winner={winner}
            tie={tie}
            restartGame={restartGame}
            leaveRoom={leaveRoom}
            messages={messages}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            sendMessage={sendMessage}
            chatContainerRef={chatContainerRef}
            xIsNext={xIsNext}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const LobbyView = ({
  playerName,
  setPlayerName,
  inputRoomId,
  setInputRoomId,
  createRoom,
  joinRoom,
  joinAsSpectator,
}) => (
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
      className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      type="text"
        placeholder="Enter room ID"
        value={inputRoomId}
        onChange={(e) => setInputRoomId(e.target.value)}
      />

      <br />
<br />
      <button
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        onClick={joinRoom}
      >
        Join
      </button>
      <br />
    </div>
    <button
      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
      onClick={joinAsSpectator}
    >
      Spectate
    </button>
  </motion.div>
)

const GameView = ({
  isSpectator,
  roomId,
  playerName,
  player,
  opponentName,
  squares,
  gameOver,
  handleClick,
  winner,
  tie,
  restartGame,
  leaveRoom,
  messages,
  inputMessage,
  setInputMessage,
  sendMessage,
  chatContainerRef,
  xIsNext,
}) => (
  <motion.div
    key="game"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="bg-white p-4 sm:p-8 rounded-xl shadow-2xl space-y-6 w-full max-w-6xl"
  >
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 space-y-6">
        <GameInfo
          isSpectator={isSpectator}
          roomId={roomId}
          playerName={playerName}
          player={player}
          opponentName={opponentName}
        />
        <GameBoard
          squares={squares}
          gameOver={gameOver}
          handleClick={handleClick}
          isSpectator={isSpectator}
          player={player}
          xIsNext={xIsNext}
        />
        <GameStatus gameOver={gameOver} winner={winner} tie={tie} restartGame={restartGame} />
        <button
          onClick={leaveRoom}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Leave Room
        </button>
      </div>
      <ChatArea
        messages={messages}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        sendMessage={sendMessage}
        chatContainerRef={chatContainerRef}
        playerName={playerName}
      />
    </div>
  </motion.div>
)

const GameInfo = ({ isSpectator, roomId, playerName, player, opponentName }) => (
  <div className="text-center space-y-2">
    <h2 className="text-2xl font-semibold">
      Room ID: <span className="text-indigo-600">{roomId}</span>
    </h2>
    {isSpectator ? (
      <h3 className="text-lg font-medium text-yellow-600">Spectator Mode</h3>
    ) : (
      <>
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
      </>
    )}
  </div>
)

const GameBoard = ({ squares, gameOver, handleClick, isSpectator, player, xIsNext }) => (
  <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-[300px] sm:max-w-[350px] mx-auto">
    {squares.map((square, index) => (
      <motion.button
        key={index}
        whileHover={{ scale: isSpectator ? 1 : 1.05 }}
        whileTap={{ scale: isSpectator ? 1 : 0.95 }}
        className={`aspect-square text-4xl font-bold rounded-lg flex items-center justify-center transition duration-300 ease-in-out
          ${
            square === "X"
              ? "bg-indigo-500 text-white"
              : square === "O"
                ? "bg-purple-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
          }`}
        onClick={() => handleClick(index)}
        disabled={isSpectator || square || gameOver || (xIsNext && player !== "X") || (!xIsNext && player !== "O")}
      >
        {square && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {square === "X" ? <XIcon className="w-12 h-12" /> : <OIcon className="w-12 h-12" />}
          </motion.div>
        )}
      </motion.button>
    ))}
  </div>
)

const GameStatus = ({ gameOver, winner, tie, restartGame }) =>
  gameOver && (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center space-y-4">
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
  )

const ChatArea = ({ messages, inputMessage, setInputMessage, sendMessage, chatContainerRef, playerName }) => (
  <div className="flex-1 space-y-4 min-w-[250px]">
    <div ref={chatContainerRef} className="bg-gray-100 p-4 rounded-lg h-[400px] overflow-y-auto space-y-2">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-2 rounded-lg ${msg.playerName === playerName ? "bg-blue-200 text-right" : "bg-green-200"}`}
        >
          <span className="font-bold">{msg.playerName}: </span>
          {msg.message}
        </div>
      ))}
    </div>
    <div className="flex space-x-2">
      <input
        type="text"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-grow p-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
      />
      <button
        onClick={sendMessage}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Send
      </button>
    </div>
  </div>
)

export default TicTacToe

