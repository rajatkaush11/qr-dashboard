import React, { useEffect, useState } from 'react';
import { db } from './firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, onGenerateKOT, onGenerateBill, onComplete }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('tableNo', '==', tableNumber));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push(doc.data());
      });
      setOrders(ordersData);
    });

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, [tableNumber]);

  return (
    <div className="table-details">
      <button onClick={onBackClick}>Back</button>
      <h2>Table {tableNumber} Details</h2>
      <div className="order-list">
        <h3>Current Order</h3>
        {orders.map((order, index) => (
          <div key={index} className="order-item">
            <p><strong>Name:</strong> {order.name}</p>
            <p><strong>WhatsApp:</strong> {order.whatsapp}</p>
            <p><strong>Items:</strong></p>
            <ul>
              {order.items.map((item, i) => (
                <li key={i}>{item.name} - {item.price} x {item.quantity}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button onClick={onGenerateKOT}>Generate KOT</button>
      <button onClick={onGenerateBill}>Generate Bill</button>
      <button onClick={onComplete}>Complete Order</button>
    </div>
  );
};

export default TableDetails;
