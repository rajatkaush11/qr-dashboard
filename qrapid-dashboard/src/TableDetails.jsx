import React, { useEffect, useState } from 'react';
import { backendDb } from './firebase-config';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState({ name: '', address: '', contact: '' });

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      const uid = localStorage.getItem('UID');
      if (!uid) {
        console.error("UID is not found in localStorage.");
        return;
      }

      const restaurantRef = doc(backendDb, 'restaurants', uid);
      const restaurantDoc = await getDoc(restaurantRef);
      if (restaurantDoc.exists()) {
        const data = restaurantDoc.data();
        setRestaurant({
          name: data.restaurantName || "No name provided",
          address: data.address || "No address provided",
          contact: data.contactNumber || "No contact provided"
        });
        console.log("Fetched restaurant details:", data);
      } else {
        console.error(`No restaurant found with UID: ${uid}`);
      }
    };

    fetchRestaurantDetails();

    // Normalize tableNumber to match the format in Firestore
    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
    console.log(`Querying for table number: ${normalizedTableNumber}`);

    const q = query(
      collection(backendDb, 'orders'),
      where('tableNo', '==', normalizedTableNumber),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Query snapshot size:', querySnapshot.size);
      console.log('Query snapshot data:', querySnapshot.docs.map(doc => doc.data()));
      if (!querySnapshot.empty) {
        const latestOrder = querySnapshot.docs[0].data();
        setOrder(latestOrder);
        console.log("Latest order fetched:", latestOrder);
      } else {
        setOrder(null);
        console.log("No orders found for this table.");
      }
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
          content += `\x1b\x21\x30`;
          content += `*** ${restaurant.name.toUpperCase()} ***\n`;
          content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`;
          content += `\x1b\x21\x00`;
          content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
          content += `Bill No: ${order.id}    Table No: ${order.tableNo}\n\n`;
          order.items.forEach(item => {
            content += `${item.name} (${item.specialNote}) - ${item.quantity}\n`;
          });
          content += `Total Items to Prepare: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}\n\n`;
        } else {
          content += `\x1b\x21\x30`;
          content += `*** ${restaurant.name.toUpperCase()} ***\n`;
          content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`;
          content += `\x1b\x21\x00`;
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
    if (!order) return;
    await printContent(order, true);
    updateTableColor(tableNumber, 'orange');
  };

  const handleGenerateBill = async () => {
    if (!order) return;
    await printContent(order, false);
    updateTableColor(tableNumber, 'green');
  };

  const handleCompleteOrder = () => {
    setOrder(null);  // Clear current order
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
        {!order ? (
          <p>No current orders.</p>
        ) : (
          <div className="order-item">
            <p><strong>Name:</strong> {order.name}</p>
            <p><strong>Items:</strong></p>
            <ul>
              {order.items.map((item, index) => (
                <li key={index}>{item.name} - {item.price} x {item.quantity}</li>
              ))}
            </ul>
          </div>
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
