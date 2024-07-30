import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from './firebase-config'; // Ensure you import the auth object
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
    const q = query(collection(backendDb, 'orders'), where('tableNo', '==', normalizedTableNumber));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        ordersData.push(order);
      });
      setOrders(ordersData);
    }, (error) => {
      console.error('Error fetching snapshot:', error);
    });

    return () => unsubscribe();
  }, [tableNumber]);

  const makeRequest = async (url, order) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber,
          orderId: order.id,
          uid: auth.currentUser.uid // Pass the current user's UID
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process request: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error making request to ${url}:`, error);
      throw error;
    }
  };

  const handleGenerateKOT = async () => {
    if (orders.length === 0) return;

    const order = orders[0];
    try {
      const result = await makeRequest('https://us-central1-qr-dashboard-1107.cloudfunctions.net/printKOT', order);
      if (result.success) {
        updateTableColor(tableNumber, 'orange'); // Update color to Running KOT Table (orange)
      }
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };

  const handleGenerateBill = async () => {
    if (orders.length === 0) return;

    const order = orders[0];
    try {
      const result = await makeRequest('https://us-central1-qr-dashboard-1107.cloudfunctions.net/printBill', order);
      if (result.success) {
        updateTableColor(tableNumber, 'green'); // Update color to Printed Table (green)
      }
    } catch (error) {
      console.error('Error generating bill:', error);
    }
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
