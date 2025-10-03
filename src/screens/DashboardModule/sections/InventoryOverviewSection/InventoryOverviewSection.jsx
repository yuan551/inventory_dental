import React from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import inventoryValueIcon from "../../../../assets/dashboard/inventory value.png"; // use PNG icon

export const InventoryOverviewSection = ({ totalValue = 0 }) => {
  const formatted = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(totalValue || 0);
  return (
    <Card className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="[font-family:'Oxygen',Helvetica] font-medium text-gray-600 text-sm mb-2">
              Inventory Value
            </div>
            <div className="[font-family:'Inter',Helvetica] font-bold text-gray-900 text-2xl mb-1">
              {formatted}
            </div>
            <div className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-xs">
              Total inventory value
            </div>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              <img src={inventoryValueIcon} alt="Inventory value" className="w-5 h-5 object-contain" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};