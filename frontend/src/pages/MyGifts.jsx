import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase";

import "../styles/MyGifts.css";

function MyGifts() {
  const navigate = useNavigate();

  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // FETCH LOGGED-IN USER'S GIFTS
  useEffect(() => {
    let isMounted = true;

    const fetchMyGifts = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser = auth.currentUser;

        if (!currentUser) {
          if (isMounted) {
            setError("Please log in to view your gifts.");
          }
          return;
        }

        const giftsQuery = query(
          collection(db, "gifts"),
          where("ownerUid", "==", currentUser.uid)
        );

        const snapshot = await getDocs(giftsQuery);

        const giftList = snapshot.docs.map((giftDoc) => ({
          id: giftDoc.id,
          ...giftDoc.data(),
        }));

        if (isMounted) {
          setGifts(giftList);
        }
      } catch (err) {
        console.error("Fetch gifts error:", err);

        if (isMounted) {
          setError("Unable to load your gifts. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMyGifts();

    return () => {
      isMounted = false;
    };
  }, []);

  // CHANGE GIFT STATUS
  const handleStatusChange = async (giftId, newStatus) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please log in again.");
      return;
    }

    const selectedGift = gifts.find(
      (gift) => gift.id === giftId
    );

    if (!selectedGift || selectedGift.ownerUid !== currentUser.uid) {
      alert("You are not authorized to update this gift.");
      return;
    }

    const previousStatus = selectedGift.status;

    // Update UI immediately, including dropdown colour
    setGifts((prevGifts) =>
      prevGifts.map((gift) =>
        gift.id === giftId
          ? { ...gift, status: newStatus }
          : gift
      )
    );

    try {
      await updateDoc(doc(db, "gifts", giftId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Status update error:", err);

      // Restore previous status if update fails
      setGifts((prevGifts) =>
        prevGifts.map((gift) =>
          gift.id === giftId
            ? { ...gift, status: previousStatus }
            : gift
        )
      );

      alert("Unable to update gift status. Please try again.");
    }
  };

  //DELETE GIFT LISTING AND ITS SUPABASE FILES
  const handleDelete = async (giftId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this gift listing? This action cannot be undone."
    );

    if (!confirmed) return;

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please log in again.");
      return;
    }

    try {
      setDeletingId(giftId);
      setError("");

      const selectedGift = gifts.find(
        (gift) => gift.id === giftId
      );

      if (
        !selectedGift ||
        selectedGift.ownerUid !== currentUser.uid
      ) {
        throw new Error(
          "You are not authorized to delete this gift."
        );
      }

      // 1. DELETE GIFT PHOTOS FROM SUPABASE
      const imagePaths = selectedGift.imagePaths || [];
      console.log("Gift ID:", giftId);
      console.log("Image paths from Firestore:", imagePaths);
      console.log("Invoice path from Firestore:", selectedGift.invoicePath);


      if (imagePaths.length > 0) {
        const { data, error: imageError } = await supabase.storage
          .from("gift-images")
          .remove(imagePaths);

        console.log("Supabase image deletion response:", data);
        console.log("Supabase image deletion error:", imageError);

        if (imageError) {
          throw new Error(
            "Unable to delete gift photos: " + imageError.message
          );
        }
      } else {
        console.error("No image paths found in Firestore!");
        throw new Error("Image paths are missing. Gift was not deleted.");
      }

      // 2. DELETE INVOICE FROM SUPABASE
      if (selectedGift.invoicePath) {
        const { error: invoiceError } = await supabase.storage
          .from("gift-invoices")
          .remove([selectedGift.invoicePath]);

        if (invoiceError) {
          throw new Error(
            "Unable to delete gift invoice: " + invoiceError.message
          );
        }
      }

      // 3. DELETE GIFT DOCUMENT FROM FIRESTORE
      await deleteDoc(doc(db, "gifts", giftId));

      // 4. REMOVE GIFT CARD FROM UI
      setGifts((previousGifts) =>
        previousGifts.filter((gift) => gift.id !== giftId)
      );

    } catch (err) {
      console.error("Delete gift error:", err);
      setError(err.message || "Unable to delete this gift.");
    } finally {
      setDeletingId(null);
    }
  };

  // GET STATUS CLASS
  const getStatusClass = (status) => {
    switch (status) {
      case "Available":
        return "status-available";

      case "Not Available":
        return "status-unavailable";

      case "Sold":
        return "status-sold";

      default:
        return "status-available";
    }
  };

  return (
    <div className="my-gifts-page">

      {/* HEADER */}
      <header className="my-gifts-header">

        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/home")}
        >
          ← Back to Home
        </button>

        <h1>
          My <span>Gifts</span>
        </h1>

        <p>
          Manage the gifts you have listed on ReGifty.
        </p>

        <button
          type="button"
          className="add-new-gift"
          onClick={() => navigate("/add-gift")}
        >
          + List a New Gift
        </button>

      </header>

      {/* LOADING */}
      {loading && (
        <p className="my-gifts-message">
          Loading your gifts...
        </p>
      )}

      {/* ERROR */}
      {error && (
        <p className="my-gifts-error">
          {error}
        </p>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && gifts.length === 0 && (
        <div className="no-gifts">

          <div className="no-gifts-icon">
            ♧
          </div>

          <h2>
            You haven't listed any gifts yet.
          </h2>

          <p>
            Give your unused gifts a new home!
          </p>

          <button
            type="button"
            onClick={() => navigate("/add-gift")}
          >
            List Your First Gift
          </button>

        </div>
      )}

      {/* GIFT LIST */}
      {!loading && gifts.length > 0 && (
        <div className="my-gifts-grid">

          {gifts.map((gift) => {
            const currentStatus = gift.status || "Available";

            return (
              <div className="my-gift-card" key={gift.id}>

                {/* GIFT IMAGE */}
                {gift.imageUrls && gift.imageUrls.length > 0 ? (
                  <img
                    src={gift.imageUrls[0]}
                    alt={gift.giftName || "Gift"}
                  />
                ) : (
                  <div className="my-gift-no-image">
                    No image available
                  </div>
                )}

                <div className="my-gift-content">

                  <h3>
                    {gift.giftName || "Untitled Gift"}
                  </h3>

                  <p>
                    {gift.category || "Uncategorized"}
                  </p>

                  <p>
                    Estimated Value: ₹
                    {gift.estimatedValue ?? "N/A"}
                  </p>

                  {/* STATUS DROPDOWN */}
                  <select
                    className={`gift-status-dropdown ${getStatusClass(currentStatus)}`}
                    value={currentStatus}
                    onChange={(e) =>
                      handleStatusChange(gift.id, e.target.value)
                    }
                    aria-label={`Change status of ${gift.giftName || "gift"}`}
                  >
                    <option value="Available">
                      Status: Available
                    </option>

                    <option value="Not Available">
                      Status: Not Available
                    </option>

                    <option value="Sold">
                      Status: Sold
                    </option>
                  </select>

                  {/* ACTION BUTTONS */}
                  <div className="my-gift-actions">

                    <button
                      type="button"
                      className="edit-gift-btn"
                      onClick={() =>
                        navigate("/edit-gift/" + gift.id)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-gift-btn"
                      disabled={deletingId === gift.id}
                      onClick={() => handleDelete(gift.id)}
                    >
                      {deletingId === gift.id ? "Deleting..." : "Delete"}
                    </button>

                  </div>

                </div>
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

export default MyGifts;