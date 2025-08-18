import React from "react";

export default function SettingsPanel({ settings, setSettings }) {
  return (
    <div className="card gap">
      <h2>Sozlamalar</h2>
      <div className="row" style={{flexWrap:'wrap'}}>
        <div>
          <label>Tashkilot nomi</label>
          <input className="input" value={settings.orgName} onChange={e=>setSettings({...settings, orgName:e.target.value})} />
        </div>
        <div>
          <label>Telefon</label>
          <input className="input" value={settings.orgPhone} onChange={e=>setSettings({...settings, orgPhone:e.target.value})} />
        </div>
        <div>
          <label>Manzil</label>
          <input className="input" value={settings.orgAddress} onChange={e=>setSettings({...settings, orgAddress:e.target.value})} />
        </div>
        <div>
          <label>Soliq % (QQS)</label>
          <input type="number" className="input" value={settings.taxPercent} onChange={e=>setSettings({...settings, taxPercent:Number(e.target.value)})} />
        </div>
      </div>
      <div style={{color:'#6b7280'}}>Eslatma: Ma'lumotlar brauzer localStorage'ida saqlanadi.</div>
    </div>
  );
}
