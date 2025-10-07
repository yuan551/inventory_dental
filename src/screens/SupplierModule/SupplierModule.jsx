import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";

const initialSuppliers = [
  {
    name: "MedSupply Co.",
    address: "123 Medical St, Healthcare City, HC 12345",
    contactName: "John Smith",
    email: "orders@medsupply.com",
    phone: "+1 (555) 123-4567",
    category: "General Supplies",
    rating: 4.8,
    totalOrders: 45,
    lastOrder: "9/20/2024",
    status: "Active",
  },
  {
    name: "PharmaCorp",
    address: "456 Pharma Ave, Medicine Town, MT 67890",
    contactName: "Dr. Emily Davis",
    email: "sales@pharmacorp.com",
    phone: "+1 (555) 987-6543",
    category: "Pharmaceuticals",
    rating: 4.9,
    totalOrders: 28,
    lastOrder: "9/22/2024",
    status: "Active",
  },
  {
    name: "DentalTech Pro",
    address: "789 Tech Blvd, Innovation City, IC 13579",
    contactName: "Michael Chen",
    email: "support@dentaltechpro.com",
    phone: "+1 (555) 456-7890",
    category: "Equipment",
    rating: 4.7,
    totalOrders: 12,
    lastOrder: "9/18/2024",
    status: "Active",
  },
  {
    name: "SafeMed Inc.",
    address: "321 Safety St, Secure City, SC 24680",
    contactName: "Sarah Wilson",
    email: "orders@safemed.com",
    phone: "+1 (555) 321-0987",
    category: "Safety Equipment",
    rating: 4.6,
    totalOrders: 8,
    lastOrder: "8/15/2024",
    status: "Inactive",
  },
];

