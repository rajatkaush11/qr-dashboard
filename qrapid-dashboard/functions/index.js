const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const EscPosEncoder = require('esc-pos-encoder');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Function to send content to the printer
async function sendToPrinter(content) {
  return new Promise((resolve, reject) => {
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        return reject(error);
      }

      const encoder = new EscPosEncoder();
      const encodedContent = encoder.initialize().text(content).encode();

      printer
        .text(encodedContent)
        .cut()
        .close(() => resolve());
    });
  });
}

// Function to print Kitchen Order Ticket (KOT)
exports.printKOT = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { tableNumber, orderIds } = req.body;

      // Fetch order details from Firestore
      const orders = await Promise.all(orderIds.map(async (orderId) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
          throw new Error(`Order ${orderId} not found`);
        }
        return orderDoc.data();
      }));

      // Generate KOT content
      let kotContent = `Table No: ${tableNumber}\n\n`;
      orders.forEach(order => {
        kotContent += `Order ID: ${order.id}\nItems:\n`;
        order.items.forEach(item => {
          kotContent += `${item.name} x ${item.quantity}\n`;
        });
        kotContent += '\n';
      });

      // Send KOT content to the printer
      await sendToPrinter(kotContent);

      return res.status(200).send({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      console.error('Error printing KOT:', error);
      return res.status(500).send({ success: false, message: error.message });
    }
  });
});

// Function to print a bill
exports.printBill = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { tableNumber, orderIds } = req.body;

      // Fetch order details from Firestore
      const orders = await Promise.all(orderIds.map(async (orderId) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
          throw new Error(`Order ${orderId} not found`);
        }
        return orderDoc.data();
      }));

      // Generate Bill content
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

      // Send bill content to the printer
      await sendToPrinter(billContent);

      return res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      console.error('Error printing bill:', error);
      return res.status(500).send({ success: false, message: error.message });
    }
  });
});
