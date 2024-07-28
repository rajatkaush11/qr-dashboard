import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase-config';
import { collection, query, onSnapshot } from 'firebase/firestore';
import TableBox from './TableBox';
import TableDetails from './TableDetails';
import './TableOverview.css';

const WelcomeHome = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState(Array(15).fill(null).map((_, i) => `T${i + 1}`));
  const [tableColors, setTableColors] = useState(Array(15).fill('blank'));
  const [restaurantName, setRestaurantName] = useState('QRapid');
  const [activeRoom, setActiveRoom] = useState('AC Premium');
  const [selectedTable, setSelectedTable] = useState(null);
  const [view, setView] = useState('overview'); // Manage the view state

  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const updatedColors = [...tableColors]; // Copy the current colors to update
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        const tableIndex = tables.findIndex(t => t === order.tableNo);
        if (tableIndex !== -1) {
          updatedColors[tableIndex] = 'blue'; // Change to blue when an order is placed
        }
      });
      setTableColors(updatedColors); // Update the state once after processing all documents
    }, (error) => {
      console.error('Error fetching snapshot:', error);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [tables, tableColors]); // Only re-run the effect if `tables` or `tableColors` changes

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
    setTables(prevTables => [...prevTables, newTableNumber]);
    setTableColors(prevColors => [...prevColors, 'blank']);
  };

  const handleTableClick = (tableNumber) => {
    setSelectedTable(tableNumber);
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
                  onClick={() => handleTableClick(tableNumber)}
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

export default WelcomeHome;
