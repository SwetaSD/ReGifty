
import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Signup.css";

import { db } from "../firebase/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";

import { getAdditionalUserInfo } from "firebase/auth";



import {
  validateName,
  validateEmail,
  validatePhone,
  validateOTP,
} from "../utils/validation";

import {
  createRecaptchaVerifier,
  sendPhoneOTP,
  resetRecaptchaVerifier,
} from "../firebase/phoneAuth";

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmationResultRef = useRef(null);
  const recaptchaRef = useRef(null);

  // Send real OTP through Firebase
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!validateName(fullName)) {
      setMessage("Please enter a valid full name.");
      return;
    }

    if (!validateEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!validatePhone(phone)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Clear any previous reCAPTCHA instance
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

    }
    catch (error) {
      console.error("Firebase OTP error code:", error.code);
      console.error("Firebase OTP error message:", error.message);

      setMessage(
        error.code === "auth/invalid-phone-number"
          ? "Invalid phone number. Check your number."
          : error.code === "auth/too-many-requests"
            ? "Too many attempts. Try again later."
            : error.code === "auth/quota-exceeded"
              ? "Firebase SMS quota exceeded. Try again later."
              : error.code === "auth/captcha-check-failed"
                ? "reCAPTCHA failed. Please try again."
                : error.message
      );

      resetRecaptchaVerifier();
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  // Verify real OTP through Firebase
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!validateOTP(otp)) {
      setMessage("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!confirmationResultRef.current) {
      setMessage("Please request a new OTP first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await confirmationResultRef.current.confirm(otp);

      const user = result.user;
      const normalizedEmail = email.trim().toLowerCase();



      // Create a unique email index and user profile atomically.
      const emailId = encodeURIComponent(normalizedEmail);

      const emailRef = doc(db, "emailIndex", emailId);
      const userRef = doc(db, "users", user.uid);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const emailDoc = await transaction.get(emailRef);

        // Check whether this phone number already has a ReGifty profile.
        if (userDoc.exists()) {
          throw new Error("PHONE_ALREADY_REGISTERED");
        }

        // Check whether this email is already registered.
        if (emailDoc.exists()) {
          throw new Error("EMAIL_ALREADY_REGISTERED");
        }

        transaction.set(emailRef, {
          uid: user.uid,
        });

        transaction.set(userRef, {
          fullName: fullName.trim(),
          email: normalizedEmail,
          phoneNumber: user.phoneNumber || `+91${phone}`,
          firebaseUid: user.uid,
          createdAt: serverTimestamp(),
        });
      });

      setMessage("Signup successful! Welcome to ReGifty.");
      navigate("/home");

      confirmationResultRef.current = null;

      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }

    } catch (error) {
      console.error("OTP verification error:", error);

      if (error.message === "PHONE_ALREADY_REGISTERED") {
        setMessage("This phone number is already registered. Please login.");
      } else if (error.message === "EMAIL_ALREADY_REGISTERED") {
        setMessage("This email is already registered. Please login.");
      } else if (error.code === "auth/invalid-verification-code") {
        setMessage("Incorrect OTP. Please enter the correct code.");
      } else if (error.code === "auth/code-expired") {
        setMessage("OTP expired. Please request a new OTP.");
      } else {
        setMessage("Signup failed. Please try again.");
      }

    } finally {
      setLoading(false);
    }
  };

  // Return to the original signup form
  const handleChangePhone = () => {
    confirmationResultRef.current = null;

    resetRecaptchaVerifier();
    recaptchaRef.current = null;

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

              <h2>Create account</h2>

              <p className="form-subtitle">
                Join the ReGifty community
              </p>

              {!otpSent ? (
                <form onSubmit={handleSendOTP}>

                  <input
                    type="text"
                    placeholder="Enter your Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <input
                    type="email"
                    placeholder="Enter your Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10-digit Phone Number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
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
                    placeholder="Enter 6-digit OTP"
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
                    {loading ? "Verifying..." : "Verify & Create Account"}
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

              {/* Firebase reCAPTCHA container */}
              <div id="recaptcha-container"></div>

              {message && (
                <p className="auth-message">{message}</p>
              )}

              <p className="switch-auth">
                Already a member? <Link to="/login">Login</Link>
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

export default Signup;