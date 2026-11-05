
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import "../styles/ExploreGifts.css";

function ExploreGifts() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const giftsQuery = query(
          collection(db, "gifts"),
          where("status", "==", "Available")
        );

        const snapshot = await getDocs(giftsQuery);

        const giftList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setGifts(giftList);
      } catch (err) {
        console.error("Error fetching gifts:", err);
        setError("Unable to load gifts. Please try again.");
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

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch = gift.giftName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      gift.category === selectedCategory;

    return matchesSearch && matchesCategory;
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
      </div>

      {loading && <p className="explore-message">Loading gifts...</p>}

      {error && <p className="explore-error">{error}</p>}

      {!loading && !error && filteredGifts.length === 0 && (
        <p className="explore-message">
          No gifts found. Try another search or category.
        </p>
      )}

      <div className="gift-grid">
        {filteredGifts.map((gift) => (
          <div className="gift-card" key={gift.id}>
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

              <span className="gift-status">
                {gift.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExploreGifts;
