
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import "../styles/ExploreGifts.css";
import { useNavigate } from "react-router-dom";

function ExploreGifts() {
  const navigate = useNavigate();

  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedExchangeMode, setSelectedExchangeMode] = useState("All");

  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error("Please log in to explore gifts.");
        }

        // Fetch available gifts
        const giftsQuery = query(
          collection(db, "gifts"),
          where("status", "==", "Available")
        );

        const snapshot = await getDocs(giftsQuery);

        const giftList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        // Hide gifts listed by the logged-in user
        const otherUsersGifts = giftList.filter(
          (gift) => gift.ownerUid !== currentUser.uid
        );

        // Fetch exchange requests sent by the logged-in user
        const requestsQuery = query(
          collection(db, "requests"),
          where("requesterUid", "==", currentUser.uid)
        );

        const requestsSnapshot = await getDocs(requestsQuery);

        // Match each request with its gift ID
        const requestStatusMap = {};

        requestsSnapshot.docs.forEach((requestDoc) => {
          const request = requestDoc.data();
          requestStatusMap[request.giftId] = request.status;
        });

        // Add request status to the corresponding gift
        const giftsWithRequestStatus = otherUsersGifts.map((gift) => ({
          ...gift,
          requestStatus: requestStatusMap[gift.id] || null,
        }));

        setGifts(giftsWithRequestStatus);
      } catch (err) {
        console.error("Error fetching gifts:", err);
        setError(err.message || "Unable to load gifts. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGifts();
  }, []);

  const categories = [
    "All",
    "Food & Treats",
    "Home & Living",
    "Electronics & Gadgets",
    "Lifestyle & Hobbies",
  ];

  const exchangeModes = [
    "All",
    "Swap",
    "Swap + Money",
    "Buy/Sell",
  ];

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch = gift.giftName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      gift.category === selectedCategory;

    const matchesExchangeMode =
      selectedExchangeMode === "All" ||
      gift.exchangeMode === selectedExchangeMode;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesExchangeMode
    );
  });

  return (
    <div className="explore-page">
      <header className="explore-header">
        <h1>Explore Gifts</h1>
        <p>Discover something special in your community.</p>
      </header>

      <div className="explore-controls">
        <input
          type="text"
          placeholder="Search gifts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={selectedExchangeMode}
          onChange={(e) => setSelectedExchangeMode(e.target.value)}
        >
          {exchangeModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode === "All" ? "All Exchange Modes" : mode}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="explore-message">Loading gifts...</p>
      )}

      {error && (
        <p className="explore-error">{error}</p>
      )}

      {!loading && !error && filteredGifts.length === 0 && (
        <p className="explore-message">
          No gifts found. Try another search or filter.
        </p>
      )}

      <div className="gift-grid">
        {filteredGifts.map((gift) => (
          <div
            className="gift-card"
            key={gift.id}
            onClick={() => navigate(`/gift/${gift.id}`)}
          >
            <img
              src={gift.imageUrls?.[0]}
              alt={gift.giftName}
            />

            <div className="gift-card-content">
              <h3>{gift.giftName}</h3>

              <p>{gift.category}</p>

              {gift.subcategory && (
                <p>{gift.subcategory}</p>
              )}

              <p className="gift-value">
                Estimated Value: ₹{gift.estimatedValue}
              </p>

              <div className="gift-status-container">
                <span className="gift-status">
                  {gift.status}
                </span>

                {gift.requestStatus && (
                  <span
                    className={`gift-request-status status-${gift.requestStatus.toLowerCase()}`}
                  >
                    {gift.requestStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExploreGifts;
