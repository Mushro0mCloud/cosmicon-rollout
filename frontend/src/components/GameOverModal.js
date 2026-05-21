// game over modal. exactly as it sounds
import React from "react"
import "./Modal.css"


//i hate this as much as you do but god i do not know if this works
function Modal({ winner, hp1, hp2 }) {
  return (
    <div className='modalBackground'>
      <div className='modalContainer'>
        <div className='titleCloseBtn'>
          <button onClick={closeModal}>X</button>
        </div>
        <div className='title'>
          <h1>The winner is {winner}!</h1>
        </div>
        <div className='body'>
          <p>Player 1 HP: {hp1}</p>
          <p>Player 2 HP:</p>
        </div>
        <div className='footer'>
          <button onClick={() => openEditModal(item)}>Edit</button>
          <button onClick={() => openDeleteModal(item)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default Modal;