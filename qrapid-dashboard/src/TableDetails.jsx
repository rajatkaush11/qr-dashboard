import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

  const handleGenerateKOT = async () => {
    if (orders.length === 0) return;
    const order = orders[0];
    try {
      await printKOT(order);
      updateTableColor(tableNumber, 'orange'); // Update color to Running KOT Table (orange)
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };

  const printKOT = async (order) => {
    if ('serial' in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });  // Make sure baud rate matches your printer's specifications

        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();

        // Generate KOT content
        let kotContent = `Table No: ${order.tableNo}\nOrder ID: ${order.id}\nItems:\n`;
        order.items.forEach(item => {
          kotContent += `${item.name} x ${item.quantity}\n`;
        });

        // Send the KOT content to the printer
        await writer.write(encoder.encode(kotContent));
        writer.releaseLock();

        await port.close();
        console.log('KOT printed successfully');
      } catch (error) {
        console.error('Error connecting to Bluetooth device:', error);
      }
    } else {
      console.log('Web Serial API not supported.');
    }
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
      </div>
    </div>
  );
};

export default TableDetails;
