import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    // Fetch the available printers from the server or local machine
    // This is a placeholder example, replace with actual fetching logic
    setPrinters(['Printer1', 'Printer2', 'Printer3']);
  }, []);

  const handlePrinterChange = (event) => {
    setSelectedPrinter(event.target.value);
  };

  const handleSave = () => {
    // Save the selected printer setting, maybe store it in local storage or send to backend
    console.log(`Selected Printer: ${selectedPrinter}`);
  };

  return (
    <div className="settings-container">
      <h2>Printer Settings</h2>
      <div className="settings-section">
        <label htmlFor="printer-select">Select Printer:</label>
        <select
          id="printer-select"
          value={selectedPrinter}
          onChange={handlePrinterChange}
        >
          <option value="">Select a printer</option>
          {printers.map((printer, index) => (
            <option key={index} value={printer}>
              {printer}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleSave} className="save-button">Save Settings</button>
    </div>
  );
};

export default Settings;
