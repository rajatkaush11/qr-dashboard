const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

exports.printKOT = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      console.log("Method not allowed");
      res.status(405).send("Method Not Allowed");
      return;
    }
    const { tableNumber, orderId } = req.body;
    const orderRef = db.collection("orders").doc(orderId);
    orderRef
        .get()
        .then((orderDoc) => {
          if (!orderDoc.exists) {
            console.log("Order not found");
            res.status(404).send("Order not found");
            return;
          }

          const order = orderDoc.data();
          let kotContent = `Table No: ${tableNumber}\nOrder ID: ${orderId}\nItems:\n`;
          order.items.forEach((item) => {
            kotContent += `${item.name} x ${item.quantity}\n`;
          });

          // Simulate printing action
          console.log("KOT Content:", kotContent);
          res.status(200).send({ success: true, message: "KOT printed successfully" });
        })
        .catch((error) => {
          console.error("Error accessing Firestore:", error);
          res.status(500).send(error.toString());
        });
  });
});

exports.printBill = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      console.log("Method not allowed");
      res.status(405).send("Method Not Allowed");
      return;
    }
    const { tableNumber, orderId } = req.body;
    const orderRef = db.collection("orders").doc(orderId);
    orderRef
        .get()
        .then((orderDoc) => {
          if (!orderDoc.exists) {
            console.log("Order not found");
            res.status(404).send("Order not found");
            return;
          }

          const order = orderDoc.data();
          let billContent = `Bill for Table No: ${tableNumber}\n\nItems:\n`;
          let totalAmount = 0;
          order.items.forEach((item) => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            billContent += `${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`;
          });
          billContent += `\nTotal Amount: ${totalAmount}\nThank you for dining with us!`;

          // Simulate printing action
          console.log("Bill Content:", billContent);
          res.status(200).send({ success: true, message: "Bill printed successfully" });
        })
        .catch((error) => {
          console.error("Error accessing Firestore:", error);
          res.status(500).send(error.toString());
        });
  });
});
