
import React from "react";
import { fmt } from "../utils/helpers";

export async function openPrintReceipt({ settings, customer, items, fromDate, toDate, days, subtotal, tax, total, totalWeight, preOpenedWindow, companyPhone: providedPhone, orderId }) {
  const safeSettings = settings || {};
  let companyPhone = localStorage.getItem('companyPhone') || providedPhone || safeSettings.orgPhone || "";
  
  const safeCustomer = customer || {};
  const safeItems = Array.isArray(items) ? items : [];
  const safeSubtotal = Number(subtotal) || 0;
  const safeTotal = Number(total) || 0;
  const safeTotalWeight = Number(totalWeight) || 0;
  const safeOrderId = orderId || "";
  const billingMultiplier = Number(days) || 1;

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
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).replace(/\./g, ' ');
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Hozirgi haqiqiy soatni olish (O'zbekiston soati bilan)
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Чек - ${safeOrderId}</title>
        <meta charset="UTF-8" />
        <style>
          body { 
            font-family: Arial, sans-serif; 
            font-size: 16px; 
            background: white;
            color: #000;
            font-weight: bold;
          }
          .header {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 12px; 
            font-size: 16px;
            text-align: left;
            vertical-align: top;
            font-weight: bold;
          }
          th { 
            background: #f0f0f0; 
            font-weight: bold;
            text-align: center;
            font-size: 18px;
          }
          .number-cell {
            text-align: center;
          }
          .price-cell {
            text-align: right;
          }
          .total-cell {
            text-align: right;
            font-weight: bold;
          }
          .summary-row {
            background: #f8f8f8;
            font-weight: bold;
            font-size: 18px;
          }
          .customer-row {
            background: #e8f4f8;
            font-weight: bold;
            font-size: 18px;
          }
          @page { 
            margin: 10mm; 
            size: A4;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          Корейский Опалубка Тел: ${companyPhone || ""}
        </div>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Махсулот номи</th>
              <th>Олчам</th>
              <th>Сони</th>
              <th>Суммаси</th>
              <th>Оғирлиги</th>
              <th>Берилган сана</th>
              <th>Берилган вақт</th>
            </tr>
          </thead>
          <tbody>
            ${safeItems.map((item, index) => `
              <tr>
                <td class="number-cell">${safeOrderId || ""}</td>
                <td>${item?.name ?? ""}</td>
                <td>${item?.size || item?.sku || ""}</td>
                <td class="number-cell">${Number(item?.qty) || 0}</td>
                <td class="price-cell">${fmt((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0) * billingMultiplier)}</td>
                <td class="number-cell">${(item?.weight || 0) * (Number(item?.qty) || 0)} кг</td>
                <td>${formatDate(fromDate)}</td>
                <td>${getCurrentTime()}</td>
              </tr>
            `).join('')}
            <tr class="summary-row">
              <td><strong>ЖАМИ:</strong></td>
              <td></td>
              <td></td>
              <td class="number-cell"><strong>${safeItems.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0)}</strong></td>
              <td class="total-cell"><strong>${fmt(safeItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0) * billingMultiplier), 0))}</strong></td>
              <td class="number-cell"><strong>${safeTotalWeight.toFixed(2)} кг</strong></td>
              <td></td>
              <td></td>
            </tr>
            <tr class="summary-row">
              <td colspan="8" style="text-align:left;">
                <strong>Вақт:</strong> ${formatTimeDisplay(elapsedHours)}
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="customer-row">
          <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border: 1px solid #000; text-align: center;">
            <div style="margin-bottom: 10px;"><strong>Мижоз исми ва фамилияси: ${safeCustomer.name || ""}</strong></div>
            <div><strong>Телефон рақами: ${safeCustomer.phone || ""}</strong></div>
          </div>
        </div>
        
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
