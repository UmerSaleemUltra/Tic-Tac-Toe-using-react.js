import React, { useState } from 'react';

const Square = ({ value, onClick }) => {
  return (
    <button
      className="w-20 h-20 border-2 border-gray-500 text-3xl flex items-center justify-center"
      onClick={onClick}
    >
      {value}
    </button>
  );
};

const Board = ({ squares, onClick }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {squares.map((square, i) => (
        <Square key={i} value={square} onClick={() => onClick(i)} />
      ))}
    </div>
  );
};

const TicTacToe = () => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const handleClick = (i) => {
    const newSquares = squares.slice();
    if (calculateWinner(newSquares) || newSquares[i]) return;
    newSquares[i] = xIsNext ? 'X' : 'O';
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  };

  const winner = calculateWinner(squares);
  let status;
  if (winner) {
    status = `Winner: ${winner}`;
  } else {
    status = `Next player: ${xIsNext ? 'X' : 'O'}`;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="mb-4 text-2xl">{status}</div>
      <Board squares={squares} onClick={handleClick} />
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setSquares(Array(9).fill(null))}
      >
        Restart
      </button>
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
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};

export default TicTacToe;
