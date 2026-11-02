
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Signup.css";

import {
  validateName,
  validateEmail,
  validatePhone,
  validateOTP,
} from "../utils/validation";

function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  // Validate signup details and show OTP screen
  const handleSendOTP = (e) => {
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

    setMessage("");
    setOtp("");
    setOtpSent(true);
  };

  // Validate OTP format (actual Firebase verification comes in Step 3)
  const handleVerifyOTP = (e) => {
    e.preventDefault();

    if (!validateOTP(otp)) {
      setMessage("Please enter a valid 6-digit OTP.");
      return;
    }

    setMessage(
      "OTP format is valid. Real OTP verification will be added with Firebase."
    );
  };
  // const handleChangePhone = () => {
  //   setOtpSent(false);
  //   setOtp("");
  //   setMessage("");
  // };

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

                  <button type="submit" className="auth-button">
                    Continue with OTP
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

                  <button type="submit" className="auth-button">
                    Verify & Create Account
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      window.location.assign("/signup");
                    }}
                  >
                    Change phone number
                  </button>

                </form>
              )}

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
