// game over modal. exactly as it sounds
import React from "react"
import "./Modal.css"


//i hate this as much as you do but god i do not know if this works
//the new game button should refresh the redis store. but the fact that this is working at all is good
function GameOverModal({ winner, hp1, hp2, closeModal, newGame }) {
  return (
    <div className='modalBackground' onClick={closeModal}>
      <div className='modalContainer modalAnimationFallIn'>
        <div className='titleCloseBtn'>
          <button onClick={closeModal}>X</button>
        </div>
        <div className='title'>
          <h1>Game Over!</h1>
          <h1>The winner is {winner}!</h1>
        </div>
        <div className='body'>
          <h6>Player 1 HP: {hp1}</h6>
          <h6>Player 2 HP: {hp2}</h6>
        </div>
        <div className='footer'>
          <button onClick={(event) => { event.stopPropagation(); newGame(); }}>New Game</button>
        </div>
      </div>
    </div>
  );
}

export default GameOverModal;