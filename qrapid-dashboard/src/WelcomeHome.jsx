import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, backendDb } from './firebase-config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import TableBox from './TableBox';
import TableDetails from './TableDetails';
import './TableOverview.css';

const WelcomeHome = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState(Array(15).fill(null).map((_, i) => `T${i + 1}`));
  const [tableColors, setTableColors] = useState(() => {
    const cachedColors = sessionStorage.getItem('tableColors');
    return cachedColors ? JSON.parse(cachedColors) : Array(15).fill('blank');
  });
  const [restaurantName, setRestaurantName] = useState('QRapid');
  const [activeRoom, setActiveRoom] = useState('AC Premium');
  const [selectedTable, setSelectedTable] = useState(null);
  const [view, setView] = useState('overview');

  useEffect(() => {
    console.log('Setting up Firestore listener for orders...');
    const q = query(collection(backendDb, 'orders'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Received Firestore snapshot.');
      const updatedColors = Array(15).fill('blank');
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        console.log('Fetched order:', order);
        const tableIndex = tables.findIndex(t => t === `T${order.tableNo}` || t === `T${parseInt(order.tableNo, 10)}`);
        if (tableIndex !== -1) {
          updatedColors[tableIndex] = 'blue';
        }
      });
      console.log('Updated table colors:', updatedColors);
      sessionStorage.setItem('tableColors', JSON.stringify(updatedColors));
      setTableColors(updatedColors);
    }, (error) => {
      console.error('Error fetching snapshot:', error);
    });

    return () => {
      console.log('Cleaning up Firestore listener...');
      unsubscribe();
    };
  }, [tables]);

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
    const newColors = [...tableColors, 'blank'];
    sessionStorage.setItem('tableColors', JSON.stringify(newColors));
    setTableColors(newColors);
  };

  const handleTableClick = (tableNumber) => {
    setSelectedTable(tableNumber);
    setView('details');
  };

  const handleRoomClick = (room) => {
    setActiveRoom(room);
  };

  const handleBackClick = () => {
    setView('overview');
  };

  const updateTableColor = (tableNumber, color) => {
    const tableIndex = tables.findIndex(t => t === tableNumber);
    if (tableIndex !== -1) {
      const updatedColors = [...tableColors];
      updatedColors[tableIndex] = color;
      setTableColors(updatedColors);
      sessionStorage.setItem('tableColors', JSON.stringify(updatedColors));
    }
  };

  return (
    <div className="table-overview">
      {view === 'overview' ? (
        <>
          <div className="header">
            <h1>{restaurantName} - Table Overview</h1>
            <button className="button add-table-btn" onClick={addTable}>+ Add Table</button>
            <button className="button logout-btn" onClick={handleLogout}>Logout</button>
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
          updateTableColor={updateTableColor}
        />
      )}
    </div>
  );
};

export default WelcomeHome;
