import React, { useState, useEffect } from 'react';
import { auth } from './firebase-config'; 
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', image: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [notification, setNotification] = useState(null);
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Use the environment variable for the base URL
  const navigate = useNavigate();

  // Fetch categories for the authenticated restaurant
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/categories/${auth.currentUser.uid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.currentUser?.accessToken}` // Include the token
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const categoriesData = await response.json();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setNotification('Failed to fetch categories');
      }
    };

    if (auth.currentUser?.uid) {
      fetchCategories();
    }
  }, []);

  const handleAddCategory = async () => {
    if (newCategory.name) {
      try {
        const response = await fetch(`${apiBaseUrl}/category`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.currentUser?.accessToken}` // Include the token
          },
          body: JSON.stringify({
            name: newCategory.name,
            image: newCategory.image,
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save category in MongoDB');
        }

        const addedCategory = await response.json(); // Parse the added category
        setCategories(prevCategories => [...prevCategories, addedCategory]); // Update the state with the new category
        setNewCategory({ name: '', image: '' });
        setShowCategoryInput(false);
        showNotification("Category added successfully");
      } catch (error) {
        console.error('Error adding category:', error);
        showNotification('Failed to add category');
      }
    }
  };

  const handleUpdateCategory = async () => {
    if (newCategory.name && editingCategory) {
      try {
        const response = await fetch(`${apiBaseUrl}/category/${editingCategory._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.currentUser?.accessToken}` // Include the token
          },
          body: JSON.stringify({
            name: newCategory.name,
            image: newCategory.image,
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update category in MongoDB');
        }

        const updatedCategory = await response.json(); // Parse the updated category
        setCategories(prevCategories =>
          prevCategories.map(category =>
            category._id === updatedCategory._id ? updatedCategory : category
          )
        );
        setNewCategory({ name: '', image: '' });
        setEditingCategory(null);
        setShowCategoryInput(false);
        showNotification("Category updated successfully");
      } catch (error) {
        console.error('Error updating category:', error);
        showNotification('Failed to update category');
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
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.currentUser?.accessToken}` // Include the token
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete category in MongoDB');
        }

        setCategories(prevCategories =>
          prevCategories.filter(category => category._id !== categoryId)
        );
        showNotification("Category deleted successfully");
      } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Failed to delete category');
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewCategory({ ...newCategory, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    setNewCategory({ ...newCategory, name: e.target.value });
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
              <p>{category.restaurantName}</p> {/* Display the restaurant name */}
              <div className="menu-item-actions">
                <button onClick={(e) => { e.stopPropagation(); setEditingCategory(category); setShowCategoryInput(true); }} className="edit-category-btn">
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
