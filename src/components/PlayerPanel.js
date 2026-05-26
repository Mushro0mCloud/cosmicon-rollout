import React from 'react'

export default function PlayerPanel({ title, role, hp, maxHp = 30, isAttacking = false }) {
  const hpPercentage = (hp / maxHp) * 100;
  const isSpectator = role === 'Spectator';
  
  return (
    <div style={{ width: '100%', padding: '8px', marginTop: '10px', border: '1px solid #ccc', borderRadius: '6px', background: '#fafafa' }}>
      <h3 style={{ margin: '4px 0' }}>{title}</h3>
      <p style={{color: '#000000'}}>Role: {role} {!isSpectator && (isAttacking ? '(Attacking)' : '(Defending)')}</p>
      <div style={{ marginBottom: '8px' }}>
        <p style={{color: '#000000', margin: '4px 0'}}>HP: {hp}/{maxHp}</p>
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#ddd',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid #999'
        }}>
          <div style={{
            width: `${hpPercentage}%`,
            height: '100%',
            backgroundColor: hpPercentage > 50 ? '#4CAF50' : hpPercentage > 10 ? '#f4c836' : '#f44336',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {hpPercentage > 10 && `${Math.round(hpPercentage)}%`}
          </div>
        </div>
      </div>
    </div>
  )
}
