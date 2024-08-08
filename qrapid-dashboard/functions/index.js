const express = require('express');
const bodyParser = require('body-parser');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const app = express();
const port = 5000;

app.use(bodyParser.json());

app.post('/print', (req, res) => {
  const { content } = req.body;

  const device = new escpos.USB();
  const printer = new escpos.Printer(device);

  device.open((error) => {
    if (error) {
      return res.status(500).send({ success: false, message: 'Failed to open USB connection' });
    }

    printer
      .text(content)
      .cut()
      .close(() => res.send({ success: true, message: 'Printed successfully' }));
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
