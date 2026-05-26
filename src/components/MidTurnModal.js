// display this modal when a new turn happens. display HP of both and also the damage they dealt.
import React from "react"
import "./Modal.css"


//i hate this as much as you do but god i do not know if this works
function MidTurnModal({ currentPlayer, closeModal, turn, hp1, hp2 }) {
    return (
    <div className='modalBackground' onClick={closeModal}>
      <div className='modalContainer modalAnimationFallIn'>
        <div className='titleCloseBtn'>
          <button onClick={closeModal}>X</button>
        </div>
        <div className='title'>
          <h1>Turn {turn} complete!</h1>
          <h1>Next turn: Turn {turn+1}</h1>
        </div>
        <div className='body'>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h6 style={{ marginBottom: '15px' }}>Attacker: {currentPlayer}</h6>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20px' }}>
              <div>
                <p style={{ marginBottom: '8px' }}><strong>Player 1</strong></p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: hp1 > 10 ? '#4CAF50' : '#f44336' }}>HP: {hp1}/30</p>
              </div>
              <div>
                <p style={{ marginBottom: '8px' }}><strong>Player 2</strong></p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: hp2 > 10 ? '#4CAF50' : '#f44336' }}>HP: {hp2}/30</p>
              </div>
            </div>
          </div>
        </div>
        <div className='footer'>
          <button onClick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default MidTurnModal;