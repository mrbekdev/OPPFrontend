import React, { useState, useEffect } from "react";
import { fmt, formatUzbekistanDate, formatUzbekistanTime } from "../utils/helpers";
import { openReturnReceipt } from "./ReturnReceipt";

export default function ReturnsPanel({ customers, settings }) {
  const [returnedRentals, setReturnedRentals] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const token = localStorage.getItem("token");

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch returned rentals from backend
  useEffect(() => {
    fetchReturnedRentals();
  }, []);

  const fetchReturnedRentals = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/orders", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Get return records for partial returns
        const returnRecordsResponse = await fetch("http://localhost:3000/return-records", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        let returnRecords = [];
        if (returnRecordsResponse.ok) {
          const returnRecordsData = await returnRecordsResponse.json();
          returnRecords = returnRecordsData.returnRecords || [];
        }
        
        // Combine fully returned orders and partial return records
        const fullyReturnedOrders = (data.orders || [])
          .filter(o => o.returnedAt) // Only fully returned orders
          .map((o) => ({
            id: o.id,
            customerId: o.clientId,
            type: 'full_return',
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
                weight: i.product.weight || 0,
              })),
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

        // Convert return records to display format
        const partialReturns = returnRecords.map(record => ({
          id: `partial_${record.id}`,
          originalOrderId: record.orderId,
          customerId: record.customerId,
          type: 'partial_return',
          items: [{
            itemId: record.productId,
            qty: 0, // Already returned
            pricePerDay: record.productPrice,
            returned: record.returnQuantity,
            name: record.productName,
            size: record.productSize,
            totalQuantity: record.returnQuantity,
            weight: record.productWeight,
          }],
          createdAt: record.orderCreatedAt,
          returnedAt: record.returnedAt,
          rentalDays: record.rentalDays,
          rentalHours: record.rentalHours,
          billingMultiplier: record.billingMultiplier,
          total: record.returnAmount,
        }));

        // Combine both types
        const allReturns = [...fullyReturnedOrders, ...partialReturns];
        setReturnedRentals(allReturns);
      }
    } catch (error) {
      console.error("Error fetching returned rentals:", error);
    } finally {
      setLoading(false);
    }
  };

  const nameById = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.name} (${c.phone || ''})` : id;
  };

  const formatTimeDisplayFromStored = (days, hours) => {
    const d = days || 0;
    const h = hours || 0;
    return `${d} кун ${h} соат`;
  };

  // Print receipt for returned rental
  const printReturnedReceipt = (rental) => {
    const customer = customers.find(c => c.id === rental.customerId) || {};
    
    // Use stored values from backend
    const days = rental.rentalDays || 0;
    const hours = rental.rentalHours || 0;
    const totalAmount = rental.total || 0;
    
    // Prepare returned items data with proper quantities
    const returnedItems = rental.items.map(item => ({
      ...item,
      qty: rental.type === 'partial_return' ? item.returned : item.totalQuantity, // Show returned quantity
      returnedQty: rental.type === 'partial_return' ? item.returned : item.totalQuantity,
      weight: item.weight || 0,
    }));

    openReturnReceipt({
      settings,
      customer,
      rental,
      returnedItems,
      remainingItems: [], // No remaining items for returned rentals
      returnAmount: totalAmount,
      originalAmount: totalAmount,
      days,
      hours,
    });
  };

  // Filter rentals based on search and sort by ID descending
  let filteredRentals = returnedRentals.filter((r) => {
    const q = search.toLowerCase();
    const idMatch = String(r.id).includes(q);
    const nameMatch = nameById(r.customerId).toLowerCase().includes(q);
    return idMatch || nameMatch;
  }).sort((a, b) => b.id - a.id); // Sort by ID descending (newest first)

  if (loading) {
    return (
      <div className="gap">
        <div className="card gap">
          <h2>Қайтарилганлар рўйхати</h2>
          <p>Юкланмоқда...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h2>Қайтарилганлар рўйхати</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              className="input"
              placeholder="ID ёки исм бўйича қидириш..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 250 }}
            />
            <button 
              onClick={fetchReturnedRentals}
              className="btn"
              style={{ backgroundColor: "#28a745", color: "white" }}
            >
              Янгилаш
            </button>
          </div>
        </div>

        {filteredRentals.length === 0 ? (
          <p>Қайтарилган ижаралар топилмади.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Мижоз</th>
                  <th>Олинган сана</th>
                  <th>Қайтарилган сана</th>
                  <th>Ишлаган вақт</th>
                  <th>Жами сумма</th>
                  <th>Амаллар</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.map((r) => {
                  const totalAmount = r.total || 0;
                  const timeDisplay = r.rentalDays != null && r.rentalHours != null ? 
                    formatTimeDisplayFromStored(r.rentalDays, r.rentalHours) :
                    "Маълумот йўқ";

                  const displayId = r.type === 'partial_return' ? 
                    `${r.originalOrderId} (қисман)` : 
                    r.id;
                  
                  return (
                    <tr key={r.id} style={{ backgroundColor: "#f8f9fa" }}>
                      <td className="mono text-2xl">{displayId}</td>
                      <td className="text-2xl">{nameById(r.customerId)}</td>
                      <td className="text-2xl">
                        {formatUzbekistanDate(r.createdAt || r.fromDate || r.paidAt)}&nbsp;&nbsp;&nbsp;
                        <span style={{ color: '#666' }}>
                          {formatUzbekistanTime(r.createdAt || r.fromDate || r.paidAt)}
                        </span>
                      </td>
                      <td className="text-2xl">
                        {formatUzbekistanDate(r.returnedAt)}&nbsp;&nbsp;&nbsp;
                        <span style={{ color: '#666' }}>
                          {formatUzbekistanTime(r.returnedAt)}
                        </span>
                      </td>
                      <td className="text-2xl" style={{ color: "#059669" }}>
                        {timeDisplay}
                      </td>
                      <td className="text-2xl" style={{ color: "#059669", fontWeight: "bold" }}>
                        {fmt(totalAmount)}
                      </td>
                      <td>
                        <button
                          onClick={() => printReturnedReceipt(r)}
                          className="btn btn-sm"
                          style={{
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Чек чиқариш
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <p style={{ margin: 0, color: "#666" }}>
            Жами: {filteredRentals.length} та қайтарилган ижара
          </p>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            Охирги янгиланиш: {formatUzbekistanTime(currentTime)}
          </p>
        </div>
      </div>
    </div>
  );
}
