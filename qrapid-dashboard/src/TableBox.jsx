import React from 'react';
import './TableBox.css';

const TableBox = ({ tableNumber, color, isActive, onClick }) => {
    return (
        <div
            className={`table-box ${color} ${isActive ? 'active' : ''}`}
            onClick={() => onClick(tableNumber)}
        >
            {tableNumber}
        </div>
    );
};

export default TableBox;
