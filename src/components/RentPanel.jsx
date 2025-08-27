import React, { useState, useEffect } from 'react';
import { Search, Calendar, ShoppingCart, Plus, Minus, Trash2, User, CreditCard, Printer } from 'lucide-react';

const ModernRentalPOS = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [settings, setSettings] = useState({
    storeName: 'Ijara Magazini',
    storeAddress: 'Toshkent, O\'zbekiston',
    storePhone: '+998 XX XXX XX XX'
  });

  const token = localStorage.getItem("token");

  // Backend dan mahsulotlarni yuklash
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:3000/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      } else {
        console.error("Mahsulotlarni olishda xatolik");
      }
    } catch (error) {
      console.error("Mahsulotlarni olishda xatolik:", error);
    }
  };

  const calculateDays = (from, to) => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const ms = Math.max(0, d2 - d1);
    const calculatedDays = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return calculatedDays <= 0 ? 1 : calculatedDays; // Minimum 1 kun
  };

  const days = calculateDays(fromDate, toDate);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         product.size.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const addToCart = (product) => {
    if (product.count === 0) return;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.qty < product.count) {
          return prevCart.map(item =>
            item.id === product.id 
              ? { ...item, qty: item.qty + 1 }
              : item
          );
        }
        return prevCart;
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
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

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.qty * days), 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  // Chek chop etish funksiyasi
  const openPrintReceipt = (receiptData) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chek</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; font-size: 11px; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center bold">${receiptData.settings.storeName}</div>
        <div class="center">${receiptData.settings.storeAddress}</div>
        <div class="center">${receiptData.settings.storePhone}</div>
        <div class="line"></div>
        <div><strong>Chek #:</strong> ${receiptData.orderId}</div>
        <div><strong>Sana:</strong> ${new Date().toLocaleString('uz-UZ')}</div>
        <div><strong>Mijoz:</strong> ${receiptData.customer.name}</div>
        <div><strong>Telefon:</strong> ${receiptData.customer.phone}</div>
        <div class="line"></div>
        <div><strong>Ijara muddati:</strong></div>
        <div>Boshlanish: ${receiptData.fromDate}</div>
        <div>Tugash: ${receiptData.toDate}</div>
        <div>Kunlar: ${receiptData.days}</div>
        <div class="line"></div>
        <table>
          <tr><th>Nom</th><th>Soni</th><th>Narx</th><th>Jami</th></tr>
          ${receiptData.items.map(item => `
            <tr>
              <td>${item.name} (${item.size})</td>
              <td class="center">${item.qty}</td>
              <td class="right">${formatPrice(item.price)}</td>
              <td class="right">${formatPrice(item.price * item.qty * receiptData.days)}</td>
            </tr>
          `).join('')}
        </table>
        <div class="line"></div>
        <div class="right"><strong>JAMI: ${formatPrice(receiptData.total)}</strong></div>
        <div class="line"></div>
        <div class="center">Rahmat!</div>
      </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowCustomerModal(true);
  };

  const processOrder = async () => {
    if (!customer.firstName || !customer.lastName || !customer.phone) {
      alert("Iltimos, mijoz ma'lumotlarini to'liq kiriting!");
      return;
    }

    const orderData = {
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        phone: customer.phone.trim(),
      },
      items: cart.map(item => ({ productId: item.id, quantity: item.qty })),
      fromDate,
      toDate,
      taxPercent: 0,
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

        // Chek chop etish
        await openPrintReceipt({
          settings: settings,
          customer: customerData,
          items: cart.map(item => ({ 
            ...item, 
            sku: item.size, 
            pricePerDay: item.price, 
            weight: item.weight || 0 
          })),
          fromDate,
          toDate,
          days,
          subtotal: calculateTotal(),
          tax: 0,
          total: calculateTotal(),
          totalWeight: cart.reduce((total, item) => total + (item.weight || 0) * item.qty, 0),
          orderId: data.order.id,
        });

        alert(`Buyurtma muvaffaqiyatli yaratildi! ID: ${data.order.id}`);
        
        // Savat va mijoz ma'lumotlarini tozalash
        setCart([]);
        setCustomer({ firstName: '', lastName: '', phone: '' });
        setShowCustomerModal(false);
        
        // Mahsulotlar ro'yxatini yangilash
        fetchProducts();
      } else {
        const errorData = await res.json();
        alert(`Xatolik: ${errorData.message || "Buyurtma yaratishda xatolik"}`);
      }
    } catch (error) {
      console.error("Buyurtma yaratishda xatolik:", error);
      alert("Tarmoq xatoligi yuz berdi");
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
              Ijara POS Tizimi
            </h1>
            <div className="flex items-center space-x-4 text-lg font-medium text-gray-600">
              <Calendar size={24} className="text-blue-500" />
              <span>Muddati: {days} kun</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          
          {/* Products Panel */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Mahsulotlar</h2>
                  <div className="text-sm opacity-90">
                    Jami: {products.length} ta mahsulot
                  </div>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Mahsulot nomi yoki o'lchami bo'yicha qidiring..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="p-4 max-h-screen overflow-y-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`
                        rounded-xl p-4 cursor-pointer transition-all duration-200 border-2
                        ${product.count > 0 
                          ? 'bg-gradient-to-br from-white to-blue-50 border-blue-200 hover:border-blue-400 hover:shadow-lg hover:scale-105' 
                          : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="text-center">
                        <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="text-xs text-gray-600 mb-2">
                          {product.size}
                        </div>
                        <div className="text-lg font-bold text-blue-600 mb-2">
                          {formatPrice(product.price)}
                        </div>
                        <div className={`
                          text-sm font-medium px-2 py-1 rounded-full
                          ${product.count > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                          }
                        `}>
                          {product.count > 0 ? `${product.count} ta` : 'Tugagan'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="w-96">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <h2 className="text-2xl font-bold flex items-center">
                  <ShoppingCart className="mr-3" size={28} />
                  Savat ({cart.length})
                </h2>
              </div>

              {/* Date Selection */}
              <div className="p-4 bg-gray-50 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Boshlanish
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tugash
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto" style={{maxHeight: '400px'}}>
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Savat bo'sh</p>
                    <p className="text-sm">Mahsulotlarni tanlang</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {cart.map((item) => (
                      <div key={item.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 text-sm">
                              {item.name}
                            </h4>
                            <p className="text-xs text-gray-600">{item.size}</p>
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
                            <span className="w-8 text-center font-medium">
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
                            {formatPrice(item.price * item.qty * days)}
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
                      <span>Jami:</span>
                      <span className="text-green-600">
                        {formatPrice(calculateTotal())}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {days} kun uchun
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center"
                  >
                    <Printer className="mr-2" size={20} />
                    Ijara berish & Chek chop etish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
              <h3 className="text-2xl font-bold flex items-center">
                <User className="mr-3" size={28} />
                Mijoz Ma'lumotlari
              </h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ismi *
                  </label>
                  <input
                    type="text"
                    value={customer.firstName}
                    onChange={(e) => setCustomer({...customer, firstName: e.target.value})}
                    placeholder="Mijozning ismi"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Familiyasi *
                  </label>
                  <input
                    type="text"
                    value={customer.lastName}
                    onChange={(e) => setCustomer({...customer, lastName: e.target.value})}
                    placeholder="Mijozning familiyasi"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon raqami *
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                    placeholder="+998 XX XXX XX XX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-b-xl flex space-x-3">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={processOrder}
                disabled={!customer.firstName || !customer.lastName || !customer.phone}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernRentalPOS;