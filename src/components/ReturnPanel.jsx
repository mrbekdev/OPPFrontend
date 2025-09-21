import React, { useState, useEffect } from "react";
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
  const [editModal, setEditModal] = useState(false);
  const [editRental, setEditRental] = useState(null);
  const [editDateTime, setEditDateTime] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  const token = localStorage.getItem("token");

  // Update current time every minute to refresh time displays
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Force re-render when component mounts to refresh time calculations
  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  const nameById = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.name} (${c.phone || ''})` : id;
  };

  const calcHoursFromStartTime = (createdAt) => {
    const startDate = toUzbekistanTime(createdAt);
    const now = toUzbekistanTime(currentTime);
    
    // If rental hasn't started yet, return 0 hours
    if (now < startDate) {
      return 0;
    }
    
    const ms = now - startDate;
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    return Math.max(0, hours);
  };

  // Billing multiplier: full days + proportional hours
  const calcBillingMultiplier = (createdAt) => {
    const hours = calcHoursFromStartTime(createdAt);
    
    // If rental hasn't started yet, no billing
    if (hours === 0) return 0;
    
    // 1-24 hours = 1 day charge, after 24 hours = hourly calculation
    if (hours <= 24) return 1;
    return 1 + ((hours - 24) / 24);
  };

  // Billing multiplier for returned rentals
  const calcBillingMultiplierForReturned = (startTime, endTime) => {
    const startDate = toUzbekistanTime(startTime);
    const endDate = toUzbekistanTime(endTime);
    
    const ms = Math.max(0, endDate.getTime() - startDate.getTime());
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    
    // If rental duration is 0, no billing
    if (hours === 0) return 0;
    
    // 1-24 hours = 1 day charge, after 24 hours = hourly calculation
    if (hours <= 24) return 1;
    return 1 + ((hours - 24) / 24);
  };

  const formatTimeDisplay = (createdAt) => {
    const startDate = toUzbekistanTime(createdAt);
    const now = toUzbekistanTime(currentTime);
    const hours = calcHoursFromStartTime(createdAt);
    
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

  // Format time display for returned rentals
  const formatTimeDisplayForReturned = (startTime, endTime) => {
    const startDate = toUzbekistanTime(startTime);
    const endDate = toUzbekistanTime(endTime);
    
    const ms = Math.max(0, endDate.getTime() - startDate.getTime());
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    
    if (hours <= 0) return "0 соат";
    
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

  // Format time display from stored backend values
  const formatTimeDisplayFromStored = (days, hours) => {
    // Handle undefined/null values
    const safeDays = days || 0;
    const safeHours = hours || 0;
    
    if (safeDays === 0 && safeHours === 0) return "0 соат";
    
    const totalHours = safeDays * 24 + safeHours;
    
    if (totalHours <= 24) {
      return `1 кун`;
    } else {
      if (safeHours === 0) {
        return `${safeDays} кун`;
      } else {
        return `${safeDays} кун ${safeHours} соат`;
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
    // Use createdAt (start time) for calculation
    const multiplier = calcBillingMultiplier(rental.createdAt || rental.fromDate || rental.paidAt);
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
      const hours = calcHoursFromStartTime(rental.createdAt || rental.fromDate || rental.paidAt);
      const multiplier = calcBillingMultiplier(rental.createdAt || rental.fromDate || rental.paidAt);
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

    // Calculate actual rental duration for full return
    const startTime = rental.createdAt || rental.fromDate || rental.paidAt;
    const endTime = new Date();
    const startDate = toUzbekistanTime(startTime);
    const endDate = toUzbekistanTime(endTime);
    
    const totalHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const rentalDays = Math.floor(totalHours / 24);
    const rentalHours = totalHours % 24;
    
    // Calculate billing multiplier: 1-24 hours = 1 day, after 24 hours = hourly calculation
    const billingMultiplier = totalHours <= 24 ? 1 : 1 + ((totalHours - 24) / 24);

    try {
      const res = await fetch(`http://localhost:3000/orders/${rental.id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          items: allItemsReturned,
          rentalDays: rentalDays,
          rentalHours: rentalHours,
          billingMultiplier: billingMultiplier
        }),
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
            pricePerDay: product?.price || item.pricePerDay,
            weight: product?.weight || 0
          };
        });

        // Use the calculated billing multiplier from the API response
        const returnAmount = data.returnRecords ? 
          data.returnRecords.reduce((sum, record) => sum + record.returnAmount, 0) :
          rental.items.reduce((s, it) => {
            const product = items.find((i) => i.id === it.itemId);
            const price = product ? product.price : (it.pricePerDay || 0);
            return s + price * (it.qty || 0) * billingMultiplier;
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

    // Calculate actual rental duration
    const startTime = selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt;
    const endTime = new Date();
    const startDate = toUzbekistanTime(startTime);
    const endDate = toUzbekistanTime(endTime);
    
    const totalHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const rentalDays = Math.floor(totalHours / 24);
    const rentalHours = totalHours % 24;
    
    // Calculate billing multiplier: 1-24 hours = 1 day, after 24 hours = hourly calculation
    const billingMultiplier = totalHours <= 24 ? 1 : 1 + ((totalHours - 24) / 24);

    try {
      const res = await fetch(`http://localhost:3000/orders/${selectedRental.id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          items: itemsToReturn,
          rentalDays: rentalDays,
          rentalHours: rentalHours,
          billingMultiplier: billingMultiplier
        }),
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
              pricePerDay: product?.price || item.pricePerDay,
              weight: product?.weight || 0
            });
          }
          
          if (item.qty > returnQty) {
            remainingItems.push({
              ...item,
              name: product?.name || item.name,
              size: product?.size || item.size,
              qty: item.qty - returnQty,
              pricePerDay: product?.price || item.pricePerDay,
              weight: product?.weight || 0
            });
          }
        });

        // Use the calculated return amount from API response
        const returnAmount = data.returnRecords ? 
          data.returnRecords.reduce((sum, record) => sum + record.returnAmount, 0) :
          calculateReturnAmount(selectedRental, returnQuantities);
        
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
          const mapped = (refreshData.orders || [])
            .filter(o => !o.returnedAt) // Only include active (non-returned) orders
            .map((o) => ({
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
                .filter((item) => item.qty > 0), // Only keep items with remaining quantity
              fromDate: o.fromDate,
              createdAt: o.createdAt,
              toDate: o.toDate,
              subtotal: o.subtotal,
              tax: o.tax,
              total: o.total,
              advancePayment: o.advancePayment || 0,
              advanceUsed: o.advanceUsed || 0,
              paidAt: o.createdAt || o.fromDate,
              returnedAt: o.returnedAt,
              status: o.status,
              rentalDays: o.rentalDays,
              rentalHours: o.rentalHours,
              billingMultiplier: o.billingMultiplier,
            }));
          setRentals(mapped);
        } else {
          // Fallback to local update if refresh fails
          setRentals((rs) =>
            rs.filter((r) => {
              // If this is the rental being returned and all items are returned, remove it from the list
              if (r.id === selectedRental.id && allItemsReturned) {
                return false;
              }
              // If this is the rental being returned but not all items are returned, update it
              if (r.id === selectedRental.id) {
                const updatedItems = r.items
                  .map((item) => {
                    const returnedQty = returnQuantities[item.itemId] || 0;
                    return { ...item, qty: item.qty - returnedQty, returned: (item.returned || 0) + returnedQty };
                  })
                  .filter((item) => item.qty > 0);
                
                // If no items left after return, remove the rental
                if (updatedItems.length === 0) {
                  return false;
                }
                
                // Update the rental with remaining items
                r.items = updatedItems;
                r.rentalDays = data.returnRecords?.[0]?.rentalDays || rentalDays;
                r.rentalHours = data.returnRecords?.[0]?.rentalHours || rentalHours;
                r.billingMultiplier = data.returnRecords?.[0]?.billingMultiplier || billingMultiplier;
                r.total = returnAmount;
              }
              return true;
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
    const multiplier = calcBillingMultiplier(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt);
    const hours = calcHoursFromStartTime(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt);
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
      fromDate: selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt,
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

  // Open edit modal
  const openEditModal = (rental) => {
    setEditRental(rental);
    // Convert createdAt to datetime-local format
    const startTime = rental.createdAt || rental.fromDate || rental.paidAt;
    if (startTime) {
      const date = new Date(startTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setEditDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
    setEditModal(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal(false);
    setEditRental(null);
    setEditDateTime("");
  };

  // Save edited date time
  const saveEditedDateTime = async () => {
    if (!editRental || !editDateTime) return;
    
    try {
      const res = await fetch(`http://localhost:3000/orders/${editRental.id}/edit-start-time`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startDateTime: editDateTime }),
      });

      if (res.ok) {
        // Update local state
        setRentals(prev => prev.map(r => 
          r.id === editRental.id 
            ? { ...r, createdAt: editDateTime, fromDate: null, paidAt: editDateTime }
            : r
        ));
        alert("Олинган сана ва вақт муваффақиятли ўзгартирилди!");
        closeEditModal();
      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || "Ўзгартиришда хатолик юз берди"}`);
      }
    } catch (error) {
      console.error("Error updating start time:", error);
      alert("Тармоқ хатолиги юз берди");
    }
  };

  // Show only active rentals and sort by ID descending
  let filteredRentals = rentals.filter((r) => {
    // Only show active rentals (not returned)
    if (r.returnedAt) return false;
    
    const q = search.toLowerCase();
    const idMatch = String(r.id).includes(q);
    const nameMatch = nameById(r.customerId).toLowerCase().includes(q);
    return idMatch || nameMatch;
  }).sort((a, b) => b.id - a.id); // Sort by ID descending (newest first)

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h2>Ижарадаги товарлар рўйхати</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input className="input" style={{ width: 350 }} placeholder="ID ёки мижоз (исм/фамилия)" value={search} onChange={(e)=> setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Мижоз</th>
                <th>Сана вақт</th>
                <th>Вақт</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Амаллар</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.map((r) => {
                const isReturned = !!r.returnedAt;
                // Use stored values from backend if available, otherwise calculate
                const multiplier = isReturned && r.billingMultiplier != null ? 
                  r.billingMultiplier :
                  (isReturned ? 
                    calcBillingMultiplierForReturned(r.createdAt || r.fromDate || r.paidAt, r.returnedAt) :
                    calcBillingMultiplier(r.createdAt || r.fromDate || r.paidAt));
                // For active rentals, calculate total based on current items and live multiplier
                const total = r.items.reduce((s,it)=> s + (it.pricePerDay||0) * (it.qty||0) * multiplier,0);
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
                      {formatUzbekistanDate(r.createdAt || r.fromDate || r.paidAt)}&nbsp;&nbsp;&nbsp;
                      <span style={{ color: '#666' }}>
                        {formatUzbekistanTime(r.createdAt || r.fromDate || r.paidAt)}
                      </span>
                    </td>
                    <td className="text-2xl">{isReturned && r.rentalDays != null && r.rentalHours != null ? 
                      formatTimeDisplayFromStored(r.rentalDays, r.rentalHours) :
                      (isReturned ? 
                        formatTimeDisplayForReturned(r.createdAt || r.fromDate || r.paidAt, r.returnedAt) :
                        formatTimeDisplay(r.createdAt || r.fromDate || r.paidAt))
                    }</td>
                    <td className="text-2xl">{fmt(total)}</td>
                    <td className="text-2xl" style={{ color: isReturned ? "#059669" : "#f59e0b" }}>
                      {isReturned ? "Қайтарилган" : "Ижарада"}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(r);
                        }}
                        className="btn btn-sm"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Таҳрирлаш
                      </button>
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
                  <strong>Олинган сана ва вақт:</strong> {formatUzbekistanDate(viewReturnedRental.createdAt || viewReturnedRental.fromDate || viewReturnedRental.paidAt)}&nbsp;&nbsp;&nbsp;
                  <span style={{ color: '#666' }}>
                    {formatUzbekistanTime(viewReturnedRental.createdAt || viewReturnedRental.fromDate || viewReturnedRental.paidAt)}
                  </span>
                </div>
                <div>
                  <strong>Қайтарилган сана ва вақт:</strong> {formatUzbekistanDate(viewReturnedRental.returnedAt)}&nbsp;&nbsp;&nbsp;
                  <span style={{ color: '#666' }}>
                    {formatUzbekistanTime(viewReturnedRental.returnedAt)}
                  </span>
                </div>
                <div><strong>Ижарада бўлган вақт:</strong> {formatTimeDisplay(viewReturnedRental.createdAt || viewReturnedRental.fromDate || viewReturnedRental.paidAt)}</div>
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
                  const multiplier = calcBillingMultiplier(viewReturnedRental.createdAt || viewReturnedRental.fromDate || viewReturnedRental.paidAt);
                  const hours = calcHoursFromStartTime(viewReturnedRental.createdAt || viewReturnedRental.fromDate || viewReturnedRental.paidAt);
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
                    fromDate: viewReturnedRental.createdAt || viewReturnedRental.fromDate || viewReturnedRental.paidAt,
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
                      <strong>Олинган сана ва вақт:</strong> {formatUzbekistanDate(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt)}&nbsp;&nbsp;&nbsp;
                      <span style={{ color: '#666' }}>
                        {formatUzbekistanTime(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt)}
                      </span>
                    </div>
                    <div>
                      <strong>Бугунги сана ва вақт:</strong> {formatUzbekistanDate(new Date())}&nbsp;&nbsp;&nbsp;
                      <span style={{ color: '#666' }}>
                        {formatUzbekistanTime(new Date())}
                      </span>
                    </div>
                    <div><strong>Вақт:</strong> {formatTimeDisplay(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt)}</div>
                    <div><strong>Жами сумма:</strong> {fmt((() => {
                      const multiplier = calcBillingMultiplier(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt);
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
                    <div><strong>Жами вазн:</strong> {(() => {
                      let totalWeight = 0;
                      Object.keys(returnQuantities).forEach((itemId) => {
                        const returnQty = returnQuantities[itemId] || 0;
                        if (returnQty > 0) {
                          const product = items.find((i) => i.id == itemId);
                          if (product) {
                            totalWeight += (product.weight || 0) * returnQty;
                          }
                        }
                      });
                      return totalWeight;
                    })()} кг</div>
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
                const multiplier = calcBillingMultiplier(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt);
                const returnQty = returnQuantities[item.itemId] || 0;
                const price = product ? product.price : (item.pricePerDay || 0);
                const itemAmount = price * returnQty * multiplier;
                
                return (
                  <div key={item.itemId}>
                    <label>
                      {product?.name || item.name} ({product?.size || item.size}) - Вазн: {product?.weight || 0} кг - Қолган: {item.qty}
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
                  const multiplier = calcBillingMultiplier(selectedRental.createdAt || selectedRental.fromDate || selectedRental.paidAt);
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

      {/* Edit DateTime Modal */}
      {editModal && editRental && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Олинган сана ва вақтни таҳрирлаш</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <div className="modal-body gap">
              <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #0ea5e9' }}>
                <div><strong>Ижара ID:</strong> {editRental.id}</div>
                <div><strong>Мижоз:</strong> {nameById(editRental.customerId)}</div>
                <div><strong>Ҳозирги сана ва вақт:</strong> {(() => {
                  const currentTime = editRental.createdAt || editRental.fromDate || editRental.paidAt;
                  return `${formatUzbekistanDate(currentTime)} ${formatUzbekistanTime(currentTime)}`;
                })()}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Янги олинган сана ва вақт
                </label>
                <input
                  type="datetime-local"
                  value={editDateTime}
                  onChange={(e) => setEditDateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeEditModal}>Бекор қилиш</button>
              <button
                className="btn primary"
                onClick={saveEditedDateTime}
                disabled={!editDateTime}
                style={{ marginLeft: "auto" }}
              >
                Сақлаш
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}