
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Login.css";
import {
  validatePhone,
  validateOTP,
} from "../utils/validation";

function Login() {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOTP = (e) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setMessage("");
    setOtp("");
    setOtpSent(true);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();

    if (!validateOTP(otp)) {
      setMessage("OTP must contain exactly 6 digits.");
      return;
    }

    setMessage(
      "OTP format is valid. Firebase verification will be added in Step 3."
    );
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

                  <button type="submit" className="auth-button">
                    Verify OTP
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setMessage("");
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
