import React, { useState } from "react";
import { fmt } from "../utils/helpers";
import { uid } from "../utils/helpers";

export default function InventoryPanel({ items, setItems }) {
  const [form, setForm] = useState({ name: "", sku: "", pricePerDay: 0, stock: 0 });

  const addItem = () => {
    if (!form.name || !form.sku) return;
    setItems([{ id: uid(), ...form, pricePerDay: Number(form.pricePerDay||0), stock:Number(form.stock||0) }, ...items]);
    setForm({ name:"", sku:"", pricePerDay:0, stock:0 });
  };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));

  return (
    <div className="gap">
      <div className="card gap">
        <h2>Tovar qo'shish</h2>
        <div className="row" style={{flexWrap:'wrap'}}>
          <input className="input" placeholder="Nom" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="input" placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})} />
          <input className="input" placeholder="Kunlik narx" type="number" value={form.pricePerDay} onChange={e=>setForm({...form, pricePerDay:e.target.value})} />
          <input className="input" placeholder="Stok" type="number" value={form.stock} onChange={e=>setForm({...form, stock:e.target.value})} />
          <button className="btn primary" onClick={addItem}>Qo'shish</button>
        </div>
      </div>

      <div className="card">
        <h2>Tovarlar ro'yxati</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>SKU</th><th>Kunlik narx</th><th>Stok</th><th>O'chirish</th></tr></thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td><b>{it.name}</b></td>
                  <td>{it.sku}</td>
                  <td>{fmt(it.pricePerDay)}</td>
                  <td>{it.stock}</td>
                  <td><button className="btn" onClick={()=>removeItem(it.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
