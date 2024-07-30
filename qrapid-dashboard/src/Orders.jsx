import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { backendDb } from './firebase-config';
import './Orders.css';

const Orders = () => {
  const [view, setView] = useState('Table Service');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    console.log('Setting up Firestore listener for orders...');
    const q = query(collection(backendDb, 'orders'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Received Firestore snapshot.');
      const fetchedOrders = [];

      querySnapshot.forEach((doc) => {
        const order = doc.data();
        console.log('Fetched order:', order);
        fetchedOrders.push({
          id: doc.id,
          ...order,
        });
      });

      console.log('All fetched orders:', fetchedOrders);
      setOrders(fetchedOrders);
    });

    return () => {
      console.log('Cleaning up Firestore listener...');
      unsubscribe();
    };
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    console.log('Search term updated:', e.target.value);
  };

  const filteredOrders = orders.filter(order => {
    console.log('Order keys:', Object.keys(order)); // Log the keys of each order
    return order.id.toString().includes(searchTerm) ||
      (order.tableNo && order.tableNo.toString().includes(searchTerm)) ||
      (order.status && order.status.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  console.log('Filtered orders:', filteredOrders);

  // Adjusted to not filter by type since there is no type field in the orders
  const displayOrders = view === 'Table Service' ? filteredOrders : [];

  console.log('Displaying orders for view:', view, displayOrders);

  return (
    <div className="order-container">
      <div className="sidebar">
        <div className={`sidebar-item ${view === 'Table Service' ? 'active' : ''}`} onClick={() => { setView('Table Service'); console.log('View changed to Table Service'); }}>
          Table Service
        </div>
        <div className={`sidebar-item ${view === 'Parcel' ? 'active' : ''}`} onClick={() => { setView('Parcel'); console.log('View changed to Parcel'); }}>
          Parcel
        </div>
      </div>
      <div className="main-content">
        <h1>Order History</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for orders"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="status-filters">
          <button>All</button>
          <button>Open</button>
          <button>In Progress</button>
          <button>Ready</button>
          <button>Served</button>
          <button>Cancelled</button>
        </div>
        <table className="order-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>{view === 'Table Service' ? 'Table' : 'Parcel'}</th>
              <th>Items</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayOrders.map((order, index) => (
              <tr key={order.id}>
                <td>#{index + 1}</td>
                <td>{order.tableNo}</td>
                <td>
                  <ul>
                    {order.items && order.items.map((item, i) => (
                      <li key={i}>{item.name} - {item.price} x {item.quantity}</li>
                    ))}
                  </ul>
                </td>
                <td>{order.createdAt ? order.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                <td><button className="details-button" onClick={() => console.log('Details button clicked for order:', order.id)}>Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
