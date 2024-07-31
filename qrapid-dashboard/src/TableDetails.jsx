import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      // Assuming the restaurant ID is stored in the local storage or could be inferred
      const restaurantId = localStorage.getItem('restaurantId');
      if (restaurantId) {
        const restaurantRef = doc(backendDb, 'restaurants', restaurantId);
        const restaurantDoc = await getDoc(restaurantRef);
        if (restaurantDoc.exists()) {
          setRestaurantName(restaurantDoc.data().restaurantName);
        } else {
          console.log('No such restaurant!');
        }
      }
    };

    fetchRestaurantDetails();

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

  const printContent = async (order, isKOT) => {
    if ('serial' in navigator) {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 }); // Set baud rate as per printer specification
  
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      let content = '';
  
      if (isKOT) {
        // KOT Formatting
        content += `\x1b\x21\x30`; // Double height and width for the restaurant name
        content += `*** ${restaurantName.toUpperCase()} ***\n\n`; // Restaurant name in bold and centered
        content += `\x1b\x21\x08`; // Normal height but double width for the address
        content += `${restaurantAddress}\n\n`; // Address in medium font, centered
        content += `\x1b\x21\x00`; // Normal text size
        content += `Date: ${new Date().toLocaleDateString()}    `; // Date on left
        content += `Time: ${new Date().toLocaleTimeString()}\n`; // Time on right
        content += `\x1b\x21\x08`; // Double width for emphasis
        content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`; // Bill and table number
        content += `\x1b\x21\x00`; // Return to normal text size
        order.items.forEach(item => {
          content += `${item.name} (${item.specialNote}) - ${item.quantity}\n`; // Items with special notes
        });
        content += `Total Items to Prepare: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}\n`; // Total quantity
      } else {
        // Bill Formatting
        content += `\x1b\x21\x30`; // Bold + double-size font
        content += `*** ${restaurantName.toUpperCase()} ***\n`; // Restaurant name in bold and centered
        content += `\x1b\x21\x08`; // Normal height but double width for the address
        content += `${restaurantAddress}\n`; // Address centered
        content += `\x1b\x21\x00`; // Normal text size
        content += `Date: ${new Date().toLocaleDateString()}    `; // Date on left
        content += `Time: ${new Date().toLocaleTimeString()}\n`; // Time on right
        content += `\x1b\x21\x08`; // Double width for emphasis
        content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`; // Bill and table number
        content += `\x1b\x21\x00`; // Return to normal text size
        let totalAmount = 0;
        order.items.forEach(item => {
          const itemTotal = item.price * item.quantity;
          totalAmount += itemTotal;
          content += `${item.name} - ${item.quantity} x ${item.price} = ${itemTotal}\n`; // Itemized breakdown
        });
        content += `Sub Total: ${totalAmount}\n`;
        content += `Discount: -${order.discount}\n`;
        content += `CGST: +${order.cgst}\n`;
        content += `SGST: +${order.sgst}\n`;
        content += `Grand Total: ${totalAmount + order.cgst + order.sgst - order.discount}\n\n`;
        content += 'Thank you for dining with us!\n'; // Thank you note centered
        content += '--------------------------------\n'; // Cut line
      }
  
      await writer.write(encoder.encode(content));
      writer.releaseLock();
      await port.close();
      console.log(isKOT ? 'KOT printed successfully' : 'Bill printed successfully');
    } else {
      console.error("Web Serial API not supported.");
    }
  };
  
  
  

  const handleGenerateKOT = async () => {
    if (orders.length === 0) return;
    const order = orders[0];
    await printContent(order, true);
    updateTableColor(tableNumber, 'orange');
  };

  const handleGenerateBill = async () => {
    if (orders.length === 0) return;
    const order = orders[0];
    await printContent(order, false);
    updateTableColor(tableNumber, 'green');
  };

  const handleCompleteOrder = () => {
    updateTableColor(tableNumber, 'blank');
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
