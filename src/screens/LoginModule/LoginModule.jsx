import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { auth } from "../../firebase";
import ConfirmModal from '../../components/modals/ConfirmModal';
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
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmailResent, setVerifyEmailResent] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

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
      const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = cred.user;
      if (user && !user.emailVerified) {
        // Prevent access and show modal instructing verification
        console.log('User email not verified:', user.email);
        setUnverifiedEmail(user.email || formData.email);
        setShowVerifyModal(true);
        setLoading(false);
        return;
      }
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

  const handleSendReset = async () => {
    setResetError('');
    setResetMessage('');
    const email = (resetEmail || '').trim();
    if (!email) { setResetError('Please enter an email address.'); return; }
    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, email);
      setResetMessage('If this account exists, a password reset email has been sent. Please check your inbox.');
    } catch (err) {
      console.error('Failed to send password reset', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-email') setResetError('Invalid email address.');
      else if (code === 'auth/user-not-found') setResetError('No account found with this email.');
      else setResetError('Failed to send reset email. Try again later.');
    } finally {
      setResetLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    setVerifyEmailResent(false);
    try {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
        setVerifyEmailResent(true);
      } else if (unverifiedEmail) {
        // attempt to sign-in silently to get currentUser
        try {
          // No secure way to send verification without signing in; advise user to login again after verifying.
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to resend verification email', err);
    }
  };
  return (
  <>
  <div className="bg-white h-screen w-full flex overflow-hidden relative">
      {/* Left side - Login Form (50%) */}
      <div className="w-full lg:w-1/2 box-border flex flex-col justify-center items-center px-8 lg:px-16 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-md mx-auto py-8">
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
                <button type="button" onClick={() => { setResetEmail(formData.email || ''); setShowResetModal(true); setResetMessage(''); setResetError(''); }} className="[font-family:'Oxygen',Helvetica] font-normal text-[#42424280] text-sm lg:text-base underline bg-transparent border-none cursor-pointer">
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

  {/* Optional vertical divider for visual balance */}
  <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-[#e5e7eb] z-10 pointer-events-none" />

  {/* Right side - Branding (50%) */}
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
  {/* Password Reset Modal */}
  <div className={`${showResetModal ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[70] flex items-center justify-center transition-opacity duration-200`} onClick={() => setShowResetModal(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className={`relative z-10 w-[480px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${showResetModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-2xl bg-[#00b7c2] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none"><path d="M12 11v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 11a5 5 0 10-10 0v3a2 2 0 002 2h6a2 2 0 002-2v-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="text-lg font-semibold">Reset Password</div>
          </div>
          <button onClick={() => setShowResetModal(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M6.28 5.22a.75.75 0 011.06 0L10 7.88l2.66-2.66a.75.75 0 111.06 1.06L11.06 9l2.66 2.66a.75.75 0 11-1.06 1.06L10 10.12l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 9 6.28 6.34a.75.75 0 010-1.12z" clipRule="evenodd"/></svg>
          </button>
        </div>
        <div className="px-6 pt-5 pb-6">
          {resetMessage ? (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">{resetMessage}</div>
          ) : null}
          {resetError ? (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{resetError}</div>
          ) : null}
          <label className="block text-sm text-gray-600 mb-2">Email</label>
          <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full h-12 rounded-md border border-gray-300 px-3" placeholder="you@example.com" type="email" />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setShowResetModal(false)} className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button onClick={handleSendReset} disabled={resetLoading} className="px-4 py-2 rounded-full bg-[#00b7c2] text-white">{resetLoading ? 'Sending…' : 'Send Reset Email'}</button>
          </div>
        </div>
      </div>
    </div>
    {/* Email verification modal for unverified accounts */}
    <ConfirmModal
      open={showVerifyModal}
      title="Email not verified"
      message={verifyEmailResent ? `A verification email was resent to ${unverifiedEmail}. Please check your inbox (and spam) and click the verification link. Then return and login.` : `Please verify your email address first. A verification link was sent to ${unverifiedEmail || formData.email} when you registered.`}
      onCancel={() => { setShowVerifyModal(false); setVerifyEmailResent(false); }}
      onConfirm={async () => { await handleResendVerification(); }}
      confirmText={verifyEmailResent ? 'Ok' : 'Resend verification'}
      cancelText='Close'
    />
  </>
  );
};