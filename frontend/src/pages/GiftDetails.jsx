
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import "../styles/GiftDetails.css";

function GiftDetails() {
  const { giftId } = useParams();
  const navigate = useNavigate();

  const [gift, setGift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);

  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [existingRequest, setExistingRequest] = useState(null);

  // Fetch gift details
  useEffect(() => {
    const fetchGiftDetails = async () => {
      try {
        const giftRef = doc(db, "gifts", giftId);
        const giftSnapshot = await getDoc(giftRef);

        if (!giftSnapshot.exists()) {
          setError("This gift listing could not be found.");
          return;
        }

        setGift({
          id: giftSnapshot.id,
          ...giftSnapshot.data(),
        });
      } catch (err) {
        console.error("Error fetching gift details:", err);
        setError("Unable to load gift details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGiftDetails();
  }, [giftId]);

  // Check whether the user has already requested this gift
  useEffect(() => {
    const checkExistingRequest = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser || !gift) return;

        if (gift.ownerUid === currentUser.uid) return;

        const requestsQuery = query(
          collection(db, "requests"),
          where("giftId", "==", giftId),
          where("requesterUid", "==", currentUser.uid)
        );

        const snapshot = await getDocs(requestsQuery);

        if (!snapshot.empty) {
          const requestDoc = snapshot.docs[0];

          setExistingRequest({
            id: requestDoc.id,
            ...requestDoc.data(),
          });
        }
      } catch (err) {
        console.error("Error checking existing request:", err);
      }
    };

    checkExistingRequest();
  }, [gift, giftId]);

  // Send exchange request
  const handleExchangeRequest = async () => {
    try {
      setRequestLoading(true);
      setRequestMessage("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setRequestMessage("Please log in to send a request.");
        return;
      }

      if (gift.ownerUid === currentUser.uid) {
        setRequestMessage("You cannot request your own gift.");
        return;
      }

      if (existingRequest) {
        setRequestMessage("");
        return;
      }

      if (gift.status !== "Available") {
        setRequestMessage("This gift is no longer available.");
        return;
      }

      const requestRef = await addDoc(collection(db, "requests"), {
        giftId: giftId,
        giftName: gift.giftName,
        requesterUid: currentUser.uid,
        ownerUid: gift.ownerUid,
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setExistingRequest({
        id: requestRef.id,
        status: "Pending",
      });

      setRequestMessage(
        "Your exchange request has been sent successfully!"
      );
    } catch (err) {
      console.error("Error sending exchange request:", err);
      setRequestMessage("Unable to send request. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gift-details-message">
        Loading gift details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gift-details-message">
        <p>{error}</p>
        <button onClick={() => navigate("/explore")}>
          Back to Explore
        </button>
      </div>
    );
  }

  const images = gift.imageUrls || [];

  const formatDate = (date) => {
    if (!date) return "Not provided";

    return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isGiftOwner = gift.ownerUid === auth.currentUser?.uid;

  return (
    <div className="gift-details-page">
      <button
        className="back-to-explore"
        onClick={() => navigate("/explore")}
      >
        ← Back to Explore
      </button>

      <div className="gift-details-container">
        <div className="gift-details-gallery">
          {images.length > 0 ? (
            <>
              <img
                className="gift-main-image"
                src={images[selectedImage]}
                alt={gift.giftName}
              />

              {images.length > 1 && (
                <div className="gift-thumbnail-list">
                  {images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${gift.giftName} ${index + 1}`}
                      className={
                        selectedImage === index
                          ? "active-thumbnail"
                          : ""
                      }
                      onClick={() => setSelectedImage(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="gift-no-image">
              No image available
            </div>
          )}
        </div>

        <div className="gift-details-content">
          <span className="details-status">
            {gift.status}
          </span>

          <h1>{gift.giftName}</h1>

          <p className="details-value">
            Estimated Value: ₹{gift.estimatedValue}
          </p>

          <div className="details-section">
            <h3>Gift Description</h3>
            <p>
              {gift.description || "No description provided."}
            </p>
          </div>

          <div className="details-section">
            <h3>Gift Information</h3>

            <div className="details-row">
              <span>Category</span>
              <span>{gift.category || "Not provided"}</span>
            </div>

            <div className="details-row">
              <span>Subcategory</span>
              <span>{gift.subcategory || "Not provided"}</span>
            </div>

            <div className="details-row">
              <span>Condition</span>
              <span>{gift.condition || "Not provided"}</span>
            </div>

            <div className="details-row">
              <span>Exchange Mode</span>
              <span>{gift.exchangeMode || "Not provided"}</span>
            </div>

            <div className="details-row">
              <span>Purchase Date</span>
              <span>{formatDate(gift.purchaseDate)}</span>
            </div>

            <div className="details-row">
              <span>Expiry Date</span>
              <span>{formatDate(gift.expiryDate)}</span>
            </div>
          </div>

          <div className="details-section">
            <h3>Preferred Exchange Items</h3>
            <p>
              {gift.preferredExchange ||
                "No preference specified."}
            </p>
          </div>

          {/* Exchange Request Section */}
          {!isGiftOwner && (
            <div className="details-section">
              <h3>Interested in this Gift?</h3>

              {existingRequest ? (
                <p>
                  You have already sent a request.
                  <br />
                  Request Status: {existingRequest.status}
                </p>
              ) : gift.status !== "Available" ? (
                <p>This gift is no longer available.</p>
              ) : (
                <button
                  onClick={handleExchangeRequest}
                  disabled={requestLoading}
                  className="request-exchange-button"
                >
                  {requestLoading
                    ? "Sending Request..."
                    : "Request to Exchange"}
                </button>
              )}

              {requestMessage && (
                <p className="request-message">
                  {requestMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GiftDetails;
