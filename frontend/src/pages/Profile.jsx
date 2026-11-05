import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import "../styles/Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate("/login");
          return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          setError("Profile information could not be found.");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError("Unable to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const getInitials = (name) => {
    if (!name) return "U";

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  const maskPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "Not available";

    const digits = phoneNumber.replace(/\D/g, "");
    const lastFourDigits = digits.slice(-4);

    return `••••••${lastFourDigits}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Not available";

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setError("Unable to log out. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="profile-message">
        Loading your profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-message">
        <p>{error || "Profile information is unavailable."}</p>
        <button onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-navbar">
        <button
          className="profile-logo"
          onClick={() => navigate("/home")}
        >
          ReGifty
        </button>

        <button
          className="profile-home-button"
          onClick={() => navigate("/home")}
        >
          Back to Home
        </button>
      </header>

      <main className="profile-container">
        <div className="profile-heading">
          <span className="profile-label">YOUR ACCOUNT</span>
          <h1>My <span>Profile.</span></h1>
          <p>View your ReGifty account information.</p>
        </div>

        <section className="profile-card">
          <div className="profile-avatar">
            {getInitials(profile.fullName)}
          </div>

          <h2>{profile.fullName || "ReGifty User"}</h2>
          <p className="profile-subtitle">
            ReGifty Member
          </p>

          <div className="profile-details">
            <div className="profile-detail">
              <span>Full Name</span>
              <p>{profile.fullName || "Not available"}</p>
            </div>

            <div className="profile-detail">
              <span>Email Address</span>
              <p>{profile.email || "Not available"}</p>
            </div>

            <div className="profile-detail">
              <span>Phone Number</span>
              <p>{maskPhoneNumber(profile.phoneNumber)}</p>
            </div>

            <div className="profile-detail">
              <span>Account Created</span>
              <p>{formatDate(profile.createdAt)}</p>
            </div>

            <div className="profile-detail">
              <span>My Gifts</span>
              <p>Coming soon</p>
            </div>
          </div>

          <p className="profile-readonly-note">
            Your account information is read-only and cannot be
            edited from this page.
          </p>

          <button
            className="profile-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </section>
      </main>
    </div>
  );
}

export default Profile;