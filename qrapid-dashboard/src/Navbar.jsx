import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBell } from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';

const Navbar = ({ activePage, onLinkClick }) => {
    const [searchActive, setSearchActive] = useState(false);

    const handleSearchClick = () => {
        setSearchActive(!searchActive);
    };

    return (
        <div className="navbar">
            <div className="brand">QRAPID</div>
            <div className="nav-links">
                <a 
                    href="#"
                    onClick={() => onLinkClick('TableOverview')}
                    className={activePage === 'TableOverview' ? 'active-link' : ''}
                >
                    Table
                </a>
                <a 
                    href="#"
                    onClick={() => onLinkClick('Dashboard')}
                    className={activePage === 'Dashboard' ? 'active-link' : ''}
                >
                    Dashboard
                </a>
                <a 
                    href="#"
                    onClick={() => onLinkClick('Menu')}
                    className={activePage === 'Menu' ? 'active-link' : ''}
                >
                    Menu
                </a>
                <a 
                    href="#"
                    onClick={() => onLinkClick('Orders')}
                    className={activePage === 'Orders' ? 'active-link' : ''}
                >
                    Orders
                </a>
                <a 
                    href="#"
                    onClick={() => onLinkClick('Reports')}
                    className={activePage === 'Reports' ? 'active-link' : ''}
                >
                    Reports
                </a>
            </div>
            <div className="right-icons">
                <FontAwesomeIcon icon={faSearch} onClick={handleSearchClick} className="icon" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className={`search-input ${searchActive ? 'active' : ''}`} 
                />
                <FontAwesomeIcon icon={faBell} className="icon" />
            </div>
        </div>
    );
};

export default Navbar;
