import React, { useState } from "react";
import { uid } from "../utils/helpers";

export default function CustomersPanel({ customers, setCustomers }) {
  const [form, setForm] = useState({ name: "", phone: "" });

  const addCustomer = () => {
    if (!form.name) return;
    setCustomers([{ id: uid(), ...form }, ...customers]);
    setForm({ name:"", phone:"" });
  };
  const removeCustomer = (id) => setCustomers(customers.filter(c => c.id !== id));

  return (
    <div className="gap">
      <div className="card gap">
        <h2>Mijoz qo'shish</h2>
        <div className="row" style={{flexWrap:'wrap'}}>
          <input className="input" placeholder="Ism Familya" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="input" placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
          <button className="btn primary" onClick={addCustomer}>Qo'shish</button>
        </div>
      </div>

      <div className="card">
        <h2>Mijozlar ro'yxati</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ism</th><th>Telefon</th><th>ID</th><th>O'chirish</th></tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.phone}</td>
                  <td className="mono">{c.id}</td>
                  <td><button className="btn" onClick={()=>removeCustomer(c.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
