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
      await printContent(order, true); // true for KOT
      updateTableColor(tableNumber, 'orange'); // Update color to Running KOT Table (orange)
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };

  const handleGenerateBill = async () => {
    if (orders.length === 0) return;

    const order = orders[0];
    try {
      await printContent(order, false); // false for Bill
      updateTableColor(tableNumber, 'green'); // Update color to Printed Table (green)
    } catch (error) {
      console.error('Error generating bill:', error);
    }
  };

  const handleCompleteOrder = () => {
    updateTableColor(tableNumber, 'blank'); // Update color to Blank Table (grey)
  };

  const printContent = async (order, isKOT) => {
    try {
      // Request device with Bluetooth service and characteristic UUIDs
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'SAMPANN Regular' }],
        optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // Common UUID for Serial Port Profile
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb'); // Update to correct characteristic UUID

      // Generate content based on the type (KOT or Bill)
      let content = `Table No: ${order.tableNo}\nOrder ID: ${order.id}\nItems:\n`;
      let totalAmount = 0;
      order.items.forEach(item => {
        if (isKOT) {
          content += `${item.name} x ${item.quantity}\n`;
        } else {
          const itemTotal = item.price * item.quantity;
          totalAmount += itemTotal;
          content += `${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`;
        }
      });
      if (!isKOT) {
        content += `\nTotal Amount: ${totalAmount}\nThank you for dining with us!`;
      }

      // Convert to ArrayBuffer
      const encoder = new TextEncoder();
      const data = encoder.encode(content);

      // Write data to Bluetooth characteristic
      await characteristic.writeValue(data);
      console.log(isKOT ? 'KOT printed successfully' : 'Bill printed successfully');
    } catch (error) {
      console.error(isKOT ? 'Error printing KOT:' : 'Error printing bill:', error);
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
        <button onClick={handleGenerateBill} className="action-button">Generate Bill</button>
        <button onClick={handleCompleteOrder} className="action-button">Complete Order</button>
      </div>
    </div>
  );
};

export default TableDetails;
