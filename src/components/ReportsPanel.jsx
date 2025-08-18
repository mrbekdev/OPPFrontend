import React, { useMemo, useState } from "react";
import { fmt } from "../utils/helpers";

export default function ReportsPanel({ rentals }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const rows = rentals
    .filter(r => (dateFrom ? r.paidAt.slice(0,10) >= dateFrom : true))
    .filter(r => (dateTo ? r.paidAt.slice(0,10) <= dateTo : true))
    .map(r => ({ id:r.id, date:r.paidAt.slice(0,10), days:r.days, subtotal:r.subtotal, tax:r.tax, total:r.total, returned:!!r.returnedAt }));

  const totals = rows.reduce((a, r) => { a.subtotal+=r.subtotal; a.tax+=r.tax; a.total+=r.total; return a; }, {subtotal:0, tax:0, total:0});

  const groupedByDay = useMemo(() => {
    const map = new Map();
    rows.forEach(r => map.set(r.date, (map.get(r.date)||0) + r.total));
    return Array.from(map.entries()).map(([date,total]) => ({date,total})).sort((a,b)=>a.date.localeCompare(b.date));
  }, [rows]);

  const exportCSV = () => {
    const header = ["ID","Sana","Kun","Oraliq","Soliq","Jami","Qaytarilgan"].join(",");
    const body = rows.map(r => [r.id, r.date, r.days, r.subtotal, r.tax, r.total, r.returned ? "ha":"yo'q"].join(",")).join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hisobot_${dateFrom||"bosh"}-${dateTo||"bugun"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gap">
      <div className="card gap">
        <h2>Hisobotlar</h2>
        <div className="row" style={{flexWrap:'wrap'}}>
          <div>
            <label>Dan</label>
            <input type="date" className="input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div>
            <label>Gacha</label>
            <input type="date" className="input" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
          <button className="btn primary" onClick={exportCSV}>CSV yuklab olish</button>
          <div className="text-lg">Jami: <b>{fmt(totals.total)}</b> (Soliq: <b>{fmt(totals.tax)}</b>)</div>
        </div>
      </div>

      <div className="card">
        <h2>Ijara ro'yxati</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sana</th><th>ID</th><th>Kun</th><th>Oraliq</th><th>Soliq</th><th>Jami</th><th>Holat</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td className="mono">{r.id}</td>
                  <td>{r.days}</td>
                  <td>{fmt(r.subtotal)}</td>
                  <td>{fmt(r.tax)}</td>
                  <td>{fmt(r.total)}</td>
                  <td>{r.returned ? "Qaytarilgan" : "Faol"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{marginTop:'12px'}}>
          <h3 style={{margin:'0 0 6px 0'}}>Kunlik daromad</h3>
          <div className="gap">
            {groupedByDay.map(g => (
              <div key={g.date} className="row" style={{justifyContent:'space-between', background:'#f1f5f9', padding:'8px 12px', borderRadius:'12px'}}>
                <div><b>{g.date}</b></div>
                <div>{fmt(g.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
