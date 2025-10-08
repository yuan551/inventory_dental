import React from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import pendingIcon from "../../../../assets/dashboard/pending orders icon.png"; // use PNG icon for consistency

export const PendingOrdersSection = ({ count = 0 }) => {
  return (
    <Card className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="[font-family:'Oxygen',Helvetica] font-medium text-gray-600 text-sm mb-2">
              Pending Orders
            </div>
            <div className="[font-family:'Inter',Helvetica] font-bold text-gray-900 text-2xl mb-1">
              {count}
            </div>
            <div className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-[10px]">
              Orders awaiting
            </div>
          </div>
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              <img src={pendingIcon} alt="Pending orders" className="w-5 h-5 object-contain" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};