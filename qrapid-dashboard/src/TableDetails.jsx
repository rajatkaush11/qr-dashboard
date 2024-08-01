// TableDetails.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, writeBatch } from 'firebase/firestore';
import { backendDb } from './firebase-config';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState({ name: '', address: '', contact: '' });
  const [completedOrderIds, setCompletedOrderIds] = useState([]);

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
      } else {
        console.error(`No restaurant found with UID: ${uid}`);
      }
    };

    fetchRestaurantDetails();

    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;

    const q = query(
      collection(backendDb, 'orders'),
      where('tableNo', '==', normalizedTableNumber),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(allOrders);
      if (allOrders.length > 0) {
        updateTableColor(`T${normalizedTableNumber}`, 'blue');
      } else {
        updateTableColor(`T${normalizedTableNumber}`, 'blank');
      }
    }, (error) => {
      console.error('Error fetching orders:', error);
    });

    const fetchCompletedOrderIds = async () => {
      const q = query(collection(backendDb, 'bills'));
      const querySnapshot = await getDocs(q);
      const ids = querySnapshot.docs.map(doc => doc.data().orderId);
      setCompletedOrderIds(ids);
    };

    fetchCompletedOrderIds();

    return () => unsubscribe();
  }, [tableNumber, updateTableColor]);

  const printContent = async (orders, isKOT) => {
    if ('serial' in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        let content = '';

        content += `\x1b\x21\x30`;
        content += `*** ${restaurant.name.toUpperCase()} ***\n`;
        content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`;
        content += `\x1b\x21\x00`;
        content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
        content += `Table No: ${tableNumber}\n\n`;

        if (isKOT) {
          orders.forEach(order => {
            order.items.forEach(item => {
              content += `${item.name} (${item.specialNote || ''}) - ${item.quantity}\n`;
            });
          });
          const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
          content += `Total Items to Prepare: ${totalItems}\n\n`;
        } else {
          let totalAmount = 0;
          orders.forEach(order => {
            order.items.forEach(item => {
              const itemTotal = item.price * item.quantity;
              totalAmount += itemTotal;
              content += `${item.name} - ${item.quantity} x ${item.price} = ${itemTotal}\n`;
            });
          });
          const discount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
          const cgst = totalAmount * 0.025;
          const sgst = totalAmount * 0.025;
          const grandTotal = totalAmount - discount + cgst + sgst;
          content += `Sub Total: ${totalAmount}\n`;
          content += `Discount: -${discount}\n`;
          content += `CGST: +${cgst}\n`;
          content += `SGST: +${sgst}\n`;
          content += `Grand Total: ${grandTotal}\n\n`;
          content += 'Thank you for dining with us!\n';
          content += '--------------------------------\n';
        }

        await writer.write(encoder.encode(content));
        writer.releaseLock();
        await port.close();
      } catch (error) {
        console.error("Failed to print content via serial:", error);
      }
    } else {
      console.error("Web Serial API not supported.");
    }
  };

  const handleGenerateKOT = async () => {
    const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
    if (filteredOrders.length === 0) return;
    await printContent(filteredOrders, true);
    updateTableColor(`T${tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber}`, 'orange');
  };

  const handleGenerateBill = async () => {
    const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
    if (filteredOrders.length === 0) return;
    await printContent(filteredOrders, false);
    updateTableColor(`T${tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber}`, 'green');
  };

  const handleCompleteOrder = async () => {
    const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
    const batch = writeBatch(backendDb);

    filteredOrders.forEach(order => {
      const billRef = doc(collection(backendDb, 'bills'));
      batch.set(billRef, { orderId: order.id, ...order });
    });

    await batch.commit();

    setCompletedOrderIds([...completedOrderIds, ...filteredOrders.map(order => order.id)]);
    updateTableColor(`T${tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber}`, 'blank');
  };

  return (
    <div className="table-details">
      <div className="header">
        <button onClick={onBackClick} className="back-button">Back</button>
        <h2>Table {tableNumber} Details</h2>
      </div>
      <div className="current-order">
        <h3>Current Orders</h3>
        {orders.length === 0 ? (
          <p>No current orders.</p>
        ) : (
          orders
            .filter(order => !completedOrderIds.includes(order.id))
            .map((order, orderIndex) => (
              <div className="order-item" key={orderIndex}>
                <p><strong>Name:</strong> {order.name}</p>
                <p><strong>Items:</strong></p>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>{item.name} - {item.price} x {item.quantity}</li>
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
