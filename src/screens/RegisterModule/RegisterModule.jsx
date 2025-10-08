import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export const RegisterModule = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, "accounts", user.uid), {
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName,
        createdAt: new Date(),
        uid: user.uid
      });

      console.log("User registered successfully!");
      
      // Navigate to login page after successful registration
      navigate("/");
      
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
  <div className="bg-white h-screen w-full flex overflow-hidden relative">
  {/* Left side - Registration Form */}
  <div className="w-full lg:w-1/2 box-border flex flex-col justify-center items-center px-8 lg:px-16 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto lg:mx-0 py-8">
          <h1 className="[font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-3xl sm:text-4xl lg:text-5xl mb-3">
            Create Account
          </h1>

          <p className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base sm:text-lg lg:text-xl mb-8 max-w-lg">
            Welcome! Please input all the important details to create account.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base lg:text-lg mb-2 block">
                  First Name
                </Label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 [font-family:'Source_Code_Pro',Helvetica] text-[#42424280]"
                  placeholder="First Name"
                  type="text"
                  required
                />
              </div>

              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base lg:text-lg mb-2 block">
                  Email
                </Label>
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 [font-family:'Source_Code_Pro',Helvetica] text-[#42424280]"
                  placeholder="user@gmail.com"
                  type="email"
                  required
                />
              </div>

              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base lg:text-lg mb-2 block">
                  Last Name
                </Label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 [font-family:'Source_Code_Pro',Helvetica] text-[#42424280]"
                  placeholder="Last Name"
                  type="text"
                  required
                />
              </div>

              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base lg:text-lg mb-2 block">
                  Password
                </Label>
                <Input
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 [font-family:'Source_Code_Pro',Helvetica] text-[#42424280]"
                  placeholder="*************"
                  type="password"
                  required
                />
              </div>

              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base lg:text-lg mb-2 block">
                  Middle Name
                </Label>
                <Input
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 [font-family:'Source_Code_Pro',Helvetica] text-[#42424280]"
                  placeholder="Middle Name"
                  type="text"
                />
              </div>

              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-base lg:text-lg mb-2 block">
                  Confirm Password
                </Label>
                <Input
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 [font-family:'Source_Code_Pro',Helvetica] text-[#42424280]"
                  placeholder="*************"
                  type="password"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-1/2 h-14 mt-8 bg-[#00b7c2] rounded-[30px] border-0 [font-family:'Inter',Helvetica] font-bold text-white text-lg lg:text-xl hover:bg-[#009ba5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <span className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-xs lg:text-sm">
              Already had an account?{" "}
            </span>
            <button
              className="underline bg-transparent border-none cursor-pointer text-[#42424280] [font-family:'Oxygen',Helvetica] font-normal text-xs lg:text-sm"
              onClick={() => navigate("/")}
            >
              Login
            </button>
          </div>
        </div>
      </div>

  {/* Optional vertical divider for visual balance */}
  <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-[#e5e7eb] z-10 pointer-events-none" />

      {/* Right side - Branding (exact copy from Login layout) */}
      <div className="hidden lg:flex w-1/2 box-border bg-[#00b7c2] relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-32 -left-16 w-80 h-80 bg-[#ffffff1a] rounded-full"></div>
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-[#ffffff1a] rounded-full"></div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-between h-full w-full px-8 pt-8">
          {/* Logo and clinic name */}
          <div className="mt-28 mb-2">
            <div className="flex items-center justify-center mb-1 space-x-2">
              <img
                className="w-16 h-16 mr-3"
                alt="Group"
                src="/group.png"
              />
              <div className="[font-family:'Inter',Helvetica] text-white">
                <div className="inline-block text-left mx-auto">
                  <div className="font-bold text-4xl xl:text-5xl tracking-[4px]">MEDICARE</div>
                  <div className="font-semibold text-white text-sm xl:text-base tracking-[2px] mt-1">DENTAL CLINIC</div>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor image (anchored to bottom so it fits flush) */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end overflow-hidden pointer-events-none">
            <img
              className="w-full max-w-md xl:max-w-lg object-contain"
              alt="Dental Professional"
              src="/group-6.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
