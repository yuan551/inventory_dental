import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import Users from "../../assets/Users.png";
import mark_email_unread from "../../assets/mark_email_unread.png";
import PhoneIcon from "../../assets/PhoneIcon.png";
import edit from "../../assets/edit.png";
import Boxx from "../../assets/Boxx.png";
import Frame from "../../assets/Frame.png";
import Location_on from "../../assets/Location_on.png";
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

  const [showForm, setShowForm] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [editForm, setEditForm] = useState(null); // Holds the supplier being edited
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHoverRating, setEditHoverRating] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [selectedSupplier, setSelectedSupplier] = useState("All Supplier");

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
    status: "",
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
      countryCode: "+63",
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

        <div className="flex w-full max-w-full mx-auto mt-6 justify-end items-center gap-5">
          {/* Dropdown button for supplier filter */}
          <select
            className="border-2 border-[#00bfc8] [font-family:'Oxygen',Helvetica] rounded-full px-4 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00bfc8]"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="All Supplier">All Supplier</option>
            {suppliers.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Add Supplier Button */}
          <button
            className="flex items-center gap-2 bg-[#00bfc8] text-white rounded-full px-5 py-2 mr-7 [font-family:'Oxygen',Helvetica] font-medium shadow hover:bg-[#00a7b0] transition"
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
        <div className="flex justify-center mt-6 mb-0.5 px-6">
          <div className="w-full max-w-full bg-gray-200 rounded-xl flex shadow-sm">
            {" "}
            {/*fixed padding*/}
            <button
              className={`flex-1 h-12 text-lg rounded-xl font-medium transition-all duration-150
                ${
                  activeTab === "directory"
                    ? "bg-white text-gray-900 shadow m-2"
                    : "bg-gray-200  text-gray-700 hover:bg-white hover:shadow-lg m-2"
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

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            {/* Float email warning outside the modal form */}
            {emailError && (
              <div
                className="absolute top-10 left-1/2 transform -translate-x-1/2 z-[60] bg-white border border-red-400 rounded shadow-lg px-6 py-2 text-red-600 text-base font-semibold"
                style={{ minWidth: "220px" }}
              >
                {emailError}
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-md relative">
              {/* ...existing modal and form code... */}
            </div>
          </div>
        )}
        {/* Add Supplier Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-md relative">
              {/* Modal Header */}
              <div className="bg-[#00bfc8] rounded-t-2xl px-6 py-4 flex items-center justify-between">
                <h3 className="text-white text-xl font-semibold m-0">
                  <span>
                    <img
                      src={Frame}
                      className="inline-block w-7 h-7 mb-2 mr-2"
                    />
                  </span>
                  Add Supplier
                </h3>
                <button
                  className="text-white text-2xl font-bold hover:text-gray-200"
                  onClick={() => {
                    setShowForm(false);
                    setForm({
                      name: "",
                      address: "",
                      contactName: "",
                      email: "",
                      phone: "",
                      countryCode: "+63",
                      category: "",
                      rating: "",
                      totalOrders: "",
                      lastOrder: "",
                      status: "Active",
                    });
                    setEmailError("");
                  }}
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
                <h2 className="text-[#00bfc8] text-2xl font-bold [font-family:'Inter',Helvetica]">
                  Add Supplier
                </h2>
                <input
                  className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 mb-0.5 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                  name="name"
                  placeholder="Supplier Name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
                <div className="flex gap-4 mb-2">
                  <input
                    className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                    name="address"
                    placeholder="Address"
                    value={form.address}
                    onChange={handleInputChange}
                    required
                  />
                  <div className="w-full">
                    <input
                      className={`w-full border-2 ${
                        emailError ? "border-red-500" : "border-[#00bfc8]"
                      } rounded-full px-4 py-2 focus:outline-none focus:ring-2 ${
                        emailError
                          ? "focus:ring-red-500"
                          : "focus:ring-[#00bfc8]"
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
                  </div>
                </div>
                <div className="flex gap-2 mb-2 min-w-0">
                  <input
                    className="w-1/2 border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfc8] placeholder-gray-400"
                    type="tel"
                    name="phone"
                    placeholder="Contact Number"
                    value={form.phone}
                    onChange={handleInputChange}
                    maxLength={11}
                    pattern="[0-9]{11}"
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

                {/* Rating */}
                {/* Ratings (disabled, gray, not inputtable) */}
                <div className="flex items-center py-1 gap-3 mb-2 ml-2">
                  <label className="text-gray-400 font-medium">Rating</label>
                  <div className="flex gap-1 ml-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className="w-7 h-7 text-gray-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
                      </svg>
                    ))}
                  </div>
                </div>
                {/* Total Orders (disabled, gray, not inputtable) */}
                <div className="flex items-center gap-4 mb-2 justify-end">
                  <label
                    htmlFor="totalOrders"
                    className="text-gray-700 ml-2  font-medium whitespace-nowrap [font-family:'Oxygen',Helvetica]"
                  >
                    Total Orders:
                  </label>
                  <input
                    id="totalOrders"
                    className="w-full ml-10 border-2 border-gray-300 bg-gray-100 rounded-full px-4 py-2 focus:outline-none text-gray-400 [font-family:'Oxygen',Helvetica]"
                    name="totalOrders"
                    placeholder="Total Orders"
                    type="number"
                    disabled
                  />
                </div>
                {/* Last Orders (disabled, gray, not inputtable) */}
                <div className="flex items-center gap-4 mb-2 justify-end">
                  <label
                    htmlFor="lastOrder"
                    className="text-gray-700 ml-2 font-medium whitespace-nowrap [font-family:'Oxygen',Helvetica]"
                  >
                    Last Order:
                  </label>
                  <input
                    id="lastOrder"
                    className="w-full border-2 ml-10 border-gray-300 bg-gray-100 rounded-full px-4 py-2 focus:outline-none text-gray-400 [font-family:'Oxygen',Helvetica]"
                    name="lastOrder"
                    placeholder="Last Orders"
                    type="date"
                    disabled
                  />
                </div>
                {/* Status (disabled, gray, not inputtable) */}
                <div className="flex items-center gap-4 mb-2 justify-end">
                  <label
                    htmlFor="status"
                    className="text-gray-700 ml-2 font-medium whitespace-nowrap [font-family:'Oxygen',Helvetica]"
                  >
                    Status:
                  </label>
                  <select
                    id="status"
                    className="w-full ml-10 border-2 border-gray-300 bg-gray-100 rounded-full px-4 py-2 focus:outline-none text-gray-400 [font-family:'Oxygen',Helvetica]"
                    name="status"
                    disabled
                  >
                    <option value="Active">Status</option>
                  </select>
                </div>
                {/* Save Button */}
                <button
                  type="submit"
                  className="w-full bg-[#00bfc8] text-white rounded-full px-5 py-2 mt-2 [font-family:'Oxygen',Helvetica] font-medium shadow hover:bg-[#00a7b0] transition text-lg"
                >
                  Save
                </button>
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
        {showEditModal && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-xl relative">
              {/* Modal Header */}
              <div className="bg-[#00bfc8] rounded-t-2xl px-6 py-4 flex items-center justify-between">
                <h3 className="text-white text-2xl [font-family:'Inter',Helvetica]  m-0">
                  <span>
                    <img
                      src={edit}
                      className="inline-block w-5 h-5 mr-2 mb-1.5"
                    />
                  </span>
                  Edit Action
                </h3>
                <button
                  className="text-white text-2xl font-bold hover:text-gray-200"
                  onClick={() => setShowEditModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              {/* Modal Title */}
              <div className="px-8 pt-6 pb-2 ">
                <div className="flex items-center justify-between mb-5 mt-2">
                  <h2 className="text-[#00bfc8] text-2xl font-bold [font-family:'Inter',Helvetica]">
                    Edit Supplier Information
                  </h2>
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    {new Date().toLocaleDateString()}
                    <svg
                      className="w-5 h-5 ml-1"
                      fill="none"
                      stroke="#00bfc8"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        stroke="currentColor"
                      />
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" />
                    </svg>
                  </span>
                </div>
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
                className="px-8 pb-6 space-y-3"
              >
                <div className="grid grid-cols-2 gap-x-8 gap-y-7 mb-4 ml-2 mr-2">
                  <div>
                    <label className=" opacity-60 block [font-family:'Oxygen',Helvetica] text-gray-700 text-xl  mb-3">
                      Supplier Name
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none [font-family:'Inter',Helvetica] text-gray-700"
                      name="name"
                      placeholder="Pharma Corp."
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className=" opacity-60 block [font-family:'Oxygen',Helvetica] text-gray-700 text-xl  mb-3">
                      Contact Person
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none [font-family:'Inter',Helvetica] text-gray-700"
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
                  <div>
                    <label className=" opacity-60 block [font-family:'Oxygen',Helvetica] text-gray-700 text-xl  mb-3">
                      Contact Number
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none [font-family:'Inter',Helvetica] text-gray-700"
                      name="phone"
                      placeholder="2864834732"
                      value={editForm.phone}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);
                        setEditForm((f) => ({ ...f, phone: value }));
                      }}
                      required
                      maxLength="11"
                      type="tel"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className=" opacity-60 block [font-family:'Oxygen',Helvetica] text-gray-700 text-xl  mb-3">
                      Email Address
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none [font-family:'Inter',Helvetica] text-gray-700"
                      name="email"
                      placeholder="Email Address"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className=" opacity-60 block [font-family:'Oxygen',Helvetica] text-gray-700 text-xl  mb-3">
                      Category
                    </label>
                    <select
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none [font-family:'Inter',Helvetica] text-gray-700"
                      name="category"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, category: e.target.value }))
                      }
                      required
                    >
                      <option value="">Pharmaceuticals</option>
                      <option value="General Supplies">General Supplies</option>
                      <option value="Pharmaceuticals">Pharmaceuticals</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Safety Equipment">Safety Equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className=" opacity-60 block [font-family:'Oxygen',Helvetica] text-gray-700 text-xl  mb-3">
                      Company Address
                    </label>
                    <input
                      className="w-full border-2 border-[#00bfc8] rounded-full px-4 py-2 focus:outline-none [font-family:'Inter',Helvetica] text-gray-700"
                      name="address"
                      placeholder="Contat "
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, address: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                {/* Ratings */}
                <div className="flex items-center gap-2 mb-2 py-2 ml-2">
                  <label className="opacity-50 text-lg [font-family:'Oxygen',Helvetica] mr-2">
                    Ratings
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const displayRating =
                        editHoverRating !== null
                          ? editHoverRating
                          : editForm.rating;
                      const isFilled = displayRating >= star;
                      return (
                        <svg
                          key={star}
                          className={`w-6 h-6 cursor-pointer ${
                            isFilled ? "text-yellow-400" : "text-gray-300"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          onMouseEnter={() => setEditHoverRating(star)}
                          onMouseLeave={() => setEditHoverRating(null)}
                          onClick={() =>
                            setEditForm((f) => ({ ...f, rating: star }))
                          }
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
                        </svg>
                      );
                    })}
                  </div>
                </div>
                {/* Buttons */}
                <div className="flex gap-8 justify-center mt-7 py-5 px-20">
                  <button
                    type="submit"
                    className="flex-1 bg-[#00bfc8] text-white rounded-full px-5 py-2 font-semibold shadow hover:bg-[#00a7b0] transition text-lg"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-red-600 text-white rounded-full px-5 py-2 font-semibold shadow hover:bg-red-700 transition text-lg"
                    onClick={() => setShowRemoveConfirm(true)}
                  >
                    Remove
                  </button>
                </div>
              </form>
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

        {/* TABLE Area */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            {activeTab === "directory" && (
              <>
                <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
                  <span>
                    <img src={Users} className="inline-block w-7 h-7 mr-2" />
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
                          <tr
                            key={idx}
                            className="border-b last:border-b-0 hover:bg-blue-50 transition"
                          >
                            <td className="py-4 pr-4 align-top">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500">
                                <img
                                  src={Location_on}
                                  alt="User Icon"
                                  className="w-4 h-4 text-gray-500"
                                />
                                {s.address}
                              </div>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              <div className="font-medium flex items-center gap-1">
                                {s.contactName}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <img
                                  src={mark_email_unread}
                                  alt="User Icon"
                                  className="w-4 h-4 text-gray-500"
                                />
                                {s.email}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <img
                                  src={PhoneIcon}
                                  alt="User Icon"
                                  className="w-4 h-4 text-gray-500"
                                />
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
                                  });
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
            )}

            {activeTab === "orders" && (
              <>
                <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
                  <span>
                    <img src={Boxx} className="inline-block w-7 h-7 mr-2" />
                  </span>
                  Purchase Orders{" "}
                  <span className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-lg">
                    (1 Order)
                  </span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-4 font-semibold">Order ID</th>
                        <th className="py-2 pr-4 font-semibold">Item Name</th>
                        <th className="py-2 pr-4 font-semibold">Quantity</th>
                        <th className="py-2 pr-4 font-semibold">Supplier</th>
                        <th className="py-2 pr-4 font-semibold">
                          Date Delivered
                        </th>
                        <th className="py-2 pr-4 font-semibold">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900">
                      <tr className="border-b hover:bg-blue-50 transition">
                        <td className="py-4 pr-4 align-top font-medium">
                          PO-2024-0156
                        </td>
                        <td className="py-4 pr-4 align-top">
                          Latex Gloves, Dental Masks
                        </td>
                        <td className="py-4 pr-4 align-top">—</td>
                        <td className="py-4 pr-4 align-top">MedSupply Co.</td>
                        <td className="py-4 pr-4 align-top">9/20/2024</td>
                        <td className="py-4 pr-4 align-top">$245.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
