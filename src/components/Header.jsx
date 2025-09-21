import React, { useState, useEffect, useRef } from "react";
import { getUser } from "../utils/storage.js";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { TbArrowBackUp } from "react-icons/tb";
import { PiPackageLight } from "react-icons/pi";
import { HiOutlineUsers } from "react-icons/hi";
import { HiOutlineChartBar } from "react-icons/hi";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";

export default function Header({ orgName, active, onTab, onLogout }) {
  const [user, setUser] = useState(null);
  const prevUserIdRef = useRef(null);

  const tabs = [
    ["rent", "Ижара бериш", HiOutlineDocumentText, "#007bff"],
    ["return", "Қайтариш", TbArrowBackUp, "#28a745"],
    ["returns", "Қайтарилганлар", HiOutlineClipboardDocumentList, "#dc3545"],
    ["inventory", "Товарлар", PiPackageLight, "#ffc107"],
    ["customers", "Мижозлар", HiOutlineUsers, "#17a2b8"],
    ["reports", "Ҳисоботлар", HiOutlineChartBar, "#6f42c1"],
    ["settings", "Созламалар", HiOutlineCog6Tooth, "#6c757d"],
  ];

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    prevUserIdRef.current = currentUser?.id;
    
    // Check for user data periodically
    const interval = setInterval(() => {
      const updatedUser = getUser();
      if (updatedUser && prevUserIdRef.current !== updatedUser.id) {
        setUser(updatedUser);
        prevUserIdRef.current = updatedUser.id;
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="card" style={{backgroundColor:'black', padding: '16px'}}>
      <div className="row" style={{justifyContent:'space-between', alignItems:'center', marginBottom: '16px'}}>
        <img src="src\components\logo.png" alt="logo" style={{width:'110px', height:'50px' } } />
        <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
          {user && (
            <span style={{ fontSize: '14px', color: '#666' }}>
              {user.firstName} {user.lastName}
            </span>
          )}
          <button
            className="btn"
            onClick={onLogout}
          >
            Чиқиш
          </button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="row" style={{ gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {tabs.map(([id, label, Icon, color]) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`btn ${isActive ? "active" : ""}`}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                padding: "12px 16px",
                minHeight: "48px",
                border: isActive ? `2px solid ${color}` : "1px solid #e2e8f0",
                backgroundColor: isActive ? `${color}15` : "#fff",
                color: isActive ? color : "#374151",
                transition: "all 0.2s ease",
                borderRadius: "8px",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = `${color}10`;
                  e.target.style.borderColor = color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = "#fff";
                  e.target.style.borderColor = "#e2e8f0";
                }
              }}
            >
              <Icon aria-hidden size={20} style={{ color: isActive ? color : "#6b7280" }} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
