const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const EscPosEncoder = require('esc-pos-encoder');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Function to print Kitchen Order Ticket (KOT)
exports.printKOT = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { tableNumber, orderId } = req.body;

      // Fetch order details from Firestore
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).send('Order not found');
      }

      const order = orderDoc.data();

      // Generate KOT content
      const encoder = new EscPosEncoder();
      encoder.initialize();
      encoder.text(`Table No: ${tableNumber}\nOrder ID: ${orderId}\nItems:\n`);
      order.items.forEach(item => {
        encoder.text(`${item.name} x ${item.quantity}\n`);
      });
      encoder.text('\n\n');

      // Send to printer
      await sendToPrinter(encoder.encode());

      return res.status(200).send({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
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
      const { tableNumber, orderId } = req.body;

      // Fetch order details from Firestore
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).send('Order not found');
      }

      const order = orderDoc.data();

      // Generate Bill content
      const encoder = new EscPosEncoder();
      encoder.initialize();
      encoder.text(`Bill for Table No: ${tableNumber}\n\nItems:\n`);
      let totalAmount = 0;
      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        encoder.text(`${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`);
      });
      encoder.text(`\nTotal Amount: ${totalAmount}\nThank you for dining with us!\n\n`);

      // Send to printer
      await sendToPrinter(encoder.encode());

      return res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  });
});

async function sendToPrinter(content) {
  const device = new escpos.USB();
  const printer = new escpos.Printer(device);
  device.open(function (error) {
    if (error) {
      console.error('Error opening device:', error);
      throw error;
    }
    printer
      .encode('cp850')
      .text(content)
      .cut()
      .close();
  });
}
