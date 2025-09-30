import React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export const LoginModule = () => {
  return (
    <div className="bg-white overflow-hidden w-full min-w-[1920px] h-[1080px] relative">
      <div className="absolute top-[423px] left-[1386px] [font-family:'Inter',Helvetica] font-normal text-white text-2xl tracking-[0] leading-[normal]">
        DR
      </div>

      <div className="absolute top-0 left-[960px] w-[960px] h-[1080px] bg-[#00b7c2]" />

      <div className="top-[-245px] left-[752px] absolute w-[511px] h-[490px] bg-[#ffffff1a] rounded-[255.5px/245px]" />

      <div className="top-[883px] left-[1686px] absolute w-[511px] h-[490px] bg-[#ffffff1a] rounded-[255.5px/245px]" />

      <div className="absolute top-[219px] left-[218px] [font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-5xl tracking-[0] leading-[normal]">
        Login
      </div>

      <Label className="absolute top-[397px] left-[218px] [font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-2xl tracking-[0] leading-[normal]">
        Username
      </Label>

      <Label className="absolute top-[535px] left-[218px] [font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-2xl tracking-[0] leading-[normal]">
        Password
      </Label>

      <button className="absolute top-[656px] left-[602px] h-[19px] flex items-center justify-center [font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-[15px] tracking-[0] leading-[normal] underline bg-transparent border-none cursor-pointer">
        Forgot Password?
      </button>

      <div className="absolute top-[839px] left-[380px] h-[19px] flex items-center justify-center [font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-[15px] tracking-[0] leading-[normal]">
        <span className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-[15px] tracking-[0]">
          New User?{" "}
        </span>

        <button className="underline bg-transparent border-none cursor-pointer text-[#42424280]">
          Create Account
        </button>
      </div>

      <div className="absolute top-[281px] left-[218px] [font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-2xl tracking-[0] leading-[normal]">
        Welcome back! Please login to your <br />
        account.
      </div>

      <div className="absolute top-[434px] left-[218px] w-[504px] h-[72px]">
        <Input
          className="w-full h-full bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-9 [font-family:'Source_Code_Pro',Helvetica] font-normal text-[#42424280] text-xl tracking-[0] leading-[normal]"
          defaultValue="usersample@gmail.com"
          type="email"
        />
      </div>

      <div className="absolute top-[572px] left-[218px] w-[504px] h-[72px]">
        <Input
          className="w-full h-full bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-9 [font-family:'Source_Code_Pro',Helvetica] font-normal text-[#42424280] text-xl tracking-[0] leading-[normal]"
          defaultValue="***********"
          type="password"
        />
      </div>

      <Button className="absolute top-[704px] left-[218px] w-[504px] h-[72px] bg-[#00b7c2] rounded-[30px] border-0 border-none [font-family:'Inter',Helvetica] font-bold text-white text-2xl tracking-[0] leading-[normal] hover:bg-[#009ba5]">
        Login
      </Button>

      <img
        className="absolute w-0 h-0 top-[55.28%] left-[34.79%]"
        alt="Vector"
        src="/vector.svg"
      />

      <img
        className="absolute top-[413px] left-[1108px] w-[664px] h-[667px]"
        alt="Group"
        src="/group-6.png"
      />

      <div className="absolute top-[260px] left-[1194px] w-[496px] h-[92px]">
        <div className="absolute top-0 left-[93px] [font-family:'Inter',Helvetica] font-normal text-transparent text-[64px] leading-[normal]">
          <span className="font-bold text-white tracking-[6.14px]">MEDI</span>

          <span className="text-white tracking-[6.14px]">CARE</span>
        </div>

        <img
          className="absolute w-[15.93%] h-[84.78%] top-[13.04%] left-0"
          alt="Group"
          src="/group.png"
        />

        <div className="absolute top-[68px] left-24 [font-family:'Inter',Helvetica] font-semibold text-white text-xl tracking-[3.00px] leading-[normal] whitespace-nowrap">
          DENTAL CLINIC
        </div>
      </div>
    </div>
  );
};