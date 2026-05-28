import React from 'react';

export default function WaitingRoom({ onJoinGame }) {
  return (
    <div style={{
      backgroundColor: '#282c34',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding:'20px',
      fontSize: '10px + 2vmin',
      color: 'white',
      overflowY: 'auto',
    }}>
      <h1 style={{ fontSize: '3rem', color: '#61dafb', margin: '0' }}>COSMICON ROLLOUT</h1>
      <p style={{ fontSize: '1.5rem', textAlign: 'center', maxWidth: '500px' }}>
        Welcome to Cosmicon Rollout! Click the button below to join the game.
      </p>
      <p style={{ fontSize: '1.5rem', textAlign: 'center', maxWidth: '500px' }}>
        Your life is in the hands of the three dice you choose. Whoever drops to 0 first is the loser.
      </p>
      <button
        onClick={onJoinGame}
        style={{
          padding: '20px 40px',
          fontSize: '1.5rem',
          backgroundColor: '#61dafb',
          color: '#282c34',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#4fa8d5';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#61dafb';
          e.target.style.transform = 'scale(1)';
        }}
      >
        Join Game
      </button>
    </div>
  );
}
