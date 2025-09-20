import React, { useState, useEffect } from "react";
import { fmt } from "../utils/helpers";

export default function CustomersPanel({ customers, setCustomers, items }) {
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [editCustomerData, setEditCustomerData] = useState({
    id: null,
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [error, setError] = useState(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingAdd, setIsLoadingAdd] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("token");

  const openAddModal = () => {
    setNewCustomer({ firstName: "", lastName: "", phone: "" });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewCustomer({ firstName: "", lastName: "", phone: "" });
  };

  const addCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone) {
      alert("Барча мажбурий майдонларни тўлдиринг!");
      return;
    }

    setIsLoadingAdd(true);
    try {
      const res = await fetch("http://localhost:3000/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          phone: newCustomer.phone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomers([
          ...customers,
          {
            id: data.client.id,
            name: `${data.client.firstName} ${data.client.lastName}`,
            phone: data.client.phone,
            firstName: data.client.firstName,
            lastName: data.client.lastName,
          },
        ]);
        closeAddModal();
    
      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || "Мижоз қўшишда хатолик"}`);
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      alert("Тармоқ хатолиги юз берди. Сервер ишламаётган бўлиши мумкин.");
    } finally {
      setIsLoadingAdd(false);
    }
  };

  const editCustomer = (customer) => {
    setEditCustomerData({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditCustomerData({ id: null, firstName: "", lastName: "", phone: "" });
  };

  const updateCustomer = async () => {
    if (!editCustomerData.firstName || !editCustomerData.lastName || !editCustomerData.phone) {
      alert("Барча мажбурий майдонларни тўлдиринг!");
      return;
    }

    setIsLoadingEdit(true);
    try {
      const res = await fetch(`http://localhost:3000/clients/${editCustomerData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editCustomerData.firstName,
          lastName: editCustomerData.lastName,
          phone: editCustomerData.phone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomers(
          customers.map((c) =>
            c.id === editCustomerData.id
              ? {
                  ...c,
                  name: `${data.client.firstName} ${data.client.lastName}`,
                  firstName: data.client.firstName,
                  lastName: data.client.lastName,
                  phone: data.client.phone,
                }
              : c
          )
        );
        closeEditModal();
      } else {
        const errorData = await res.json();
        alert(`Хатолик: ${errorData.message || "Мижозни ўзгартиришда хатолик"}`);
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Тармоқ хатолиги юз берди. Сервер ишламаётган бўлиши мумкин.");
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const viewCustomerOrders = async (customerId, customerName) => {
    setIsLoadingOrders(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/orders/client/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const mappedOrders = data.orders.map((order) => ({
          id: order.id,
          date: order.createdAt.slice(0, 10),
          days: Math.max(
            1,
            Math.ceil(
              (new Date(order.toDate) - new Date(order.fromDate)) / (1000 * 60 * 60 * 24)
            )
          ),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          items: order.items.map((item) => ({
            orderItemId: item.orderItemId,
            productId: item.productId,
            productName: item.product?.name || "Номаълум",
            productSize: item.product?.size || "йўқ",
            rentedQuantity: item.quantity,
            returnedQuantity: item.returned || 0,
          })),
        }));
        setSelectedCustomerOrders(mappedOrders);
        setSelectedCustomerName(customerName);
        setIsModalOpen(true);
      } else {
        const errorData = await res.json();
        setError(`Хатолик: ${errorData.message || "Буюртмаларни олишда хатолик"}`);
      }
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      setError("Тармоқ хатолиги юз берди. Сервер билан боғланиш имкони йўқ.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCustomerOrders([]);
    setSelectedCustomerName("");
    setError(null);
  };

  const getOrderStatus = (order) => {
    switch (order.status) {
      case 'PENDING':
        return { text: "Қайтарилмаган", color: "red" };
      case 'PARTIALLY_RETURNED':
        return { text: "Қисман қайтарилган", color: "yellow" };
      case 'RETURNED':
        return { text: "Қайтарилган", color: "green" };
      default:
        return { text: order.status, color: "black" };
    }
  };

  const deleteCustomer = async (id) => {
    if (!confirm("Мижозни ўчиришни тасдиқланг")) return;
    try {
      const res = await fetch(`http://localhost:3000/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setCustomers((customers || []).filter(c => c.id !== id));

      } else {
        const e = await res.json();
        alert(e.message || "Ўчиришда хатолик");
      }
    } catch (e) {
      alert("Тармоқ хатолиги");
    }
  };

  const filteredCustomers = (customers || []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="gap">
      <div className="card gap">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2>Мижозлар</h2>
          <div className="row" style={{ gap: "16px", alignItems: "center" }}>
            <input
              className="input"
              style={{ width: "300px", fontSize: "14px" }}
              placeholder="Қидириш..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn primary" onClick={openAddModal}>
              + Янги мижоз
            </button>
          </div>
        </div>
        
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="text-2xl">ID</th>
                <th className="text-2xl">Исм</th>
                <th className="text-2xl">Фамилия</th>
                <th className="text-2xl">Телефон</th>
                <th className="text-2xl">Амаллар</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-black hover:text-white">
                  <td className="text-2xl">{customer.id}</td>
                  <td className="text-2xl">
                    <strong>{customer.firstName}</strong>
                  </td>
                  <td className="text-2xl">
                    <strong>{customer.lastName}</strong>
                  </td>
                  <td className="text-2xl">{customer.phone}</td>
                  <td>
                    <div className="row" style={{ gap: "8px" }}>
                      <button
                        className="btn"
                        onClick={() => viewCustomerOrders(customer.id, customer.name)}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        📋
                      </button>
                      <button
                        className="btn"
                        onClick={() => editCustomer(customer)}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteCustomer(customer.id)}
                        style={{ padding: "6px 12px", fontSize: "12px", background: '#ef4444', color: '#fff' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Янги мижоз қўшиш</h3>
              <button className="modal-close" onClick={closeAddModal}>
                ✕
              </button>
            </div>
            <div className="modal-body gap">
              <div>
                <label>Исми *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Мижознинг исми"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                />
              </div>
              <div>
                <label>Фамилия *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Мижознинг фамилияси"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                />
              </div>
              <div>
                <label>Телефон рақами *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+998 XX XXX XX XX"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeAddModal} disabled={isLoadingAdd}>
                Бекор қилиш
              </button>
              <button
                className="btn primary"
                onClick={addCustomer}
                disabled={isLoadingAdd || !newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone}
              >
                {isLoadingAdd ? "Қўшилмоқда..." : "Қўшиш"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Мижозни ўзгартириш</h3>
              <button className="modal-close" onClick={closeEditModal}>
                ✕
              </button>
            </div>
            <div className="modal-body gap">
              <div>
                <label>Исми *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Мижознинг исми"
                  value={editCustomerData.firstName}
                  onChange={(e) => setEditCustomerData({ ...editCustomerData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label>Фамилия *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Мижознинг фамилияси"
                  value={editCustomerData.lastName}
                  onChange={(e) => setEditCustomerData({ ...editCustomerData, lastName: e.target.value })}
                />
              </div>
              <div>
                <label>Телефон рақами *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+998 XX XXX XX XX"
                  value={editCustomerData.phone}
                  onChange={(e) => setEditCustomerData({ ...editCustomerData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeEditModal} disabled={isLoadingEdit}>
                Бекор қилиш
              </button>
              <button
                className="btn primary"
                onClick={updateCustomer}
                disabled={isLoadingEdit || !editCustomerData.firstName || !editCustomerData.lastName || !editCustomerData.phone}
              >
                {isLoadingEdit ? "Ўзгартирилмоқда..." : "Сақлаш"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Orders Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCustomerName} - Буюртмалар</h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body gap">
              {error ? (
                <div style={{ textAlign: "center", color: "#dc3545" }}>
                  <p>{error}</p>
                  <button
                    className="btn primary"
                    onClick={() => viewCustomerOrders(selectedCustomerOrders[0]?.id, selectedCustomerName)}
                  >
                    Қайта уриниш
                  </button>
                </div>
              ) : isLoadingOrders ? (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Буюртмалар юкланмоқда...
                </p>
              ) : selectedCustomerOrders.length === 0 ? (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Бу мижоз учун буюртмалар топилмади.
                </p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Сана</th>
                        <th>Маҳсулотлар</th>
                        <th>Жами</th>
                        <th>Ҳолат</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomerOrders.map((order) => {
                        const status = getOrderStatus(order);
                        return (
                          <tr key={order.id}>
                            <td className="mono">{order.id}</td>
                            <td>{order.date}</td>
                            <td>
                              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                                {order.items.map((item) => (
                                  <li key={item.orderItemId}>
                                    {item.productName} ({item.productSize}): Ижара:{" "}
                                    {item.rentedQuantity}, Қайтарилган:{" "}
                                    {item.returnedQuantity}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td>{fmt(order.total)}</td>
                            <td
                              style={{
                                color:
                                  status.color === "red"
                                    ? "#dc3545"
                                    : status.color === "yellow"
                                    ? "#ffc107"
                                    : "#28a745",
                                fontWeight: "bold",
                              }}
                            >
                              {status.text}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>
                Ёпиш
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}