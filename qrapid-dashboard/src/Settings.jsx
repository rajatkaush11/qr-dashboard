import React, { useEffect, useState } from 'react';

const Settings = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Mock function to simulate fetching printers.
    const fetchPrinters = async () => {
      try {
        // Simulating a delay for fetching data
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Mock data representing printers
        const mockPrinters = [
          { ip: '192.168.1.101', name: 'Printer 1' },
          { ip: '192.168.1.102', name: 'Printer 2' },
          { ip: '192.168.1.103', name: 'Printer 3' },
        ];
        setPrinters(mockPrinters);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching printers:', error);
        setError('Failed to load printers. Please try again.');
        setLoading(false);
      }
    };

    fetchPrinters();
  }, []);

  const handlePrinterChange = (event) => {
    setSelectedPrinter(event.target.value);
    // Save the selected printer to localStorage or database
    localStorage.setItem('selectedPrinter', event.target.value);
  };

  if (loading) {
    return <div>Loading printers...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Settings</h1>
      <div>
        <label htmlFor="printer-select">Select Printer:</label>
        <select
          id="printer-select"
          value={selectedPrinter}
          onChange={handlePrinterChange}
        >
          <option value="">Select a printer</option>
          {printers.map((printer) => (
            <option key={printer.ip} value={printer.ip}>
              {printer.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Settings;
