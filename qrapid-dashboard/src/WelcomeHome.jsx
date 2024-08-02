import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, backendDb } from './firebase-config';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
    const q = query(collection(backendDb, 'orders'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Real-time orders update:', querySnapshot.size);
      const updatedColors = [...tableColors];
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        console.log('Fetched order:', order);
        const tableIndex = tables.findIndex(t => t === `T${order.tableNo}` || t === `T${parseInt(order.tableNo, 10)}`);
        if (tableIndex !== -1 && order.status !== 'completed') {
          updatedColors[tableIndex] = 'blue';
        }
      });
      sessionStorage.setItem('tableColors', JSON.stringify(updatedColors));
      setTableColors(updatedColors);
    }, (error) => {
      console.error('Error fetching snapshot:', error);
    });

    return () => unsubscribe();
  }, [tables, tableColors]);

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

  const updateTableColor = async (tableNumber, color) => {
    const tableIndex = tables.findIndex(t => t === tableNumber);
    if (tableIndex !== -1) {
      const updatedColors = [...tableColors];
      updatedColors[tableIndex] = color;
      setTableColors(updatedColors);
      sessionStorage.setItem('tableColors', JSON.stringify(updatedColors));
      
      // Update Firestore with the new color
      const orderRef = doc(backendDb, 'orders', tableNumber);
      await updateDoc(orderRef, { color });
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
