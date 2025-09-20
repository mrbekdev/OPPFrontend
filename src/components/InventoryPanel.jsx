import React, { useState, useMemo } from "react";
import { formatCurrency } from "../utils/helpers.js";

const fmt = formatCurrency;

export default function InventoryPanel({ items, setItems, rentals, setRentals, customers }) {
  const [newItem, setNewItem] = useState({ 
    name: "", 
    size: "", 
    price: "", 
    count: "", 
    weight: "" 
  });
  const [editItemForm, setEditItemForm] = useState({ 
    id: null, 
    name: "", 
    size: "", 
    price: "", 
    count: "", 
    weight: "" 
  });
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [reportYear, setReportYear] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const token = localStorage.getItem('token');

  // Pul formatlash funksiyasi - har 3 xonaga nuqta qo'yadi
  const formatCurrencyInput = (value) => {
    // Faqat raqamlarni qoldiramiz
    const numbers = value.replace(/\D/g, '');
    // Har 3 xonaga nuqta qo'yamiz
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Pul input-ni boshqarish
  const handlePriceChange = (value, setter, currentItem) => {
    const formatted = formatCurrencyInput(value);
    if (setter === setNewItem) {
      setNewItem(prev => ({ ...prev, price: formatted }));
    } else if (setter === setEditItemForm) {
      setEditItemForm(prev => ({ ...prev, price: formatted }));
    }
  };

  const openAddModal = () => {
    setNewItem({ 
      name: "", 
      size: "", 
      price: "", 
      count: "", 
      weight: "" 
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewItem({ 
      name: "", 
      size: "", 
      price: "", 
      count: "", 
      weight: "" 
    });
  };

  const openEditModal = (product) => {
    setEditItemForm({
      id: product.id,
      name: product.name || "",
      size: product.size || "",
      price: String(product.price ?? ""),
      count: String(product.count ?? ""),
      weight: String(product.weight ?? ""),
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditItemForm({ 
      id: null, 
      name: "", 
      size: "", 
      price: "", 
      count: "", 
      weight: "" 
    });
  };

  const addItem = async () => {
    if (!newItem.name || !newItem.size || !newItem.price || !newItem.count) {
      alert("Барча мажбурий майдонларни тўлдиринг!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newItem.name,
          size: newItem.size,
          price: Number(newItem.price.replace(/\./g, '')),
          count: Number(newItem.count),
          weight: newItem.weight === "" ? 0 : Number(newItem.weight),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems(prevItems => [...(prevItems || []), data.product]);
        closeAddModal();

      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || 'Маҳсулот қўшишда хатолик'}`);
      }
    } catch (error) {
      console.error('Маҳсулот қўшишда хатолик:', error);
      alert('Тармоқ хатолиги юз берди');
    } finally {
      setIsLoading(false);
    }
  };

  const showItemReport = (item) => {
    setSelectedItem(item);
    setReportYear("");
    setReportMonth("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const getItemRentals = (itemId) => {
    return rentals
      .filter(rental => (rental.items || []).some(item => item.itemId === itemId))
      .map(rental => {
        const item = (rental.items || []).find(i => i.itemId === itemId);
        const paidAt = rental.paidAt || rental.fromDate || "";
        return {
          rentalId: rental.id,
          customerId: rental.customerId,
          paidAt,
          dateStr: paidAt ? new Date(paidAt).toLocaleDateString('uz-UZ') : '',
          year: paidAt ? new Date(paidAt).getFullYear() : null,
          month: paidAt ? new Date(paidAt).getMonth() + 1 : null,
          qty: item?.qty || 0,
          returned: item?.returned || 0,
          pricePerDay: item?.pricePerDay || selectedItem?.price || 0,
          days: rental.days || 1,
          amount: (item?.pricePerDay || 0) * (item?.qty || 0) * (rental.days || 1),
          returnedAt: rental.returnedAt || null,
        };
      });
  };

  const getProductStatus = (productId) => {
    let totalOutstanding = 0;
    let totalRented = 0;
    (rentals || []).forEach((r) => {
      const it = (r.items || []).find((i) => i.itemId === productId);
      if (it) {
        const qty = Number(it.qty || 0);
        const returned = Number(it.returned || 0);
        totalOutstanding += qty;
        totalRented += qty + returned;
      }
    });

    if (totalRented === 0) {
      return { text: "Ижарага берилмаган", color: '#64748b' };
    }
    if (totalOutstanding === 0) {
      return { text: "Тўлиқ қайтарилган", color: '#16a34a' };
    }
    if (totalOutstanding === totalRented) {
      return { text: "Тўлиқ қайтарилмаган", color: '#dc2626' };
    }
    return { text: "Қисман қайтарилган", color: '#d97706' };
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Нома\'лум мижоз';
  };

  const filtered = (items || []).filter(i => (i.name + " " + i.size).toLowerCase().includes(search.toLowerCase()));

  const itemRentalsAll = useMemo(() => (selectedItem ? getItemRentals(selectedItem.id) : []), [selectedItem, rentals]);
  const reportYearOptions = useMemo(() => {
    const ys = new Set(itemRentalsAll.map(r => r.year).filter(Boolean));
    return Array.from(ys).sort((a,b) => a-b);
  }, [itemRentalsAll]);
  const reportMonthOptions = useMemo(() => {
    if (!reportYear) {
      return Array.from(new Set(itemRentalsAll.map(r => r.month).filter(Boolean))).sort((a,b)=>a-b);
    }
    const ms = new Set(itemRentalsAll.filter(r => r.year === Number(reportYear)).map(r => r.month).filter(Boolean));
    return Array.from(ms).sort((a,b)=>a-b);
  }, [itemRentalsAll, reportYear]);

  const itemRentalsFiltered = useMemo(() => {
    return itemRentalsAll
      .filter(r => (reportYear ? r.year === Number(reportYear) : true))
      .filter(r => (reportMonth ? r.month === Number(reportMonth) : true));
  }, [itemRentalsAll, reportYear, reportMonth]);

  const deleteItem = async (id) => {
    if (!confirm("Ростдан ҳам ўчирмоқчимисиз?")) return;
    try {
      const res = await fetch(`http://localhost:3000/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setItems((prevItems || []).filter(p => p.id !== id));
      } else {
        const e = await res.json();
        alert(e.message || "Ўчиришда хатолик");
      }
    } catch (e) {
      alert("Тармоқ хатолиги");
    }
  };

  const saveEditItem = async () => {
    if (!editItemForm.id) return;
    if (!editItemForm.name || !editItemForm.size || editItemForm.price === "" || editItemForm.count === "") {
      alert("Барча мажбурий майдонларни тўлдиринг!");
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`http://localhost:3000/products/${editItemForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: editItemForm.name,
          size: editItemForm.size,
          price: Number(editItemForm.price.replace(/\./g, '')),
          count: Number(editItemForm.count),
          weight: editItemForm.weight === "" ? 0 : Number(editItemForm.weight),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prevItems || []).map(it => it.id === editItemForm.id ? data.product : it));
        closeEditModal();
      }
    } catch (e) {
      alert("Тармоқ хатолиги");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2>Товарлар</h2>
          <div className="row" style={{ gap: "16px", alignItems: "center" }}>
            <input
              className="input"
              style={{ width: "300px", fontSize: "14px" }}
              placeholder="Қидириш..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn primary" onClick={openAddModal}>
              + Янги товар
            </button>
          </div>
        </div>
        
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="text-2xl">ID</th>
                <th className="text-2xl">Ном</th>
                <th className="text-2xl">Ўлчам</th>
                <th className="text-2xl">Нарх</th>
                <th className="text-2xl">Сон</th>
                <th className="text-2xl">Оғирлик</th>
                <th className="text-2xl">Амаллар</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-black hover:text-white">
                  <td className="text-xl">{item.id}</td>
                  <td className="text-2xl">
                    <strong>{item.name}</strong>
                  </td>
                  <td className="text-2xl">{item.size}</td>
                  <td className="text-2xl">{fmt(item.price)}</td>
                  <td className="text-2xl" style={{ color: item.count > 0 ? "#28a745" : "#dc3545" }}>
                    <strong>{item.count}</strong>
                  </td>
                  <td className="text-2xl">{item.weight ? `${item.weight} кг` : "-"}</td>
                  <td >
                    <div className="row" style={{ gap: "8px" }}>
                      <button
                        className="btn"
                        onClick={() => openEditModal(item)}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteItem(item.id)}
                        style={{ padding: "6px 12px", fontSize: "12px", background: '#ef4444', color: '#fff' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Янги маҳсулот қўшиш</h3>
              <button className="modal-close" onClick={closeAddModal}>
                ✕
              </button>
            </div>
            <div className="modal-body gap">
              <div className="row" style={{ gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div>
                    <label>Ном *</label>
                    <input type="text" className="input" placeholder="Маҳсулот номи" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                  </div>
                  <div>
                    <label>Ўлчами *</label>
                    <input type="text" className="input" placeholder="Масалан, PRJ-01" value={newItem.size} onChange={e => setNewItem({ ...newItem, size: e.target.value })} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div>
                    <label>Кунлик нарх *</label>
                    <input type="text" className="input" placeholder="Кунлик нарх" value={newItem.price} onChange={e => handlePriceChange(e.target.value, setNewItem, newItem)} />
                  </div>
                  <div>
                    <label>Сток *</label>
                    <input type="number" className="input" placeholder="Сони" value={newItem.count} onChange={e => setNewItem({ ...newItem, count: e.target.value })} />
                  </div>
                  <div>
                    <label>Оғирлик (кг)</label>
                    <input type="number" className="input" placeholder="Оғирлик килограммларда" step="0.01" value={newItem.weight} onChange={e => setNewItem({ ...newItem, weight: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeAddModal} disabled={isLoading}>Бекор қилиш</button>
              <button className="btn primary" onClick={addItem} disabled={isLoading || !newItem.name || !newItem.size || !newItem.price || !newItem.count}>{isLoading ? "Қўшилмоқда..." : "Қўшиш"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Маҳсулотни таҳрирлаш</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <div className="modal-body gap">
              <div className="row" style={{ gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div>
                    <label>Ном *</label>
                    <input type="text" className="input" value={editItemForm.name} onChange={e => setEditItemForm({ ...editItemForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label>Ўлчами *</label>
                    <input type="text" className="input" value={editItemForm.size} onChange={e => setEditItemForm({ ...editItemForm, size: e.target.value })} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div>
                    <label>Кунлик нарх *</label>
                    <input type="text" className="input" value={editItemForm.price} onChange={e => handlePriceChange(e.target.value, setEditItemForm, editItemForm)} />
                  </div>
                  <div>
                    <label>Сток *</label>
                    <input type="number" className="input" value={editItemForm.count} onChange={e => setEditItemForm({ ...editItemForm, count: e.target.value })} />
                  </div>
                  <div>
                    <label>Оғирлик (кг)</label>
                    <input type="number" className="input" step="0.01" value={editItemForm.weight} onChange={e => setEditItemForm({ ...editItemForm, weight: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeEditModal} disabled={isSavingEdit}>Бекор қилиш</button>
              <button className="btn primary" onClick={saveEditItem} disabled={isSavingEdit || !editItemForm.name || !editItemForm.size || editItemForm.price === "" || editItemForm.count === ""}>{isSavingEdit ? "Сақланмоқда..." : "Сақлаш"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showModal && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '900px', width: '100%', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              <h2>{selectedItem.name} - Ҳисобот</h2>
              <div className="row" style={{ gap: 8 }}>
                <div>
                  <label>Йил</label>
                  <select className="input" value={reportYear} onChange={(e)=> setReportYear(e.target.value)}>
                    <option value="">Ҳаммаси</option>
                    {reportYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label>Ой</label>
                  <select className="input" value={reportMonth} onChange={(e)=> setReportMonth(e.target.value)}>
                    <option value="">Ҳаммаси</option>
                    {reportMonthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn" onClick={closeModal} style={{ fontSize: '18px', padding: '8px 12px', background: '#f3f4f6', border: '1px solid #d1d5db' }}>✕</button>
            </div>
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Мижоз</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Сана</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Кун</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Сони</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Нарх/кун</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Жами</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRentalsFiltered.map((r, index) => (
                    <tr key={`${r.rentalId}_${index}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{getCustomerName(r.customerId)}</td>
                      <td style={{ padding: '12px' }}>{r.dateStr}</td>
                      <td style={{ padding: '12px' }}>{r.days}</td>
                      <td style={{ padding: '12px' }}>{r.qty}</td>
                      <td style={{ padding: '12px' }}>{fmt(r.pricePerDay)}</td>
                      <td style={{ padding: '12px' }}>{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}