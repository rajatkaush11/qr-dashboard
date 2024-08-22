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
  const [temporaryOrders, setTemporaryOrders] = useState([]);
  const [kotTime, setKotTime] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [kotReady, setKotReady] = useState(false);
  const [bestTimeToken, setBestTimeToken] = useState(null);

  const kotRef = useRef();
  const billRef = useRef();

  let printer = null;

  useEffect(() => {
    const ePosDevice = new window.epson.ePOSDevice();
    ePosDevice.connect('192.168.29.12', window.epson.ePOSDevice.DEVICE_TYPE_PRINTER, {
      success: (device) => {
        printer = device;
        printer.onreceive = (response) => {
          if (response.success) {
            console.log('Print successful');
          } else {
            console.log('Print failed');
          }
        };
      },
      error: (error) => {
        console.log('Failed to connect:', error);
      }
    });
  }, []);

  const playSound = () => {
    const audio = new Audio(successSound);
    audio.play().catch(error => console.error('Error playing sound:', error));
  };

  useEffect(() => {
    const fetchBestTimeToken = async () => {
      try {
        const uid = auth.currentUser?.uid;

        if (uid) {
          console.log("Fetching bestTimeToken for UID:", uid);

          const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/restaurant/${uid}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.currentUser?.accessToken}`,
            },
          });

          const data = await response.json();
          if (data.bestTimeToken) {
            console.log("Fetched bestTimeToken:", data.bestTimeToken);
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
        console.log("Fetching categories from backend for user:", userId);

        const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/categories/${userId}`, {
          headers: {
            Authorization: `Bearer ${bestTimeToken}`,
          },
        });
        const categoriesData = await response.json();

        if (response.ok) {
          setCategories(categoriesData);
          console.log("Fetched categories successfully:", categoriesData);
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
    if (selectedCategory) {
      const fetchItems = async () => {
        try {
          console.log("Fetching items for category:", selectedCategory.id);

          const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/items/${selectedCategory.id}`, {
            headers: {
              Authorization: `Bearer ${bestTimeToken}`,
            },
          });
          const itemsData = await response.json();

          if (response.ok) {
            setItems(itemsData);
            console.log("Fetched items successfully:", itemsData);
          } else {
            console.error("Failed to fetch items:", itemsData);
          }
        } catch (error) {
          console.error("Error fetching items:", error);
        }
      };

      fetchItems();
    }
  }, [selectedCategory, bestTimeToken]);

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

    const tempOrdersRef = collection(backendDb, 'manual-orders');
    const unsubscribeTemporaryOrders = onSnapshot(tempOrdersRef, (querySnapshot) => {
      const tempOrdersData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.tableNo === normalizedTableNumber);
      setTemporaryOrders(tempOrdersData);
    });

    const billsRef = collection(db, 'bills');
    const unsubscribeCompletedOrderIds = onSnapshot(billsRef, (querySnapshot) => {
      const ids = querySnapshot.docs.map(doc => doc.data().orderId);
      setCompletedOrderIds(ids);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTemporaryOrders();
      unsubscribeCompletedOrderIds();
    };
  }, [tableNumber, updateTableColor]);

  useEffect(() => {
    const allOrders = [...orders, ...temporaryOrders];
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
  }, [orders, temporaryOrders, tableNumber, updateTableColor, kotTime]);

  const calculateTotalAmount = (orders) => {
    return orders.reduce((total, order) => {
      return total + order.items.reduce((subTotal, item) => subTotal + (item.price * item.quantity), 0);
    }, 0);
  };

  const formatKOTContent = (order) => {
    return `
      Table No: ${order.tableNo}     Dt:${new Date(order.createdAt.toDate()).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })}     Time:${order.istTime.toDate().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}\n
      --------------------------------\n
      ${order.items.map(item => `${item.quantity}    ${item.name}`).join('\n')}
      --------------------------------\n
      Total Items: ${order.items.reduce((total, item) => total + item.quantity, 0)}\n
    `;
  };

  const printKOT = (order) => {
    if (printer) {
      const builder = new window.epson.ePOSBuilder();
      builder.addTextAlign(builder.ALIGN_LEFT);
      builder.addText(formatKOTContent(order));
      builder.addCut(window.epson.ePOSBuilder.CUT_FEED);

      // Debugging: Log the content before printing
      console.log('KOT content to be printed:', formatKOTContent(order));

      printer.send(builder.toString());
    } else {
      console.log('Printer not connected');
    }
  };

  const printBill = (order) => {
    if (printer) {
      const builder = new window.epson.ePOSBuilder();
      builder.addTextAlign(builder.ALIGN_CENTER);
      builder.addText(`BILL\n`);
      builder.addText(`Table No: ${tableNumber}\n`);
      let total = 0;
      order.items.forEach(item => {
        builder.addText(`${item.quantity} x ${item.name} - ${item.price * item.quantity}\n`);
        total += item.price * item.quantity;
      });
      builder.addText(`------------------------------\n`);
      builder.addText(`Total: ${total.toFixed(2)}\n`);
      builder.addCut(window.epson.ePOSBuilder.CUT_FEED);
      printer.send(builder.toString());
    } else {
      console.log('Printer not connected');
    }
  };

  const handleGenerateKOT = async () => {
    try {
      const filteredOrders = [...orders, ...temporaryOrders].filter(order => !completedOrderIds.includes(order.id));
      if (filteredOrders.length === 0 && currentOrder.length === 0) {
        console.log('No orders to generate KOT');
        return;
      }

      if (currentOrder.length > 0) {
        const now = new Date();
        const istTime = Timestamp.fromDate(new Date(now.getTime() + 5.5 * 60 * 60 * 1000));

        const newOrder = {
          id: `temp-${Date.now()}`,
          tableNo: tableNumber.slice(1),
          items: currentOrder,
          status: 'KOT',
          createdAt: Timestamp.fromDate(now),
          istTime,
          name: 'Temporary Order',
        };
        await setDoc(doc(collection(backendDb, 'manual-orders'), newOrder.id), newOrder);
        setTemporaryOrders(prev => [...prev, newOrder]);
        filteredOrders.push(newOrder);
        setOrders([...orders, newOrder]);
        setCurrentOrder([]);
        setKotTime(istTime.toDate().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        }));
        console.log('Temporary order created:', newOrder);
      }

      populateKOTPrintSection(filteredOrders);
      setKotReady(true);

      for (const order of filteredOrders) {
        printKOT(order);
        await updateOrderStatus([order], 'KOT');
      }

      updateTableColor(tableNumber, 'orange');
      setOrders(prevOrders =>
        prevOrders.map(order =>
          filteredOrders.some(filteredOrder => filteredOrder.id === order.id)
            ? { ...order, status: 'KOT' }
            : order
        )
      );
      console.log('KOT generated and printed successfully');
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };

  const handleGenerateBill = async () => {
    try {
      const filteredOrders = [...orders, ...temporaryOrders].filter(order => !completedOrderIds.includes(order.id));
      if (filteredOrders.length === 0) {
        console.log('No orders to generate Bill');
        return;
      }

      const amount = calculateTotalAmount(filteredOrders);
      setTotalAmount(amount);
      populateBillPrintSection(filteredOrders, amount);

      for (const order of filteredOrders) {
        printBill(order);
        await updateOrderStatus([order], 'billed');
      }

      updateTableColor(tableNumber, 'green');
      console.log('Bill generated and printed successfully');
    } catch (error) {
      console.error('Error generating Bill:', error);
    }
  };

  const populateKOTPrintSection = (filteredOrders) => {
    const kotContent = filteredOrders.map(order => {
        const formattedItems = order.items.map(item => 
          `<div style="font-size: 18px; margin-bottom: 2px;">${item.quantity.toString().padEnd(3)} ${item.name}</div>`
        ).join('');

        return `
          <div style="margin-top: 0; padding: 0;">
            <strong style="font-size: 16px;">Table No: ${order.tableNo}</strong>
            <span style="float: right; font-size: 18px;">
              ${new Date(order.createdAt.toDate()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              ${new Date(order.createdAt.toDate()).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata'
              })}
            </span>
          </div>
          <div style="margin-top: 2px; padding: 0;">
            ${formattedItems}
          </div>
          <div style="margin-top: 2px; padding: 0;">
            <strong style="font-size: 18px;">Total Items: ${order.items.reduce((total, item) => total + item.quantity, 0)}</strong>
          </div>
          <hr style="border: 0; border-top: 1px solid #000; margin: 2px 0;" />
        `;
    }).join('');
    
    kotRef.current.innerHTML = `
      <div style="font-family: monospace; white-space: pre; font-size: 14px; line-height: 1.1; margin: 0; padding: 0;">
        ${kotContent}
      </div>
    `;
  };

  const populateBillPrintSection = (filteredOrders, totalAmount) => {
    const billContent = filteredOrders.map(order =>
      order.items.map(item => `<li>${item.name} - ${item.price} x ${item.quantity}</li>`).join('')
    ).join('');
    billRef.current.innerHTML = `
      <h1>Bill for Table ${tableNumber}</h1>
      <ul>${billContent}</ul>
      <h2>Total: ₹${totalAmount.toFixed(2)}</h2>
    `;
    console.log("Bill content populated: ", billRef.current.innerHTML);
  };

  const handleCompleteOrder = async () => {
    try {
      const filteredOrders = [...orders, ...temporaryOrders].filter(order => !completedOrderIds.includes(order.id));
      
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
      await updateOrderStatus(filteredOrders, 'completed');

      // Update UI and clear orders
      setCompletedOrderIds([...completedOrderIds, ...filteredOrders.map(order => order.id)]);
      setOrders(prevOrders => prevOrders.filter(order => !filteredOrders.map(o => o.id).includes(order.id)));
      await updateTableColor(tableNumber, 'blank');

      // Remove temporary orders from Firestore
      const tempOrderIds = filteredOrders.filter(order => order.id.startsWith('temp-')).map(order => order.id);
      const batchDelete = writeBatch(backendDb);
      tempOrderIds.forEach(id => {
        batchDelete.delete(doc(backendDb, 'manual-orders', id));
      });
      await batchDelete.commit();
      setTemporaryOrders(prev => prev.filter(order => !tempOrderIds.includes(order.id)));

      console.log('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const updateOrderStatus = async (orders, status) => {
    const batch = writeBatch(backendDb);
    orders.forEach(order => {
      const orderRef = doc(backendDb, 'orders', order.id);
      batch.update(orderRef, { status });
    });
    await batch.commit();
    console.log(`Order status updated to ${status}`);
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
    } else {
      const reason = prompt('Please provide a reason for deleting this order:');
      if (reason) {
        await deleteDoc(doc(collection(backendDb, 'manual-orders'), itemId));
        setTemporaryOrders((prevOrders) => prevOrders.filter(order => order.id !== itemId));
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
          {[...orders, ...temporaryOrders].filter(order => order.status === 'KOT').map((order, orderIndex) => (
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
          {orders.length === 0 ? (
            <p>No digital orders.</p>
          ) : (
            orders
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
          {currentOrder.length === 0 ? (
            <p>No items in current order.</p>
          ) : (
            currentOrder.map((item, index) => (
              <div className="current-order-item" key={index}>
                <div className="order-text">
                  <p>{item.name}</p>
                  <p>{item.price * item.quantity}</p>
                </div>
                <div className="order-actions">
                  <button className="action-button decrement" onClick={() => handleDecrement(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button className="action-button increment" onClick={() => handleIncrement(item.id)}>+</button>
                  <button className="action-button delete" onClick={() => handleDelete(item.id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="action-buttons">
          <ReactToPrint
            trigger={() => <button className="action-button generate-kot">Generate KOT</button>}
            content={() => kotRef.current}
            onBeforeGetContent={async () => {
              await handleGenerateKOT();
              await new Promise(resolve => setTimeout(resolve, 500));
              console.log('KOT content before print:', kotRef.current.innerHTML);
              kotRef.current.style.display = 'block'; // Ensure kotRef content is available for printing
            }}
            onAfterPrint={() => {
              kotRef.current.style.display = 'none'; // Hide after printing
              console.log('KOT print completed.');
            }}
          />
          <ReactToPrint
            trigger={() => <button className="action-button generate-bill">Generate Bill</button>}
            content={() => billRef.current}
            onBeforeGetContent={async () => {
              await handleGenerateBill();
              await new Promise(resolve => setTimeout(resolve, 500));
              console.log('Bill content before print:', billRef.current.innerHTML);
              billRef.current.style.display = 'block'; // Ensure billRef content is available for printing
            }}
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
