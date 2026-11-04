import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Login.css";

import { auth, db } from "../firebase/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import {
  validatePhone,
  validateOTP,
} from "../utils/validation";

import {
  createRecaptchaVerifier,
  sendPhoneOTP,
  resetRecaptchaVerifier,
} from "../firebase/phoneAuth";

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmationResultRef = useRef(null);
  const recaptchaRef = useRef(null);


  // Send Firebase OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Clear an older reCAPTCHA instance
      // Reset the previous shared reCAPTCHA instance
      resetRecaptchaVerifier();
      recaptchaRef.current = null;

      const verifier = createRecaptchaVerifier();
      recaptchaRef.current = verifier;
      

      const formattedPhone = `+91${phone}`;

      const confirmation = await sendPhoneOTP(
        formattedPhone,
        verifier
      );

      confirmationResultRef.current = confirmation;

      setOtp("");
      setOtpSent(true);
      setMessage("OTP sent successfully!");

    } catch (error) {
      console.error("Firebase Login OTP error:", error);

      setMessage(
        error.code === "auth/invalid-phone-number"
          ? "Invalid phone number. Please check your number."
          : error.code === "auth/too-many-requests"
            ? "Too many attempts. Please try again later."
            : error.code === "auth/billing-not-enabled"
              ? "SMS billing is not enabled. Use a configured Firebase test number."
              : error.code === "auth/captcha-check-failed"
                ? "reCAPTCHA verification failed. Please try again."
                : "Unable to send OTP. Please try again."
      );

      resetRecaptchaVerifier();
      recaptchaRef.current = null;

    } finally {
      setLoading(false);
    }
  };

  // Verify Firebase OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!validateOTP(otp)) {
      setMessage("OTP must contain exactly 6 digits.");
      return;
    }

    if (!confirmationResultRef.current) {
      setMessage("Please request a new OTP first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result =
        await confirmationResultRef.current.confirm(otp);

      console.log("Firebase authenticated user:", result.user.uid);

      // Check whether the user has a ReGifty profile.
      const userRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        setMessage("Authentication successful! Welcome to ReGifty.");
        navigate("/home");
      } else {
        await signOut(auth);
        setMessage("Account not found. Please sign up first.");
      }

      confirmationResultRef.current = null;

      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }

    } catch (error) {
      console.error("Firebase OTP verification error:", error);

      setMessage(
        error.code === "auth/invalid-verification-code"
          ? "Incorrect OTP. Please enter the correct code."
          : error.code === "auth/code-expired"
            ? "OTP expired. Please request a new OTP."
            : "Authentication failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  // Change phone number
  const handleChangePhone = () => {
    confirmationResultRef.current = null;

    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }

    setOtpSent(false);
    setOtp("");
    setMessage("");
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">

        <header className="auth-header">
          <Link to="/" className="brand-name">
            ReGifty
          </Link>

          <span className="brand-tagline">
            A new home for every gift <span>♧</span>
          </span>
        </header>

        <main className="auth-content">

          <section className="visual-panel">
            <img
              className="gift-image"
              src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=85"
              alt="Beautifully wrapped gifts"
            />

            <div className="visual-caption">
              <h1>Give again. Receive differently.</h1>

              <p>
                Discover gifts, exchange what you don't need and find
                something you'll love.
              </p>

              <span className="decorative-gift">♧</span>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-content">

              <h2>Welcome back!</h2>

              <p className="form-subtitle">
                Login to continue your journey
              </p>

              {!otpSent ? (
                <form onSubmit={handleSendOTP}>

                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10 digit Phone Number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    maxLength={10}
                    required
                  />

                  <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                  >
                    {loading ? "Sending OTP..." : "Continue with OTP"}
                  </button>

                </form>
              ) : (
                <form onSubmit={handleVerifyOTP}>

                  <p className="otp-instruction">
                    Enter the 6-digit OTP sent to +91 {phone}
                  </p>

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    required
                  />

                  <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={handleChangePhone}
                    disabled={loading}
                  >
                    Change phone number
                  </button>

                </form>
              )}

              <div id="recaptcha-container"></div>

              {message && (
                <p className="auth-message">{message}</p>
              )}

              <p className="switch-auth">
                Don't have an account? <Link to="/signup">Sign Up</Link>
              </p>

              <p className="privacy-note">
                Your personal contact details will not be visible to other
                users.
              </p>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default Login;