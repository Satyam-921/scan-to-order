import React, { useState, useEffect,useRef } from "react";
import "./owner_page.css";

export default function OwnerDashboard() {
  // 🔐 Auth State
  const [authMode, setAuthMode] = useState("register"); // "register" | "login"
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [restaurantId, setRestaurantId] = useState(null);
  const qrRef = useRef(null);

  const [restaurant, setRestaurant] = useState({ name: "", phone: "", address: "" });
  const [menuItem, setMenuItem] = useState({
    image_url: "",
    name: "",
    description: "",
    price: "",
    category_id: "",
    is_available: true,
  });
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔌 Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8000/order/get-categories");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
        // Fallback to sample data if API is not available
        setCategories([
          { id: 1, name: "Appetizers" },
          { id: 2, name: "Main Course" },
          { id: 3, name: "Desserts" },
          { id: 4, name: "Beverages" },
          { id: 5, name: "Salads" },
          { id: 6, name: "Soups" }
        ]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (restaurantId && qrRef.current) {
      qrRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [restaurantId]);
  // 🔐 Handle Auth Change
  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  // 🔐 Register/Login
  const handleAuthSubmit = async () => {
    setIsLoading(true);
    try {
      const url =
        authMode === "register"
          ? "http://localhost:8001/auth/register"
          : "http://localhost:8001/auth/login";

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });

      const data = await response.json();
      if (response.ok) {
        if (authMode === "login") {
          localStorage.setItem("token", data.access_token);
          setToken(data.access_token);
          setMessage("✅ Logged in successfully!");
        } else {
          setMessage("✅ Account created successfully! Please login.");
          setAuthMode("login");
        }
      } else {
        setMessage(`❌ ${data.detail}`);
      }
    } catch (err) {
      setMessage(`❌ Auth failed: ${err.message}`);
    } finally {
      setIsLoading(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // 🔓 Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setMessage("✅ Logged out successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  // Restaurant Handlers
  const handleRestaurantChange = (e) => {
    setRestaurant({ ...restaurant, [e.target.name]: e.target.value });
  };

  const handleMenuChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setMenuItem({ ...menuItem, [e.target.name]: value });
  };

  const handleMenuImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setMenuItem({ ...menuItem, image_url: imageUrl });
    }
  };

  const addMenuItem = () => {
    if (menuItem.name && menuItem.price && menuItem.category_id) {
      const newItem = {
        ...menuItem,
        id: Date.now(),
        price: parseFloat(menuItem.price)
      };
      setMenuItems([...menuItems, newItem]);
      setMenuItem({
        image_url: "",
        name: "",
        description: "",
        price: "",
        category_id: "",
        is_available: true,
      });
      setMessage("✅ Menu item added!");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("❌ Please fill all required fields");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const deleteMenuItem = (id) => {
    setMenuItems(menuItems.filter((item) => item.id !== id));
    setMessage("✅ Menu item deleted!");
    setTimeout(() => setMessage(""), 3000);
  };

  const saveRestaurant = async () => {
    if (!token) {
      setMessage("❌ Please login first!");
      return;
    }

    setIsLoading(true);
    const payload = {
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      menu_items: menuItems.map((item) => ({
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        category_id: parseInt(item.category_id),
        image_url: item.image_url,
        is_available: item.is_available,
      })),
    };

    try {
      const response = await fetch("http://localhost:8000/order/restaurants-with-menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setRestaurantId(data.restaurant_id);
      } else {
        setMessage(`❌ Error: ${data.detail}`);
      }
    } catch (err) {
      setMessage(`❌ Save failed: ${err.message}`);
    } finally {
      setIsLoading(false);

      setTimeout(() => setMessage(""), 5000);
    }
  };

  const getCategoryName = (id) => {
    const category = categories.find(c => c.id === parseInt(id));
    return category ? category.name : "Unknown";
  };

  return (
    <div className="owner-dashboard">
      {/* Toast Notifications */}
      {message && (
        <div className={`toast ${message.includes("❌") ? "error" : "success"}`}>
          <div className="toast-content">
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* Authentication Section */}
      {!token ? (
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-logo">🍽️</div>
              <h1 className="auth-title">RestaurantOS</h1>
              <p className="auth-subtitle">Manage your restaurant with ease</p>
            </div>

            <div className="auth-form-container">
              <h2 className="auth-form-title">
                {authMode === "register" ? "Create Account" : "Welcome Back"}
              </h2>
              
              <div className="auth-form">
                {authMode === "register" && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={authData.name}
                      onChange={handleAuthChange}
                      className="form-input"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={authData.email}
                    onChange={handleAuthChange}
                    className="form-input"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={authData.password}
                    onChange={handleAuthChange}
                    className="form-input"
                    placeholder="Enter your password"
                  />
                </div>
                
                <button
                  onClick={handleAuthSubmit}
                  disabled={isLoading}
                  className="auth-submit-btn"
                >
                  {isLoading ? (
                    <div className="loading-content">
                      <div className="spinner"></div>
                      <span>Please wait...</span>
                    </div>
                  ) : (
                    authMode === "register" ? "Create Account" : "Sign In"
                  )}
                </button>
                
                <button
                  onClick={() => setAuthMode(authMode === "register" ? "login" : "register")}
                  className="auth-switch-btn"
                >
                  {authMode === "register" ? "Already have an account? Sign In" : "Don't have an account? Create one"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="main-header">
            <div className="header-container">
              <div className="header-content">
                <div className="header-logo">
                  <div className="logo-icon">🍽️</div>
                  <div className="logo-text">
                    <h1>RestaurantOS</h1>
                    <p>Restaurant Management</p>
                  </div>
                </div>
                
                <div className="header-actions">
                  <div className="header-stats">
                    <div className="stat-item">
                      <div className="stat-number">{menuItems.length}</div>
                      <div className="stat-label">Menu Items</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number stat-available">
                        {menuItems.filter(item => item.is_available).length}
                      </div>
                      <div className="stat-label">Available</div>
                    </div>
                  </div>
                  
                  <button onClick={handleLogout} className="logout-btn">
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="main-content">
            <div className="content-container">
              
              {/* Restaurant Information */}
              <div className="section restaurant-info-section">
                <div className="section-header">
                  <div className="section-icon">🏪</div>
                  <h2 className="section-title">Restaurant Information</h2>
                </div>
                
                <div className="restaurant-form">
                  <div className="form-group">
                    <label className="form-label">Restaurant Name</label>
                    <input
                      type="text"
                      name="name"
                      value={restaurant.name}
                      onChange={handleRestaurantChange}
                      className="form-input"
                      placeholder="Enter restaurant name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={restaurant.phone}
                      onChange={handleRestaurantChange}
                      className="form-input"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={restaurant.address}
                      onChange={handleRestaurantChange}
                      className="form-input"
                      placeholder="Enter restaurant address"
                    />
                  </div>
                </div>
              </div>

              {/* Add Menu Item */}
              <div className="section add-menu-section">
                <div className="section-header">
                  <div className="section-icon">➕</div>
                  <h2 className="section-title">Add Menu Item</h2>
                </div>
                
                <div className="menu-form">
                  {/* Image Upload */}
                  <div className="image-upload-section">
                    <label className="form-label">Item Image</label>
                    <div className="image-upload-area">
                      {menuItem.image_url ? (
                        <img
                          src={menuItem.image_url}
                          alt="Menu item"
                          className="uploaded-image"
                        />
                      ) : (
                        <div className="upload-placeholder">
                          <div className="upload-icon">📷</div>
                          <p className="upload-text">Click to upload</p>
                          <p className="upload-hint">JPG, PNG, GIF</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMenuImage}
                        className="file-input"
                      />
                    </div>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="menu-form-fields">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Item Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={menuItem.name}
                          onChange={handleMenuChange}
                          className="form-input"
                          placeholder="Enter item name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Price *</label>
                        <div className="price-input-container">
                          <span className="price-currency">₹</span>
                          <input
                            type="number"
                            name="price"
                            value={menuItem.price}
                            onChange={handleMenuChange}
                            className="form-input price-input"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Category *</label>
                      <select
                        name="category_id"
                        value={menuItem.category_id}
                        onChange={handleMenuChange}
                        className="form-select"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        value={menuItem.description}
                        onChange={handleMenuChange}
                        className="form-textarea"
                        placeholder="Describe your menu item..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="form-actions">
                      <label className="availability-toggle">
                        <input
                          type="checkbox"
                          name="is_available"
                          checked={menuItem.is_available}
                          onChange={handleMenuChange}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-text">Available for order</span>
                      </label>
                      
                      <button onClick={addMenuItem} className="add-item-btn">
                        <span>➕</span>
                        <span>Add Item</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items Display */}
              <div className="section menu-items-section">
                <div className="section-header">
                  <div className="section-icon">📋</div>
                  <h2 className="section-title">Menu Items ({menuItems.length})</h2>
                </div>

                {menuItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🍽️</div>
                    <h3 className="empty-title">No menu items yet</h3>
                    <p className="empty-text">Start by adding your first menu item above</p>
                  </div>
                ) : (
                  <div className="menu-items-grid">
                    {menuItems.map((item) => (
                      <div key={item.id} className="menu-item-card">
                        {/* Item Image */}
                        <div className="menu-item-image-container">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="menu-item-image"
                            />
                          ) : (
                            <div className="menu-item-placeholder">
                              <div className="placeholder-icon">🍽️</div>
                            </div>
                          )}
                          
                          {/* Availability Badge */}
                          <div className={`availability-badge ${item.is_available ? 'available' : 'unavailable'}`}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </div>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => deleteMenuItem(item.id)}
                            className="delete-btn"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Item Info */}
                        <div className="menu-item-content">
                          <div className="menu-item-header">
                            <h3 className="menu-item-name">{item.name}</h3>
                            <div className="menu-item-price">₹{item.price}</div>
                          </div>
                          
                          {item.description && (
                            <p className="menu-item-description">{item.description}</p>
                          )}
                          
                          <div className="menu-item-footer">
                            <span className="menu-item-category">
                              {getCategoryName(item.category_id)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Restaurant */}
              <div className="section save-section">
                <div className="save-content">
                  <div className="save-icon">💾</div>
                  <h3 className="save-title">Save Your Restaurant</h3>
                  <p className="save-description">Save your restaurant information and menu to make it live</p>
                  
                  <button
                    onClick={saveRestaurant}
                    disabled={isLoading || !restaurant.name || menuItems.length === 0}
                    className="save-btn"
                  >
                    {isLoading ? (
                      <div className="loading-content">
                        <div className="spinner"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      "Save Restaurant & Menu"
                    )}
                  </button>
                  
                  {(!restaurant.name || menuItems.length === 0) && (
                    <p className="save-requirements">
                      {!restaurant.name ? "Please enter restaurant details. " : ""}
                      {menuItems.length === 0 ? "Please add at least one menu item." : ""}
                    </p>
                  )}
                </div>
              </div>
              {restaurantId && (
                <div className="section qr-section" ref={qrRef}>
                  <h3 className="section-title">📲 Share QR Code with Customers</h3>
                  <img 
                    src={`http://localhost:8000/order/generate-qr/${restaurantId}`} 
                    alt="Restaurant QR Code"
                    width="200"
                  />
                  <a 
                    href={`http://localhost:8000/order/generate-qr/${restaurantId}`} 
                    download={`restaurant_${restaurantId}_qr.png`} 
                    className="download-btn"
                  >
                    ⬇️ Download QR
                  </a>
                  
                  <p>Scan this code to view your restaurant menu</p>
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}