import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const Menu = () => {
    const [categories, setCategories] = useState([]);
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', image: '' });
    const [editingCategory, setEditingCategory] = useState(null);
    const userId = localStorage.getItem('userId'); // Retrieve userId from localStorage
    const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Use the environment variable for the base URL
    const navigate = useNavigate();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            console.log(`Fetching categories for user ${userId}`);
            const response = await fetch(`${apiBaseUrl}/categories/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add token if required
                },
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Fetched categories:', data);
                setCategories(data);
            } else {
                console.error('Failed to fetch categories');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleAddCategoryClick = () => {
        setShowCategoryInput(true);
        setEditingCategory(null); // Ensure we are not in editing mode
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCategory({ ...newCategory, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewCategory({ ...newCategory, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddCategory = async () => {
        if (newCategory.name && userId) {
            try {
                console.log('Adding category:', newCategory);
                const response = await fetch(`${apiBaseUrl}/categories`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add token if required
                    },
                    body: JSON.stringify({ name: newCategory.name, userId, image: newCategory.image }),
                });
                if (response.ok) {
                    const addedCategory = await response.json();
                    setCategories([...categories, addedCategory]);
                    setNewCategory({ name: '', image: '' });
                    setShowCategoryInput(false);
                } else {
                    console.error('Failed to add category');
                }
            } catch (error) {
                console.error('Error adding category:', error);
            }
        }
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setNewCategory({ name: category.name, image: category.image });
        setShowCategoryInput(true);
    };

    const handleUpdateCategory = async () => {
        if (newCategory.name && editingCategory && userId) {
            try {
                console.log('Updating category:', newCategory);
                const response = await fetch(`${apiBaseUrl}/categories/${editingCategory._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add token if required
                    },
                    body: JSON.stringify({ name: newCategory.name, image: newCategory.image }),
                });
                if (response.ok) {
                    const updatedCategory = await response.json();
                    const updatedCategories = categories.map((cat) =>
                        cat._id === updatedCategory._id ? updatedCategory : cat
                    );
                    setCategories(updatedCategories);
                    setNewCategory({ name: '', image: '' });
                    setEditingCategory(null);
                    setShowCategoryInput(false);
                } else {
                    console.error('Failed to update category');
                }
            } catch (error) {
                console.error('Error updating category:', error);
            }
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        const confirmed = window.confirm('Are you sure you want to delete this category?');
        if (confirmed) {
            try {
                const response = await fetch(`${apiBaseUrl}/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    setCategories(categories.filter(category => category._id !== categoryId));
                } else {
                    console.error('Failed to delete category');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
            }
        }
    };

    const handleCategoryClick = (category) => {
        navigate(`/category/${category._id}/items`);
    };

    return (
        <div className="menu-container">
            <div className="menu-header">
                <h1>Edit Menu</h1>
                <button className="add-food-category-btn" onClick={handleAddCategoryClick}>
                    {editingCategory ? 'Edit Category' : '+ Add Food Category'}
                </button>
            </div>
            <div className="menu-tabs">
                <a href="#" className="active">All</a>
                <a href="#">Popular Items</a>
                <a href="#">Featured</a>
                <a href="#">Combos</a>
                <a href="#">Family Bundles</a>
                <a href="#">Desserts</a>
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
            <div className="menu-items">
                {categories.map((category, index) => (
                    <div className="menu-item" key={index} onClick={() => handleCategoryClick(category)}>
                        <img src={category.image} alt={category.name} />
                        <div className="menu-item-details">
                            <h2>{category.name}</h2>
                            <button onClick={() => handleEditCategory(category)} className="edit-category-btn">
                                Edit
                            </button>
                            <button onClick={() => handleDeleteCategory(category._id)} className="delete-category-btn">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Menu;
