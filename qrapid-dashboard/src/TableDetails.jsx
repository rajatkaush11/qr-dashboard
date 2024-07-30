import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config'; // Import backendDb
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
    const q = query(collection(backendDb, 'orders'), where('tableNo', '==', normalizedTableNumber)); // Use backendDb

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      console.log(`Real-time update for table ${tableNumber}:`, querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        console.log('Fetched order for table:', tableNumber, order);
        ordersData.push(order);
      });
      setOrders(ordersData);
    }, (error) => {
      console.error('Error fetching snapshot:', error);
    });

    return () => unsubscribe();
  }, [tableNumber]);

  const handleGenerateKOT = () => {
    updateTableColor(tableNumber, 'orange'); // Update color to Running KOT Table (orange)
  };

  const handleGenerateBill = () => {
    updateTableColor(tableNumber, 'green'); // Update color to Printed Table (green)
  };

  const handleCompleteOrder = () => {
    updateTableColor(tableNumber, 'blank'); // Update color to Blank Table (grey)
  };

  return (
    <div className="table-details">
      <div className="header">
        <button onClick={onBackClick} className="back-button">Back</button>
        <h2>Table {tableNumber} Details</h2>
      </div>
      <div className="current-order">
        <h3>Current Order</h3>
        {orders.length === 0 ? (
          <p>No current orders.</p>
        ) : (
          orders.map((order, index) => (
            <div key={index} className="order-item">
              <p><strong>Name:</strong> {order.name}</p>
              <p><strong>Items:</strong></p>
              <ul>
                {order.items.map((item, i) => (
                  <li key={i}>{item.name} - {item.price} x {item.quantity}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <div className="action-buttons">
        <button onClick={handleGenerateKOT} className="action-button">Generate KOT</button>
        <button onClick={handleGenerateBill} className="action-button">Generate Bill</button>
        <button onClick={handleCompleteOrder} className="action-button">Complete Order</button>
      </div>
    </div>
  );
};

export default TableDetails;
