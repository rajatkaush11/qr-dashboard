import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState({ name: '', address: '' });

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        const restaurantId = localStorage.getItem('restaurantId');
        if (!restaurantId) {
          console.error("Restaurant ID is not found in localStorage.");
          return;
        }

        const restaurantRef = doc(backendDb, 'restaurants', restaurantId);
        const restaurantDoc = await getDoc(restaurantRef);

        if (restaurantDoc.exists()) {
          const data = restaurantDoc.data();
          setRestaurant({
            name: data.restaurantName || "No name provided",
            address: data.address || "No address provided"
          });
          console.log("Fetched restaurant details:", data);
        } else {
          console.error(`No restaurant found with ID: ${restaurantId}`);
        }
      } catch (error) {
        console.error("Error fetching restaurant details:", error);
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
      console.log("Orders fetched:", ordersData);
    }, (error) => {
      console.error('Error fetching orders:', error);
    });

    return () => unsubscribe();
  }, [tableNumber]);

  const printContent = async (order, isKOT) => {
    if ('serial' in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        let content = '';

        if (isKOT) {
          content += `\x1b\x21\x30`; // Commands for text formatting
          content += `*** ${restaurant.name.toUpperCase()} ***\n`;
          content += `${restaurant.address}\n\n`;
          content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
          content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`;
          order.items.forEach(item => {
            content += `${item.name} - ${item.quantity}\n`;
          });
          content += `Total Items to Prepare: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}\n\n`;
        } else {
          content += `\x1b\x21\x30`; // Commands for text formatting
          content += `*** ${restaurant.name.toUpperCase()} ***\n`;
          content += `${restaurant.address}\n`;
          content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
          content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`;
          let totalAmount = 0;
          order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            content += `${item.name} - ${item.quantity} x ${item.price} = ${itemTotal}\n`;
          });
          content += `Sub Total: ${totalAmount}\n`;
          content += `Thank you for dining with us!\n`;
          content += '--------------------------------\n';
        }

        await writer.write(encoder.encode(content));
        writer.releaseLock();
        await port.close();
        console.log(isKOT ? 'KOT printed successfully' : 'Bill printed successfully');
      } catch (error) {
        console.error("Failed to print content via serial:", error);
      }
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
