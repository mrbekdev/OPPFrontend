import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, ShoppingCart, Plus, Minus, Trash2, User, CreditCard, Printer } from 'lucide-react';
import { openPrintReceipt } from './Receipt';
import { toUzbekistanTime, formatUzbekistanDateTime } from '../utils/helpers';

const ModernRentalPOS = ({ items, setItems, customers, setCustomers, rentals, setRentals, settings }) => {
  // Use products from props
  const products = items;
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  // Get current Uzbekistan time in datetime-local format
  const getCurrentLocalDateTime = () => {
    const uzbekTime = toUzbekistanTime(new Date());
    const year = uzbekTime.getFullYear();
    const month = String(uzbekTime.getMonth() + 1).padStart(2, '0');
    const day = String(uzbekTime.getDate()).padStart(2, '0');
    const hours = String(uzbekTime.getHours()).padStart(2, '0');
    const minutes = String(uzbekTime.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [startDateTime, setStartDateTime] = useState(getCurrentLocalDateTime());
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalWasClosed, setModalWasClosed] = useState(false); // Модал ёпилганини кузатиш учун
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityInput, setQuantityInput] = useState('');
  const quantityInputRef = useRef(null);
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [advancePayment, setAdvancePayment] = useState('');
  // Settings now come from props

  const token = localStorage.getItem("token");

  // Phone number formatting function
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as XX XXX XX XX (9 digits total)
    const digits = cleaned.slice(0, 9);
    let formatted = '';
    
    if (digits.length > 0) {
      formatted += digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += ' ' + digits.slice(2, 5);
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.slice(5, 7);
    }
    if (digits.length > 7) {
      formatted += ' ' + digits.slice(7);
    }
    
    return formatted;
  };

  // Money formatting function
  const formatMoney = (value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Add spaces every 3 digits from the right
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Products come from props, no need to fetch separately

  // Саватни localStorage дан олиш
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    
    // Мижоз маълумотларини localStorage дан олиш
    const savedCustomer = localStorage.getItem('customerData');
    if (savedCustomer) {
      const customerData = JSON.parse(savedCustomer);
      setCustomer(customerData.customer || { firstName: '', lastName: '', phone: '' });
      setAdvancePayment(customerData.advancePayment || '');
    }
  }, []);

  // Сават ўзгарганда localStorage га сақлаш
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('cart');
    }
  }, [cart]);

  // Компонент unmount бўлганда ёки бошqa саҳифага ўтганда модални ёпиш
  // Мижоз маълумотларини localStorage га сақлаш
  useEffect(() => {
    return () => {
      // Cleanup function - компонент unmount бўлганда ишлайди
      // Агар мижоз маълумотлари тўлдирилган бўлса, localStorage га сақлаш
      if (customer.firstName || customer.lastName || customer.phone || advancePayment) {
        const customerData = {
          customer: customer,
          advancePayment: advancePayment
        };
        localStorage.setItem('customerData', JSON.stringify(customerData));
      }
      
      setShowCustomerModal(false);
      setShowQuantityModal(false);
      setModalWasClosed(true); // Саҳифа алмашганда модал ёпилганини белгилаш
    };
  }, []); // Removed dependencies to prevent running on every keystroke

  // Модал ёпилган бўлса, қайта очмаслик учун - REMOVED: This was causing modal to close unexpectedly

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:3000/products", {
        headers: { Authorization: `Bearer ${token}` },
      });    
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      } else {
        console.error("Маҳсулотларни олишда хатолик");
      }
    } catch (error) {
      console.error("Маҳсулотларни олишда хатолик:", error);
    }
  };

  // Rental will be calculated based on actual usage time when returned
  const days = 1; // Default display value

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         product.size.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleProductClick = (product) => {
    if (product.count === 0) return;
    setSelectedProduct(product);
    setQuantityInput('');
    setShowQuantityModal(true);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty < 1 || qty > selectedProduct.count) {
      alert(`Нотўғри миқдор! 1 дан ${selectedProduct.count} гача киритинг.`);
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === selectedProduct.id);
      if (existingItem) {
        const newQty = existingItem.qty + qty;
        if (newQty > selectedProduct.count) {
          alert("Мавжуд миқдордан ошди!");
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === selectedProduct.id 
            ? { ...item, qty: newQty }
            : item
        );
      }
      return [...prevCart, { ...selectedProduct, qty }];
    });

    setShowQuantityModal(false);
    setSelectedProduct(null);
    setQuantityInput('');
  };

  const updateQuantity = (productId, newQty) => {
    const product = products.find(p => p.id === productId);
    const clampedQty = Math.max(0, Math.min(newQty, product.count));
    
    if (clampedQty === 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId 
            ? { ...item, qty: clampedQty }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    if (confirm("Саватни тозалашни хоҳлайсизми?")) {
      setCart([]);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
  };

  const calculateTotalWeight = () => {
    return cart.reduce((total, item) => total + ((item.weight || 0) * item.qty), 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " сўм";
  };


  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowCustomerModal(true);
    setModalWasClosed(false); // Модал очилганда флагни ресет қилиш
  };

  const processOrder = async () => {
    if (!customer.firstName || !customer.lastName || !customer.phone) {
      alert("Илтимос, мижоз маълумотларини тўлиқ киритинг!");
      return;
    }

    const orderData = {
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        phone: customer.phone.trim(),
      },
      items: cart.map(item => ({ productId: item.id, quantity: item.qty })),
      startDateTime,
      taxPercent: 0,
      advancePayment: Number(advancePayment.replace(/\s/g, '')) || 0,
    };

    try {
      const res = await fetch("http://localhost:3000/orders/with-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        const data = await res.json();
        
        const customerData = {
          id: data.order.client.id,
          name: `${data.order.client.firstName} ${data.order.client.lastName}`,
          phone: data.order.client.phone,
        };

        // Чек чоп этиш
        await openPrintReceipt({
          settings: settings,
          customer: customerData,
          items: cart.map(item => ({ 
            ...item, 
            sku: item.size, 
            pricePerDay: item.price, 
            weight: item.weight || 0 
          })),
          startDateTime,
          days: 1, // Will be calculated on return
          subtotal: calculateTotal(),
          tax: 0,
          total: calculateTotal(),
          totalWeight: cart.reduce((total, item) => total + (item.weight || 0) * item.qty, 0),
          orderId: data.order.id,
          advancePayment: Number(advancePayment.replace(/\s/g, '')) || 0,
        });

        // Add new order to rentals state
        const newRental = {
          id: data.order.id,
          customerId: data.order.client.id,
          items: cart.map(item => ({
            itemId: item.id,
            qty: item.qty,
            pricePerDay: item.price,
            orderItemId: null, // Will be set by backend
            returned: 0,
            name: item.name,
            size: item.size,
          })),
          fromDate: null, // Not used anymore
          toDate: null,
          subtotal: data.order.subtotal,
          tax: data.order.tax,
          total: data.order.total,
          advancePayment: Number(advancePayment.replace(/\s/g, '')) || 0,
          createdAt: startDateTime, // Use createdAt for start time
          returnedAt: null,
          status: 'PENDING',
        };
        
        setRentals(prev => [newRental, ...prev]);
        
        // Update customer list if new customer
        if (!customers.find(c => c.id === data.order.client.id)) {
          setCustomers(prev => [...prev, {
            id: data.order.client.id,
            name: `${data.order.client.firstName} ${data.order.client.lastName}`,
            phone: data.order.client.phone,
            firstName: data.order.client.firstName,
            lastName: data.order.client.lastName,
          }]);
        }
        
        // alert(`Буюртма муваффақиятли яратилди! ID: ${data.order.id}`);
        
        // Сават ва мижоз маълумотларини тозалаш
        setCart([]);
        setCustomer({ firstName: '', lastName: '', phone: '' });
        setAdvancePayment('');
        setShowCustomerModal(false);
        setModalWasClosed(true); // Муваффақиятли юборилганда модал ёпилганини белгилаш
        
        // localStorage дан мижоз маълумотларини тозалаш
        localStorage.removeItem('customerData');
        
        // Update products inventory after rental
        const updatedItems = items.map(item => {
          const cartItem = cart.find(c => c.id === item.id);
          if (cartItem) {
            return { ...item, count: item.count - cartItem.qty };
          }
          return item;
        });
        setItems(updatedItems);
      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || "Буюртма яратишда хатолик"}`);
      }
    } catch (error) {
      console.error("Буюртма яратишда хатолик:", error);
      alert("Тармоқ хатолиги юз берди");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <ShoppingCart className="mr-3 text-blue-600" size={36} />
              Ижара Тизими
            </h1>
            <div className="flex items-center space-x-4 text-lg font-medium text-gray-600">
              <Calendar size={24} className="text-blue-500" />
              <span>Ижара бошланиши: {(() => {
                const dt = formatUzbekistanDateTime(startDateTime);
                return `${dt.date} ${dt.time}`;
              })()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Cart Panel */}
          <div className="basis-[30%]">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center">
                    <ShoppingCart className="mr-3" size={28} />
                    Сават ({cart.length})
                  </h2>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-white hover:text-red-200 text-sm"
                    >
                      Тозалаш
                    </button>
                  )}
                </div>
              </div>

              {/* Start DateTime Selection */}
              <div className="p-4 bg-gray-50 border-b">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ижара бошланиш вақти
                  </label>
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto" style={{maxHeight: '400px'}}>
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Сават бўш</p>
                    <p className="text-sm">Маҳсулотларни танланг</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {cart.map((item) => (
                      <div key={item.id} className="mb-4 p-3 bg-gray-50 rounded-lg  hover:bg-gray-400 text-white">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 flex items-center gap-2">
                            <h4 className="font-medium text-black text-xl">
                              {item.name}
                            </h4>
                            (<p className=" text-gray-600 text-xl">{item.size}</p>)
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.qty - 1)}
                              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-medium text-2xl text-black">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.qty + 1)}
                              className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600"
                              disabled={item.qty >= item.count}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            {formatPrice(item.price * item.qty)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total and Checkout */}
              {cart.length > 0 && (
                <div className="p-4 bg-gray-50 border-t">
                  <div className="mb-4">
                    <div className="flex justify-between text-lg font-bold text-gray-800">
                      <span>Жами:</span>
                      <span className="text-green-600">
                        {formatPrice(calculateTotal())}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Жами оғирлик:</span>
                      <span>{calculateTotalWeight().toFixed(2)} кг</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Хақиқий вақт қайтарилганда ҳисобланади
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center"
                  >
                    <Printer className="mr-2" size={20} />
                    Ижара бериш & Чек чоп этиш
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Products Panel */}
          <div className="basis-[70%]">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Маҳсулотлар</h2>
                  <div className="text-sm opacity-90">
                    Жами: {products.length} та маҳсулот
                  </div>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400 " size={20} />
                  <input
                    type="text"
                    placeholder="Маҳсулот номи ёки ўлчами бўйича қидиринг..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="p-4 max-h-screen overflow-y-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className={ `
                        rounded-xl p-4 cursor-pointer transition-all duration-200 border-2 
                        ${product.count > 0 
                          ? 'bg-gradient-to-br from-white to-blue-50 border-blue-200 hover:border-black hover:shadow-lg hover:scale-105' 
                          : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="text-center ">
                        <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="text-2xl text-black font-bold mb-2">
                          {product.size}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {product.weight || 0} кг
                        </div>
                        <div className={`
                          text-sm font-medium px-2 py-1 rounded-full
                          ${product.count > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                          }
                        `}>
                          {product.count > 0 ? `${product.count} та` : 'Тугаган'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            // Мижоз маълумотларини localStorage га сақлаш
            const customerData = {
              customer: customer,
              advancePayment: advancePayment
            };
            localStorage.setItem('customerData', JSON.stringify(customerData));
            
            setShowCustomerModal(false);
            setModalWasClosed(true);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
              <h3 className="text-2xl font-bold flex items-center">
                <User className="mr-3" size={28} />
                Мижоз Маълумотлари
              </h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Исми *
                  </label>
                  <input
                    type="text"
                    value={customer.firstName}
                    onChange={(e) => setCustomer({...customer, firstName: e.target.value})}
                    placeholder="Мижознинг исми"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фамилияси *
                  </label>
                  <input
                    type="text"
                    value={customer.lastName}
                    onChange={(e) => setCustomer({...customer, lastName: e.target.value})}
                    placeholder="Мижознинг фамилияси"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон рақами *
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({...customer, phone: formatPhoneNumber(e.target.value)})}
                    placeholder="91 999 99 99"
                    maxLength="12"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Аванс (олдиндан тўлов)
                  </label>
                  <input
                    type="text"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(formatMoney(e.target.value))}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Максимум: {formatPrice(calculateTotal())}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-b-xl flex space-x-3">
              <button
                onClick={() => {
                  // Мижоз маълумотларини localStorage га сақлаш
                  const customerData = {
                    customer: customer,
                    advancePayment: advancePayment
                  };
                  localStorage.setItem('customerData', JSON.stringify(customerData));
                  
                  setShowCustomerModal(false);
                  setModalWasClosed(true); // Бекор қилинганда модал ёпилганини белгилаш
                }}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Бекор қилиш
              </button>
              <button
                onClick={processOrder}
                disabled={!customer.firstName || !customer.lastName || !customer.phone}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Тасдиқлаш
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Modal */}
      {showQuantityModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-md max-w-sm w-full mx-4 p-4">
            <h3 className="text-lg font-bold mb-2">Миқдорни киритинг</h3>
            <div className="mb-2">
              <span className="font-semibold text-gray-800 text-2xl">{selectedProduct.name}</span>
              <span className="ml-2 text-gray-600 text-2xl">({selectedProduct.size})</span>
            </div>
            <input
              ref={quantityInputRef}
              type="text"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmAddToCart();
                }
              }}
              placeholder="Миқдор (1 дан мавжуд миқдоргача)"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
              autoFocus
            />
            <p className=" text-gray-600 mb-4 text-2xl">Мавжуд: {selectedProduct.count} та</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowQuantityModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Бекор қилиш
              </button>
              <button
                onClick={confirmAddToCart}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Қўшиш
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernRentalPOS;