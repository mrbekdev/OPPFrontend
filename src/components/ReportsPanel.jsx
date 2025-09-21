import React, { useMemo, useState, useEffect } from "react";
import { fmt, toUzbekistanTime } from "../utils/helpers";
import { openPrintReceipt } from "./Receipt";

export default function ReportsPanel({ rentals, items, customers, setRentals }) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);

  const safeItems = Array.isArray(items) ? items : [];
  const safeRentals = Array.isArray(rentals) ? rentals : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  const nameById = (id) => safeCustomers.find(c => c.id === id)?.name || id;
  useEffect(() => {
    // Always pull fresh orders so returned orders keep their items
    refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Calculate billing multiplier for each rental
  const calcBillingMultiplier = (createdAt, returnedAt) => {
    if (!createdAt) return 1;
    const startDate = toUzbekistanTime(createdAt);
    const endDate = returnedAt ? toUzbekistanTime(returnedAt) : toUzbekistanTime(new Date());
    const totalHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    
    // 1-24 hours = 1 day, after 24 hours = hourly calculation
    return totalHours <= 24 ? 1 : 1 + ((totalHours - 24) / 24);
  };

  const normalizedRentals = safeRentals.map((r) => {
    // Use stored billing multiplier if available, otherwise calculate
    const billingMultiplier = r.billingMultiplier || calcBillingMultiplier(r.createdAt || r.paidAt, r.returnedAt);
    
    return {
      id: r.id,
      date: r.createdAt ? r.createdAt.slice(0, 10) : (r.paidAt ? r.paidAt.slice(0, 10) : ""),
      paidAt: r.paidAt || "",
      createdAt: r.createdAt || r.paidAt || "",
      fromDate: r.fromDate || r.createdAt || r.paidAt || "",
      returnedAt: r.returnedAt || null,
      year: r.createdAt ? new Date(r.createdAt).getFullYear() : (r.paidAt ? new Date(r.paidAt).getFullYear() : null),
      month: r.createdAt ? new Date(r.createdAt).getMonth() + 1 : (r.paidAt ? new Date(r.paidAt).getMonth() + 1 : null),
      billingMultiplier: billingMultiplier,
      rentalDays: r.rentalDays || Math.floor(billingMultiplier),
      rentalHours: r.rentalHours || Math.round((billingMultiplier % 1) * 24),
      returned: !!r.returnedAt,
      customerId: r.customerId,
      status: r.status,
      items: (r.items || []).map((item) => {
        const product = safeItems.find((i) => i.id === item.itemId);
        const productName = item.name || item.productName || product?.name || item?.product?.name || "Unknown";
        const productSize = item.size || item.productSize || product?.size || item?.product?.size || "N/A";
        const pricePerDay = item.pricePerDay || product?.price || item?.product?.price || 0;
        const qty = item.qty || 0;
        const activeQty = item.activeQty || (qty - (item.returned || 0));
        const returnedQty = item.returnedQty || item.returned || 0;
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
    };
  });

  const filteredRentals = normalizedRentals
    .filter((r) => (year ? r.year === Number(year) : true))
    .filter((r) => (month ? r.month === Number(month) : true));

  const totals = filteredRentals.reduce(
    (a, r) => {
      const rentalTotal = r.items.reduce((s, it) => s + it.pricePerDay * it.qty * r.billingMultiplier, 0);
      a.subtotal += rentalTotal;
      return a;
    },
    { subtotal: 0 }
  );

  const groupedByDay = useMemo(() => {
    const map = new Map();
    filteredRentals.forEach((r) => {
      const revenue = r.items.reduce((s, it) => s + it.pricePerDay * it.qty * r.billingMultiplier, 0);
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
        existing.totalAmount += item.pricePerDay * item.qty * r.billingMultiplier;
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
      "Буюртма ID",
      "Сана",
      "Мижоз",
      "Кун",
      "Жами (ижара)",
      "Буюртма Ҳолати",
      "Маҳсулот Номи",
      "Маҳсулот Ўлчами",
      "Жами Сони",
      "Қайтарилган Сони",
      "Фаол Сони",
      "Нарx/кун",
      "Item Жами",
    ].join(delimiter);
    const body = filteredRentals
      .flatMap((r) => {
        const rentalTotal = r.items.reduce((s, it) => s + it.pricePerDay * it.qty * r.billingMultiplier, 0);
        return r.items.map((item) =>
          [
            r.id,
            `"${r.date}"`,
            `"${nameById(r.customerId)}"`,
            r.billingMultiplier.toFixed(2),
            rentalTotal.toFixed(2),
            `"${getOrderStatusText(r.status || 'PENDING')}"`,
            `"${item.productName}"`,
            `"${item.productSize}"`,
            item.qty,
            item.returnedQty,
            item.activeQty,
            item.pricePerDay.toFixed(2),
            (item.pricePerDay * item.qty * r.billingMultiplier).toFixed(2),
          ].join(delimiter)
        );
      })
      .join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ҳисобот_${year || "ҳаммаси"}-${month || "ҳаммаси"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openOrderDetail = (order) => setOrderDetail(order);
  const closeOrderDetail = () => setOrderDetail(null);

  const getReturnStatusText = (item) => {
    if (item.isFullyReturned) return "✓ Тўлиқ қайтарилди";
    if (item.isPartiallyReturned) return `↻ ${item.returnedQty}/${item.qty} қайтарилди`;
    return "Фаол";
  };

  const getReturnStatusColor = (item) => {
    if (item.isFullyReturned) return "#28a745";
    if (item.isPartiallyReturned) return "#ffc107";
    return "#17a2b8";
  };

  const getOrderStatusText = (status) => {
    if (!status) return "Номаълум";
    switch (status) {
      case "RETURNED": return "Тўлиқ қайтарилди";
      case "PARTIALLY_RETURNED": return "Қисман қайтарилди";
      case "DELIVERED": return "Етказилди";
      case "PENDING": return "Кутилмоқда";
      default: return "Номаълум";
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
        const mapped = (data.orders || []).map((o) => ({
          id: o.id,
          customerId: o.clientId,
          items: (o.items || []).map((i) => ({
            itemId: i.productId,
            qty: i.quantity, // Жами сон
            activeQty: i.quantity - i.returned, // Фаол сон
            returnedQty: i.returned, // Қайтарилган сон
            pricePerDay: i.product.price,
            orderItemId: i.id,
            returned: i.returned,
            name: i.product.name,
            size: i.product.size,
            isFullyReturned: i.returned === i.quantity,
            isPartiallyReturned: i.returned > 0 && i.returned < i.quantity,
          })),
          createdAt: o.createdAt,
          fromDate: o.fromDate,
          toDate: o.toDate,
          billingMultiplier: o.billingMultiplier || 1,
          rentalDays: o.rentalDays || 0,
          rentalHours: o.rentalHours || 0,
          subtotal: o.subtotal,
          tax: o.tax,
          total: o.total,
          paidAt: o.createdAt,
          returnedAt: o.returnedAt,
          status: o.status,
        }));
        setRentals(mapped);
      }
    } catch (e) {
      console.error("Refresh orders error", e);
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm("Буюртмани ўчиришни тасдиқланг")) return;
    try {
      const res = await fetch(`http://localhost:3000/orders/${id}`, { method:'DELETE', headers:{ Authorization: `Bearer ${token}` } });
      if (res.ok) {
        await refreshOrders();
        closeOrderDetail();
      } else {
        const e = await res.json();
      }
    } catch (e) {
      alert("Тармоқ хатолиги");
    }
  };

  const printOrder = async (order) => {
    const customer = safeCustomers.find(c => c.id === order.customerId) || {};
    const itemsForReceipt = (order.items || []).map(it => ({
      name: it.productName,
      size: it.productSize,
      qty: it.activeQty || it.qty || 0,
      pricePerDay: it.pricePerDay || 0,
      weight: 0,
    }));
    const subtotal = itemsForReceipt.reduce((s, it) => s + (Number(it.pricePerDay) || 0) * (Number(it.qty) || 0), 0);
    await openPrintReceipt({
      settings: {},
      customer: { name: nameById(order.customerId), phone: customer.phone },
      items: itemsForReceipt,
      fromDate: order.fromDate || order.paidAt,
      toDate: order.returnedAt || new Date().toISOString(),
      days: order.days || 1,
      subtotal,
      tax: 0,
      total: subtotal,
      totalWeight: 0,
      orderId: order.id,
    });
  };

  return (
    <div className="gap">
      <div className="card gap" style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.06)', borderRadius: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Ҳисоботлар</h2>
          <div className="row" style={{ gap: "12px", alignItems: "center", flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: "140px", fontSize: "14px" }}
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
              style={{ width: "140px", fontSize: "14px" }}
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
              {showSummary ? "Деталлар" : "Ҳисобот"}
            </button>
            <button
              className="btn"
              onClick={exportCSV}
              style={{ background: "#28a745", color: "white" }}
            >
              📊 Excel юклаб олиш
            </button>
            <button
              className="btn"
              onClick={() => {
                const delimiter = ',';
                const header = [
                  "Маҳсулот Номи",
                  "Ўлчам",
                  "Жами сон",
                  "Қайтарилган",
                  "Фаол",
                  "Жами сумма"
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
                a.download = `маҳсулотлар_ҳисобот_${year || "ҳаммаси"}-${month || "ҳаммаси"}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{ background: "#17a2b8", color: "white" }}
            >
              📊 Маҳсулотлар Excel
            </button>
          </div>
        </div>
        
        {showSummary ? (
          <div className="gap">
            <div className="row" style={{ gap: "24px", flexWrap: "wrap" }}>
              <div className="card" style={{ flex: 1, minWidth: "220px", boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <h3>Умумий маълумот</h3>
                <div style={{ lineHeight: 1.9 }}>Буюртмалар сони: <b>{filteredRentals.length}</b></div>
                <div style={{ lineHeight: 1.9 }}>Жами сумма: <b>{fmt(totals.subtotal)}</b></div>
                <div style={{ lineHeight: 1.9 }}>Фаол буюртмалар: <b>{filteredRentals.filter(r => (r.status || 'PENDING') !== "RETURNED").length}</b></div>
                <div style={{ lineHeight: 1.9 }}>Тўлиқ қайтарилган: <b>{filteredRentals.filter(r => (r.status || 'PENDING') === "RETURNED").length}</b></div>
                <div style={{ lineHeight: 1.9 }}>Қисман қайтарилган: <b>{filteredRentals.filter(r => (r.status || 'PENDING') === "PARTIALLY_RETURNED").length}</b></div>
              </div>
              
              <div className="card" style={{ flex: 1, minWidth: "220px", boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h3>Кунлик даромад</h3>
                  <button
                    className="btn"
                    onClick={() => {
                      const delimiter = ',';
                      const header = [
                        "Сана",
                        "Даромад"
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
                      a.download = `кунлик_даромад_${year || "ҳаммаси"}-${month || "ҳаммаси"}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ background: "#6f42c1", color: "white", fontSize: "10px", padding: "2px 6px" }}
                  >
                    📊 Кунлик Excel
                  </button>
                </div>
                <div style={{ maxHeight: 220, overflow: 'auto' }}>
                  {groupedByDay.slice(-14).map((day) => (
                    <div key={day.date}>
                      {day.date}: <b>{fmt(day.total)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="card gap">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3>Маҳсулотлар бўйича</h3>
                <button
                  className="btn"
                  onClick={() => {
                    const delimiter = ',';
                    const header = [
                      "Маҳсулот Номи",
                      "Ўлчам",
                      "Жами сон",
                      "Қайтарилган",
                      "Фаол",
                      "Жами сумма"
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
                    a.download = `маҳсулотлар_ҳисобот_${year || "ҳаммаси"}-${month || "ҳаммаси"}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ background: "#17a2b8", color: "white", fontSize: "12px", padding: "4px 8px" }}
                >
                  📊 Маҳсулотлар Excel
                </button>
              </div>
              <div className="table-wrap" style={{ maxHeight: 420, overflow: 'auto', borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Маҳсулот</th>
                      <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Ўлчам</th>
                      <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Жами сон</th>
                      <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Қайтарилган</th>
                      <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Фаол</th>
                      <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Жами сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSummary.map((item, idx) => (
                      <tr key={`${item.productId}_${item.productSize}`} style={{ background: idx % 2 ? '#fafafa' : '#fff' }} >
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
          <div className="table-wrap" style={{ maxHeight: 520, overflow: 'auto', borderRadius: 8 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>ID</th>
                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Сана</th>
                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Мижоз</th>

                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Кунлар</th>
                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Жами</th>
                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Ҳолат</th>
                  <th style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>Амалар</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.map((r, idx) => (
                  <tr 
                    key={r.id}  
                    className="hover:bg-black hover:text-white"
                    style={{
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "black";
                      e.currentTarget.style.color = "white";
                      // Make button text black when row is hovered
                      const buttons = e.currentTarget.querySelectorAll('button');
                      buttons.forEach(btn => {
                        btn.style.color = "black";
                        btn.style.backgroundColor = "white";
                      });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "";
                      e.currentTarget.style.color = "";
                      // Reset button styles
                      const buttons = e.currentTarget.querySelectorAll('button');
                      buttons.forEach(btn => {
                        btn.style.color = "";
                        btn.style.backgroundColor = "";
                      });
                    }}
                  >
                    <td className="text-2xl">{r.id}</td>
                    <td className="text-2xl">{r.date}</td>
                    <td className="text-2xl">{nameById(r.customerId)}</td>
                    <td className="text-2xl">{r.billingMultiplier.toFixed(1)} кун</td>
                    <td className="text-2xl">{fmt(r.items.reduce((s, it) => s + it.pricePerDay * it.qty * r.billingMultiplier, 0))}</td>
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
                        Кўриш
                      </button>
                      <button 
                        className="btn"
                        onClick={() => printOrder(r)}
                        style={{ fontSize: "12px", padding: "4px 8px", marginLeft: 8 }}
                      >
                        🖨️ Print
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
              <h3>Буюртма #{orderDetail.id} - тўлиқ маълумот</h3>
              <button className="modal-close" onClick={closeOrderDetail}>✕</button>
            </div>
            <div className="modal-body gap">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: "16px" }}>
                <div><b>Олинган сана:</b> {orderDetail.fromDate ? new Date(orderDetail.fromDate).toLocaleString('uz-UZ') : new Date(orderDetail.date).toLocaleString('uz-UZ')}</div>
                <div><b>Қайтарилган сана:</b> {orderDetail.returnedAt ? new Date(orderDetail.returnedAt).toLocaleString('uz-UZ') : '-'}</div>
                <div><b>Мижоз:</b> {nameById(orderDetail.customerId)}</div>
                <div><b>Ижара муддати:</b> {orderDetail.billingMultiplier.toFixed(1)} кун</div>
                <div><b>Ҳолат:</b> 
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
              <div className="table-wrap" style={{ maxHeight: 420, overflow: 'auto', borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Маҳсулот</th>
                      <th>Ўлчам</th>
                      <th>Жами Сони</th>
                      <th>Фаол Сони</th>
                      <th>Қайтарилган</th>
                      <th>Нарx/кун</th>
                      <th>Жами</th>
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
                        <td>{it.qty} дона</td>
                        <td style={{ color: it.activeQty > 0 ? "#28a745" : "#666" }}>
                          {it.activeQty} дона
                        </td>
                        <td style={{ color: it.returnedQty > 0 ? "#ffc107" : "#666" }}>
                          {it.returnedQty} дона
                        </td>
                        <td>{fmt(it.pricePerDay)}</td>
                        <td>{fmt(it.pricePerDay * it.qty * orderDetail.billingMultiplier)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Жами маҳсулотлар: {orderDetail.items.length} | 
                  Фаол маҳсулотлар: {orderDetail.items.filter(it => it.activeQty > 0).length} | 
                  Қайтарилган маҳсулотлар: {orderDetail.items.filter(it => it.returnedQty > 0).length}
                </div>
                <div className="total">
                  Умумий: {fmt(orderDetail.items.reduce((s, it) => s + it.pricePerDay * it.qty * orderDetail.billingMultiplier, 0))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => deleteOrder(orderDetail.id)} style={{ background:'#ef4444', color:'#fff', marginRight:'auto' }}>Буюртмани ўчириш</button>
              <button className="btn" onClick={closeOrderDetail}>Ёпиш</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}