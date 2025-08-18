import React, { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import RentPanel from "./components/RentPanel.jsx";
import ReturnPanel from "./components/ReturnPanel.jsx";
import InventoryPanel from "./components/InventoryPanel.jsx";
import CustomersPanel from "./components/CustomersPanel.jsx";
import ReportsPanel from "./components/ReportsPanel.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import { loadLS, saveLS, LS_KEYS } from "./utils/storage.js";
import { uid } from "./utils/helpers.js";

export default function App() {
  const [items, setItems] = useState(() => loadLS(LS_KEYS.items, [
    { id: uid(), name: "Projektor", sku: "PRJ-01", pricePerDay: 80000, stock: 3 },
    { id: uid(), name: "Kamera", sku: "CAM-02", pricePerDay: 120000, stock: 2 },
    { id: uid(), name: "Tripod", sku: "TRP-03", pricePerDay: 20000, stock: 5 },
  ]));
  const [customers, setCustomers] = useState(() => loadLS(LS_KEYS.customers, [
    { id: uid(), name: "Ali Valiyev", phone: "+99890 000 00 00" },
  ]));
  const [rentals, setRentals] = useState(() => loadLS(LS_KEYS.rentals, []));
  const [settings, setSettings] = useState(() => loadLS(LS_KEYS.settings, {
    orgName: "Mening Ijara Servisim",
    orgPhone: "+99890 123 45 67",
    orgAddress: "Toshkent",
    taxPercent: 0,
  }));

  useEffect(() => saveLS(LS_KEYS.items, items), [items]);
  useEffect(() => saveLS(LS_KEYS.customers, customers), [customers]);
  useEffect(() => saveLS(LS_KEYS.rentals, rentals), [rentals]);
  useEffect(() => saveLS(LS_KEYS.settings, settings), [settings]);

  const [tab, setTab] = useState("rent");

  return (
    <div className="app gap">
      <Header orgName={settings.orgName} active={tab} onTab={setTab} />

      {tab === "rent" && (
        <RentPanel items={items} setItems={setItems} customers={customers} rentals={rentals} setRentals={setRentals} settings={settings} />
      )}
      {tab === "return" && (
        <ReturnPanel items={items} setItems={setItems} rentals={rentals} setRentals={setRentals} customers={customers} />
      )}
      {tab === "inventory" && (
        <InventoryPanel items={items} setItems={setItems} />
      )}
      {tab === "customers" && (
        <CustomersPanel customers={customers} setCustomers={setCustomers} />
      )}
      {tab === "reports" && (
        <ReportsPanel rentals={rentals} />
      )}
      {tab === "settings" && (
        <SettingsPanel settings={settings} setSettings={setSettings} />
      )}
    </div>
  );
}
