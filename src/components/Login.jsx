import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!login || !password) {
      setError("Логин ва паролни киритинг");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.message || "Киришда хатолик");
      }
      
      const token = data.access_token || data.token || data.accessToken;
      const phone =data.user?.phone
      localStorage.setItem('companyPhone', phone || "");
      if (!token) {
        throw new Error("Токен топилмади");
      }
      
      // Store only token and userId
      try {
        localStorage.setItem('token', token);
        if (data.user && data.user.id) {
          localStorage.setItem('userId', String(data.user.id));
        }
      } catch {}
      
      onLogin(token);
    } catch (err) {
      setError(err.message || "Хатолик юз берди");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <form onSubmit={handleSubmit} className="card gap" style={{ width: '100%', maxWidth: 420 }}>
        <img src="src\components\logo1.png" alt="logo" style={{width:'100px', height:'100px',borderRadius:'50%',margin:'0 auto' } } />
        <h2 style={{textAlign:'center'}}>Кириш</h2>

        {error && (
          <div className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>
        )}
        <div>
          <label>Логин</label>
          <input
            type="text"
            className="input"
            placeholder="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </div>
        <div>
          <label>Парол</label>
          <input
            type="password"
            className="input"
            placeholder="Парол"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Кирилмоқда..." : "Кириш"}
        </button>
      </form>
    </div>
  );
}


