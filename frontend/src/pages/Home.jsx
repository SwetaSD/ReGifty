
import "../styles/Home.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const categories = [
  {
    name: "Food & Treats",
    image:
      "https://images.openai.com/static-rsc-4/T0RQAB9hVOcYPbncoGY603_H25YN97778nxXLB3WNX_Y84GUxoLr2JndNNjd4qUCnehwTCd4Lvws7P2wG8zxcIxpXDBUL2ey4FsIAeoi72sX4bGa9wNEfPhdZfDEpLb-qNS2JAJOjA1Qwfx7rmISY6-IQshxiqceeOwcjCPnzKo?purpose=inline",
    description: "Delightful treats waiting for a new home.",
    icon: "✦",
  },
  {
    name: "Home & Living",
    image:
      "https://images.openai.com/static-rsc-4/guG-1jA6TlvtseDkniUO9FNt_rAXFqoALAeCKDwmqJzsv_XMrwORAbiOngcTUUczecnBWcb758pk7eX427l60oCawVBvVQ8neUr9jsbm0p7UkGR5RwCy0G00weWr1wCdl-yy_aQKSDgnWxt04ZtMbRfZsR3BRly5NNljQl_hDSI?purpose=inline",
    description: "Make every corner a little more special.",
    icon: "⌂",
  },
  {
    name: "Electronics & Gadgets",
    image:
      "https://images.openai.com/static-rsc-4/gfJGFbsPuiknm94UsQJfBDeQc1HWQ-d0zajnkn7JVI1yHr0cLw56CkVzLBTrsr2SjCuPf1FaN3m_JePDZYi_vcqrDMMCahfnFTApORnCdeAXeI-C7bfFgme1IiqTS-CnAoFSmebPElsUW46kDTqdjAdlq-sEjAP98gqXvkU-w0?purpose=inline",
    description: "Discover gadgets worth exchanging.",
    icon: "⌘",
  },
  {
    name: "Lifestyle & Hobbies",
    image:
      "https://images.openai.com/static-rsc-4/iKDb_Lysy2CzUKBRAk_n90NspcAmkzzoksliH-lMVXviQZ43_gj6BFoFU5BgddkbJZshFzyInxjluHau58gXDhvTyP0BaxK6ZPDgwiX8y1VKp2CB4oB4xFsaszQQ1WEv6-ECr30mWXvjMEGm64LV_uQz3mLuo?purpose=inline",
    description: "Find something that matches your interests.",
    icon: "♡",
  },
];

function Home() {
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    let buyerRequests = [];
    let sellerRequests = [];

    const updateNotificationCount = () => {
      const allRequests = new Map();

      [...buyerRequests, ...sellerRequests].forEach((request) => {
        allRequests.set(request.id, request);
      });

      let count = 0;

      allRequests.forEach((request) => {
        if (request.status !== "Accepted") return;

        const isBuyer = request.requesterUid === currentUser.uid;
        const isSeller = request.ownerUid === currentUser.uid;

        if (!isBuyer && !isSeller) return;

        const myConfirmation = isBuyer
          ? request.buyerConfirmed === true
          : request.sellerConfirmed === true;

        const otherConfirmation = isBuyer
          ? request.sellerConfirmed === true
          : request.buyerConfirmed === true;

        if (!myConfirmation && otherConfirmation) {
          count++;
        }
      });

      setNotificationCount(count);
    };

    const buyerQuery = query(
      collection(db, "requests"),
      where("requesterUid", "==", currentUser.uid)
    );

    const sellerQuery = query(
      collection(db, "requests"),
      where("ownerUid", "==", currentUser.uid)
    );

    const unsubscribeBuyer = onSnapshot(
      buyerQuery,
      (snapshot) => {
        buyerRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        updateNotificationCount();
      },
      (error) => console.error("Buyer notification listener:", error)
    );

    const unsubscribeSeller = onSnapshot(
      sellerQuery,
      (snapshot) => {
        sellerRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        updateNotificationCount();
      },
      (error) => console.error("Seller notification listener:", error)
    );

    return () => {
      unsubscribeBuyer();
      unsubscribeSeller();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="home-page">
      {/* NAVBAR */}
      <header className="home-navbar">
        <a href="#top" className="home-logo">
          ReGifty
        </a>

        <nav className="home-nav-links">
          <a href="#categories">Explore</a>

          <button
            type="button"
            onClick={() => navigate("/my-gifts")}
            className="nav-link-button"
          >
            My Gifts
          </button>

          <button
            type="button"
            onClick={() => navigate("/chats")}
            className="nav-link-button"
          >
            Chats
          </button>

          <button
            type="button"
            onClick={() => navigate("/incoming-requests")}
            className="nav-link-button notification-nav-button"
          >
            Incoming Requests

            {notificationCount > 0 && (
              <span className="request-notification-badge">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>
        </nav>

        <div className="home-nav-right">
          <span className="home-tagline">
            A new home for every gift <span>♧</span>
          </span>

          <button
            className="profile-button"
            aria-label="Profile"
            onClick={() => navigate("/profile")}
          >
            P
          </button>

          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-label">
              ♧ GIVE A GIFT A SECOND LIFE
            </span>

            <h1>
              Your unused gifts deserve
              <span> another story.</span>
            </h1>

            <p>
              Discover something special, exchange what you don't need,
              and give every gift a second life.
            </p>

            <div className="hero-buttons">
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/explore")}
              >
                Start Exploring <span>→</span>
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/add-gift")}
              >
                List a Gift <span>+</span>
              </button>
            </div>

            <div className="hero-note">
              <span>✦</span> One person's unused gift is another person's treasure.
            </div>
          </div>

          <div className="hero-image-container">
            <img
              src="https://images.openai.com/static-rsc-4/K3Uw6Y4_iNQIYNX8eqUVJTy1rZ4Jywb2cZFJc_5eHVQq5KOTQhQuVfFCnON_UVP65WV_fVy2HzcTss5HiENLSwFwKdYhI6PExRhxWVS8wD9Ytftjcr_-V7OJaBcdHE-XNhwxFsDR6LKsJD2SYGztW8bVrL8rHkFueIOH4VjFSyAb6l0ZXIBX-Tliq1W8LWjt?purpose=inline"
              alt="Black gift box with a golden ribbon"
            />
            <div className="hero-image-caption">
              <span>GIVE. EXCHANGE. REPEAT.</span>
              <p>Every gift deserves another story.</p>
            </div>
          </div>
        </section>

        {/* EXCHANGE OPTIONS */}
        <section className="exchange-section">
          <div className="section-heading">
            <span className="section-label">YOUR CHOICE</span>
            <h2>Three ways to <span>ReGift.</span></h2>
            <p>Choose the exchange that works best for you.</p>
          </div>

          <div className="exchange-grid">
            <div className="exchange-card">
              <div className="exchange-icon">⇄</div>
              <h3>Swap</h3>
              <p>Exchange gifts directly with someone who has what you want.</p>
              <a href="#categories">Explore swaps →</a>
            </div>

            <div className="exchange-card featured-exchange">
              <div className="exchange-icon">₹</div>
              <h3>Swap + Money</h3>
              <p>Exchange gifts and add money to balance the difference.</p>
              <a href="#categories">Explore exchanges →</a>
            </div>

            <div className="exchange-card">
              <div className="exchange-icon">♧</div>
              <h3>Buy / Sell</h3>
              <p>Find a gift you love or sell something you no longer need.</p>
              <a href="#categories">Explore marketplace →</a>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="categories-section" id="categories">
          <div className="section-heading">
            <span className="section-label">FIND YOUR NEXT TREASURE</span>
            <h2>Explore <span>Categories.</span></h2>
            <p>Something special is waiting to be discovered.</p>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <a
                href="#recently-listed"
                className="category-card"
                key={category.name}
              >
                <img src={category.image} alt={category.name} />

                <div className="category-overlay">
                  <span className="category-icon">{category.icon}</span>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <span className="category-explore">
                    Explore <span>→</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* RECENTLY LISTED GIFTS */}
        <section className="recent-section" id="recently-listed">
          <div className="recent-heading">
            <div className="section-heading">
              <span className="section-label">DISCOVER SOMETHING NEW</span>
              <h2>Recently <span>Listed.</span></h2>
              <p>Find something you didn't know you needed.</p>
            </div>

            <button
              type="button"
              className="view-all-link"
              onClick={() => navigate("/explore")}
            >
              View all gifts →
            </button>
          </div>

          <div className="empty-gifts">
            <div className="empty-gifts-icon">♧</div>
            <h3>New gifts are on their way!</h3>
            <p>
              Gifts listed by the ReGifty community will appear here.
              Keep exploring and find your next favourite thing.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span className="section-label">SIMPLE. THOUGHTFUL. FUN.</span>
            <h2>How ReGifty <span>Works.</span></h2>
            <p>Giving your gifts a new home is easier than you think.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">01</span>
              <div className="step-icon">＋</div>
              <h3>List a Gift</h3>
              <p>Upload a gift you no longer need and share its details.</p>
            </div>

            <div className="step-card">
              <span className="step-number">02</span>
              <div className="step-icon">⌕</div>
              <h3>Find a Match</h3>
              <p>Explore gifts and discover something you would love.</p>
            </div>

            <div className="step-card">
              <span className="step-number">03</span>
              <div className="step-icon">♡</div>
              <h3>Connect</h3>
              <p>Chat with the other person and agree on an exchange.</p>
            </div>

            <div className="step-card">
              <span className="step-number">04</span>
              <div className="step-icon">✧</div>
              <h3>ReGift!</h3>
              <p>Complete the exchange and give your gift a new home.</p>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="bottom-cta" id="list-a-gift">
          <div>
            <span className="section-label">READY TO REGIFT?</span>
            <h2>Let your gifts begin a new story.</h2>
            <p>Someone out there might be looking for exactly what you have.</p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/add-gift")}
          >
            List a Gift <span>+</span>
          </button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="home-footer">
        <a href="#top" className="home-logo">ReGifty</a>
        <p>A new home for every gift ♧</p>
        <span>© 2026 ReGifty. Give again. Receive differently.</span>
      </footer>
    </div>
  );
}

export default Home;
