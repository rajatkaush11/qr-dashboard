const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const EscPosEncoder = require('esc-pos-encoder');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');  // Import network support

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
      const { tableNumber, orderIds } = req.body;

      // Fetch order details from Firestore
      const orderPromises = orderIds.map(orderId => db.collection('orders').doc(orderId).get());
      const orderDocs = await Promise.all(orderPromises);
      const orders = orderDocs.map(doc => doc.data()).filter(order => order);

      if (orders.length === 0) {
        return res.status(404).send('No valid orders found');
      }

      // Generate KOT content
      const encoder = new EscPosEncoder();
      encoder.initialize();
      encoder.text(`Table No: ${tableNumber}\nOrder IDs: ${orderIds.join(', ')}\nItems:\n`);
      orders.forEach(order => {
        order.items.forEach(item => {
          encoder.text(`${item.name} x ${item.quantity}\n`);
        });
      });
      encoder.text('\n\n');

      // Send to printers
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
      const { tableNumber, orderIds } = req.body;

      // Fetch order details from Firestore
      const orderPromises = orderIds.map(orderId => db.collection('orders').doc(orderId).get());
      const orderDocs = await Promise.all(orderPromises);
      const orders = orderDocs.map(doc => doc.data()).filter(order => order);

      if (orders.length === 0) {
        return res.status(404).send('No valid orders found');
      }

      // Generate Bill content
      const encoder = new EscPosEncoder();
      encoder.initialize();
      encoder.text(`Bill for Table No: ${tableNumber}\n\nItems:\n`);
      let totalAmount = 0;
      orders.forEach(order => {
        order.items.forEach(item => {
          const itemTotal = item.price * item.quantity;
          totalAmount += itemTotal;
          encoder.text(`${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`);
        });
      });
      encoder.text(`\nTotal Amount: ${totalAmount}\nThank you for dining with us!\n\n`);

      // Send to printers
      await sendToPrinter(encoder.encode());

      return res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  });
});

async function sendToPrinter(content) {
  // USB Printer
  const usbDevice = new escpos.USB();
  const usbPrinter = new escpos.Printer(usbDevice);
  usbDevice.open(function (error) {
    if (error) {
      console.error('Error opening USB device:', error);
      throw error;
    }
    usbPrinter
      .encode('cp850')
      .text(content)
      .cut()
      .close();
  });

  // Network Printer
  const networkDevice = new escpos.Network('192.168.1.100'); // IP address of the network printer
  const networkPrinter = new escpos.Printer(networkDevice);
  networkDevice.open(function (error) {
    if (error) {
      console.error('Error opening network device:', error);
      throw error;
    }
    networkPrinter
      .encode('cp850')
      .text(content)
      .cut()
      .close();
  });
}
