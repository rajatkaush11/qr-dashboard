import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import TableBox from './TableBox';
import './TableOverview.css';

const WelcomeHome = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState(Array(15).fill(null).map((_, i) => `T${i + 1}`));
  const [tableColors, setTableColors] = useState(Array(15).fill('blank'));
  const [restaurantName, setRestaurantName] = useState('QRapid');
  const [activeRoom, setActiveRoom] = useState('AC Premium');
  const [selectedTable, setSelectedTable] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout Failed', error);
    }
  };

  const addTable = () => {
    const newTableNumber = `T${tables.length + 1}`;
    setTables([...tables, newTableNumber]);
    setTableColors([...tableColors, 'blank']);
  };

  const handleTableClick = (tableNumber) => {
    setSelectedTable(tableNumber);
  };

  const handleRoomClick = (room) => {
    setActiveRoom(room);
  };

  return (
    <div className="table-overview">
      <div className="header">
        <h1>{restaurantName} - Table Overview</h1>
        <button className="add-table-btn" onClick={addTable}>+ Add Table</button>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      <div className="room-button-group">
        <button
          className={activeRoom === 'AC Premium' ? 'active' : ''}
          onClick={() => handleRoomClick('AC Premium')}
        >
          AC Premium
        </button>
        <button
          className={activeRoom === 'Room-2' ? 'active' : ''}
          onClick={() => handleRoomClick('Room-2')}
        >
          Room-2
        </button>
        <button
          className={activeRoom === 'Room-3' ? 'active' : ''}
          onClick={() => handleRoomClick('Room-3')}
        >
          Room-3
        </button>
      </div>
      <div className="main-container">
        <div className="left-container">
          <button className="side-button">Running Table</button>
          <button className="side-button">Printed Table</button>
          <button className="side-button">Running KOT Table</button>
        </div>
        <div className="table-container">
          {tables.map((tableNumber, index) => (
            <TableBox
              key={index}
              tableNumber={tableNumber}
              color={tableColors[index]}
              isActive={selectedTable === tableNumber}
              onClick={handleTableClick}
            />
          ))}
        </div>
        <div className="status-container">
          <div className="status-item">
            <span className="status-color grey"></span> Blank Table
          </div>
          <div className="status-item">
            <span className="status-color blue"></span> Running Table
          </div>
          <div className="status-item">
            <span className="status-color green"></span> Printed Table
          </div>
          <div className="status-item">
            <span className="status-color yellow"></span> Paid Table
          </div>
          <div className="status-item">
            <span className="status-color orange"></span> Running KOT Table
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHome;
