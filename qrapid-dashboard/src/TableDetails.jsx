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
  
      // Fetch additional restaurant details, assumed to be stored in state or fetched previously
      const restaurantAddress = "123 Example St, City";
      const contactNumber = "(123) 456-7890";
      const discount = order.discount || 0; // Assuming discount is part of order object
      const cgst = order.cgst || 0; // Central Goods and Services Tax
      const sgst = order.sgst || 0; // State Goods and Services Tax
  
      // Header
      let content = `\n*** ${restaurantName.toUpperCase()} ***\n`;
      content += `${restaurantAddress}\n`;
      content += `Contact: ${contactNumber}\n\n`;
  
      // Order details
      content += `Date: ${new Date().toLocaleDateString()}\n`;
      content += `Time: ${new Date().toLocaleTimeString()}\n`;
      content += `Bill No: ${order.id}\n\n`;
      content += `Items Ordered:\n`;
  
      let totalAmount = 0;
      let totalQuantity = 0;
      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        totalQuantity += item.quantity;
        content += `${item.name} - ${item.quantity} x ${item.price} = ${itemTotal}\n`;
      });
  
      // Totals and taxes
      content += `\nTotal Items: ${totalQuantity}\n`;
      content += `Sub Total: ${totalAmount}\n`;
      content += `Discount: -${discount}\n`;
      content += `CGST: +${cgst}\n`;
      content += `SGST: +${sgst}\n`;
  
      const grandTotal = totalAmount + cgst + sgst - discount;
      content += `Grand Total: ${grandTotal}\n`;
  
      // Footer
      content += '\n--------------------------------\n'; // Dashed line for cut here indication
      content += 'Thank you for dining with us!\n\n';
  
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
