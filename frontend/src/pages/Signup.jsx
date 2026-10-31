import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Signup.css";

function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleContinue = (event) => {
    event.preventDefault();

    if (!/^[0-9]{10}$/.test(phone)) {
      setMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    setOtpSent(true);
    setMessage(
      "Demo mode: OTP delivery will be connected with Firebase later."
    );
  };

  const handleVerify = (event) => {
    event.preventDefault();

    if (!/^[0-9]{6}$/.test(otp)) {
      setMessage("Please enter a valid 6-digit OTP.");
      return;
    }

    setMessage(
      "Demo verification successful! Real OTP verification will be added with Firebase."
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
              <h2>Create account</h2>
              <p className="form-subtitle">
                Join the ReGifty community
              </p>

              {!otpSent ? (
                <form onSubmit={handleContinue}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength="10"
                    required
                  />

                  <button type="submit" className="auth-button">
                    Continue with OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerify}>
                  <p className="otp-instruction">
                    Enter the 6-digit OTP to verify your phone number.
                  </p>

                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, ""))
                    }
                    maxLength="6"
                    required
                  />

                  <button type="submit" className="auth-button">
                    Verify & Create Account
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

              {message && <p className="auth-message">{message}</p>}

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