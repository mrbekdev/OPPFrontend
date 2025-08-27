
import React from "react";
import { fmt } from "../utils/helpers";

export async function openReturnReceipt({ 
  settings, 
  customer, 
  rental,
  returnedItems, 
  remainingItems, 
  returnAmount, 
  originalAmount, 
  days,
  hours,
  companyPhone: providedPhone 
}) {
  const safeSettings = settings || {};
  let companyPhone = localStorage.getItem('companyPhone') || providedPhone || safeSettings.orgPhone || "";
  
  const safeCustomer = customer || {};
  const safeReturnedItems = Array.isArray(returnedItems) ? returnedItems : [];
  const safeRemainingItems = Array.isArray(remainingItems) ? remainingItems : [];
  const safeReturnAmount = Number(returnAmount) || 0;
  const safeOriginalAmount = Number(originalAmount) || 0;
  const safeHours = Number(hours) || 0;
  const billingMultiplier = Number(days) || 1;

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

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Қайтариш чеки - ${rental?.id || ""}</title>
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
            margin-bottom: 20px;
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
          .section-title {
            font-size: 20px;
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 10px;
            text-align: center;
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

        ${safeReturnedItems.length > 0 ? `
          <div class="section-title">ҚАЙТАРИЛДИ</div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Махсулот номи</th>
                <th>Олчам</th>
                <th>Сони</th>
                <th>Суммаси</th>
                <th>Оғирлиги</th>
                <th>Қайтарилган сана</th>
                <th>Қайтарилган вақт</th>
              </tr>
            </thead>
            <tbody>
              ${safeReturnedItems.map((item, index) => `
                <tr>
                  <td class="number-cell">${rental?.id || ""}</td>
                  <td>${item?.name || ""}</td>
                  <td>${item?.size || item?.sku || ""}</td>
                  <td class="number-cell">${Number(item?.returnQty) || 0}</td>
                  <td class="price-cell">${fmt((Number(item?.pricePerDay) || 0) * (Number(item?.returnQty) || 0) * billingMultiplier)}</td>
                  <td class="number-cell">${(item?.weight || 0) * (Number(item?.returnQty) || 0)} кг</td>
                  <td>${formatDate(new Date())}</td>
                  <td>${formatTime(new Date())}</td>
                </tr>
              `).join('')}
              <tr class="summary-row">
                <td><strong>ЖАМИ:</strong></td>
                <td></td>
                <td></td>
                <td class="number-cell"><strong>${safeReturnedItems.reduce((sum, item) => sum + (Number(item?.returnQty) || 0), 0)}</strong></td>
                <td class="total-cell"><strong>${fmt(safeReturnedItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.returnQty) || 0) * billingMultiplier), 0))}</strong></td>
                <td class="number-cell"><strong>${safeReturnedItems.reduce((sum, item) => sum + ((item?.weight || 0) * (Number(item?.returnQty) || 0)), 0).toFixed(2)} кг</strong></td>
                <td></td>
                <td></td>
              </tr>
              <tr class="summary-row">
                <td colspan="8"><strong>Вақт:</strong> ${formatTimeDisplay(safeHours)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${safeRemainingItems.length > 0 ? `
          <div class="section-title">ҚОЛГАН ТОВАРЛАР</div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Махсулот номи</th>
                <th>Олчам</th>
                <th>Сони</th>
                <th>Суммаси</th>
                <th>Оғирлиги</th>
                <th>Қайтарилган сана</th>
                <th>Қайтарилган вақт</th>
              </tr>
            </thead>
            <tbody>
              ${safeRemainingItems.map((item, index) => `
                <tr>
                  <td class="number-cell">${rental?.id || ""}</td>
                  <td>${item?.name || ""}</td>
                  <td>${item?.size || item?.sku || ""}</td>
                  <td class="number-cell">${Number(item?.qty) || 0}</td>
                  <td class="price-cell">${fmt((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0) * billingMultiplier)}</td>
                  <td class="number-cell">${(item?.weight || 0) * (Number(item?.qty) || 0)} кг</td>
                  <td>${formatDate(new Date())}</td>
                  <td>${formatTime(new Date())}</td>
                </tr>
              `).join('')}
              <tr class="summary-row">
                <td><strong>ЖАМИ:</strong></td>
                <td></td>
                <td></td>
                <td class="number-cell"><strong>${safeRemainingItems.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0)}</strong></td>
                <td class="total-cell"><strong>${fmt(safeRemainingItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0) * billingMultiplier), 0))}</strong></td>
                <td class="number-cell"><strong>${safeRemainingItems.reduce((sum, item) => sum + ((item?.weight || 0) * (Number(item?.qty) || 0)), 0).toFixed(2)} кг</strong></td>
                <td></td>
                <td></td>
              </tr>
              <tr class="summary-row">
                <td colspan="8"><strong>Вақт:</strong> ${formatTimeDisplay(safeHours)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

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

  const w = window.open('', '_blank');
  if (!w) return;
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (e) {
    console.error('Чек чиқаришда хато:', e);
  }
}
