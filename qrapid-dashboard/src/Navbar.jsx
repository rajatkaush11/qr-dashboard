import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBell } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ activePage, onLinkClick }) => {
  const [searchActive, setSearchActive] = useState(false);
  const navigate = useNavigate();

  const handleSearchClick = () => {
    setSearchActive(!searchActive);
  };

  const handleLinkClick = (page) => {
    onLinkClick(page);
    if (page === 'Home') {
      navigate('/home');
    } else if (page === 'Table') {
      navigate('/table');
    } else {
      navigate(`/${page.toLowerCase()}`);
    }
  };

  return (
    <div className="navbar">
      <div className="brand">QRAPID</div>
      <div className="nav-links">
        <a
          href="#"
          onClick={() => handleLinkClick('Home')}
          className={activePage === 'Home' ? 'active-link' : ''}
        >
          Home
        </a>
        <a
          href="#"
          onClick={() => handleLinkClick('Table')}
          className={activePage === 'Table' ? 'active-link' : ''}
        >
          Table
        </a>
        <a
          href="#"
          onClick={() => handleLinkClick('Dashboard')}
          className={activePage === 'Dashboard' ? 'active-link' : ''}
        >
          Dashboard
        </a>
        <a
          href="#"
          onClick={() => handleLinkClick('Menu')}
          className={activePage === 'Menu' ? 'active-link' : ''}
        >
          Menu
        </a>
        <a
          href="#"
          onClick={() => handleLinkClick('Orders')}
          className={activePage === 'Orders' ? 'active-link' : ''}
        >
          Orders
        </a>
        <a
          href="#"
          onClick={() => handleLinkClick('Reports')}
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
