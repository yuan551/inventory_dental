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
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState("directory");
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [showForm, setShowForm] = useState(false);
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

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
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
  };

  return (
    <div className="h-screen overflow-hidden flex" style={{ backgroundColor: '#F5F5F5' }}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="SUPPLIER" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AppHeader title="SUPPLIER" subtitle="Manage your suppliers and vendor relationships" />

        {/* Add Supplier Button */}
        <div className="flex justify-end w-full max-w-[1216px] mx-auto mt-6">
          <button
            className="flex items-center gap-2 bg-[#00bfc8] text-white rounded-full px-5 py-2 [font-family:'Oxygen',Helvetica] font-medium shadow hover:bg-[#00a7b0] transition"
            onClick={() => setShowForm(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center mt-6 mb-0.5">
          <div className="w-full max-w-[1050px] bg-gray-200 rounded-xl flex shadow-sm">
            <button
              className={`flex-1 h-12 text-lg rounded-xl font-medium transition-all duration-150
                ${activeTab === "directory"
                  ? "bg-white text-gray-900 shadow m-2"
                  : "bg-gray-200 text-gray-700 hover:bg-white hover:shadow-lg m-2"}
                focus:outline-none
              `}
              onClick={() => setActiveTab("directory")}
            >
              Supplier Directory
            </button>
            <button
              className={`flex-1 h-12 text-lg rounded-xl font-medium transition-all duration-150
                ${activeTab === "orders"
                  ? "bg-white text-gray-900 shadow m-2"
                  : "bg-gray-200 text-gray-700 hover:bg-white hover:shadow-lg m-2"}
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
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h3 className="text-xl font-semibold mb-4">Add New Supplier</h3>
              <form onSubmit={handleAddSupplier} className="space-y-3">
                <div className="flex gap-3">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="name"
                    placeholder="Supplier Name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="contactName"
                    placeholder="Contact Person"
                    value={form.contactName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="address"
                  placeholder="Address"
                  value={form.address}
                  onChange={handleInputChange}
                  required
                />
                <div className="flex gap-3">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="phone"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="category"
                    placeholder="Category"
                    value={form.category}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="rating"
                    placeholder="Rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="totalOrders"
                    placeholder="Total Orders"
                    type="number"
                    min="0"
                    value={form.totalOrders}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    name="lastOrder"
                    placeholder="Last Order (e.g. 10/1/2025)"
                    value={form.lastOrder}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <select
                    className="w-full border rounded px-3 py-2"
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#00bfc8] text-white rounded-full px-5 py-2 mt-2 [font-family:'Oxygen',Helvetica] font-medium shadow hover:bg-[#00a7b0] transition"
                >
                  Add Supplier
                </button>
              </form>
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
                    <svg className="inline-block w-7 h-7 mr-2 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m10-5a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm-4-4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                    </svg>
                  </span>
                  Supplier Directory <span className="font-normal text-gray-500 text-lg">({suppliers.length} Suppliers)</span>
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
                        <th className="py-2 pr-4 font-semibold">Total Orders</th>
                        <th className="py-2 pr-4 font-semibold">Last Order</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900">
                      {suppliers.map((s, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-4 pr-4 align-top">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.address}</div>
                          </td>
                          <td className="py-4 pr-4 align-top">
                            <div className="font-medium flex items-center gap-1">
                              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM2 18a8 8 0 1116 0H2z" /></svg>
                              {s.contactName}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12H8m8 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" /></svg>
                              {s.email}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm0 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2zm12-12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V5zm0 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" /></svg>
                              {s.phone}
                            </div>
                          </td>
                          <td className="py-4 pr-4 align-top">{s.category}</td>
                          <td className="py-4 pr-4 align-top flex items-center gap-1">
                            {s.rating}
                            <svg className="w-4 h-4 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/></svg>
                          </td>
                          <td className="py-4 pr-4 align-top">{s.totalOrders}</td>
                          <td className="py-4 pr-4 align-top">{s.lastOrder}</td>
                          <td className="py-4 pr-4 align-top">
                            {s.status === "Active" ? (
                              <span className="inline-block px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">Active</span>
                            ) : (
                              <span className="inline-block px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-600 font-semibold">Inactive</span>
                            )}
                          </td>
                          <td className="py-4 align-top">
                            <button className="px-4 py-1 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition">Edit</button>
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
