import React from "react";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { TbArrowBackUp } from "react-icons/tb";
import { PiPackageLight } from "react-icons/pi";
import { HiOutlineUsers } from "react-icons/hi";
import { HiOutlineChartBar } from "react-icons/hi";
import { HiOutlineCog6Tooth } from "react-icons/hi2";

export default function Sidebar({ active, onTab, isCollapsed = false }) {
  const tabs = [
    ["rent", "Ижара бериш", HiOutlineDocumentText, "#007bff"],
    ["return", "Қайтариш", TbArrowBackUp, "#28a745"],
    ["inventory", "Товарлар", PiPackageLight, "#ffc107"],
    ["customers", "Мижозлар", HiOutlineUsers, "#17a2b8"],
    ["reports", "Ҳисоботлар", HiOutlineChartBar, "#6f42c1"],
    ["settings", "Созламалар", HiOutlineCog6Tooth, "#6c757d"],
  ];

  return (
    <aside className="card" style={{ 
      position: "sticky", 
      top: 16, 
      height: "fit-content",
      transition: "all 0.3s ease",
      border: `2px solid ${tabs.find(tab => tab[0] === active)?.[3] || "#e0e0e0"}`
    }}>
      <nav className="gap">
        {tabs.map(([id, label, Icon, color]) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`btn ${isActive ? "active" : ""}`}
              style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                gap: isCollapsed ? 0 : 8, 
                justifyContent: isCollapsed ? "center" : "flex-start",
                padding: isCollapsed ? "12px 8px" : "12px 16px",
                minHeight: "48px",
                border: isActive ? `2px solid ${color}` : "1px solid #e2e8f0",
                backgroundColor: isActive ? `${color}15` : "#fff",
                color: isActive ? color : "#374151",
                transition: "all 0.2s ease"
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
              title={isCollapsed ? label : ""}
            >
              <Icon aria-hidden size={isCollapsed ? 24 : 20} style={{ color: isActive ? color : "#6b7280" }} />
              {!isCollapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}