import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState({ name: '', address: '', contact: '' });

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      const uid = localStorage.getItem('UID');  // Retrieve UID from localStorage
      if (!uid) {
        console.error("UID is not found in localStorage.");
        return;
      }

      const restaurantRef = doc(backendDb, 'restaurants', uid);  // Use UID to reference the correct document
      const restaurantDoc = await getDoc(restaurantRef);
      if (restaurantDoc.exists()) {
        const data = restaurantDoc.data();
        setRestaurant({
          name: data.restaurantName || "No name provided",
          address: data.address || "No address provided",
          contact: data.contactNumber || "No contact provided"  // Assuming contactNumber field exists
        });
        console.log("Fetched restaurant details:", data);
      } else {
        console.error(`No restaurant found with UID: ${uid}`);
      }
    };

    fetchRestaurantDetails();

    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
    const q = query(
      collection(backendDb, 'orders'),
      where('tableNo', '==', normalizedTableNumber),
      where('status', '!=', 'completed') // Fetch only non-completed orders
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        ordersData.push({ id: doc.id, ...order });
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
          // KOT Formatting
          content += `\x1b\x21\x30`; // Double height and width for the restaurant name
          content += `*** ${restaurant.name.toUpperCase()} ***\n`; // Restaurant name in bold and centered
          content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`; // Address and contact in medium font, centered
          content += `\x1b\x21\x00`; // Normal text size
          content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
          content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`;
          order.items.forEach(item => {
            content += `${item.name} (${item.specialNote}) - ${item.quantity}\n`; // Items with special notes
          });
          content += `Total Items to Prepare: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}\n\n`;
        } else {
          // Bill Formatting
          content += `\x1b\x21\x30`; // Bold + double-size font
          content += `*** ${restaurant.name.toUpperCase()} ***\n`; // Restaurant name in bold and centered
          content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`; // Address and contact in medium font, centered
          content += `\x1b\x21\x00`; // Normal text size
          content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
          content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`;
          let totalAmount = 0;
          order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            content += `${item.name} - ${item.quantity} x ${item.price} = ${itemTotal}\n`;
          });
          content += `Sub Total: ${totalAmount}\n`;
          content += `Discount: -${order.discount || 0}\n`;
          content += `CGST: +${order.cgst || 0}\n`;
          content += `SGST: +${order.sgst || 0}\n`;
          content += `Grand Total: ${totalAmount + (order.cgst || 0) + (order.sgst || 0) - (order.discount || 0)}\n\n`;
          content += 'Thank you for dining with us!\n';
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

  const handleCompleteOrder = async () => {
    if (orders.length === 0) return;
    const order = orders[0];
    const orderRef = doc(backendDb, 'orders', order.id);
    await updateDoc(orderRef, { status: 'completed' });
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
        <button onClick={() => handleGenerateKOT()} className="action-button">Generate KOT</button>
        <button onClick={() => handleGenerateBill()} className="action-button">Generate Bill</button>
        <button onClick={() => handleCompleteOrder()} className="action-button">Complete Order</button>
      </div>
    </div>
  );
};

export default TableDetails;
