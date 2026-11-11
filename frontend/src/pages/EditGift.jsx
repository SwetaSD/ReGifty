import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/EditGift.css";

const categories = {
  "Food & Treats": [
    "Food & Dry Fruits",
    "Chocolates & Sweets",
  ],
  "Home & Living": [
    "Candles & Home Décor",
    "Home & Lifestyle",
    "Kitchen Appliances",
  ],
  "Electronics & Gadgets": [],
  "Lifestyle & Hobbies": [
    "Fashion & Accessories",
    "Books & Stationery",
    "Toys & Games",
    "Other Gifts",
  ],
};

function EditGift() {
  const navigate = useNavigate();
  const { giftId } = useParams();

  const [formData, setFormData] = useState({
    giftName: "",
    description: "",
    exchangeMode: "",
    category: "",
    subcategory: "",
    condition: "",
    estimatedValue: "",
    purchaseDate: "",
    expiryDate: "",
    preferredExchange: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // FETCH EXISTING GIFT
  useEffect(() => {
    let isMounted = true;

    const fetchGift = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error("Please log in to edit your gift.");
        }

        if (!giftId) {
          throw new Error("Gift listing ID is missing.");
        }

        const giftRef = doc(db, "gifts", giftId);
        const giftSnapshot = await getDoc(giftRef);

        if (!giftSnapshot.exists()) {
          throw new Error("Gift listing not found.");
        }

        const gift = giftSnapshot.data();

        if (gift.ownerUid !== currentUser.uid) {
          throw new Error(
            "You are not authorized to edit this gift."
          );
        }

        if (isMounted) {
          setFormData({
            giftName: gift.giftName || "",
            description: gift.description || "",
            exchangeMode: gift.exchangeMode || "",
            category: gift.category || "",
            subcategory: gift.subcategory || "",
            condition: gift.condition || "",
            estimatedValue: gift.estimatedValue ?? "",
            purchaseDate: gift.purchaseDate || "",
            expiryDate: gift.expiryDate || "",
            preferredExchange: gift.preferredExchange || "",
          });
        }
      } catch (err) {
        console.error("Fetch gift error:", err);

        if (isMounted) {
          setError(err.message || "Unable to load gift details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGift();

    return () => {
      isMounted = false;
    };
  }, [giftId]);

  // HANDLE INPUT CHANGES
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // HANDLE CATEGORY CHANGE
  const handleCategoryChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      category: e.target.value,
      subcategory: "",
    }));
  };

  // SAVE UPDATED GIFT
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please log in again.");
      return;
    }

    if (
      !formData.giftName.trim() ||
      !formData.description.trim() ||
      !formData.exchangeMode ||
      !formData.category ||
      !formData.condition ||
      !formData.estimatedValue ||
      Number(formData.estimatedValue) <= 0
    ) {
      setError("Please complete all required fields correctly.");
      return;
    }

    const selectedSubcategories = categories[formData.category] || [];

    if (
      selectedSubcategories.length > 0 &&
      !formData.subcategory
    ) {
      setError("Please select a subcategory.");
      return;
    }

    if (
      formData.purchaseDate &&
      formData.expiryDate &&
      formData.expiryDate < formData.purchaseDate
    ) {
      setError("Expiry date cannot be earlier than purchase date.");
      return;
    }

    try {
      setSaving(true);

      const giftRef = doc(db, "gifts", giftId);
      const giftSnapshot = await getDoc(giftRef);

      if (!giftSnapshot.exists()) {
        throw new Error("Gift listing no longer exists.");
      }

      if (giftSnapshot.data().ownerUid !== currentUser.uid) {
        throw new Error("You cannot edit another user's gift.");
      }

      await updateDoc(giftRef, {
        giftName: formData.giftName.trim(),
        description: formData.description.trim(),
        exchangeMode: formData.exchangeMode,
        category: formData.category,
        subcategory: formData.subcategory,
        condition: formData.condition,
        estimatedValue: Number(formData.estimatedValue),
        purchaseDate: formData.purchaseDate || null,
        expiryDate: formData.expiryDate || null,
        preferredExchange: formData.preferredExchange.trim(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("Gift details updated successfully!");

      setTimeout(() => {
        navigate("/my-gifts");
      }, 1200);

    } catch (err) {
      console.error("Update gift error:", err);
      setError(err.message || "Unable to update gift details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-gift-page">
        <p>Loading gift details...</p>
      </div>
    );
  }

  if (error && !formData.giftName) {
    return (
      <div className="edit-gift-page">
        <p className="edit-error">{error}</p>

        <button
          type="button"
          onClick={() => navigate("/my-gifts")}
        >
          Back to My Gifts
        </button>
      </div>
    );
  }

  return (
    <div className="edit-gift-page">
      <div className="edit-gift-container">

        <button
          type="button"
          className="edit-back-button"
          onClick={() => navigate("/my-gifts")}
        >
          ← Back to My Gifts
        </button>

        <h1>
          Edit Your <span>Gift</span>
        </h1>

        <p className="edit-gift-subtitle">
          Update your gift listing details on ReGifty.
        </p>

        <form onSubmit={handleSubmit}>

          <div className="edit-form-group">
            <label>Gift Name *</label>
            <input
              type="text"
              name="giftName"
              value={formData.giftName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="edit-form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
            />
          </div>

          <div className="edit-form-group">
            <label>Exchange Mode *</label>
            <select
              name="exchangeMode"
              value={formData.exchangeMode}
              onChange={handleChange}
              required
            >
              <option value="">Select exchange mode</option>
              <option value="Swap">Swap</option>
              <option value="Swap + Money">Swap + Money</option>
              <option value="Buy/Sell">Buy/Sell</option>
            </select>
          </div>

          <div className="edit-form-row">

            <div className="edit-form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                required
              >
                <option value="">Select category</option>

                {Object.keys(categories).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="edit-form-group">
              <label>Subcategory</label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                disabled={
                  !formData.category ||
                  categories[formData.category].length === 0
                }
              >
                <option value="">Select subcategory</option>

                {(categories[formData.category] || []).map(
                  (subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>

          <div className="edit-form-row">

            <div className="edit-form-group">
              <label>Condition *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                required
              >
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <div className="edit-form-group">
              <label>Estimated Value (₹) *</label>
              <input
                type="number"
                name="estimatedValue"
                min="1"
                value={formData.estimatedValue}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="edit-form-row">

            <div className="edit-form-group">
              <label>Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
              />
            </div>

            <div className="edit-form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="edit-form-group">
            <label>Preferred Exchange Items</label>
            <textarea
              name="preferredExchange"
              value={formData.preferredExchange}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="edit-existing-photos">
            Existing gift photos and invoice will be preserved.
          </div>

          {error && (
            <p className="edit-error">{error}</p>
          )}

          {success && (
            <p className="edit-success">{success}</p>
          )}

          <button
            type="submit"
            className="edit-save-button"
            disabled={saving}
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default EditGift;