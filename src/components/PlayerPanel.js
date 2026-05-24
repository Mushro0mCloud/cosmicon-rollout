import React from 'react'

export default function PlayerPanel({ title, role, hp, lastRolls = [], selected = [] }) {
  return (
    <div style={{ width: '100%', padding: '8px', marginTop: '10px', border: '1px solid #ccc', borderRadius: '6px', background: '#fafafa' }}>
      <h3 style={{ margin: '4px 0' }}>{title}</h3>
      <p style={{color: '#000000'}}>Role: {role}</p>
      <p style={{color: '#000000'}}>HP: {hp}</p>
      <p style={{color: '#000000'}}>Last rolls: {lastRolls.length ? lastRolls.join(', ') : ''}</p>
      <p style={{color: '#000000'}}>Selected: {selected.length ? selected.map(i => lastRolls[i]).join(', ') : 'None'}</p>
    </div>
  )
}
