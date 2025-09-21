
import React from "react";
import { fmt, formatUzbekistanDate, formatUzbekistanTime } from "../utils/helpers";

export async function openPrintReceipt({ settings, customer, items, fromDate, toDate, days, subtotal, tax, total, totalWeight, preOpenedWindow, companyPhone: providedPhone, orderId, advancePayment, startDateTime }) {
  const safeSettings = settings || {};
  let companyPhone = localStorage.getItem('companyPhone') || providedPhone || safeSettings.orgPhone || "";
  
  const safeCustomer = customer || {};
  const safeItems = Array.isArray(items) ? items : [];
  const safeSubtotal = Number(subtotal) || 0;
  const safeTotal = Number(total) || 0;
  const safeTotalWeight = Number(totalWeight) || 0;
  const safeOrderId = orderId || "";
  const billingMultiplier = Number(days) || 1;
  const safeAdvancePayment = Number(advancePayment) || 0;
  const safeStartDateTime = startDateTime;

  // Hisoblangan vaqt (kun/soat)
  const startDate = fromDate ? new Date(fromDate) : null;
  const endDate = toDate ? new Date(toDate) : new Date();
  let elapsedHours = 0;
  if (startDate) {
    const ms = Math.max(0, endDate - startDate);
    elapsedHours = Math.ceil(ms / (1000 * 60 * 60));
  }

  // Sana va vaqtni formatlash
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return formatUzbekistanDate(dateString);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return formatUzbekistanTime(dateString);
  };

  const formatTimeDisplay = (hours) => {
    if (hours <= 0) return "1 кун";
    if (hours <= 24) {
      return "1 кун";
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

  // Start time ni olish (O'zbekiston soati bilan)
  const getStartTime = () => {
    if (safeStartDateTime) {
      return formatUzbekistanTime(safeStartDateTime);
    }
    if (fromDate) {
      return formatUzbekistanTime(fromDate);
    }
    return formatUzbekistanTime(new Date());
  };

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Чек - ${safeOrderId}</title>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; font-size: 16px; background: #fff; color: #000; margin: 0; padding: 20px; font-weight: bold; }
          .header { text-align: center; font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 0; }
          th, td { border: 1px solid #000;  font-size: 12px; text-align: left; vertical-align: top; font-weight: bold; }
          th { background: none; text-align: center; font-size: 16px; font-weight: bold; }
          .number-cell { text-align: center; }
          .price-cell { text-align: right; }
          .total-cell { text-align: right; font-weight: bold; }
          .summary-row { background: none; font-weight: bold; font-size: 16px; }
          .customer-row { background: none; font-weight: bold; font-size: 16px; }
          @page { margin: 0; size: A4; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">Корейский Опалубка Тел: ${companyPhone || ""}</div>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Клиент тел</th>
              <th>Махсулот номи</th>
              <th>Олчам</th>
              <th>Сони</th>
              <th>Суммаси</th>
              <th>Оғирлиги</th>
              <th>Сана вақт</th>
            </tr>
          </thead>
          <tbody>
            ${safeItems.map((item, index) => `
              <tr>
                <td class="number-cell">${safeOrderId || ""}</td>
                <td class="number-cell">${safeCustomer.phone || ""}</td>
                <td>${item?.name ?? ""}</td>
                <td>${item?.size || item?.sku || ""}</td>
                <td class="number-cell">${Number(item?.qty) || 0}</td>
                <td class="price-cell">${fmt((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0))}</td>
                <td class="number-cell">${(item?.weight || 0) * (Number(item?.qty) || 0)} кг</td>
                <td>${formatDate(safeStartDateTime || fromDate)} ${getStartTime()}</td>
              </tr>
            `).join('')}
            ${safeAdvancePayment > 0 ? `
    
            ` : ''}
            <tr class="summary-row">

            </tr>
            <tr class="summary-row">
              <td>ЖАМИ</td>
              <td></td>
              <td></td>
              <td></td>
              <td class="number-cell">${safeItems.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0)}</td>
              <td class="total-cell">${fmt(safeItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0)), 0))}</td>
              <td class="number-cell">${safeTotalWeight.toFixed(2)} кг</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="summary-row">
              <td colspan="9" style="position: relative; border-top: 2px solid #000;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                  <span>АВАНС: ${safeAdvancePayment > 0 ? fmt(safeAdvancePayment) : '000 000'}</span>
                  <span>ЖАМИ (соатгача): ${fmt(safeItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0) * billingMultiplier), 0))}</span>
                </div>
              </td>
            </tr>
            <tr class="customer-row">
              <td colspan="9" style="text-align:left;">Мижоз исми ва фамилияси: ${safeCustomer.name || ""}</td>
            </tr>
            <tr class="customer-row">
              <td colspan="9" style="text-align:left;">Телефон рақами: ${safeCustomer.phone || ""}</td>
            </tr>
          </tbody>
        </table>
        
        <script>
          window.addEventListener('load', function() {
            setTimeout(() => { window.print(); setTimeout(() => window.close(), 300); }, 100);
          });
        </script>
      </body>
    </html>`;

  const w = preOpenedWindow && !preOpenedWindow.closed ? preOpenedWindow : window.open('', '_blank');
  if (!w) return;
  try {
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.postMessage({ type: 'RENDER_RECEIPT', html }, '*');
    } else {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  } catch (e) {
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch {}
  }
}
