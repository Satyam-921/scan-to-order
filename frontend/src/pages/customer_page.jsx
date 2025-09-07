import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './customer_page.css';

const API_BASE_URL = "http://localhost:8000";

export default function CustomerOrderPage() {
  const { restaurant_id } = useParams();
  const navigate = useNavigate();
  
  const [tableNumber, setTableNumber] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCart, setShowCart] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: "satyam pandey",
    phone: "919463052507",
    address: "test"
  });
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set restaurant ID from URL params
  useEffect(() => {
    if (restaurant_id) {
      const parsedId = parseInt(restaurant_id);
      if (isNaN(parsedId)) {
        setError("Invalid restaurant ID");
        return;
      }
      setRestaurantId(parsedId);
    } else {
      setError("Restaurant ID not found");
    }
  }, [restaurant_id]);

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!restaurantId) return;

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/order/menu-items/${restaurantId}`, {
          headers: {
            'accept': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Menu not found for this restaurant');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMenuItems(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError(err.message);
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [restaurantId]);

  const handleSendWhatsApp = async () => {
    if (!restaurantInfo.phone) {
      alert("Restaurant contact information not available");
      return;
    }

    if (cart.length === 0) {
      alert("Please add items to your cart before placing an order");
      return;
    }

    const formatPhoneForWhatsApp = (phone) => {
      let cleanPhone = phone.replace(/[^\d]/g, '');
      if (cleanPhone.startsWith('91')) {
        return cleanPhone;
      } else if (cleanPhone.startsWith('0')) {
        return '91' + cleanPhone.substring(1);
      } else if (cleanPhone.length === 10) {
        return '91' + cleanPhone;
      }
      return cleanPhone;
    };

    const restaurantPhone = formatPhoneForWhatsApp(restaurantInfo.phone);

    let message = `🛒 *New Order from ${customerName || 'Guest'}*%0A`;
    message += `📱 Mobile: ${customerMobile || 'Not provided'}%0A`;
    message += `🪑 Table: ${tableNumber || 'Not specified'}%0A`;
    message += `🏪 Restaurant: ${restaurantInfo.name}%0A`;
    message += `%0A*Order Items:*%0A`;

    cart.forEach(item => {
      message += `• ${item.name} x ${item.qty} = $${(parseFloat(item.price) * item.qty).toFixed(2)}%0A`;
    });

    message += `%0ASubtotal: $${calculateSubtotal().toFixed(2)}%0A`;
    message += `Tax (8%): $${calculateTax().toFixed(2)}%0A`;
    message += `Total: *$${calculateTotal().toFixed(2)}*%0A`;

    const orderData = {
      restaurant_id: restaurantId,
      table_number: parseInt(tableNumber) || 0,
      total_amount: calculateTotal(),
      status: "pending",
      customer_name: customerName,
      customer_mobile: customerMobile,
      order_items: cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.qty,
        price: parseFloat(item.price)
      }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/order/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to save order to server');
      }

      console.log("Order saved successfully");
      setCart([]);
      setShowCart(false);
      
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Failed to send order to server, but WhatsApp message will still be sent");
    }

    const url = `https://wa.me/${restaurantPhone}?text=${message}`;
    window.open(url, '_blank');
    
    // Show success animation
    const successDiv = document.createElement('div');
    successDiv.className = 'order-success-animation';
    successDiv.innerHTML = `
      <div class="success-content">
        <div class="success-icon">✓</div>
        <h3>Order Sent Successfully!</h3>
        <p>Your order has been sent via WhatsApp</p>
      </div>
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      document.body.removeChild(successDiv);
    }, 3000);
  };

  const categories = ["All", ...new Set(menuItems.map(item => item.category?.name).filter(Boolean))];
  
  const filteredMenu = selectedCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category?.name === selectedCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });

    // Add success feedback
    const button = document.querySelector(`[data-item-id="${item.id}"] .add-btn`);
    if (button) {
      button.classList.add('added');
      setTimeout(() => button.classList.remove('added'), 600);
    }
  };

  const updateQuantity = (id, change) => {
    setCart((prev) => 
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + change;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      }).filter(item => item.qty > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.qty), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.qty, 0);
  };

  const getItemQuantity = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.qty : 0;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading delicious menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">😕</div>
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
          <button onClick={() => navigate('/')} className="home-btn">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="error-container">
        <div className="error-icon">🍽️</div>
        <h2>Menu Coming Soon!</h2>
        <p>This restaurant is preparing their delicious menu for you.</p>
        <button onClick={() => navigate('/')} className="home-btn">
          Explore Other Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="customer-order-page">
      {/* Enhanced Header */}
      <header className="header">
        <div className="header-background"></div>
        <div className="header-content">
          <div className="restaurant-section">
            <div className="restaurant-info">
              <h1>{restaurantInfo.name}</h1>
              <div className="restaurant-meta">
                {/* <span className="address">📍 {restaurantInfo.address}</span> */}
                {/* <span className="rating">⭐ 4.5 (200+ reviews)</span> */}
              </div>
              {/* <div className="delivery-info">
                <span className="delivery-time">🕐 25-30 mins</span>
                <span className="delivery-fee">🚚 Free delivery</span>
              </div> */}
            </div>
          </div>
          <div className="table-section">
            <div className="table-input-container">
              <label>Table No.</label>
              <input 
                type="number" 
                placeholder="7"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="table-input"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Customer Details Floating Button */}
      <div className="floating-customer-btn" onClick={() => setShowCustomerForm(true)}>
        <span className="customer-icon">👤</span>
        <span>Add Details</span>
        {(customerName || customerMobile) && <span className="details-indicator">•</span>}
      </div>

      {/* Customer Details Modal */}
      {showCustomerForm && (
        <div className="modal-overlay" onClick={() => setShowCustomerForm(false)}>
          <div className="customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Customer Details</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowCustomerForm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Enter mobile number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="form-input"
                />
              </div>
              <button 
                className="save-details-btn"
                onClick={() => setShowCustomerForm(false)}
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Category Filter */}
      <div className="category-section">
        <div className="category-container">
          <div className="category-scroll">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Menu Section */}
      <div className="menu-section">
        <div className="container">
          <div className="section-header">
            <h2>Menu Items</h2>
            <span className="item-count">{filteredMenu.length} items</span>
          </div>
          <div className="menu-grid">
            {filteredMenu.map((item) => {
              const quantity = getItemQuantity(item.id);
              return (
                <div key={item.id} className="menu-card" data-item-id={item.id}>
                  <div className="card-image">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop";
                      }}
                    />
                    <div className="image-overlay">
                      <span className="price-badge">${parseFloat(item.price).toFixed(2)}</span>
                      {!item.is_available && <div className="unavailable-overlay">Out of Stock</div>}
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="item-header">
                      <h3 className="item-title">{item.name}</h3>
                      <div className="item-rating">
                        <span>⭐</span>
                        <span>4.2</span>
                      </div>
                    </div>
                    <p className="item-description">{item.description}</p>
                    <div className="item-footer">
                      {quantity === 0 ? (
                        <button 
                          onClick={() => addToCart(item)}
                          disabled={!item.is_available}
                          className={`add-btn ${!item.is_available ? 'disabled' : ''}`}
                        >
                          {item.is_available ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      ) : (
                        <div className="quantity-controls">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="qty-btn minus"
                          >
                            −
                          </button>
                          <span className="quantity-display">{quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="qty-btn plus"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enhanced Cart Summary Bar */}
      {cart.length > 0 && (
        <div className="cart-float-bar">
          <div className="cart-summary-content">
            <div className="cart-info">
              <div className="cart-items-count">{getTotalItems()} items</div>
              <div className="cart-total-amount">${calculateTotal().toFixed(2)}</div>
            </div>
            <button 
              onClick={() => setShowCart(true)}
              className="view-cart-btn"
            >
              <span>View Cart</span>
              <div className="cart-icon">🛒</div>
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Cart Modal */}
      {showCart && (
        <div className="cart-overlay">
          <div className="cart-modal">
            {/* Cart Header */}
            <div className="cart-header">
              <button 
                onClick={() => setShowCart(false)}
                className="back-btn"
              >
                ← Back
              </button>
              <h2>Your Order</h2>
              <span className="items-count">{getTotalItems()} items</span>
            </div>

            {/* Delivery Info */}
            <div className="delivery-info-card">
              <div className="delivery-time">
                <span className="delivery-icon">🕐</span>
                <span>Delivery in 25-30 mins</span>
              </div>
              <div className="table-info">
                <span className="table-icon">🪑</span>
                <span>Table {tableNumber || 'Not set'}</span>
              </div>
            </div>

            {/* Cart Items */}
            <div className="cart-items-container">
              {cart.map((item) => (
                <div key={item.id} className="cart-item-card">
                  <div className="item-image">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=100&h=100&fit=crop";
                      }}
                    />
                  </div>
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p className="item-price">${parseFloat(item.price).toFixed(2)}</p>
                    <div className="quantity-section">
                      <div className="quantity-controls">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="qty-btn minus"
                        >
                          −
                        </button>
                        <span className="quantity">{item.qty}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="qty-btn plus"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="remove-btn"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="item-total">
                    ${(parseFloat(item.price) * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="bill-summary">
              <h3>Bill Details</h3>
              <div className="bill-row">
                <span>Item total</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="bill-row">
                <span>Taxes & charges</span>
                <span>${calculateTax().toFixed(2)}</span>
              </div>
              <div className="bill-row total-row">
                <span>Grand Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <div className="cart-footer">
              <button 
                className="place-order-btn" 
                onClick={handleSendWhatsApp}
                disabled={!restaurantInfo.phone || cart.length === 0}
              >
                <span className="order-text">Send Order via WhatsApp</span>
                <span className="order-amount">${calculateTotal().toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}