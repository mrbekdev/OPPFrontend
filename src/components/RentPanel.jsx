import React, { useMemo, useRef, useState } from "react";
import { fmt, today } from "../utils/helpers";
import { openPrintReceipt } from "./Receipt";

export default function RentPanel({ items, setItems, customers, rentals, setRentals, settings }) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.id || "");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [cart, setCart] = useState([]); // {itemId, qty}

  const addToCart = (itemId) => {
    const it = items.find(i => i.id === itemId);
    if (!it || it.stock === 0) return;
    setCart(c => {
      const ex = c.find(x => x.itemId === itemId);
      if (ex) {
        if (ex.qty < it.stock) return c.map(x => x.itemId === itemId ? { ...x, qty: x.qty + 1 } : x);
        return c;
      }
      return [...c, { itemId, qty: 1 }];
    });
  };
  const removeFromCart = (id) => setCart(c => c.filter(x => x.itemId !== id));
  const setQty = (id, qty, max) => setCart(c => c.map(x => x.itemId === id ? { ...x, qty: Math.max(1, Math.min(max, qty)) } : x));

  const days = useMemo(() => {
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const ms = Math.max(0, d2 - d1);
    const dd = Math.max(1, Math.ceil(ms / (1000*60*60*24)) || 1);
    return dd;
  }, [fromDate, toDate]);

  const cartDetailed = cart.map(c => {
    const it = items.find(i => i.id === c.itemId) || {};
    return { ...c, name: it.name, sku: it.sku, pricePerDay: it.pricePerDay, stock: it.stock };
  });

  const subtotal = cartDetailed.reduce((s, x) => s + (x.pricePerDay||0) * x.qty * days, 0);
  const tax = Math.round(subtotal * (Number(settings.taxPercent)||0) / 100);
  const total = subtotal + tax;

  const doRent = () => {
    if (!selectedCustomer || cart.length === 0) return;

    const newItems = items.map(it => {
      const c = cart.find(x => x.itemId === it.id);
      if (!c) return it;
      return { ...it, stock: it.stock - c.qty };
    });
    setItems(newItems);

    const rental = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      customerId: selectedCustomer,
      items: cart.map(x => ({ itemId: x.itemId, qty: x.qty, pricePerDay: items.find(i => i.id === x.itemId)?.pricePerDay || 0 })),
      fromDate, toDate, days, subtotal, tax, total,
      paidAt: new Date().toISOString(), returnedAt: null,
    };
    setRentals([rental, ...rentals]);

    const customer = customers.find(c => c.id === selectedCustomer);
    openPrintReceipt({
      settings, customer,
      items: cartDetailed, fromDate, toDate, days, subtotal, tax, total
    });
    setCart([]);
  };

  const filtered = items.filter(i => (i.name + " " + i.sku).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{alignItems:'end', flexWrap:'wrap', gap:'12px'}}>
          <div style={{flex:'1 1 280px'}}>
            <label>Mijoz</label>
            <select className="input" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
            </select>
          </div>
          <div>
            <label>Boshlanish</label>
            <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label>Tugash</label>
            <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="badge">Kun: {days}</div>
        </div>
      </div>

      <div className="card gap">
        <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap'}}>
          <h2>Tovarlar</h2>
          <input className="input" style={{width:'280px'}} placeholder="Qidirish (nom/sku)"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>SKU</th><th>Kunlik narx</th><th>Stok</th><th>Qo'shish</th></tr></thead>
            <tbody>
              {filtered.map(it => (
                <tr key={it.id}>
                  <td><b>{it.name}</b></td>
                  <td>{it.sku}</td>
                  <td>{fmt(it.pricePerDay)}</td>
                  <td>{it.stock}</td>
                  <td><button className="btn" disabled={it.stock===0} onClick={() => addToCart(it.id)}>➕ Savatga</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card gap">
        <div className="row" style={{justifyContent:'space-between'}}><h2>Savat</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>SKU</th><th>Soni</th><th>Kunlik narx</th><th>Jami</th><th>O'chirish</th></tr></thead>
            <tbody>
              {cartDetailed.map(row => (
                <tr key={row.itemId}>
                  <td><b>{row.name}</b></td>
                  <td>{row.sku}</td>
                  <td><input type="number" className="input" style={{width:'90px'}} min={1} max={row.stock} value={row.qty}
                    onChange={e => setQty(row.itemId, Number(e.target.value), row.stock)} /></td>
                  <td>{fmt(row.pricePerDay)}</td>
                  <td>{fmt(row.pricePerDay * row.qty * days)}</td>
                  <td><button className="btn" onClick={()=>removeFromCart(row.itemId)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap'}}>
          <div className="gap">
            <div>Oraliq: <b>{fmt(subtotal)}</b></div>
            <div>QQS ({settings.taxPercent}%): <b>{fmt(tax)}</b></div>
            <div className="total">Umumiy: <b>{fmt(total)}</b></div>
          </div>
          <div className="row" style={{gap:'8px'}}>
            <button className="btn primary" onClick={doRent}>Ijara berish & Chek chop</button>
          </div>
        </div>
      </div>
    </div>
  );
}
