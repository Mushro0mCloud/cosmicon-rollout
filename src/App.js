//todo: make a button to actually determine when the game starts. this would be separating the connection and the role assignment.
//todo: add reroll functionality to the attack roll. allow the attacker to select which dice to reroll up to twice.
//todo: make midturn and gameover modals actually function.
//todo: make the waiting room function
//todo: make it fit in one screen

import { React, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import PlayerPanel from './components/PlayerPanel'
import GameOverModal from './components/GameOverModal';
import MidTurnModal from './components/MidTurnModal';

const API_URL = 'http://35.255.251.132:5000'
let socket = null;

const getSocket = () => {
  if (!socket) {
    console.log('Initializing socket.io connection to:', API_URL);
    socket = io(API_URL);
    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('error', (error) => console.log('Socket error:', error));
  }
  return socket;
}

function App() {
  const [playerRole, setPlayerRole] = useState('Initializing roles...')
  const [msg, setMsg] = useState([])
  const msgList = useRef(null)
  const [turn, setTurn] = useState(1)
  const [currentPlayer, setCurrentPlayer] = useState('Player 1')
  const [damageRoll, setDamageRoll] = useState(0)
  const [defenseRoll, setDefenseRoll] = useState(0)
  const [lastTotalDamage, setLastTotalDamage] = useState(0)
  const [hp1, setHp1] = useState(30)
  const [hp2, setHp2] = useState(30)
  const [attackConfirmedTurn, setAttackConfirmedTurn] = useState(false)
  const [defenseConfirmedTurn, setDefenseConfirmedTurn] = useState(false)
  const [attackRolls, setAttackRolls] = useState([])
  const [selectedAttackRolls, setSelectedAttackRolls] = useState([])
  const [defenseRolls, setDefenseRolls] = useState([])
  const [selectedDefenseRolls, setSelectedDefenseRolls] = useState([])
  const [waitingForSelection, setWaitingForSelection] = useState(false)
  const [selectionType, setSelectionType] = useState(null)
  const [gameOverModal, setGameOverModal] = useState(false)
  const [midTurnModal, setMidTurnModal] = useState(false)
  const [winner, setWinner] = useState('Player 1')
  const [isGameOver, setIsGameOver] = useState(false)
  const [currentTime, setCurrentTime] = useState(null)

  const socket = getSocket();




  // modals oh no

  const closeGameOverModal = () =>{
    setGameOverModal(false)
  }

  const openMidTurnModal = () => {
    setGameOverModal(false)
    setMidTurnModal(true)
  }

  const closeMidTurnModal = () => {
    setMidTurnModal(false)
  }




  useEffect(() => {
    msgList.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msg])

  useEffect(() => {
      
    // Connection event, sets player role
    socket.on('player_assigned', (data) => {
      setPlayerRole(data.role)
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('game_state', (data) => {
      setTurn(data.current_turn)
      setCurrentPlayer(data.current_attacker)
      setHp1(data.player1_hp)
      setHp2(data.player2_hp)
      setDamageRoll(data.last_attack)
      setDefenseRoll(data.last_defense)
      setLastTotalDamage(data.last_total_damage)
    })

    socket.on('turn_changed', (data) => {
      setTurn(data.current_turn)
      setCurrentPlayer(data.current_player)
      // reset per-turn confirmation state
      setAttackConfirmedTurn(false)
      setDefenseConfirmedTurn(false)
      setSelectedAttackRolls([])
      setSelectedDefenseRolls([])
      setWaitingForSelection(false)
      setSelectionType(null)
      openMidTurnModal()
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('attack_rolled', (data) => {
      setAttackRolls(data.rolls)
      setSelectedAttackRolls([])
      setWaitingForSelection(true)
      setSelectionType('attack')
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('defense_rolled', (data) => {
      setDefenseRolls(data.rolls)
      setSelectedDefenseRolls([])
      setWaitingForSelection(true)
      setSelectionType('defense')
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('attack_selection_confirmed', (data) => {
      setDamageRoll(data.total)
      setWaitingForSelection(false)
      setSelectionType(null)
      setAttackConfirmedTurn(true)
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('defense_selection_confirmed', (data) => {
      setDefenseRoll(data.total)
      setLastTotalDamage(data.net_damage)
      setWaitingForSelection(false)
      setSelectionType(null)
      setDefenseConfirmedTurn(true)
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('action_confirmed', (data) => {
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('game_over', (data) => {
      setGameOverModal(true)
      setIsGameOver(true)
      setWinner(data.winner || currentPlayer)
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('rabbit_message', (data) => {
      setMsg((prevMsg) => [...prevMsg, data?.message || JSON.stringify(data)])
    })

    socket.on('error', (data) => {
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.on('reset', (data) => {
      setMsg((prevMsg) => [...prevMsg, data.message])
    })

    socket.emit('request_game_state')

    return () => {
      // Note: not removing listeners to preserve bidirectional connection
      // socket.off('player_assigned')
      // socket.off('game_state')
    }
  }, [socket]);

  const addMessage = (text) => {
    setMsg((prevMsg) => [...prevMsg, text])
  }



  const rollForDamage = () => {
    if (playerRole !== currentPlayer || playerRole === 'Spectator') {
      addMessage('Only the attacking player can roll attack on this turn.')
      return
    }
    socket.emit('roll_attack')
  }

  const rollForDefense = () => {
    if (playerRole === currentPlayer || playerRole === 'Spectator') {
      addMessage('Only the defending player can roll defense on this turn.')
      return
    }
    socket.emit('roll_defense')
  }

  const toggleAttackRollSelection = (index) => {
    if (attackConfirmedTurn) return
    if (selectedAttackRolls.includes(index)) {
      setSelectedAttackRolls(selectedAttackRolls.filter(i => i !== index))
    } else if (selectedAttackRolls.length < 3) {
      setSelectedAttackRolls([...selectedAttackRolls, index])
    }
  }

  const toggleDefenseRollSelection = (index) => {
    if (defenseConfirmedTurn) return
    if (selectedDefenseRolls.includes(index)) {
      setSelectedDefenseRolls(selectedDefenseRolls.filter(i => i !== index))
    } else if (selectedDefenseRolls.length < 3) {
      setSelectedDefenseRolls([...selectedDefenseRolls, index])
    }
  }

  const submitAttackSelection = () => {
    if (selectedAttackRolls.length === 0) {
      addMessage('Please select at least one roll.')
      return
    }
    if (attackConfirmedTurn) {
      addMessage('Attack already confirmed this turn.')
      return
    }
    socket.emit('confirm_attack_selection', { selected_indices: selectedAttackRolls })
    setAttackConfirmedTurn(true)
    setWaitingForSelection(false)
    addMessage('Attack confirmed: ' + selectedAttackRolls.map(i => attackRolls[i]).join(', ') + ' = ' + selectedAttackRolls.reduce((sum, i) => sum + attackRolls[i], 0))
  
  }

  const submitDefenseSelection = () => {
    if (selectedDefenseRolls.length === 0) {
      addMessage('Please select at least one roll.')
      return
    }
    if (!attackConfirmedTurn) {
      addMessage('Attack must be confirmed before defense can be confirmed.')
      return
    }
    if (defenseConfirmedTurn) {
      addMessage('Defense already confirmed this turn.')
      return
    }
    socket.emit('confirm_defense_selection', { selected_indices: selectedDefenseRolls })
    setDefenseConfirmedTurn(true)
    setWaitingForSelection(false)
    addMessage('Defense confirmed: ' + selectedDefenseRolls.map(i => defenseRolls[i]).join(', ') + ' = ' + selectedDefenseRolls.reduce((sum, i) => sum + defenseRolls[i], 0))
  }

  const newGame = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Unable to reset the game.')
      }
      const data = await response.json()
      setGameOverModal(false)
      setIsGameOver(false)
      setWinner('')
      setAttackConfirmedTurn(false)
      setDefenseConfirmedTurn(false)
      setWaitingForSelection(false)
      setSelectionType(null)
      setAttackRolls([])
      setSelectedAttackRolls([])
      setDefenseRolls([])
      setSelectedDefenseRolls([])
      setTurn(1)
      setMsg((prevMsg) => [...prevMsg, data.message || 'Game reset.'])
      socket.emit('request_game_state')
    } catch (error) {
      addMessage(error.message)
    }
  }

  return (
    <div className="App" style={{ padding: '1rem', display: 'flex', gap: '2rem', minHeight: '100vh' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <header className="App-header">
              {gameOverModal && isGameOver && (
                <GameOverModal winner={winner} hp1={hp1} hp2={hp2} closeModal={closeGameOverModal} newGame={newGame} />
              )}
              <h1>TURN {turn}</h1>
              {midTurnModal && !gameOverModal && (
                <MidTurnModal currentPlayer={currentPlayer} closeModal={closeMidTurnModal} turn={turn}/>
              )}
              <PlayerPanel
                title="Opponent"
                role={playerRole === 'Player 1' ? 'Player 2' : 'Player 1'}
                hp={playerRole === 'Player 1' ? hp2 : hp1}
                lastRolls={selectionType === 'defense' ? defenseRolls : []}
                selected={selectedDefenseRolls}
              />

              {waitingForSelection && selectionType === 'attack' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  border: '2px solid blue',
                  borderRadius: '5px',
                  backgroundColor: '#e3f2fd'
                }}>
                  <p><strong>Select up to 3 rolls for attack:</strong></p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {attackRolls.map((roll, index) => (
                      <button
                        key={index}
                        onClick={() => toggleAttackRollSelection(index)}
                        style={{
                          padding: '10px 15px',
                          fontSize: '16px',
                          backgroundColor: selectedAttackRolls.includes(index) ? '#4CAF50' : '#f0f0f0',
                          color: selectedAttackRolls.includes(index) ? 'white' : 'black',
                          border: '2px solid #999',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {roll}
                      </button>
                    ))}
                  </div>
                  <p>Selected: {selectedAttackRolls.map(i => attackRolls[i]).join(', ') || 'None'} = {selectedAttackRolls.reduce((sum, i) => sum + attackRolls[i], 0)}</p>
                  <button onClick={() => { submitAttackSelection(); }} style={{ marginTop: '10px', padding: '10px 20px' }}>Confirm Selection</button>
                </div>
              )}

              {waitingForSelection && selectionType === 'defense' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  border: '2px solid red',
                  borderRadius: '5px',
                  backgroundColor: '#ffebee'
                }}>
                  <p><strong>Select up to 3 rolls for defense:</strong></p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {defenseRolls.map((roll, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDefenseRollSelection(index)}
                        style={{
                          padding: '10px 15px',
                          fontSize: '16px',
                          backgroundColor: selectedDefenseRolls.includes(index) ? '#FF9800' : '#f0f0f0',
                          color: selectedDefenseRolls.includes(index) ? 'white' : 'black',
                          border: '2px solid #999',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {roll}
                      </button>
                    ))}
                  </div>
                  <p>Selected: {selectedDefenseRolls.map(i => defenseRolls[i]).join(', ') || 'None'} = {selectedDefenseRolls.reduce((sum, i) => sum + defenseRolls[i], 0)}</p>
                  <button onClick={() => { submitDefenseSelection(); }} style={{ marginTop: '10px', padding: '10px 20px' }}>Confirm Selection</button>
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <button onClick={rollForDamage} disabled={playerRole !== currentPlayer || playerRole === 'Spectator' || waitingForSelection || attackConfirmedTurn}>
                  Roll for Damage
                </button>
                <button onClick={rollForDefense} disabled={playerRole === currentPlayer || playerRole === 'Spectator' || waitingForSelection || !attackConfirmedTurn}>
                  Roll for Defense
                </button>
              </div>
              <PlayerPanel
                title={`You (${playerRole})`}
                role={playerRole}
                hp={playerRole === 'Player 1' ? hp1 : hp2}
                lastRolls={selectionType === 'attack' ? attackRolls : []}
                selected={selectedAttackRolls}
              />
            </header>
          </div>

          <div style={{ width: '300px', minWidth: '300px' }}>
            <h2 style={{ marginTop: 0 }}>Battle Log:</h2>
            <ul style={{ padding: '10px', borderRadius: '5px', listStyleType: 'none', color: 'black', height: 'calc(100vh - 150px)', overflowY: 'auto', border: '1px solid #ddd', margin: 0 }}>
              {msg.map((m, index) => (
                <li key={index} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>{m}</li>
              ))}
              <div ref={msgList} />
            </ul>
          </div>
        </div>

  )
}

export default App;
