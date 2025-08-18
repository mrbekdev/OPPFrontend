// Receipt printing helper (new window)
import { fmt } from "../utils/helpers";

export function openPrintReceipt({ settings, customer, items, fromDate, toDate, days, subtotal, tax, total }) {
  const rows = items.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.qty}</td>
      <td>${fmt(r.pricePerDay)}</td>
      <td>${fmt(r.pricePerDay * r.qty * days)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><title>Chek</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:16px; font-size:14px}
    h2{margin:0 0 6px 0; text-align:center}
    table{width:100%; border-collapse:collapse}
    th,td{padding:6px; border-bottom:1px solid #e5e7eb; text-align:left}
    .right{ text-align:right }
  </style>
  </head><body>
    <h2>${settings.orgName}</h2>
    <div style="text-align:center">Tel: ${settings.orgPhone} | ${settings.orgAddress}</div>
    <hr/>
    <div><b>Mijoz:</b> ${customer?.name || ""} (${customer?.phone || ""})</div>
    <div><b>Muddat:</b> ${fromDate} → ${toDate} (${days} kun)</div>
    <table style="margin-top:8px">
      <thead><tr><th>Nom</th><th>Soni</th><th>Kunlik</th><th>Jami</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:8px">
      <div>Oraliq: <b>${fmt(subtotal)}</b></div>
      <div>Soliq: <b>${fmt(tax)}</b></div>
      <div style="font-size:18px">Umumiy: <b>${fmt(total)}</b></div>
    </div>
    <div style="text-align:center; margin-top:12px">Rahmat! — ${new Date().toLocaleString()}</div>
  </body></html>`;

  const w = window.open("", "_blank", "width=600,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}