export const SupplierModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState("directory");
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [showForm, setShowForm] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [editForm, setEditForm] = useState(null); // Holds the supplier being edited
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHoverRating, setEditHoverRating] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    contactName: "",
    email: "",
    phone: "",
    category: "",
    rating: "",
    totalOrders: "",
    lastOrder: "",
    status: "Active",
  });
  const [hoverRating, setHoverRating] = useState(null);

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "email" && emailError) {
      setEmailError("");
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email === "") {
      setEmailError("Please put a valid email address");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please put a valid email address");
      return false;
    } else {
      setEmailError("");
      return true;
    }
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();

    if (!validateEmail(form.email)) {
      return;
    }

    setSuppliers((prev) => [
      ...prev,
      {
        ...form,
        rating: parseFloat(form.rating),
        totalOrders: parseInt(form.totalOrders, 10),
      },
    ]);
    setForm({
      name: "",
      address: "",
      contactName: "",
      email: "",
      phone: "",
      category: "",
      rating: "",
      totalOrders: "",
      lastOrder: "",
      status: "Active",
    });
    setShowForm(false);
    setShowSuccessModal(true);
  };

  return (
    <div
      className="h-screen overflow-hidden flex"
      style={{ backgroundColor: "#F5F5F5" }}
    >
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 transition-[width] duration-200 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <DashboardSidebarSection currentPage="SUPPLIER" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AppHeader
          title="SUPPLIER"
          subtitle="Manage your suppliers and vendor relationships"
        />

        {/* Add Supplier Button */}
        <div className="flex w-full max-w-full mx-auto mt-6 justify-end">
          <button
            className="flex items-center gap-2 bg-[#00bfc8] text-white rounded-full px-5 py-2 mr-6 [font-family:'Oxygen',Helvetica] font-medium shadow hover:bg-[#00a7b0] transition"
            onClick={() => setShowForm(true)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Supplier
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center mt-6 mb-0.5">
          <div className="w-full max-w-[1050px] bg-gray-200 rounded-xl flex shadow-sm">
            <button
              className={`flex-1 h-12 text-lg rounded-xl font-medium transition-all duration-150
                ${
                  activeTab === "directory"
                    ? "bg-white text-gray-900 shadow m-2"
                    : "bg-gray-200 text-gray-700 hover:bg-white hover:shadow-lg m-2"
                }
                focus:outline-none
              `}
              onClick={() => setActiveTab("directory")}
            >
              Supplier Directory
            </button>
            <button
              className={`flex-1 h-12 text-lg rounded-xl font-medium transition-all duration-150
                ${
                  activeTab === "orders"
                    ? "bg-white text-gray-900 shadow m-2"
                    : "bg-gray-200 text-gray-700 hover:bg-white hover:shadow-lg m-2"
                }
                focus:outline-none
              `}
              onClick={() => setActiveTab("orders")}
            >
              Purchase Orders
            </button>
          </div>
        </div>

        {/* Add Supplier Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-md relative">
              {/* Modal Header */}
              <div className="bg-[#00bfc8] rounded-t-2xl px-6 py-4 flex items-center justify-between">
                <h3 className="text-white text-xl font-semibold m-0">
                  Add Supplier
                </h3>
                <button
                  className="text-white text-2xl font-bold hover:text-gray-200"
                  onClick={() => setShowForm(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              {/* Modal Form */}
              <form
                onSubmit={handleAddSupplier}
                className="px-8 py-6 space-y-4"
              >
                <input
                  className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-0.5 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                  name="name"
                  placeholder="Supplier Name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
                <input
                  className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                  name="address"
                  placeholder="Address"
                  value={form.address}
                  onChange={handleInputChange}
                  required
                />
                <div>
                  <input
                    className={`w-full border-2 ${
                      emailError ? "border-red-500" : "border-[#00bfc8]"
                    } rounded-full px-4 py-2 focus:outline-none focus:ring-2 ${
                      emailError ? "focus:ring-red-500" : "focus:ring-[#00bfc8]"
                    } placeholder-gray-400 transition-all duration-200`}
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={handleInputChange}
                    onBlur={() => validateEmail(form.email)}
                    required
                  />
                  {emailError && (
                    <p className="text-red-500 text-sm px-4 mt-1">
                      {emailError}
                    </p>
                  )}

                  <select
                    className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-1 mt-5 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="General Supplies">General Supplies</option>
                    <option value="Pharmaceuticals">Pharmaceuticals</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Safety Equipment">Safety Equipment</option>
                  </select>
                </div>
                <div className="flex gap-2 mb-2 min-w-0">
                  <input
                    className="w-1/2 border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                    name="phone"
                    placeholder="Contact Number"
                    value={form.phone}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    className="w-1/2 border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                    name="contactName"
                    placeholder="Contact Person"
                    value={form.contactName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-gray-600 font-medium">Rating</label>
                  <div
                    className="flex gap-1"
                    onMouseLeave={() => setHoverRating(null)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      // Determine what to display: hover or saved rating
                      const displayRating =
                        hoverRating !== null ? hoverRating : form.rating;
                      const isFilled = displayRating >= star;
                      const isPartial =
                        displayRating > star - 1 && displayRating < star;
                      const partialPercent = isPartial
                        ? (displayRating - (star - 1)) * 100
                        : 0;

                      return (
                        <div
                          key={star}
                          className="relative w-10 h-10 cursor-pointer"
                          onMouseMove={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const fraction =
                              Math.ceil((x / rect.width) * 10) / 10;
                            const rating = star - 1 + fraction;
                            setHoverRating(parseFloat(rating.toFixed(1)));
                          }}
                          onClick={() => {
                            if (hoverRating !== null) {
                              setForm((f) => ({ ...f, rating: hoverRating }));
                            } else {
                              setForm((f) => ({ ...f, rating: star }));
                            }
                          }}
                        >
                          {/* Gray base star */}
                          <svg
                            className="w-10 h-10 text-gray-300"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
                          </svg>
                          {/* Yellow overlay for filled/partial star */}
                          {(isFilled || isPartial) && (
                            <svg
                              className="w-10 h-10 text-yellow-400 absolute top-0 left-0 pointer-events-none"
                              viewBox="0 0 20 20"
                              style={
                                isPartial
                                  ? {
                                      clipPath: `inset(0 ${
                                        100 - partialPercent
                                      }% 0 0)`,
                                    }
                                  : {}
                              }
                            >
                              <path
                                fill="currentColor"
                                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(hoverRating !== null || form.rating > 0) && (
                    <span className="text-sm text-gray-500 ml-2">
                      {(hoverRating !== null
                        ? hoverRating
                        : form.rating
                      ).toFixed(1)}
                    </span>
                  )}
                </div>
                {/* Total Orders */}
                <input
                  className="w-full border-2 border-gray-300 bg-gray-100 rounded-full px-4 py-2 mb-2 focus:outline-none"
                  name="totalOrders"
                  placeholder="Total Orders"
                  type="number"
                  min="0"
                  value={form.totalOrders}
                  onChange={handleInputChange}
                  required
                />
                {/* Last Orders */}
                <input
                  className="w-full border-2 border-gray-300 bg-gray-100 rounded-full px-4 py-2 mb-2 focus:outline-none"
                  name="lastOrder"
                  placeholder="Last Orders"
                  type="date"
                  value={form.lastOrder}
                  onChange={handleInputChange}
                  required
                  max="2025-12-31"
                />
                {/* Status */}
                <select
                  className="w-full border-2 border-gray-300 bg-gray-100 rounded-full px-4 py-2 mb-2 focus:outline-none"
                  name="status"
                  value={form.status}
                  onChange={handleInputChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {/* Done Button */}
                <button
                  type="submit"
                  className="w-full bg-[#00bfc8] text-white rounded-full px-5 py-2 mt-2 [font-family:'Oxygen',Helvetica] font-medium shadow hover:bg-[#00a7b0] transition text-lg"
                >
                  Done
                </button>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-2xl relative">
              {" "}
              {/* <-- wider modal */}
              {/* Modal Header */}
              <div className="bg-[#00bfc8] rounded-t-2xl px-6 py-4 flex items-center justify-between">
                <h3 className="text-white text-xl font-semibold m-0">Edit</h3>
                <button
                  className="text-white text-2xl font-bold hover:text-gray-200"
                  onClick={() => setShowEditModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              {/* Modal Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const updatedSuppliers = [...suppliers];
                  updatedSuppliers[editForm.index] = { ...editForm };
                  delete updatedSuppliers[editForm.index].index;
                  setSuppliers(updatedSuppliers);
                  setShowEditModal(false);
                }}
                className="px-8 py-6 space-y-4"
              >
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-gray-600 font-medium mb-1">
                      Supplier Name
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                      name="name"
                      placeholder="Supplier Name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-gray-600 font-medium mb-1">
                      Email Address
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                      name="email"
                      placeholder="Email Address"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-gray-500 font-medium mb-1">
                      Category
                    </label>
                    <select
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-800"
                      name="category"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, category: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="General Supplies">General Supplies</option>
                      <option value="Pharmaceuticals">Pharmaceuticals</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Safety Equipment">Safety Equipment</option>
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-gray-600 font-medium mb-1">
                      Address
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                      name="address"
                      placeholder="Address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, address: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-gray-600 font-medium mb-1">
                      Contact Number
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                      name="phone"
                      placeholder="Contact Number"
                      value={editForm.phone}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, "");
                        setEditForm((f) => ({ ...f, phone: value }));
                      }}
                      required
                      type="tel"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-gray-600 font-medium mb-1">
                      Contact Person
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                      name="contactName"
                      placeholder="Contact Person"
                      value={editForm.contactName}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          contactName: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                {/* Rating */}
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-gray-600 font-medium">Rating</label>
                  <div
                    className="flex gap-1"
                    onMouseLeave={() => setEditHoverRating(null)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const displayRating =
                        editHoverRating !== null
                          ? editHoverRating
                          : editForm.rating;
                      const isFilled = displayRating >= star;
                      const isPartial =
                        displayRating > star - 1 && displayRating < star;
                      const partialPercent = isPartial
                        ? (displayRating - (star - 1)) * 100
                        : 0;

                      return (
                        <div
                          key={star}
                          className="relative w-10 h-10 cursor-pointer"
                          onMouseMove={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const fraction =
                              Math.ceil((x / rect.width) * 10) / 10;
                            const rating = star - 1 + fraction;
                            setEditHoverRating(parseFloat(rating.toFixed(1)));
                          }}
                          onClick={() => {
                            if (editHoverRating !== null) {
                              setEditForm((f) => ({
                                ...f,
                                rating: editHoverRating,
                              }));
                            } else {
                              setEditForm((f) => ({ ...f, rating: star }));
                            }
                          }}
                        >
                          {/* Gray base star */}
                          <svg
                            className="w-10 h-10 text-gray-300"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
                          </svg>
                          {/* Yellow overlay for filled/partial star */}
                          {(isFilled || isPartial) && (
                            <svg
                              className="w-10 h-10 text-yellow-400 absolute top-0 left-0 pointer-events-none"
                              viewBox="0 0 20 20"
                              style={
                                isPartial
                                  ? {
                                      clipPath: `inset(0 ${
                                        100 - partialPercent
                                      }% 0 0)`,
                                    }
                                  : {}
                              }
                            >
                              <path
                                fill="currentColor"
                                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(editHoverRating !== null || editForm.rating > 0) && (
                    <span className="text-sm text-gray-500 ml-2">
                      {(editHoverRating !== null
                        ? editHoverRating
                        : editForm.rating
                      ).toFixed(1)}
                    </span>
                  )}
                </div>
                {/* Save & Remove Buttons */}
                <div className="flex gap-4 justify-center mt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#00bfc8] text-white rounded-full px-5 py-2 font-medium shadow hover:bg-[#00a7b0] transition text-lg"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-red-500 text-white rounded-full px-5 py-2 font-medium shadow hover:bg-red-600 transition text-lg"
                    onClick={() => setShowRemoveConfirm(true)}
                  >
                    Remove
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm relative flex flex-col items-center">
              {/* Close X button */}
              <button
                className="absolute top-5 right-5 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setShowRemoveConfirm(false)}
                aria-label="Close"
              >
                ×
              </button>
              {/* Red Exclamation Icon */}
              <div className="flex justify-center mb-4 mt-2">
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#E11D48"
                    strokeWidth="4"
                  />
                  <text
                    x="32"
                    y="46"
                    textAnchor="middle"
                    fontSize="40"
                    fill="#E11D48"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </svg>
              </div>
              {/* Message */}
              <h3 className="text-center text-xl font-semibold text-gray-900 mb-2 mt-2">
                Are you sure you want to
                <br />
                remove {editForm?.name}?
              </h3>
              {/* Buttons */}
              <div className="flex gap-4 mt-6 w-full">
                <button
                  className="flex-1 bg-red-600 text-white rounded-full px-6 py-2.5 font-semibold shadow hover:bg-red-700 transition text-lg"
                  onClick={() => {
                    setSuppliers(
                      suppliers.filter((_, i) => i !== editForm.index)
                    );
                    setShowRemoveConfirm(false);
                    setShowEditModal(false);
                  }}
                >
                  Remove
                </button>
                <button
                  className="flex-1 bg-[#00bfc8] text-white rounded-full px-6 py-2.5 font-semibold shadow hover:bg-[#00a7b0] transition text-lg"
                  onClick={() => setShowRemoveConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm relative flex flex-col items-center">
              {/* Close X button */}
              <button
                className="absolute top-5 right-5 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setShowSuccessModal(false)}
                aria-label="Close"
              >
                ×
              </button>
              {/* Green Check Icon */}
              <div className="flex justify-center mb-4 mt-2">
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#22C55E"
                    strokeWidth="4"
                  />
                  <path
                    d="M20 34l8 8 16-16"
                    stroke="#22C55E"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
              {/* Message */}
              <h3 className="[font-family:'Inter',Helvetica] text-center text-xl font-bold text-gray-900 mb-2 mt-2">
                Supplier Added
                <br />
                Successfully
              </h3>
              <p className="[font-family:'Inter',Helvetica] text-center text-gray-700 mb-4">
                Supplier Name has been successfully added.
              </p>
              {/* Done Button */}
              <button
                className="w-40 bg-[#00bfc8] text-white rounded-full px-10 py-2.5 [font-family:'Inter',Helvetica] font-semibold shadow hover:bg-[#00a7b0] transition text-lg"
                onClick={() => setShowSuccessModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            {activeTab === "directory" ? (
              <>
                <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
                  <span>
                    <svg
                      className="inline-block w-7 h-7 mr-2 text-gray-800"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m10-5a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm-4-4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"
                      />
                    </svg>
                  </span>
                  Supplier Directory{" "}
                  <span className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-lg">
                    ({suppliers.length} Suppliers)
                  </span>
                </h2>
                <div className="overflow-x-auto">
                  <div className="max-h-[340px] overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="py-2 pr-4 font-semibold">Supplier</th>
                          <th className="py-2 pr-4 font-semibold">Contact</th>
                          <th className="py-2 pr-4 font-semibold">Category</th>
                          <th className="py-2 pr-4 font-semibold">Rating</th>
                          <th className="py-2 pr-4 font-semibold">
                            Total Orders
                          </th>
                          <th className="py-2 pr-4 font-semibold">
                            Last Order
                          </th>
                          <th className="py-2 pr-4 font-semibold">Status</th>
                          <th className="py-2 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-900">
                        {suppliers.map((s, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-4 pr-4 align-top">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500">
                                {s.address}
                              </div>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              <div className="font-medium flex items-center gap-1">
                                <svg
                                  className="w-4 h-4 text-gray-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM2 18a8 8 0 1116 0H2z" />
                                </svg>
                                {s.contactName}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 12H8m8 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
                                  />
                                </svg>
                                {s.email}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm0 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2zm12-12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V5zm0 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z"
                                  />
                                </svg>
                                {s.phone}
                              </div>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              {s.category}
                            </td>
                            <td className="py-4 pr-4 align-top flex items-center gap-1">
                              {s.rating}
                              <svg
                                className="w-4 h-4 text-yellow-400 inline"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
                              </svg>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              {s.totalOrders}
                            </td>
                            <td className="py-4 pr-4 align-top">
                              {s.lastOrder
                                ? new Date(s.lastOrder).toLocaleDateString(
                                    "en-US"
                                  )
                                : ""}
                            </td>
                            <td className="py-4 pr-4 align-top">
                              {s.status === "Active" ? (
                                <span className="inline-block px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-600 font-semibold">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-4 align-top">
                              <button
                                className="px-4 py-1 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition"
                                onClick={() => {
                                  setEditForm({
                                    ...suppliers[idx],
                                    index: idx,
                                  }); // Save index for updating
                                  setShowEditModal(true);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">🏢</div>
                <p className="text-lg font-medium mb-2">
                  Purchase Order Management
                </p>
                <p className="text-sm">
                  This page will contain your purchase order management system
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
