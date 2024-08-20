import React, { useState, useEffect } from 'react';
import { auth } from './firebase-config'; // Only keep auth for getting the UID
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', image: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [notification, setNotification] = useState(null);
  const userId = auth.currentUser ? auth.currentUser.uid : null; // Get current user's UID
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Use the environment variable for the base URL
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/categories/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categoriesData = await response.json();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (newCategory.name && userId) {
      try {
        const response = await fetch(`${apiBaseUrl}/category`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uid: userId,
            name: newCategory.name,
            image: newCategory.image
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save category in MongoDB');
        }

        setNewCategory({ name: '', image: '' });
        setShowCategoryInput(false);
        fetchCategories(); // Re-fetch categories to update UI
        showNotification("Category added successfully");
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
  };

  const handleUpdateCategory = async () => {
    if (newCategory.name && editingCategory && userId) {
      try {
        const response = await fetch(`${apiBaseUrl}/category/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uid: userId,
            name: newCategory.name,
            image: newCategory.image
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update category in MongoDB');
        }

        fetchCategories(); // Re-fetch categories to update the state and UI
        setNewCategory({ name: '', image: '' });
        setEditingCategory(null);
        setShowCategoryInput(false);
        showNotification("Category updated successfully");
      } catch (error) {
        console.error('Error updating category:', error);
      }
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = window.confirm('Are you sure you want to delete this category?');
    if (confirmed) {
      try {
        const response = await fetch(`${apiBaseUrl}/category/${categoryId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete category in MongoDB');
        }

        setCategories(categories.filter(category => category.id !== categoryId));
        showNotification("Category deleted successfully");
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}/items`);
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddCategoryClick = () => {
    setShowCategoryInput(true);
    setEditingCategory(null); // Ensure we are not in editing mode
  };

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h1>Edit Menu</h1>
        <button className="add-food-category-btn" onClick={handleAddCategoryClick}>
          {editingCategory ? 'Edit Category' : '+ Add Food Category'}
        </button>
      </div>
      {showCategoryInput && (
        <div className="new-category-item">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="new-category-input"
          />
          <input
            type="text"
            name="name"
            placeholder="Name of the Category"
            value={newCategory.name}
            onChange={handleInputChange}
            className="new-category-input"
          />
          <button
            className="add-category-btn"
            onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
          >
            {editingCategory ? 'Update' : 'Add'}
          </button>
        </div>
      )}
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
      <div className="menu-items">
        {categories.map((category, index) => (
          <div className="menu-item" key={index} onClick={() => handleCategoryClick(category._id)}>
            <img src={category.image} alt={category.name} />
            <div className="menu-item-details">
              <h2>{category.name}</h2>
              <div className="menu-item-actions">
                <button onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }} className="edit-category-btn">
                  Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category._id); }} className="delete-category-btn">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;
