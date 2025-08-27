import React, { useMemo, useState } from "react";
import { fmt } from "../utils/helpers";

export default function ReportsPanel({ rentals, items, customers, setRentals }) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);

  const safeItems = Array.isArray(items) ? items : [];
  const safeRentals = Array.isArray(rentals) ? rentals : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  const nameById = (id) => safeCustomers.find(c => c.id === id)?.name || id;

  const yearOptions = useMemo(() => {
    const ys = new Set(
      safeRentals
        .map((r) => (r.paidAt ? new Date(r.paidAt).getFullYear() : null))
        .filter(Boolean)
    );
    return Array.from(ys).sort((a, b) => a - b);
  }, [safeRentals]);

  const monthOptions = useMemo(() => {
    if (!year) return Array.from({ length: 12 }, (_, i) => i + 1);
    const ms = new Set(
      safeRentals
        .filter((r) => r.paidAt && new Date(r.paidAt).getFullYear() === Number(year))
        .map((r) => new Date(r.paidAt).getMonth() + 1)
    );
    const arr = Array.from(ms).sort((a, b) => a - b);
    return arr.length ? arr : Array.from({ length: 12 }, (_, i) => i + 1);
  }, [safeRentals, year]);

  const normalizedRentals = safeRentals.map((r) => ({
    id: r.id,
    date: r.paidAt ? r.paidAt.slice(0, 10) : "",
    paidAt: r.paidAt || "",
    fromDate: r.fromDate || r.paidAt || "",
    returnedAt: r.returnedAt || null,
    year: r.paidAt ? new Date(r.paidAt).getFullYear() : null,
    month: r.paidAt ? new Date(r.paidAt).getMonth() + 1 : null,
    days: r.days || 1,
    returned: !!r.returnedAt,
    customerId: r.customerId,
    status: r.status,
    items: (r.items || []).map((item) => {
      const product = safeItems.find((i) => i.id === item.itemId);
      const productName = item.name || product?.name || "Unknown";
      const productSize = item.size || product?.size || "N/A";
      const pricePerDay = item.pricePerDay || product?.price || 0;
      const qty = item.qty || 0;
      const activeQty = item.activeQty || qty;
      const returnedQty = item.returnedQty || 0;
      return {
        orderItemId: item.orderItemId,
        productId: item.itemId,
        productName,
        productSize,
        qty,
        activeQty,
        returnedQty,
        pricePerDay,
        isFullyReturned: returnedQty === qty,
        isPartiallyReturned: returnedQty > 0 && returnedQty < qty,
      };
    }),
  }));

  const filteredRentals = normalizedRentals
    .filter((r) => (year ? r.year === Number(year) : true))
    .filter((r) => (month ? r.month === Number(month) : true));

  const totals = filteredRentals.reduce(
    (a, r) => {
      const rentalTotal = r.items.reduce((s, it) => s + it.pricePerDay * it.activeQty * r.days, 0);
      a.subtotal += rentalTotal;
      return a;
    },
    { subtotal: 0 }
  );

  const groupedByDay = useMemo(() => {
    const map = new Map();
    filteredRentals.forEach((r) => {
      const revenue = r.items.reduce((s, it) => s + it.pricePerDay * it.activeQty * r.days, 0);
      map.set(r.date, (map.get(r.date) || 0) + revenue);
    });
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRentals]);

  const productSummary = useMemo(() => {
    const summaryMap = new Map();
    filteredRentals.forEach((r) => {
      r.items.forEach((item) => {
        const key = `${item.productId}_${item.productSize}`;
        const existing = summaryMap.get(key) || {
          productId: item.productId,
          productName: item.productName,
          productSize: item.productSize,
          totalQty: 0,
          totalReturnedQty: 0,
          totalActiveQty: 0,
          totalAmount: 0,
        };
        existing.totalQty += item.qty;
        existing.totalReturnedQty += item.returnedQty;
        existing.totalActiveQty += item.activeQty;
        existing.totalAmount += item.pricePerDay * item.activeQty * r.days;
        summaryMap.set(key, existing);
      });
    });
    return Array.from(summaryMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );
  }, [filteredRentals]);

  const exportCSV = () => {
    const delimiter = ',';
    const header = [
      "Buyurtma ID",
      "Sana",
      "Mijoz",
      "Kun",
      "Jami (ijara)",
      "Buyurtma Holati",
      "Mahsulot Nomi",
      "Mahsulot O'lchami",
      "Jami Soni",
      "Qaytarilgan Soni",
      "Faol Soni",
      "Narx/kun",
      "Item Jami",
    ].join(delimiter);
    const body = filteredRentals
      .flatMap((r) => {
        const rentalTotal = r.items.reduce((s, it) => s + it.pricePerDay * it.activeQty * r.days, 0);
        return r.items.map((item) =>
          [
            r.id,
            `"${r.date}"`,
            `"${nameById(r.customerId)}"`,
            r.days,
            rentalTotal.toFixed(2),
            `"${getOrderStatusText(r.status || 'PENDING')}"`,
            `"${item.productName}"`,
            `"${item.productSize}"`,
            item.qty,
            item.returnedQty,
            item.activeQty,
            item.pricePerDay.toFixed(2),
            (item.pricePerDay * item.activeQty * r.days).toFixed(2),
          ].join(delimiter)
        );
      })
      .join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisobot_${year || "hammasi"}-${month || "hammasi"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openOrderDetail = (order) => setOrderDetail(order);
  const closeOrderDetail = () => setOrderDetail(null);

  const getReturnStatusText = (item) => {
    if (item.isFullyReturned) return "✓ To'liq qaytarildi";
    if (item.isPartiallyReturned) return `↻ ${item.returnedQty}/${item.qty} qaytarildi`;
    return "Faol";
  };

  const getReturnStatusColor = (item) => {
    if (item.isFullyReturned) return "#28a745";
    if (item.isPartiallyReturned) return "#ffc107";
    return "#17a2b8";
  };

  const getOrderStatusText = (status) => {
    if (!status) return "Noma'lum";
    switch (status) {
      case "RETURNED": return "To'liq qaytarildi";
      case "PARTIALLY_RETURNED": return "Qisman qaytarildi";
      case "DELIVERED": return "Yetkazildi";
      case "PENDING": return "Kutilmoqda";
      default: return "Noma'lum";
    }
  };

  const getOrderStatusColor = (status) => {
    if (!status) return "#6c757d";
    switch (status) {
      case "RETURNED": return "#28a745";
      case "PARTIALLY_RETURNED": return "#ffc107";
      case "DELIVERED": return "#17a2b8";
      case "PENDING": return "#6c757d";
      default: return "#6c757d";
    }
  };

  const token = localStorage.getItem('token');

  const refreshOrders = async () => {
    if (!setRentals) return;
    try {
      const res = await fetch("http://localhost:3000/orders", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const calcDays = (from, to) => {
          const d1 = new Date(from);
          const d2 = new Date(to);
          const ms = Math.max(0, d2 - d1);
          return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
        };
        const mapped = (data.orders || []).map((o) => ({
          id: o.id,
          customerId: o.clientId,
          items: (o.items || []).map((i) => ({
            itemId: i.productId,
            qty: i.quantity, // Jami son
            activeQty: i.activeQuantity || (i.quantity - i.returned), // Faol son
            returnedQty: i.returned, // Qaytarilgan son
            pricePerDay: i.product.price,
            orderItemId: i.id,
            returned: i.returned,
            name: i.product.name,
            size: i.product.size,
            isFullyReturned: i.isFullyReturned || (i.returned === i.quantity),
            isPartiallyReturned: i.isPartiallyReturned || (i.returned > 0 && i.returned < i.quantity),
          })),
          fromDate: o.fromDate?.split("T")[0],
          toDate: o.toDate?.split("T")[0],
          days: calcDays(o.fromDate, o.toDate),
          subtotal: o.subtotal,
          tax: o.tax,
          total: o.total,
          paidAt: o.createdAt,
          returnedAt: o.status !== "PENDING" ? o.updatedAt : null,
          status: o.status,
        }));
        setRentals(mapped);
      }
    } catch (e) {
      console.error("Refresh orders error", e);
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm("Buyurtmani o'chirishni tasdiqlang")) return;
    try {
      const res = await fetch(`http://localhost:3000/orders/${id}`, { method:'DELETE', headers:{ Authorization: `Bearer ${token}` } });
      if (res.ok) {
        await refreshOrders();
        closeOrderDetail();
      } else {
        const e = await res.json();
      }
    } catch (e) {
      alert("Tarmoq xatoligi");
    }
  };

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2>Ҳисоботлар</h2>
          <div className="row" style={{ gap: "16px", alignItems: "center" }}>
            <select
              className="input"
              style={{ width: "120px", fontSize: "14px" }}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Барча йиллар</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="input"
              style={{ width: "120px", fontSize: "14px" }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Барча ойлар</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}-ой
                </option>
              ))}
            </select>
            <button
              className="btn primary"
              onClick={() => setShowSummary(!showSummary)}
            >
              {showSummary ? "Деталлар" : "Хисобот"}
            </button>
            <button
              className="btn"
              onClick={exportCSV}
              style={{ background: "#28a745", color: "white" }}
            >
              📊 Excel yuklab olish
            </button>
            <button
              className="btn"
              onClick={() => {
                const delimiter = ',';
                const header = [
                  "Mahsulot Nomi",
                  "O'lcham",
                  "Jami son",
                  "Qaytarilgan",
                  "Faol",
                  "Jami summa"
                ].join(delimiter);
                
                const body = productSummary.map((item) =>
                  [
                    `"${item.productName}"`,
                    `"${item.productSize}"`,
                    item.totalQty,
                    item.totalReturnedQty,
                    item.totalActiveQty,
                    item.totalAmount
                  ].join(delimiter)
                ).join("\n");
                
                                    const csv = header + "\n" + body;
                    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mahsulotlar_hisobot_${year || "hammasi"}-${month || "hammasi"}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{ background: "#17a2b8", color: "white" }}
            >
              📊 Mahsulotlar Excel
            </button>
          </div>
        </div>
        
        {showSummary ? (
          <div className="gap">
            <div className="row" style={{ gap: "24px", flexWrap: "wrap" }}>
              <div className="card" style={{ flex: 1, minWidth: "200px" }}>
                <h3>Умумий маълумот</h3>
                <div>Buyurtmalar soni: <b>{filteredRentals.length}</b></div>
                <div>Jami summa: <b>{fmt(totals.subtotal)}</b></div>
                <div>Faol buyurtmalar: <b>{filteredRentals.filter(r => (r.status || 'PENDING') !== "RETURNED").length}</b></div>
                <div>To'liq qaytarilgan: <b>{filteredRentals.filter(r => (r.status || 'PENDING') === "RETURNED").length}</b></div>
                <div>Qisman qaytarilgan: <b>{filteredRentals.filter(r => (r.status || 'PENDING') === "PARTIALLY_RETURNED").length}</b></div>
              </div>
              
              <div className="card" style={{ flex: 1, minWidth: "200px" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h3>Kunlik daromad</h3>
                  <button
                    className="btn"
                    onClick={() => {
                      const delimiter = ',';
                      const header = [
                        "Sana",
                        "Daromad"
                      ].join(delimiter);
                      
                      const body = groupedByDay.map((day) =>
                        [
                          `"${day.date}"`,
                          day.total.toFixed(2)
                        ].join(delimiter)
                      ).join("\n");
                      
                      const csv = header + "\n" + body;
                      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `kunlik_daromad_${year || "hammasi"}-${month || "hammasi"}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ background: "#6f42c1", color: "white", fontSize: "10px", padding: "2px 6px" }}
                  >
                    📊 Kunlik Excel
                  </button>
                </div>
                {groupedByDay.slice(-7).map((day) => (
                  <div key={day.date}>
                    {day.date}: <b>{fmt(day.total)}</b>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card gap">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3>Mahsulotlar bo'yicha</h3>
                <button
                  className="btn"
                  onClick={() => {
                    const delimiter = ',';
                    const header = [
                      "Mahsulot Nomi",
                      "O'lcham",
                      "Jami son",
                      "Qaytarilgan",
                      "Faol",
                      "Jami summa"
                    ].join(delimiter);
                    
                    const body = productSummary.map((item) =>
                      [
                        `"${item.productName}"`,
                        `"${item.productSize}"`,
                        item.totalQty,
                        item.totalReturnedQty,
                        item.totalActiveQty,
                        item.totalAmount.toFixed(2)
                      ].join(delimiter)
                    ).join("\n");
                    
                    const csv = header + "\n" + body;
                    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `mahsulotlar_hisobot_${year || "hammasi"}-${month || "hammasi"}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ background: "#17a2b8", color: "white", fontSize: "12px", padding: "4px 8px" }}
                >
                  📊 Mahsulotlar Excel
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>O'lcham</th>
                      <th>Jami son</th>
                      <th>Qaytarilgan</th>
                      <th>Faol</th>
                      <th>Jami summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSummary.map((item) => (
                      <tr key={`${item.productId}_${item.productSize}`}>
                        <td><strong>{item.productName}</strong></td>
                        <td>{item.productSize}</td>
                        <td>{item.totalQty}</td>
                        <td style={{ color: item.totalReturnedQty > 0 ? "#ffc107" : "#666" }}>
                          {item.totalReturnedQty}
                        </td>
                        <td style={{ color: item.totalActiveQty > 0 ? "#28a745" : "#666" }}>
                          {item.totalActiveQty}
                        </td>
                        <td>{fmt(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sana</th>
                  <th>Mijoz</th>
                  <th>Mahsulotlar</th>
                  <th>Kunlar</th>
                  <th>Jami</th>
                  <th>Holat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.date}</td>
                    <td>{nameById(r.customerId)}</td>
                    <td>
                      {r.items.map((item) => (
                        <div key={item.orderItemId} style={{ marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold" }}>{item.productName}</span>
                            <span style={{ 
                              fontSize: "11px", 
                              padding: "2px 6px", 
                              borderRadius: "4px",
                              backgroundColor: getReturnStatusColor(item),
                              color: "white"
                            }}>
                              {getReturnStatusText(item)}
                            </span>
                          </div>
                          <div style={{ color: "#666", fontSize: "12px", marginLeft: "8px" }}>
                            {item.qty} dona ({item.activeQty} faol, {item.returnedQty} qaytarildi) - {item.productSize}
                          </div>
                        </div>
                      ))}
                    </td>
                    <td>{r.days}</td>
                    <td>{fmt(r.items.reduce((s, it) => s + it.pricePerDay * it.activeQty * r.days, 0))}</td>
                    <td>
                      <span style={{ 
                        color: getOrderStatusColor(r.status || 'PENDING'),
                        fontWeight: "bold",
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: getOrderStatusColor(r.status || 'PENDING') + "20"
                      }}>
                        {getOrderStatusText(r.status || 'PENDING')}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn" 
                        onClick={() => openOrderDetail(r)}
                        style={{ fontSize: "12px", padding: "4px 8px" }}
                      >
                        Ko'rish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orderDetail && (
        <div className="modal-overlay" onClick={closeOrderDetail}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buyurtma #{orderDetail.id} - to'liq ma'lumot</h3>
              <button className="modal-close" onClick={closeOrderDetail}>✕</button>
            </div>
            <div className="modal-body gap">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: "16px" }}>
                <div><b>Olingan sana:</b> {orderDetail.fromDate ? new Date(orderDetail.fromDate).toLocaleString('uz-UZ') : new Date(orderDetail.date).toLocaleString('uz-UZ')}</div>
                <div><b>Qaytarilgan sana:</b> {orderDetail.returnedAt ? new Date(orderDetail.returnedAt).toLocaleString('uz-UZ') : '-'}</div>
                <div><b>Mijoz:</b> {nameById(orderDetail.customerId)}</div>
                <div><b>Kun:</b> {orderDetail.days}</div>
                <div><b>Holat:</b> 
                  <span style={{ 
                    color: getOrderStatusColor(orderDetail.status || 'PENDING'),
                    fontWeight: "bold",
                    marginLeft: "8px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                                          backgroundColor: getOrderStatusColor(orderDetail.status || 'PENDING') + "20"
                  }}>
                    {getOrderStatusText(orderDetail.status || 'PENDING')}
                  </span>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>O'lcham</th>
                      <th>Jami Soni</th>
                      <th>Faol Soni</th>
                      <th>Qaytarilgan</th>
                      <th>Narx/kun</th>
                      <th>Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetail.items.map((it, idx) => (
                      <tr key={`${it.orderItemId}_${idx}`} style={{
                        backgroundColor: it.isFullyReturned ? '#f8f9fa' : 'transparent',
                        opacity: it.isFullyReturned ? 0.7 : 1
                      }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{it.productName}</span>
                            <span style={{ 
                              fontSize: "10px", 
                              padding: "2px 4px", 
                              borderRadius: "3px",
                              backgroundColor: getReturnStatusColor(it),
                              color: "white"
                            }}>
                              {getReturnStatusText(it)}
                            </span>
                          </div>
                        </td>
                        <td>{it.productSize}</td>
                        <td>{it.qty} dona</td>
                        <td style={{ color: it.activeQty > 0 ? "#28a745" : "#666" }}>
                          {it.activeQty} dona
                        </td>
                        <td style={{ color: it.returnedQty > 0 ? "#ffc107" : "#666" }}>
                          {it.returnedQty} dona
                        </td>
                        <td>{fmt(it.pricePerDay)}</td>
                        <td>{fmt(it.pricePerDay * it.activeQty * orderDetail.days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Jami mahsulotlar: {orderDetail.items.length} | 
                  Faol mahsulotlar: {orderDetail.items.filter(it => it.activeQty > 0).length} | 
                  Qaytarilgan mahsulotlar: {orderDetail.items.filter(it => it.returnedQty > 0).length}
                </div>
                <div className="total">
                  Umumiy: {fmt(orderDetail.items.reduce((s, it) => s + it.pricePerDay * it.activeQty * orderDetail.days, 0))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => deleteOrder(orderDetail.id)} style={{ background:'#ef4444', color:'#fff', marginRight:'auto' }}>Buyurtmani o'chirish</button>
              <button className="btn" onClick={closeOrderDetail}>Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

