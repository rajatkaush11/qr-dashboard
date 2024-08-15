const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const escpos = require('escpos');
escpos.Network = require('escpos-network');

admin.initializeApp();
const db = admin.firestore();

async function sendToPrinter(content, printerIp) {
  return new Promise((resolve, reject) => {
    const device = new escpos.Network(printerIp, 9100);
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        return reject(error);
      }

      printer
        .text(content)
        .cut()
        .close(() => resolve());
    });
  });
}

exports.printKOT = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
    try {
      const { tableNumber, orderIds, printerIp } = req.body;

      const orders = await Promise.all(orderIds.map(async (orderId) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
          throw new Error(`Order ${orderId} not found`);
        }
        return orderDoc.data();
      }));

      let kotContent = `Table No: ${tableNumber}\n\n`;
      orders.forEach(order => {
        kotContent += `Order ID: ${order.id}\nItems:\n`;
        order.items.forEach(item => {
          kotContent += `${item.name} x ${item.quantity}\n`;
        });
        kotContent += '\n';
      });

      await sendToPrinter(kotContent, printerIp);

      return res.status(200).json({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      console.error('Error printing KOT:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });
});

exports.printBill = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
    try {
      const { tableNumber, orderIds, printerIp } = req.body;

      const orders = await Promise.all(orderIds.map(async (orderId) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
          throw new Error(`Order ${orderId} not found`);
        }
        return orderDoc.data();
      }));

      let billContent = `Bill for Table No: ${tableNumber}\n\nItems:\n`;
      let totalAmount = 0;
      orders.forEach(order => {
        order.items.forEach(item => {
          const itemTotal = item.price * item.quantity;
          totalAmount += itemTotal;
          billContent += `${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`;
        });
      });
      billContent += `\nTotal Amount: ${totalAmount}\nThank you for dining with us!`;

      await sendToPrinter(billContent, printerIp);

      return res.status(200).json({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      console.error('Error printing bill:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });
});
