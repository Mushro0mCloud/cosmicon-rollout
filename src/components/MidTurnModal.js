// display this modal when a new turn happens. display HP of both and also the damage they dealt.import React from "react"
import "./Modal.css"


//i hate this as much as you do but god i do not know if this works
function MidTurnModal({ currentPlayer, closeModal, turn }) {
    return (
    <div className='modalBackground' onClick={closeModal}>
      <div className='modalContainer'>
        <div className='titleCloseBtn'>
          <button onClick={closeModal}>X</button>
        </div>
        <div className='title'>
          <h1>Turn {turn} complete!</h1>
          <h1>Next turn: Turn {turn+1}</h1>
        </div>
        <div className='body'>
          <h6>Attacker: {currentPlayer}</h6>
        </div>
        <div className='footer'>
          <button onClick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default MidTurnModal;