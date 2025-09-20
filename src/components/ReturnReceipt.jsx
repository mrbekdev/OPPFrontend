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
  const safeAdvancePayment = Number(rental?.advancePayment) || 0;

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

  const rentalDate = formatDate(rental?.paidAt);
  const rentalTime = formatTime(rental?.paidAt);
  const returnDate = formatDate(new Date());
  const returnTime = formatTime(new Date());

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Қайтариш чеки - ${rental?.id || ""}</title>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; font-size: 16px; background: #fff; color: #000; margin: 0; padding: 10px; font-weight: bold; }
          .header { text-align: center; font-size: 12px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 0; }
          th, td { border: 1px solid #000;  font-size: 16px; text-align: left; vertical-align: top; font-weight: bold; }
          th { background: none; text-align: center; font-size: 16px; font-weight: bold; }
          .number-cell { text-align: center; }
          .price-cell { text-align: right; }
          .total-cell { text-align: right; font-weight: bold; }
          .summary-row { background: none; font-weight: bold; font-size: 16px; }
          .customer-row { background: none; font-weight: bold; font-size: 16px; }
          .section-title { font-size: 16px; font-weight: bold; margin: 0; text-align: left; }
          @page { margin: 0; size: A4; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">Корейский Опалубка Тел: ${companyPhone || ""}</div>

        ${safeReturnedItems.length > 0 ? `
          <div class="section-title">ҚАЙТАРИЛДИ</div>
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
                <th>Берилган сана</th>
              </tr>
            </thead>
            <tbody>
              ${safeReturnedItems.map((item, index) => `
                <tr>
                  <td class="number-cell">${rental?.id || ""}</td>
                  <td class="number-cell">${safeCustomer.phone || ""}</td>
                  <td>${item?.name || ""}</td>
                  <td>${item?.size || item?.sku || ""}</td>
                  <td class="number-cell">${Number(item?.returnQty) || 0}</td>
                  <td class="price-cell">${fmt((Number(item?.pricePerDay) || 0) * (Number(item?.returnQty) || 0))}</td>
                  <td class="number-cell">${(item?.weight || 0) * (Number(item?.returnQty) || 0)} кг</td>
                  <td>${rentalDate}</td>
                </tr>
              `).join('')}
              <tr class="summary-row">
                <td>ЖАМИ (1 кун):</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="number-cell">${safeReturnedItems.reduce((sum, item) => sum + (Number(item?.returnQty) || 0), 0)}</td>
                <td class="total-cell">${fmt(safeReturnedItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.returnQty) || 0)), 0))}</td>
                <td class="number-cell">${safeReturnedItems.reduce((sum, item) => sum + ((item?.weight || 0) * (Number(item?.returnQty) || 0)), 0).toFixed(2)} кг</td>
                <td></td>
              </tr>
              <tr class="summary-row">
                <td colspan="8">Вақт: ${formatTimeDisplay(safeHours)} (Қайтарилган вақт: ${returnDate} ${returnTime})</td>
              </tr>
              <tr class="summary-row">
                <td colspan="8" style="position: relative; border-top: 2px solid #000;">
                  <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span>АВАНС: ${safeAdvancePayment > 0 ? fmt(safeAdvancePayment) : '000 000'}</span>
                    <span>ЖАМИ (соатгача): ${fmt(safeReturnedItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.returnQty) || 0) * billingMultiplier), 0))} (${returnTime})</span>
                  </div>
                </td>
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
                <th>Клиент тел</th>
                <th>Махсулот номи</th>
                <th>Олчам</th>
                <th>Сони</th>
                <th>Суммаси</th>
                <th>Оғирлиги</th>
                <th>Берилган сана</th>
              </tr>
            </thead>
            <tbody>
              ${safeRemainingItems.map((item, index) => `
                <tr>
                  <td class="number-cell">${rental?.id || ""}</td>
                  <td class="number-cell">${safeCustomer.phone || ""}</td>
                  <td>${item?.name || ""}</td>
                  <td>${item?.size || item?.sku || ""}</td>
                  <td class="number-cell">${Number(item?.qty) || 0}</td>
                  <td class="price-cell">${fmt((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0))}</td>
                  <td class="number-cell">${(item?.weight || 0) * (Number(item?.qty) || 0)} кг</td>
                  <td>${rentalDate}</td>
                </tr>
              `).join('')}
              <tr class="summary-row">
                <td>ЖАМИ</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="number-cell">${safeRemainingItems.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0)}</td>
                <td class="total-cell">${fmt(safeRemainingItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0)), 0))}</td>
                <td class="number-cell">${safeRemainingItems.reduce((sum, item) => sum + ((item?.weight || 0) * (Number(item?.qty) || 0)), 0).toFixed(2)} кг</td>
                <td></td>
              </tr>
              <tr class="summary-row">
                <td colspan="8">Вақт: ${formatTimeDisplay(safeHours)} (Қайтарилган вақт: ${returnDate} ${returnTime})</td>
              </tr>
              <tr class="summary-row">
                <td colspan="8" style="position: relative; border-top: 2px solid #000;">
                  <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span>АВАНС: ${safeAdvancePayment > 0 ? fmt(safeAdvancePayment) : '000 000'}</span>
                    <span>ЖАМИ (соатгача): ${fmt(safeRemainingItems.reduce((sum, item) => sum + ((Number(item?.pricePerDay) || 0) * (Number(item?.qty) || 0) * billingMultiplier), 0))} (${returnTime})</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <table>
          <tbody>
            <tr class="customer-row">
              <td colspan="7" style="text-align:left;">Мижоз исми ва фамилияси: ${safeCustomer.name || ""}</td>
            </tr>
            <tr class="customer-row">
              <td colspan="7" style="text-align:left;">Телефон рақами: ${safeCustomer.phone || ""}</td>
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