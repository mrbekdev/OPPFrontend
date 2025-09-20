import React, { useState } from "react";
import { fmt, formatUzbekistanDate, formatUzbekistanTime, formatUzbekistanDateTime, toUzbekistanTime } from "../utils/helpers";
import { openReturnReceipt } from "./ReturnReceipt";
import { openPrintReceipt } from "./Receipt";

export default function ReturnPanel({ items, setItems, rentals, setRentals, customers, settings }) {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({}); // { itemId: returnQty }
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // all | active | returned
  const [viewReturnedModal, setViewReturnedModal] = useState(false);
  const [viewReturnedRental, setViewReturnedRental] = useState(null);
  const [customerRating, setCustomerRating] = useState(""); // "good", "bad", or ""

  const token = localStorage.getItem("token");

  const nameById = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.name} (${c.phone || ''})` : id;
  };

  const calcHoursFromStartTime = (startTime) => {
    const startDate = toUzbekistanTime(startTime);
    const now = toUzbekistanTime(new Date());
    
    // If rental hasn't started yet, return 0 hours
    if (now < startDate) {
      return 0;
    }
    
    const ms = now - startDate;
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    return Math.max(0, hours);
  };

  // Billing multiplier: full days + proportional hours
  const calcBillingMultiplier = (startTime) => {
    const hours = calcHoursFromStartTime(startTime);
    
    // If rental hasn't started yet, no billing
    if (hours === 0) return 0;
    
    // Minimum 1 day billing once started
    if (hours <= 24) return 1;
    const fullDays = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return fullDays + (remainingHours / 24);
  };

  const formatTimeDisplay = (startTime) => {
    const startDate = toUzbekistanTime(startTime);
    const now = toUzbekistanTime(new Date());
    const hours = calcHoursFromStartTime(startTime);
    
    // If rental hasn't started yet, show when it will start
    if (now < startDate) {
      const timeUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60));
      if (timeUntilStart <= 24) {
        return `${timeUntilStart} соатдан кейин бошланади`;
      } else {
        const daysUntilStart = Math.ceil(timeUntilStart / 24);
        return `${daysUntilStart} кундан кейин бошланади`;
      }
    }
    
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
    // Use fromDate (start time) instead of paidAt for calculation
    const multiplier = calcBillingMultiplier(rental.fromDate || rental.paidAt);
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
      const hours = calcHoursFromStartTime(rental.fromDate || rental.paidAt);
      const multiplier = calcBillingMultiplier(rental.fromDate || rental.paidAt);
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

        const multiplier = calcBillingMultiplier(rental.fromDate || rental.paidAt);
        const totalAmount = rental.items.reduce((s, it) => {
          const product = items.find((i) => i.id === it.itemId);
          const price = product ? product.price : (it.pricePerDay || 0);
          return s + price * (it.qty || 0) * multiplier;
        }, 0);
        const returnAmount = totalAmount;
        
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
                status: 'RETURNED',
                // Keep items for history/reporting; set activeQty 0 and returnedQty = qty
                items: r.items.map((it) => ({
                  ...it,
                  activeQty: 0,
                  returnedQty: it.qty,
                })),
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
        if (!item) {
          console.error(`Item not found for itemId ${itemId} in order ${selectedRental.id}`);
          console.log('Available items:', selectedRental.items.map(i => ({ itemId: i.itemId, orderItemId: i.orderItemId })));
          return null;
        }
        if (!item.orderItemId) {
          console.error(`Invalid orderItemId for itemId ${itemId} in order ${selectedRental.id}`);
          console.log('Item details:', item);
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
        
        // Refresh rentals from backend to get accurate data
        const refreshResponse = await fetch("http://localhost:3000/orders", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const mapped = (refreshData.orders || []).map((o) => ({
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
                totalQuantity: i.quantity,
              }))
              .filter((item) => item.qty > 0),
            fromDate: o.fromDate,
            toDate: o.toDate,
            subtotal: o.subtotal,
            tax: o.tax,
            total: o.total,
            advancePayment: o.advancePayment || 0,
            advanceUsed: o.advanceUsed || 0,
            paidAt: o.fromDate || o.createdAt,
            returnedAt: o.returnedAt,
            status: o.status,
          }));
          setRentals(mapped);
        } else {
          // Fallback to local update if refresh fails
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
        }

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
    const multiplier = calcBillingMultiplier(selectedRental.fromDate || selectedRental.paidAt);
    const hours = calcHoursFromStartTime(selectedRental.fromDate || selectedRental.paidAt);
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
      fromDate: selectedRental.fromDate || selectedRental.paidAt,
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

  // Show returned rental details modal
  const openReturnedRentalModal = (rental) => {
    setViewReturnedRental(rental);
    setViewReturnedModal(true);
  };
  const closeReturnedRentalModal = () => {
    setViewReturnedModal(false);
    setViewReturnedRental(null);
  };

  // Delete returned rental
  const handleDeleteReturnedRental = async (rentalId) => {
    if (!window.confirm("Ушбу қайтарилган ижарани ўчиришни истайсизми?")) return;
    try {
      const res = await fetch(`http://localhost:3000/orders/${rentalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setRentals((rs) => rs.filter((r) => r.id !== rentalId));
        alert("Қайтарилган ижара ўчирилди!");
      } else {
        alert("Ўчиришда хатолик юз берди");
      }
    } catch (e) {
      alert("Тармоқ хатолиги");
    }
  };

  // Show all rentals (active and returned)
  let filteredRentals = rentals.filter((r) => {
    const q = search.toLowerCase();
    const idMatch = String(r.id).includes(q);
    const nameMatch = nameById(r.customerId).toLowerCase().includes(q);
    return idMatch || nameMatch;
  });
  if (statusFilter === "active") filteredRentals = filteredRentals.filter(r => !r.returnedAt);
  if (statusFilter === "returned") filteredRentals = filteredRentals.filter(r => !!r.returnedAt);

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h2>Ижаралар рўйхати</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Барчаси</option>
              <option value="active">Ижарадагилар</option>
              <option value="returned">Қайтарилганлар</option>
            </select>
            <input className="input" style={{ width: 220 }} placeholder="ID ёки мижоз (исм/фамилия)" value={search} onChange={(e)=> setSearch(e.target.value)} />
          </div>
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
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.map((r) => {
                const multiplier = calcBillingMultiplier(r.fromDate || r.paidAt);
                const total = r.items.reduce((s,it)=> s + (it.pricePerDay||0) * (it.qty||0) * multiplier,0);
                const isReturned = !!r.returnedAt;
                return (
                  <tr
                    key={r.id}
                    onClick={e => {
                      // Prevent modal open if delete button is clicked
                      if (isReturned && e.target.closest('button')) return;
                      if (!isReturned) openReturnModal(r);
                      else openReturnedRentalModal(r);
                    }}
                    style={{
                      cursor: "pointer",
                      background: isReturned ? "#f3f4f6" : "#fff",
                      opacity: isReturned ? 0.7 : 1,
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "black";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isReturned ? "#f3f4f6" : "#fff";
                      e.currentTarget.style.color = "initial";
                    }}
                  >
                    <td className="mono text-2xl">{r.id}</td>
                    <td className="text-2xl">{nameById(r.customerId)}</td>
                    <td className="text-2xl">
                      {formatUzbekistanDate(r.fromDate || r.paidAt)}&nbsp;&nbsp;&nbsp;
                      <span style={{ color: '#666' }}>
                        {formatUzbekistanTime(r.fromDate || r.paidAt)}
                      </span>
                    </td>
                    <td className="text-2xl">{formatTimeDisplay(r.fromDate || r.paidAt)}</td>
                    <td className="text-2xl">{fmt(total)}</td>
                    <td className="text-2xl" style={{ color: isReturned ? "#059669" : "#f59e0b" }}>
                      {isReturned ? "Қайтарилган" : "Ижарада"}
                    </td>
                    <td>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Returned rental details modal */}
      {viewReturnedModal && viewReturnedRental && (
        <div className="modal-overlay" onClick={closeReturnedRentalModal}>
          <div className="modal-content" style={{ maxWidth: '700px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Қайтарилган ижара маълумотлари</h3>
              <button className="modal-close" onClick={closeReturnedRentalModal}>✕</button>
            </div>
            <div className="modal-body gap">
              <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #0ea5e9' }}>
                <div>
                  <strong>Олинган сана ва вақт:</strong> {formatUzbekistanDate(viewReturnedRental.fromDate || viewReturnedRental.paidAt)}&nbsp;&nbsp;&nbsp;
                  <span style={{ color: '#666' }}>
                    {formatUzbekistanTime(viewReturnedRental.fromDate || viewReturnedRental.paidAt)}
                  </span>
                </div>
                <div>
                  <strong>Қайтарилган сана ва вақт:</strong> {formatUzbekistanDate(viewReturnedRental.returnedAt)}&nbsp;&nbsp;&nbsp;
                  <span style={{ color: '#666' }}>
                    {formatUzbekistanTime(viewReturnedRental.returnedAt)}
                  </span>
                </div>
                <div><strong>Ижарада бўлган вақт:</strong> {formatTimeDisplay(viewReturnedRental.fromDate || viewReturnedRental.paidAt)}</div>
              </div>
              <div>
                <strong>Мижоз:</strong> {(() => {
                  const c = customers.find(c => c.id === viewReturnedRental.customerId);
                  return c ? `${c.name} (${c.phone || ''})` : viewReturnedRental.customerId;
                })()}
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>Товарлар:</strong>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Номи</th>
                      <th>Ўлчами</th>
                      <th>Сони</th>
                      <th>Нархи</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewReturnedRental.items.map((item, idx) => {
                      const product = items.find(i => i.id === item.itemId);
                      return (
                        <tr key={idx}>
                          <td>{product?.name || item.name}</td>
                          <td>{product?.size || item.size}</td>
                          <td>{item.qty + (item.returnedQty || 0) || item.qty}</td>
                          <td>{fmt(product?.price || item.pricePerDay || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeReturnedRentalModal}>Ёпиш</button>
              <button
                className="btn primary"
                onClick={async () => {
                  // Print receipt for returned rental
                  const customer = customers.find(c => c.id === viewReturnedRental.customerId) || {};
                  const multiplier = calcBillingMultiplier(viewReturnedRental.fromDate || viewReturnedRental.paidAt);
                  const hours = calcHoursFromStartTime(viewReturnedRental.fromDate || viewReturnedRental.paidAt);
                  const itemsForReceipt = (viewReturnedRental.items || []).map(it => ({
                    name: (items.find(i => i.id === it.itemId)?.name) || it.name,
                    size: (items.find(i => i.id === it.itemId)?.size) || it.size,
                    qty: (it.qty + (it.returnedQty || 0)) || it.qty,
                    pricePerDay: (items.find(i => i.id === it.itemId)?.price) || it.pricePerDay || 0,
                    weight: (items.find(i => i.id === it.itemId)?.weight) || 0,
                  }));
                  const subtotal = itemsForReceipt.reduce((s, it) => s + (Number(it.pricePerDay) || 0) * (Number(it.qty) || 0) * multiplier, 0);
                  await openPrintReceipt({
                    settings,
                    customer: { name: customer.name, phone: customer.phone },
                    items: itemsForReceipt,
                    fromDate: viewReturnedRental.fromDate || viewReturnedRental.paidAt,
                    toDate: viewReturnedRental.returnedAt,
                    days: multiplier,
                    hours,
                    subtotal,
                    tax: 0,
                    total: subtotal,
                    totalWeight: itemsForReceipt.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 0), 0),
                    orderId: viewReturnedRental.id,
                  });
                  closeReturnedRentalModal();
                }}
                style={{ marginLeft: "auto" }}
              >
                🖨️ Чек чиқариш
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div><strong>Мижоз:</strong> {nameById(selectedRental.customerId)}</div>
                    <div>
                      <strong>Олинган сана ва вақт:</strong> {formatUzbekistanDate(selectedRental.fromDate || selectedRental.paidAt)}&nbsp;&nbsp;&nbsp;
                      <span style={{ color: '#666' }}>
                        {formatUzbekistanTime(selectedRental.fromDate || selectedRental.paidAt)}
                      </span>
                    </div>
                    <div>
                      <strong>Бугунги сана ва вақт:</strong> {formatUzbekistanDate(new Date())}&nbsp;&nbsp;&nbsp;
                      <span style={{ color: '#666' }}>
                        {formatUzbekistanTime(new Date())}
                      </span>
                    </div>
                    <div><strong>Вақт:</strong> {formatTimeDisplay(selectedRental.fromDate || selectedRental.paidAt)}</div>
                    <div><strong>Жами сумма:</strong> {fmt((() => {
                      const multiplier = calcBillingMultiplier(selectedRental.fromDate || selectedRental.paidAt);
                      let totalAmount = 0;
                      Object.keys(returnQuantities).forEach((itemId) => {
                        const returnQty = returnQuantities[itemId] || 0;
                        if (returnQty > 0) {
                          const item = selectedRental.items.find(i => i.itemId == itemId);
                          const product = items.find((i) => i.id == itemId);
                          if (product && item) {
                            totalAmount += product.price * returnQty * multiplier;
                          }
                        }
                      });
                      return totalAmount;
                    })())}</div>
                  </div>
                  <div>
                    <div><strong>Аванс:</strong> {fmt(selectedRental.advancePayment || 0)}</div>
                    <div><strong>Қайтариш суммаси:</strong> {fmt(calculateReturnAmount(selectedRental, returnQuantities))}</div>
                  </div>
                </div>
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
                const multiplier = calcBillingMultiplier(selectedRental.fromDate || selectedRental.paidAt);
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
                Тўлиқ қайтариш ({fmt((() => {
                  const multiplier = calcBillingMultiplier(selectedRental.fromDate || selectedRental.paidAt);
                  const totalAmount = selectedRental.items.reduce((s, it) => {
                    const product = items.find((i) => i.id === it.itemId);
                    const price = product ? product.price : (it.pricePerDay || 0);
                    return s + price * (it.qty || 0) * multiplier;
                  }, 0);
                  return totalAmount;
                })())})  
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