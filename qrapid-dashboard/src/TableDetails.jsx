import React, { useEffect, useState, useRef } from 'react';
import { backendDb, db, auth } from './firebase-config';
import { collection, query, where, orderBy, getDocs, writeBatch, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import './TableDetails.css';
import successSound from './assets/success.mp3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import ReactToPrint from 'react-to-print';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [completedOrderIds, setCompletedOrderIds] = useState([]);
  const [orderFetched, setOrderFetched] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [temporaryOrders, setTemporaryOrders] = useState([]);
  const [kotTime, setKotTime] = useState('');
  const [totalAmount, setTotalAmount] = useState(0); 
  const [kotReady, setKotReady] = useState(false); // New state to track print readiness

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
    const fetchCategories = async () => {
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      const categoriesRef = collection(db, 'restaurants', userId, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      const categoriesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCategories(categoriesData);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      if (selectedCategory) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        const itemsRef = collection(db, 'restaurants', userId, 'categories', selectedCategory.id, 'items');
        const querySnapshot = await getDocs(itemsRef);
        const itemsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setItems(itemsData);
      }
    };
    fetchItems();
  }, [selectedCategory]);

  useEffect(() => {
    const kotOrders = [...orders, ...temporaryOrders].filter(order => order.status === 'KOT');
    if (kotOrders.length > 0) {
      updateTableColor(tableNumber, 'running-kot');
      if (!kotTime) {
        const now = new Date();
        const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        });
        setKotTime(istTime);
      }
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

  const printKOT = (order) => {
    if (printer) {
        const builder = new window.epson.ePOSBuilder();

        // Header
        builder.addTextAlign(builder.ALIGN_LEFT);
        builder.addText(`Order No: ${order.id.slice(-3)}  Table No: ${order.tableNo}\n`);
        builder.addText(`Dt:${new Date(order.createdAt.toDate()).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
        })}   Time:${order.istTime.toDate().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })}\n`);
        
        // Spacer
        builder.addText(`\n`);

        // Items
        order.items.forEach(item => {
            builder.addTextAlign(builder.ALIGN_LEFT);
            builder.addText(`${item.quantity}       ${item.name}\n`);
        });

        // Total Items
        builder.addTextAlign(builder.ALIGN_LEFT);
        builder.addText(`\nTotal Items: ${order.items.reduce((total, item) => total + item.quantity, 0)}\n`);
        
        // Spacer
        builder.addText(`\n`);
        builder.addTextAlign(builder.ALIGN_CENTER);
        builder.addText(`(${order.istTime.toDate().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })})\n`);

        // Final Cut
        builder.addCut(window.epson.ePOSBuilder.CUT_FEED);
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
      const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
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
      setKotReady(true); // Set KOT ready state for print
      
      for (const order of filteredOrders) {
        const orderDoc = doc(backendDb, 'orders', order.id);
        const docSnap = await getDocs(query(orderDoc));
        if (docSnap.exists()) {
          printKOT(order);
          await updateOrderStatus([order], 'KOT');
        } else {
          console.log(`Document with ID ${order.id} does not exist.`);
        }
      }

      updateTableColor(tableNumber, 'running-kot');
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
      const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
      if (filteredOrders.length === 0) {
        console.log('No orders to generate Bill');
        return;
      }

      const amount = calculateTotalAmount(filteredOrders);
      setTotalAmount(amount);
      populateBillPrintSection(filteredOrders, amount);

      for (const order of filteredOrders) {
        const orderDoc = doc(backendDb, 'orders', order.id);
        const docSnap = await getDocs(query(orderDoc));
        if (docSnap.exists()) {
          printBill(order);
          await updateOrderStatus([order], 'billed');
        } else {
          console.log(`Document with ID ${order.id} does not exist.`);
        }
      }

      updateTableColor(tableNumber, 'green');
      console.log('Bill generated and printed successfully');
    } catch (error) {
      console.error('Error generating Bill:', error);
    }
  };

  const populateKOTPrintSection = (filteredOrders) => {
    const kotContent = filteredOrders.map(order => (
      `<h2>Order ${order.id}</h2>
      <ul>
        ${order.items.map(item => `<li>${item.quantity} x ${item.name}</li>`).join('')}
      </ul>`
    )).join('');
    kotRef.current.innerHTML = `
      <h1>KOT for Table ${tableNumber}</h1>
      ${kotContent}
    `;
    console.log("KOT content populated: ", kotRef.current.innerHTML);
  };

  const populateBillPrintSection = (filteredOrders, totalAmount) => {
    const billContent = filteredOrders.map(order =>
      order.items.map(item => `<li>${item.name} - ${item.price} x ${item.quantity}</li>`).join('')
    ).join('');
    billRef.current.innerHTML = `
      <h1>Bill for Table ${tableNumber}</h1>
      <ul>${billContent}</ul>
      <h2>Total: $${totalAmount.toFixed(2)}</h2>
    `;
    console.log("Bill content populated: ", billRef.current.innerHTML);
  };

  const handleCompleteOrder = async () => {
    try {
      const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
      const batch = writeBatch(db);
      filteredOrders.forEach(order => {
        const billRef = doc(collection(db, 'bills'));
        batch.set(billRef, { orderId: order.id, ...order });
      });
      await batch.commit();
      await updateOrderStatus(filteredOrders, 'completed');
      setCompletedOrderIds([...completedOrderIds, ...filteredOrders.map(order => order.id)]);
      setOrders(prevOrders => prevOrders.filter(order => !filteredOrders.map(o => o.id).includes(order.id)));
      await updateTableColor(tableNumber, 'blank');
      setOrderFetched(false);

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
            }} 
            onAfterPrint={() => {
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
            }} 
            onAfterPrint={() => {
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
      <div id="print-kot" ref={kotRef} style={{ display: kotReady ? 'block' : 'none' }}>
        <h1>KOT for Table {tableNumber}</h1>
        {/* KOT content will be populated dynamically */}
      </div>

      {/* Print-Ready Bill Section */}
      <div id="print-bill" ref={billRef} style={{ display: 'none' }}>
        <h1>Bill for Table {tableNumber}</h1>
        {/* Bill content will be populated dynamically */}
      </div>
    </div>
  );
};

export default TableDetails;
