import React, { useEffect, useState, useRef } from 'react';
import { backendDb, db, auth } from './firebase-config';
import { collection, writeBatch, doc, setDoc, deleteDoc, Timestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import './TableDetails.css';
import successSound from './assets/success.mp3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import ReactToPrint from 'react-to-print';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [completedOrderIds, setCompletedOrderIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [kotTime, setKotTime] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [bestTimeToken, setBestTimeToken] = useState(null);

  const kotRef = useRef();
  const billRef = useRef();

  const playSound = () => {
    const audio = new Audio(successSound);
    audio.play().catch(error => console.error('Error playing sound:', error));
  };

  useEffect(() => {
    const fetchBestTimeToken = async () => {
      try {
        const uid = auth.currentUser?.uid;

        if (uid) {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/restaurant/${uid}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser?.accessToken}`,
            },
          });

          const data = await response.json();
          if (data.bestTimeToken) {
            setBestTimeToken(data.bestTimeToken);
          } else {
            console.error('bestTimeToken not found in the response');
          }
        }
      } catch (error) {
        console.error('Error fetching bestTimeToken:', error);
      }
    };

    fetchBestTimeToken();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!bestTimeToken) return;

      try {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/categories/${userId}`, {
          headers: {
            Authorization: `Bearer ${bestTimeToken}`,
          },
        });
        const categoriesData = await response.json();

        if (response.ok) {
          setCategories(categoriesData);
        } else {
          console.error("Failed to fetch categories:", categoriesData);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    if (bestTimeToken) {
      fetchCategories();
    }
  }, [bestTimeToken]);

  useEffect(() => {
    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
    const q = query(
      collection(backendDb, 'orders'),
      where('tableNo', '==', normalizedTableNumber),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });

    const billsRef = collection(db, 'bills');
    const unsubscribeCompletedOrderIds = onSnapshot(billsRef, (querySnapshot) => {
      const ids = querySnapshot.docs.map(doc => doc.data().orderId);
      setCompletedOrderIds(ids);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeCompletedOrderIds();
    };
  }, [tableNumber, updateTableColor]);

  useEffect(() => {
    const allOrders = [...orders];
    const kotOrders = allOrders.filter(order => order.status === 'KOT');

    if (kotOrders.length > 0) {
      updateTableColor(tableNumber, 'orange');
      if (!kotTime) {
        const now = new Date();
        const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        });
        setKotTime(istTime);
      }
    } else if (allOrders.length > 0 && allOrders.every(order => order.status === 'billed')) {
      updateTableColor(tableNumber, 'green');
    } else {
      updateTableColor(tableNumber, 'blank');
      setKotTime('');
    }
  }, [orders, tableNumber, updateTableColor, kotTime]);

  const calculateTotalAmount = (orders) => {
    return orders.reduce((total, order) => {
      return total + order.items.reduce((subTotal, item) => subTotal + (item.price * item.quantity), 0);
    }, 0);
  };

  const populateKOTPrintSection = (filteredOrders) => {
    const kotContent = filteredOrders.map(order => {
        const formattedItems = order.items.map(item => 
          `<div style="font-size: 20px; margin-bottom: 5px;">
             <strong>${item.quantity.toString().padEnd(3)}</strong> ${item.name}
           </div>`
        ).join('');

        return `
          <div style="margin-top: 0; padding: 0;">
            <div style="font-size: 22px; font-weight: bold;">Running KOT</div>
            <div style="display: flex; justify-content: space-between;">
              <strong style="font-size: 18px;">Table No: ${order.tableNo}</strong>
              <span style="font-size: 18px;">
                ${new Date(order.createdAt.toDate()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                ${new Date(order.createdAt.toDate()).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata'
                })}
              </span>
            </div>
          </div>
          <div style="margin-top: 5px; padding: 0;">
            ${formattedItems}
          </div>
          <div style="margin-top: 5px; padding: 0;">
            <strong style="font-size: 20px;">Total Items: ${order.items.reduce((total, item) => total + item.quantity, 0)}</strong>
          </div>
          <hr style="border: 0; border-top: 2px solid #000; margin: 5px 0;" />
        `;
    }).join('');
    
    kotRef.current.innerHTML = `
      <div style="font-family: monospace; white-space: pre; font-size: 16px; line-height: 1.3; margin: 0; padding: 0;">
        ${kotContent}
      </div>
    `;
  };

  const handleGenerateKOT = async () => {
    try {
      const allOrders = [...orders, ...currentOrder];
      const filteredOrders = allOrders.filter(order => !completedOrderIds.includes(order.id));
  
      if (filteredOrders.length === 0) {
        console.log('No orders to generate KOT');
        return;
      }
  
      // Add currentOrder to orders list before moving to KOT
      const now = new Date();
      const istTime = Timestamp.fromDate(new Date(now.getTime() + 5.5 * 60 * 60 * 1000));
      const newOrders = currentOrder.map(item => ({
        id: `temp-${Date.now()}-${item.id}`,
        tableNo: tableNumber.slice(1),
        items: [item],
        status: 'KOT',
        createdAt: Timestamp.fromDate(now),
        istTime,
      }));
  
      for (const order of newOrders) {
        await setDoc(doc(collection(backendDb, 'manual-orders'), order.id), order);
      }
  
      setOrders([...orders, ...newOrders]);
      setCurrentOrder([]);
      setKotTime(istTime.toDate().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }));
  
      populateKOTPrintSection(filteredOrders.concat(newOrders));
  
      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay to ensure content is ready for printing
  
      // Trigger print window
      if (kotRef.current) {
        kotRef.current.style.display = 'block'; // Ensure content is available for printing
        window.print();
      }
  
      console.log('KOT generated successfully');
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };
  
  const handleGenerateBill = async () => {
    try {
      const filteredOrders = [...orders].filter(order => !completedOrderIds.includes(order.id));
      if (filteredOrders.length === 0) {
        console.log('No orders to generate Bill');
        return;
      }

      const amount = calculateTotalAmount(filteredOrders);
      setTotalAmount(amount);

      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay to ensure content is ready for printing

      console.log('Bill generated successfully');
    } catch (error) {
      console.error('Error generating Bill:', error);
    }
  };

  const handleCompleteOrder = async () => {
    try {
      const filteredOrders = [...orders].filter(order => !completedOrderIds.includes(order.id));

      if (filteredOrders.length === 0) {
        console.log('No orders to complete');
        return;
      }

      // Move orders to 'completed' and update Firestore
      const batch = writeBatch(db);
      filteredOrders.forEach(order => {
        const billRef = doc(collection(db, 'bills'));
        batch.set(billRef, { orderId: order.id, ...order });
      });
      await batch.commit();

      // Update UI and clear orders
      setCompletedOrderIds([...completedOrderIds, ...filteredOrders.map(order => order.id)]);
      setOrders(prevOrders => prevOrders.filter(order => !filteredOrders.map(o => o.id).includes(order.id)));
      setCurrentOrder([]);

      await updateTableColor(tableNumber, 'blank');

      console.log('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const handleItemClick = (item) => {
    setCurrentOrder((prevOrder) => {
      const existingItem = prevOrder.find((orderItem) => orderItem.id === item.id);
      if (existingItem) {
        return prevOrder.map((orderItem) =>
          orderItem.id === item.id ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem
        );
      }
      playSound();
      return [...prevOrder, { ...item, quantity: 1 }];
    });
  };

  const handleIncrement = (itemId) => {
    setCurrentOrder((prevOrder) =>
      prevOrder.map((orderItem) =>
        orderItem.id === itemId ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem
      )
    );
  };

  const handleDecrement = (itemId) => {
    setCurrentOrder((prevOrder) =>
      prevOrder
        .map((orderItem) =>
          orderItem.id === itemId ? { ...orderItem, quantity: orderItem.quantity - 1 } : orderItem
        )
        .filter((orderItem) => orderItem.quantity > 0)
    );
  };

  const handleDelete = async (itemId) => {
    const itemToDelete = currentOrder.find(orderItem => orderItem.id === itemId);
    if (itemToDelete) {
      const reason = prompt('Please provide a reason for deleting this item:');
      if (reason) {
        setCurrentOrder((prevOrder) => prevOrder.filter((orderItem) => orderItem.id !== itemId));
      }
    }
  };

  return (
    <div className="table-details">
      <div className="right-content">
        <button className="back-button" onClick={onBackClick}>Back</button>
        <div className="menu-category">MENU</div>
        {categories.map((category) => (
          <div
            key={category.id}
            className={`menu-category ${selectedCategory && selectedCategory.id === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category.name}
          </div>
        ))}
      </div>
      <div className="middle-content">
        <div className="table-title">Table {tableNumber}</div>
        <div className="kot-generated">
          <h3>KOT Generated <span>{kotTime}</span></h3>
          {orders.filter(order => order.status === 'KOT').map((order, orderIndex) => (
            <div className="order-item" key={orderIndex}>
              <FontAwesomeIcon icon={faTrash} className="delete-button" onClick={() => handleDelete(order.id)} />
              <p><strong>{order.name}</strong></p>
              <p>{order.items.map(item => `${item.quantity} x ${item.name}`).join(', ')}</p>
              <p><strong>{order.items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}</strong></p>
            </div>
          ))}
        </div>
        <div className="current-orders">
          <h3>Current Orders</h3>
          {orders.concat(currentOrder).length === 0 ? (
            <p>No orders.</p>
          ) : (
            orders.concat(currentOrder)
              .filter(order => order.status !== 'completed' && order.status !== 'KOT')
              .map((order, orderIndex) => (
                <div className="order-item" key={orderIndex}>
                  <p><strong>Name:</strong> {order.name}</p>
                  <p><strong>Items:</strong></p>
                  <ul>
                    {order.items && order.items.map((item, index) => (
                      <li key={index}>{item.name} - {item.price} x {item.quantity}</li>
                    ))}
                  </ul>
                </div>
              ))
          )}
        </div>
        <div className="action-buttons">
          <ReactToPrint
            trigger={() => <button className="action-button generate-kot">Generate KOT</button>}
            content={() => kotRef.current}
            onBeforeGetContent={handleGenerateKOT}
            onAfterPrint={() => {
              kotRef.current.style.display = 'none'; // Hide after printing
              console.log('KOT print completed.');
            }}
          />
          <ReactToPrint
            trigger={() => <button className="action-button generate-bill">Generate Bill</button>}
            content={() => billRef.current}
            onBeforeGetContent={handleGenerateBill}
            onAfterPrint={() => {
              billRef.current.style.display = 'none'; // Hide after printing
              console.log('Bill print completed.');
            }}
          />
          <button onClick={handleCompleteOrder} className="action-button complete">Complete Order</button>
        </div>
      </div>
      <div className="left-menu">
        <div className="item-list">
          <div className="items">
            <h3>{selectedCategory ? `${selectedCategory.name} Items` : 'Items'}</h3>
            <div className="item-grid">
              {items.length === 0 ? (
                <p>Select a category to view items</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="menu-item" onClick={() => handleItemClick(item)}>
                    <p>{item.name}</p>
                    <p>{item.price}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print-Ready KOT Section */}
      <div id="print-kot" ref={kotRef} style={{ display: 'none', fontFamily: 'monospace', whiteSpace: 'pre' }}>
        {/* KOT content will be populated dynamically */}
      </div>

      {/* Print-Ready Bill Section */}
      <div id="print-bill" ref={billRef} style={{ display: 'none', fontFamily: 'monospace', whiteSpace: 'pre' }}>
        {/* Bill content will be populated dynamically */}
      </div>
    </div>
  );
};

export default TableDetails;
