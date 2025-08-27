import React, { useState, useEffect } from "react";
import { apiCall } from "../utils/helpers.js";

export default function SettingsPanel() {
  const [user, setUser] = useState(null);
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    login: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadUserData = async () => {
    try {
      const freshUserData = await apiCall("/auth/profile");
      if (freshUserData) {
        setUser(freshUserData);
        setUserForm({
          firstName: freshUserData.firstName || "",
          lastName: freshUserData.lastName || "",
          login: freshUserData.login || "",
          phone: freshUserData.phone || "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.log("Could not get user data:", error.message);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const updateUserProfile = async () => {
    if (!user) return;

    if (userForm.password && userForm.password !== userForm.confirmPassword) {
      setMessage("Пароллар мос келмади!");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setUserLoading(true);
    try {
      const updateData = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        login: userForm.login,
        phone: userForm.phone,
      };

      if (userForm.password) {
        updateData.password = userForm.password;
      }

      const targetId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || user.id;
      const data = await apiCall(`/users/${targetId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      setUser(data.user);

      setMessage("Профил муваффақиятли янгиланди!");
      setTimeout(() => setMessage(""), 3000);

      setUserForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      setIsEditing(false);
    } catch (err) {
      setMessage(err.message || "Хатолик юз берди");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setUserLoading(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setUserForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      login: user.login || "",
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
    });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setUserForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      login: user.login || "",
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="max-w-full mx-auto p-4 w-full  ">
      {message && (
        <div
          className={`p-3 mb-4 rounded-md text-center text-sm font-medium ${
            message.includes("Xatolik") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Профил маълумотлари</h2>
          {user && !isEditing && (
            <button
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={startEditing}
            >
              Таҳрирлаш
            </button>
          )}
        </div>

        {!user ? (
          <div className="text-center py-6 bg-gray-50 rounded-md">
            <p className="text-gray-600">Маълумотлар юкланмоқда...</p>
          </div>
        ) : !isEditing ? (
          <ul className="space-y-3">
            <li className="flex justify-between border-b pb-2">
              <span className="text-sm font-medium text-gray-600">Исми:</span>
              <span className="text-sm text-gray-900">{user?.firstName || "Киритилмаган"}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-sm font-medium text-gray-600">Фамилия:</span>
              <span className="text-sm text-gray-900">{user?.lastName || "Киритилмаган"}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-sm font-medium text-gray-600">Логин:</span>
              <span className="text-sm text-gray-900">{user?.login || "Киритилмаган"}</span>
            </li>
          </ul>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Исми</label>
                <input
                  type="text"
                  className="mt-://github.com/xai-org/grok/pull/1234/files#diff-3f9e7a2b8c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0
                  w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Фамилия</label>
                <input
                  type="text"
                  className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Логин</label>
                <input
                  type="text"
                  className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={userForm.login}
                  onChange={(e) => setUserForm({ ...userForm, login: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Телефон</label>
                <input
                  type="text"
                  className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+998901234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Янги парол (ихтиёрий)</label>
                <input
                  type="password"
                  className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Паролни тасдиқланг</label>
                <input
                  type="password"
                  className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={userForm.confirmPassword}
                  onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                  placeholder="Янги паролни қайта киритинг"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                onClick={cancelEditing}
                disabled={userLoading}
              >
                Бекор қилиш
              </button>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={updateUserProfile}
                disabled={userLoading}
              >
                {userLoading ? "Сақланмоқда..." : "Сақлаш"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}