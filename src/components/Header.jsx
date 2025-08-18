import React from "react";

export default function Header({ orgName, active, onTab }) {
  const tabs = [
    ["rent", "Ijara berish"],
    ["return", "Qaytarish"],
    ["inventory", "Tovarlar"],
    ["customers", "Mijozlar"],
    ["reports", "Hisobotlar"],
    ["settings", "Sozlamalar"],
  ];
  return (
    <div className="card row" style={{justifyContent:'space-between'}}>
      <div><h1>{orgName}</h1></div>
      <nav className="nav">
        {tabs.map(([id, label]) => (
          <button key={id} className={"btn " + (active===id ? "active" : "")} onClick={() => onTab(id)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
