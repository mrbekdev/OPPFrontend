import React, { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Login from "./components/Login.jsx";
import RentPanel from "./components/RentPanel.jsx";
import ReturnPanel from "./components/ReturnPanel.jsx";
import ReturnsPanel from "./components/ReturnsPanel.jsx";
import InventoryPanel from "./components/InventoryPanel.jsx";
import CustomersPanel from "./components/CustomersPanel.jsx";
import ReportsPanel from "./components/ReportsPanel.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import { getToken, clearToken } from "./utils/storage.js";

export default function App() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  
  const [settings, setSettings] = useState({
    orgName: "Mening Ijara Servisim",
    orgPhone: "+99890 123 45 67",
    orgAddress: "Toshkent",
    taxPercent: 12,
  });

  const [tab, setTab] = useState(() => localStorage.getItem('activeTab') || "rent");
  useEffect(() => { localStorage.setItem('activeTab', tab); }, [tab]);

  const [token, setToken] = useState(() => {
    const currentToken = getToken();
    return currentToken || "";
  });

  // Fetch initial data directly from backend
  useEffect(() => {
    const fetchAll = async () => {
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      try {
        // Products
        const pr = await fetch("http://localhost:3000/products", { headers });
        if (pr.ok) {
          const data = await pr.json();
          setItems(data.products || []);
        }
        // Customers
        const cr = await fetch("http://localhost:3000/clients", { headers });
        if (pr.ok) {
          const data = await cr.json();
          const mapped = (data.clients || []).map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            phone: c.phone,
            firstName: c.firstName,
            lastName: c.lastName,
          }));
          setCustomers(mapped);
        }
        // Orders
        const or = await fetch("http://localhost:3000/orders", { headers });
        if (or.ok) {
          const data = await or.json();
          const mapped = (data.orders || []).map((o) => ({
            id: o.id,
            customerId: o.clientId,
            items: (o.items || [])
              .map((i) => ({
                itemId: i.productId,
                qty: i.quantity - i.returned,
                pricePerDay: i.product.price,
                orderItemId: i.id,
                returned: i.returned,
                name: i.product.name,
                size: i.product.size,
                totalQuantity: i.quantity, // Keep original quantity for reference
              }))
              .filter((item) => item.qty > 0), // Only show items that still have quantity to return
            fromDate: o.fromDate, // Keep full datetime for start time
            toDate: o.toDate, // Will be null for active rentals
            subtotal: o.subtotal,
            tax: o.tax,
            total: o.total,
            advancePayment: o.advancePayment || 0,
            advanceUsed: o.advanceUsed || 0,
            paidAt: o.fromDate || o.createdAt, // Use start time as paidAt
            returnedAt: o.returnedAt,
            status: o.status,
          }));
          setRentals(mapped);
        }
      } catch (e) {
        console.error("Initial fetch error", e);
      }
    };
    fetchAll();
  }, [token]);

  // Token revalidation
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToken = getToken();
      if (!currentToken) {
        setToken("");
        clearToken();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    clearToken();
    setToken("");
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app gap" style={{ width: "100vw", maxWidth: "100%" }}>
      <Header orgName={settings.orgName} active={tab} onTab={setTab} onLogout={handleLogout} />
      <div className="gap page" style={{ padding: "16px" }}>
        {tab === "rent" && (
          <RentPanel
            items={items}
            setItems={setItems}
            customers={customers}
            setCustomers={setCustomers}
            rentals={rentals}
            setRentals={setRentals}
            settings={settings}
          />
        )}
        {tab === "return" && (
          <ReturnPanel
            items={items}
            setItems={setItems}
            rentals={rentals}
            setRentals={setRentals}
            customers={customers}
            settings={settings}
          />
        )}
        {tab === "returns" && (
          <ReturnsPanel
            customers={customers}
            settings={settings}
          />
        )}
        {tab === "inventory" && (
          <InventoryPanel 
            items={items} 
            setItems={setItems} 
            rentals={rentals}
            setRentals={setRentals}
            customers={customers}
          />
        )}
        {tab === "customers" && (
          <CustomersPanel customers={customers} setCustomers={setCustomers} />
        )}
        {tab === "reports" && (
          <ReportsPanel rentals={rentals} items={items} customers={customers} setRentals={setRentals} />
        )}
        {tab === "settings" && (
          <SettingsPanel />
        )}
      </div>
    </div>
  );
}