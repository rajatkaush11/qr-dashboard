const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

// Configure CORS with dynamic origin support in a more secure manner
const corsHandler = cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['https://qr-dashboard-1107.web.app']; // Replace with your actual domain
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
});

// Wrapper function to handle CORS
const handleCors = (req, res, callback) => {
  return corsHandler(req, res, callback);
};

exports.printKOT = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      const { tableNumber, orderId } = req.body;

      // Fetch order details
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        res.status(404).send('Order not found');
        return;
      }

      const order = orderDoc.data();

      // Generate KOT content
      let kotContent = `Table No: ${tableNumber}\nOrder ID: ${orderId}\nItems:\n`;
      order.items.forEach(item => {
        kotContent += `${item.name} x ${item.quantity}\n`;
      });

      // Here, send KOT to printer (replace with actual printer logic)
      const ESC_POS = require('esc-pos-encoder');
      const encoder = new ESC_POS();
      encoder.initialize();
      encoder.text(kotContent);
      encoder.cut();
      const encodedData = encoder.encode(); // This data should be sent to the printer

      res.status(200).send({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});

exports.printBill = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      const { tableNumber, orderId } = req.body;

      // Fetch order details
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        res.status(404).send('Order not found');
        return;
      }

      const order = orderDoc.data();

      // Generate Bill content
      let billContent = `Bill for Table No: ${tableNumber}\n\nItems:\n`;
      let totalAmount = 0;
      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        billContent += `${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`;
      });
      billContent += `\nTotal Amount: ${totalAmount}\nThank you for dining with us!`;

      // Here, send Bill to printer (replace with actual printer logic)
      const ESC_POS = require('esc-pos-encoder');
      const encoder = new ESC_POS();
      encoder.initialize();
      encoder.text(billContent);
      encoder.cut();
      const encodedData = encoder.encode(); // This data should be sent to the printer

      res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});
