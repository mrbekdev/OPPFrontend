
import React, { useState } from "react";
import { fmt } from "../utils/helpers";
import { openReturnReceipt } from "./ReturnReceipt";
import { openPrintReceipt } from "./Receipt";

export default function ReturnPanel({ items, setItems, rentals, setRentals, customers, settings }) {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({}); // { itemId: returnQty }
  const [search, setSearch] = useState("");
  const [customerRating, setCustomerRating] = useState(""); // "good", "bad", or ""

  const token = localStorage.getItem("token");

  const nameById = (id) => customers.find((c) => c.id === id)?.name || id;

  const calcHoursFromCreatedAt = (createdAt) => {
    const createdDate = new Date(createdAt);
    const today = new Date();
    const ms = Math.max(0, today - createdDate);
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    return hours;
  };

  // Billing multiplier: full days + proportional hours
  const calcBillingMultiplier = (createdAt) => {
    const hours = calcHoursFromCreatedAt(createdAt);
    if (hours <= 24) return 1;
    const fullDays = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return fullDays + (remainingHours / 24);
  };

  const formatTimeDisplay = (createdAt) => {
    const hours = calcHoursFromCreatedAt(createdAt);
    if (hours <= 24) {
      return `1 кун`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `${days} кун`;
      } else {
        return `${days} кун ${remainingHours} соат`;
      }
    }
  };

  const openReturnModal = (rental) => {
    const initialQuantities = rental.items.reduce(
      (acc, item) => ({
        ...acc,
        [item.itemId]: 0,
      }),
      {}
    );
    setReturnQuantities(initialQuantities);
    setSelectedRental(rental);
    setIsReturnModalOpen(true);
    
    // Fetch customer rating
    fetchCustomerRating(rental.customerId);
  };

  const fetchCustomerRating = async (customerId) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        const res = await fetch(`http://localhost:3000/clients/${customerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCustomerRating(data.client.rating || "");
        }
      }
    } catch (error) {
      console.error("Error fetching customer rating:", error);
    }
  };

  const closeReturnModal = () => {
    setIsReturnModalOpen(false);
    setSelectedRental(null);
    setReturnQuantities({});
  };

  const handleReturnQuantityChange = (itemId, value) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(value, selectedRental.items.find((i) => i.itemId === itemId).qty)),
    }));
  };

  const calculateReturnAmount = (rental, quantities) => {
    if (!rental) return 0;
    const multiplier = calcBillingMultiplier(rental.paidAt);
    let totalAmount = 0;
    
    rental.items.forEach((item) => {
      const returnQty = quantities[item.itemId] || 0;
      if (returnQty > 0) {
        const product = items.find((i) => i.id === item.itemId);
        if (product) {
          totalAmount += product.price * returnQty * multiplier;
        }
      }
    });
    
    return totalAmount;
  };

  // Chek chiqarish funksiyasi
  const printReturnReceipt = (rental, returnedItems, remainingItems, returnAmount) => {
    const customer = customers.find(c => c.id === rental.customerId) || {};
    const hours = calcHoursFromCreatedAt(rental.paidAt);
    const multiplier = calcBillingMultiplier(rental.paidAt);
    const originalAmount = rental.items.reduce((s, it) => {
      const product = items.find((i) => i.id === it.itemId);
      const price = product ? product.price : (it.pricePerDay || 0);
      return s + price * (it.qty || 0) * multiplier;
    }, 0);

    openReturnReceipt({
      settings,
      customer,
      rental,
      returnedItems,
      remainingItems,
      returnAmount,
      originalAmount,
      days: multiplier,
      hours,
    });
  };

  // To'liq qaytarish funksiyasi
  const handleFullReturn = async (rental) => {
    if (!rental) return;

    const allItemsReturned = rental.items.map(item => ({
      orderItemId: item.orderItemId,
      returnQuantity: item.qty
    }));

    try {
      const res = await fetch(`http://localhost:3000/orders/${rental.id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: allItemsReturned }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Chek chiqarish
        const returnedItems = rental.items.map(item => {
          const product = items.find((i) => i.id === item.itemId);
          return {
            ...item,
            name: product?.name || item.name,
            size: product?.size || item.size,
            returnQty: item.qty,
            pricePerDay: product?.price || item.pricePerDay
          };
        });

        const multiplier = calcBillingMultiplier(rental.paidAt);
        const returnAmount = rental.items.reduce((s, it) => {
          const product = items.find((i) => i.id === it.itemId);
          const price = product ? product.price : (it.pricePerDay || 0);
          return s + price * (it.qty || 0) * multiplier;
        }, 0);
        
        printReturnReceipt(rental, returnedItems, [], returnAmount);

        // State yangilash
        const newItems = items.map((it) => {
          const returnedItem = data.returnedItems.find((ri) => ri.product.id === it.id);
          if (returnedItem) {
            return { ...it, count: it.count + returnedItem.returned };
          }
          return it;
        });
        setItems(newItems);
        
        setRentals((rs) =>
          rs.map((r) => {
            if (r.id === rental.id) {
              return {
                ...r,
                returnedAt: new Date().toISOString(),
                items: [],
              };
            }
            return r;
          })
        );

        alert("Барча товарлар муваффақиятли қайтарилди!");
      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || "Қайтаришда хатолик юз берди"}`);
      }
    } catch (error) {
      console.error("Error returning items:", error);
      alert("Тармоқ хатолиги юз берди");
    }
  };

  const markReturned = async () => {
    if (!selectedRental) return;

    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, returnQuantity]) => {
        const item = selectedRental.items.find((i) => i.itemId === Number(itemId));
        if (!item || !item.orderItemId) {
          console.error(`Invalid orderItemId for itemId ${itemId} in order ${selectedRental.id}`);
          return null;
        }
        return {
          orderItemId: Number(item.orderItemId),
          returnQuantity: Number(returnQuantity),
        };
      })
      .filter((item) => item !== null);

    if (itemsToReturn.length === 0) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/orders/${selectedRental.id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: itemsToReturn }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Qaytarilgan va qolgan tovarlar ro'yxatini tayyorlash
        const returnedItems = [];
        const remainingItems = [];
        
        selectedRental.items.forEach((item) => {
          const returnQty = returnQuantities[item.itemId] || 0;
          const product = items.find((i) => i.id === item.itemId);
          
          if (returnQty > 0) {
            returnedItems.push({
              ...item,
              name: product?.name || item.name,
              size: product?.size || item.size,
              returnQty: returnQty,
              pricePerDay: product?.price || item.pricePerDay
            });
          }
          
          if (item.qty > returnQty) {
            remainingItems.push({
              ...item,
              name: product?.name || item.name,
              size: product?.size || item.size,
              qty: item.qty - returnQty,
              pricePerDay: product?.price || item.pricePerDay
            });
          }
        });

        const returnAmount = calculateReturnAmount(selectedRental, returnQuantities);
        
        // Chek chiqarish
        printReturnReceipt(selectedRental, returnedItems, remainingItems, returnAmount);

        // Save customer rating
        await saveCustomerRating(selectedRental.customerId, customerRating);

        // State yangilash
        const newItems = items.map((it) => {
          const returnedItem = data.returnedItems.find((ri) => ri.product.id === it.id);
          if (returnedItem) {
            return { ...it, count: it.count + returnedItem.returned };
          }
          return it;
        });
        setItems(newItems);

        const allItemsReturned = selectedRental.items.every((item) => {
          const returnedQty = returnQuantities[item.itemId] || 0;
          return returnedQty >= item.qty;
        });
        
        setRentals((rs) =>
          rs.map((r) => {
            if (r.id === selectedRental.id) {
              return {
                ...r,
                returnedAt: allItemsReturned ? new Date().toISOString() : r.returnedAt,
                items: r.items
                  .map((item) => {
                    const returnedQty = returnQuantities[item.itemId] || 0;
                    return { ...item, qty: item.qty - returnedQty, returned: (item.returned || 0) + returnedQty };
                  })
                  .filter((item) => item.qty > 0),
              };
            }
            return r;
          })
        );

        closeReturnModal();
      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || "Қайтаришда хатолик юз берди"}`);
      }
    } catch (error) {
      console.error("Error returning items:", error);
      alert("Тармоқ хатолиги юз берди");
    }
  };

  const saveCustomerRating = async (customerId, rating) => {
    if (!rating) return; // Skip if no rating selected
    
    try {
      const res = await fetch(`http://localhost:3000/clients/${customerId}/rating`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });
      
      if (res.ok) {
        console.log('Customer rating saved successfully');
      }
    } catch (error) {
      console.error('Error saving customer rating:', error);
    }
  };

  const printCurrentListReceipt = async () => {
    if (!selectedRental) return;
    const customer = customers.find(c => c.id === selectedRental.customerId) || {};
    const multiplier = calcBillingMultiplier(selectedRental.paidAt);
    const hours = calcHoursFromCreatedAt(selectedRental.paidAt);
    const itemsForReceipt = (selectedRental.items || []).map(it => ({
      name: (items.find(i => i.id === it.itemId)?.name) || it.name,
      size: (items.find(i => i.id === it.itemId)?.size) || it.size,
      qty: it.qty || 0,
      pricePerDay: (items.find(i => i.id === it.itemId)?.price) || it.pricePerDay || 0,
      weight: (items.find(i => i.id === it.itemId)?.weight) || 0,
    }));
    const subtotal = itemsForReceipt.reduce((s, it) => s + (Number(it.pricePerDay) || 0) * (Number(it.qty) || 0) * multiplier, 0);
    await openPrintReceipt({
      settings,
      customer: { name: customer.name, phone: customer.phone },
      items: itemsForReceipt,
      fromDate: selectedRental.paidAt,
      toDate: new Date().toISOString(),
      days: multiplier,
      hours,
      subtotal,
      tax: 0,
      total: subtotal,
      totalWeight: itemsForReceipt.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 0), 0),
      orderId: selectedRental.id,
    });
  };

  const activeRentals = rentals.filter((r) => !r.returnedAt);
  const filteredRentals = activeRentals.filter((r) => {
    const q = search.toLowerCase();
    const idMatch = String(r.id).includes(q);
    const nameMatch = nameById(r.customerId).toLowerCase().includes(q);
    return idMatch || nameMatch;
  });

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <h2>Қайтарилмаган ижаралар</h2>
          <input className="input" style={{ width: 280 }} placeholder="ID ёки мижоз (исм/фамилия)" value={search} onChange={(e)=> setSearch(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Мижоз</th>
                <th>Олинган сана ва вақт</th>
                <th>Вақт</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.map((r) => {
                const multiplier = calcBillingMultiplier(r.paidAt);
                const total = r.items.reduce((s,it)=> s + (it.pricePerDay||0) * (it.qty||0) * multiplier,0);
                return (
                  <tr 
                    key={r.id}
                    onClick={() => openReturnModal(r)}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.parentElement.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.parentElement.style.backgroundColor = "#fff";
                    }}
                  >
                    <td className="mono">{r.id}</td>
                    <td>{nameById(r.customerId)}</td>
                    <td>
                      {new Date(r.paidAt).toLocaleDateString('uz-UZ')}
                      <br />
                      <small style={{ color: '#666' }}>
                        {new Date(r.paidAt).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute: '2-digit'})}
                      </small>
                    </td>
                    <td>{formatTimeDisplay(r.paidAt)}</td>
                    <td>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isReturnModalOpen && selectedRental && (
        <div className="modal-overlay" onClick={closeReturnModal}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Қайтариладиган маҳсулотлар сони</h3>
              <button className="modal-close" onClick={closeReturnModal}>
                ✕
              </button>
            </div>
            <div className="modal-body gap">
              <div style={{ 
                background: '#f0f9ff', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                border: '1px solid #0ea5e9'
              }}>
                <div><strong>Олинган сана:</strong> {new Date(selectedRental.paidAt).toLocaleDateString('uz-UZ')}</div>
                <div><strong>Бугунги сана:</strong> {new Date().toLocaleDateString('uz-UZ')}</div>
                <div><strong>Вақт:</strong> {formatTimeDisplay(selectedRental.paidAt)}</div>
                <div><strong>Қайтариш суммаси:</strong> {fmt(calculateReturnAmount(selectedRental, returnQuantities))}</div>
              </div>

              {/* Customer Rating Section */}
              <div style={{ 
                background: '#fef3c7', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                border: '1px solid #f59e0b'
              }}>
                <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#92400e' }}>
                  Мижоз рейтинги (ихтиёрий):
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rating"
                      value="good"
                      checked={customerRating === "good"}
                      onChange={(e) => setCustomerRating(e.target.value)}
                    />
                    <span style={{ color: '#059669' }}>✅ Яхши</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rating"
                      value="bad"
                      checked={customerRating === "bad"}
                      onChange={(e) => setCustomerRating(e.target.value)}
                    />
                    <span style={{ color: '#dc2626' }}>❌ Ёмон</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rating"
                      value=""
                      checked={customerRating === ""}
                      onChange={(e) => setCustomerRating(e.target.value)}
                    />
                    <span style={{ color: '#6b7280' }}>⚪ Нейтрал</span>
                  </label>
                </div>
              </div>
              
              {selectedRental.items.map((item) => {
                const product = items.find((i) => i.id === item.itemId);
                const multiplier = calcBillingMultiplier(selectedRental.paidAt);
                const returnQty = returnQuantities[item.itemId] || 0;
                const price = product ? product.price : (item.pricePerDay || 0);
                const itemAmount = price * returnQty * multiplier;
                
                return (
                  <div key={item.itemId}>
                    <label>
                      {product?.name || item.name} ({product?.size || item.size}) - Қолган: {item.qty}
                    </label>
                    <div className="row" style={{ alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Қайтариладиган сон"
                        value={returnQuantities[item.itemId] || ""}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleReturnQuantityChange(item.itemId, value);
                        }}
                        style={{ width: '100%' }}
                      />
                      {returnQty > 0 && (
                        <span style={{ fontSize: '14px', color: '#059669' }}>
                          {fmt(itemAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeReturnModal}>
                Бекор қилиш
              </button>
              <button
                className="btn primary"
                onClick={markReturned}
                disabled={Object.values(returnQuantities).every((qty) => qty === 0)}
              >
                Қайтариш ({fmt(calculateReturnAmount(selectedRental, returnQuantities))})
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  handleFullReturn(selectedRental);
                  closeReturnModal();
                }}
                style={{ marginLeft: "10px" }}
              >
                ✅ Тўлиқ қайтариш
              </button>
              <button
                className="btn"
                onClick={printCurrentListReceipt}
                style={{ marginLeft: "auto" }}
              >
                🖨️ Рўйхатни чекда чиқариш
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
