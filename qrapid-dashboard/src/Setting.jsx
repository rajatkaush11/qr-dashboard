import React, { useState, useEffect } from 'react';
import './Setting.css';

const Settings = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    // Fetch the list of printers from the backend service
    fetch('http://localhost:5001/your-project-id/us-central1/api/printers')
      .then(response => response.json())
      .then(data => setPrinters(data))
      .catch(error => console.error('Error fetching printers:', error));
  }, []);

  const handlePrinterChange = (event) => {
    setSelectedPrinter(event.target.value);
  };

  const handleSave = () => {
    // Save selected printer to local storage or send to backend if needed
    localStorage.setItem('selectedPrinter', selectedPrinter);
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
