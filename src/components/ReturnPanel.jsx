import React, { useState } from "react";
import { fmt } from "../utils/helpers";

export default function ReturnPanel({ items, setItems, rentals, setRentals, customers }) {
  const [search, setSearch] = useState("");
  const active = rentals.filter(r => !r.returnedAt);
  const filtered = active.filter(r => r.id.toLowerCase().includes(search.toLowerCase()));

  const markReturned = (r) => {
    const newItems = items.map(it => {
      const qty = r.items.find(x => x.itemId === it.id)?.qty || 0;
      if (!qty) return it;
      return { ...it, stock: it.stock + qty };
    });
    setItems(newItems);
    setRentals(rs => rs.map(x => x.id === r.id ? { ...x, returnedAt: new Date().toISOString() } : x));
  };

  const nameById = (id) => customers.find(c => c.id === id)?.name || id;

  return (
    <div className="card gap">
      <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap'}}>
        <h2>Qaytarilmagan ijaralar</h2>
        <input className="input" placeholder="Qidirish (ID)" style={{width:'280px'}}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Mijoz</th><th>Muddat</th><th>Summa</th><th>Harakat</th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{nameById(r.customerId)}</td>
                <td>{r.fromDate} → {r.toDate} ({r.days} kun)</td>
                <td>{fmt(r.total)}</td>
                <td><button className="btn" onClick={()=>markReturned(r)}>✔️ Qabul qilindi</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
