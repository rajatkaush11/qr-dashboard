import React, { useState, useEffect } from 'react';
import TableBox from './TableBox';
import TableDetails from './TableDetails'; // Import TableDetails
import './TableOverview.css';

const TableOverview = ({ tables, addTable, onSelectTable, tableColors, onLogout }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeRoom, setActiveRoom] = useState('AC Premium');
  const [restaurantName, setRestaurantName] = useState('QRapid');
  const [view, setView] = useState('overview'); // Manage the view state

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/restaurant`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setRestaurantName(data.name);
          } else {
            console.error('Failed to fetch restaurant details');
          }
        } catch (error) {
          console.error('Error fetching restaurant details:', error);
        }
      }
    };

    fetchRestaurantDetails();
  }, []);

  const handleTableClick = (tableNumber) => {
    setSelectedTable(tableNumber);
    onSelectTable(tableNumber);
    setView('details'); // Switch to details view on table click
  };

  const handleRoomClick = (room) => {
    setActiveRoom(room);
  };

  const handleBackClick = () => {
    setView('overview'); // Switch back to overview view
  };

  return (
    <div className="table-overview">
      {view === 'overview' ? (
        <>
          <div className="header">
            <h1>{restaurantName} - Table Overview</h1>
            <button className="add-table-btn" onClick={addTable}>+ Add Table</button>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
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
        </>
      ) : (
        <TableDetails
          tableNumber={selectedTable}
          onBackClick={handleBackClick}
          onGenerateKOT={() => { /* Implement KOT generation */ }}
          onGenerateBill={() => { /* Implement Bill generation */ }}
          onComplete={() => { /* Implement order completion */ }}
        />
      )}
    </div>
  );
};

export default TableOverview;
