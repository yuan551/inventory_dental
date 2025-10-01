import React from "react";
import { Bell as BellIcon, Search as SearchIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

export const AppHeader = ({ title, subtitle, searchPlaceholder = "Search inventory" }) => {
  return (
    <header className="bg-white shadow-sm px-8 py-6 flex items-center justify-between border-b border-gray-200">
      <div>
        <h1 className="[font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-3xl tracking-[0] leading-[normal] mb-1">
          {title}
        </h1>
        {subtitle ? (
          <p className="[font-family:'Oxygen',Helvetica] font-normal text-gray-600 text-sm tracking-[0] leading-[normal]">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Input
            placeholder={searchPlaceholder}
            className="w-96 h-14 bg-gray-50 rounded-full border border-gray-300 pl-6 pr-14 [font-family:'Oxygen',Helvetica] font-normal text-gray-700 text-sm focus:bg-white focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20"
          />
          <SearchIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        <div className="relative">
          <BellIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
          <Badge className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center p-0">
            <span className="[font-family:'Oxygen',Helvetica] font-normal text-white text-xs">3</span>
          </Badge>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <img className="w-10 h-10 rounded-full border-2 border-gray-200" alt="Profile" src="/group.png" />
          <div>
            <div className="[font-family:'Inter',Helvetica] font-semibold text-gray-900 text-sm tracking-[0] leading-[normal]">
              Dr. Giselle
            </div>
            <div className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-xs tracking-[0] leading-[normal]">
              ADMINISTRATOR
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
