import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export const LoginModule = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
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

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      console.log("User logged in successfully!");
      navigate("/dashboard");
    } catch (err) {
      // Log precise code/message to help diagnose config vs credential issues
      console.error("Login error:", { code: err?.code, message: err?.message });
      const code = err?.code || "";
      let msg = "Login failed. Please try again.";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") msg = "Incorrect email or password.";
      else if (code === "auth/user-not-found") msg = "No user found with this email.";
      else if (code === "auth/too-many-requests") msg = "Too many attempts. Please try again later or reset your password.";
      else if (code === "auth/network-request-failed") msg = "Network error. Check your internet connection.";
      else if (code === "auth/operation-not-allowed") msg = "Email/Password sign-in is disabled for this project. Enable it in Firebase Authentication settings.";
      else if (code === "auth/invalid-api-key" || code === "auth/invalid-project-id" || code === "auth/configuration-not-found") {
        msg = "App configuration seems invalid. Verify your .env Firebase values and restart the app.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white h-screen w-full flex overflow-hidden">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 max-w-2xl overflow-y-auto">
        <div className="w-full max-w-md mx-auto lg:mx-0 py-8">
          <h1 className="[font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-4xl lg:text-5xl mb-6">
            Login
          </h1>

          <p className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-lg lg:text-xl mb-8">
            Welcome back! Please login to your <br />
            account.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-lg lg:text-xl mb-2 block">
                  Email
                </Label>
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-16 lg:h-18 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 lg:px-9 [font-family:'Source_Code_Pro',Helvetica] font-normal text-[#42424280] text-lg lg:text-xl"
                  placeholder="username@gmail.com"
                  type="email"
                  required
                />
              </div>

              <div>
                <Label className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-lg lg:text-xl mb-2 block">
                  Password
                </Label>
                <Input
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-16 lg:h-18 bg-white rounded-[30px] border-2 border-solid border-[#00b7c2] px-6 lg:px-9 [font-family:'Source_Code_Pro',Helvetica] font-normal text-[#42424280] text-lg lg:text-xl"
                  placeholder="Password"
                  type="password"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button type="button" className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-sm lg:text-base underline bg-transparent border-none cursor-pointer">
                  Forgot Password?
                </button>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 lg:h-18 bg-[#00b7c2] rounded-[30px] border-0 [font-family:'Inter',Helvetica] font-bold text-white text-xl lg:text-2xl hover:bg-[#009ba5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>

          <div className="text-center mt-4">
            <span className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-sm lg:text-base">
              New User?{" "}
            </span>
            <button
              type="button"
              className="underline bg-transparent border-none cursor-pointer text-[#42424280] [font-family:'Oxygen',Helvetica] font-normal text-sm lg:text-base"
              onClick={() => navigate("/register")}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Dental Clinic Branding */}
      <div className="hidden lg:flex flex-1 bg-[#00b7c2] relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-32 -left-16 w-80 h-80 bg-[#ffffff1a] rounded-full"></div>
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-[#ffffff1a] rounded-full"></div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-8">
          {/* Logo and clinic name */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <img
                className="w-16 h-16 mr-4"
                alt="Group"
                src="/group.png"
              />
              <div className="[font-family:'Inter',Helvetica] text-white">
                <span className="font-bold text-4xl xl:text-5xl tracking-[6.14px]">MEDI</span>
                <span className="text-4xl xl:text-5xl tracking-[6.14px]">CARE</span>
              </div>
            </div>
            <div className="[font-family:'Inter',Helvetica] font-semibold text-white text-lg xl:text-xl tracking-[3.00px] text-center">
              DENTAL CLINIC
            </div>
          </div>

          {/* Doctor image */}
          <div className="relative flex-1 flex items-center">
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