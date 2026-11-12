
import { useEffect, useState } from "react";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import "../styles/IncomingRequests.css";

function IncomingRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // Listen to requests where the user is buyer or seller
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please log in to view your requests.");
      setLoading(false);
      return;
    }

    let buyerRequests = [];
    let sellerRequests = [];
    let buyerLoaded = false;
    let sellerLoaded = false;

    const updateRequests = () => {
      const requestMap = new Map();

      [...buyerRequests, ...sellerRequests].forEach((item) => {
        requestMap.set(item.id, item);
      });

      setRequests(Array.from(requestMap.values()));
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

        buyerLoaded = true;
        updateRequests();

        if (buyerLoaded && sellerLoaded) {
          setLoading(false);
          setError("");
        }
      },
      (err) => {
        console.error("Buyer requests error:", err);
        setError("Unable to load your requests.");
        setLoading(false);
      }
    );

    const unsubscribeSeller = onSnapshot(
      sellerQuery,
      (snapshot) => {
        sellerRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        sellerLoaded = true;
        updateRequests();

        if (buyerLoaded && sellerLoaded) {
          setLoading(false);
          setError("");
        }
      },
      (err) => {
        console.error("Seller requests error:", err);
        setError("Unable to load your requests.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeBuyer();
      unsubscribeSeller();
    };
  }, []);

  // Seller accepts or rejects a pending request
  const handleRequestAction = async (requestId, newStatus) => {
    try {
      setUpdatingId(requestId);
      setError("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Please log in again.");
      }

      const request = requests.find(
        (item) => item.id === requestId
      );

      if (!request) {
        throw new Error("Request not found.");
      }

      if (request.ownerUid !== currentUser.uid) {
        throw new Error("Only the gift owner can accept or reject.");
      }

      const requestRef = doc(db, "requests", requestId);

      if (newStatus === "Accepted") {
        const batch = writeBatch(db);
        const chatRef = doc(db, "chats", requestId);

        const systemMessage =
          "Your exchange request has been accepted! You can now continue chatting here.";

        batch.set(chatRef, {
          requestId: requestId,
          giftId: request.giftId,
          giftName: request.giftName,
          buyerUid: request.requesterUid,
          sellerUid: request.ownerUid,
          participants: [
            request.requesterUid,
            request.ownerUid,
          ],
          createdAt: serverTimestamp(),
          lastMessage: systemMessage,
          lastMessageAt: serverTimestamp(),
        });

        const messageRef = doc(
          collection(chatRef, "messages"),
          "system-accepted"
        );

        batch.set(messageRef, {
          type: "system",
          text: systemMessage,
          senderUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        batch.update(requestRef, {
          status: "Accepted",
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
      } else {
        await updateDoc(requestRef, {
          status: "Rejected",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error updating request:", err);
      setError(
        err.message || "Unable to update the request. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="incoming-requests-page">
        <p>Loading requests...</p>
      </div>
    );
  }

  const currentUid = auth.currentUser?.uid;

  return (
    <div className="incoming-requests-page">

      <button
        className="requests-back-button"
        onClick={() => navigate("/home")}
      >
        ← Back to Home
      </button>

      <div className="requests-header">
        <h1>Incoming Requests</h1>
        <p>
          View your sent and received requests,
          and check exchange confirmation notifications.
        </p>
      </div>

      {error && (
        <p className="requests-error">{error}</p>
      )}

      {requests.length === 0 ? (
        <div className="no-requests">
          <h3>No requests yet!</h3>
          <p>
            Your sent and received exchange requests
            will appear here.
          </p>
        </div>
      ) : (
        <div className="requests-grid">

          {requests.map((request) => {
            const isBuyer = request.requesterUid === currentUid;
            const isSeller = request.ownerUid === currentUid;

            const buyerConfirmed =
              request.buyerConfirmed === true;

            const sellerConfirmed =
              request.sellerConfirmed === true;

            const myConfirmation = isBuyer
              ? buyerConfirmed
              : sellerConfirmed;

            const otherConfirmation = isBuyer
              ? sellerConfirmed
              : buyerConfirmed;

            const needsMyConfirmation =
              request.status === "Accepted" &&
              !myConfirmation &&
              otherConfirmation;

            return (
              <div className="request-card" key={request.id}>

                <h3>{request.giftName}</h3>

                <p>
                  {isBuyer
                    ? "You sent a request for this gift."
                    : "A ReGifty user is interested in your gift."}
                </p>

                <div className="request-status">
                  Status: <strong>{request.status}</strong>
                </div>

                {/* Pending request */}
                {request.status === "Pending" && (
                  isSeller ? (
                    <div className="request-actions">

                      <button
                        className="accept-request-button"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          handleRequestAction(request.id, "Accepted")
                        }
                      >
                        {updatingId === request.id
                          ? "Updating..."
                          : "Accept"}
                      </button>

                      <button
                        className="reject-request-button"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          handleRequestAction(request.id, "Rejected")
                        }
                      >
                        Reject
                      </button>

                    </div>
                  ) : (
                    <p>
                      Waiting for the seller to respond to your request.
                    </p>
                  )
                )}

                {/* Rejected request */}
                {request.status === "Rejected" && (
                  <p>This exchange request was rejected.</p>
                )}

                {/* Accepted request: reminder only */}
                {request.status === "Accepted" && (
                  <div className="exchange-confirmation">

                    <h4>Exchange Confirmation</h4>

                    <div className="confirmation-status">
                      <span>Buyer approval</span>
                      <strong>
                        {buyerConfirmed ? "Confirmed ✓" : "Pending"}
                      </strong>
                    </div>

                    <div className="confirmation-status">
                      <span>Seller approval</span>
                      <strong>
                        {sellerConfirmed ? "Confirmed ✓" : "Pending"}
                      </strong>
                    </div>

                    {needsMyConfirmation ? (
                      <p>
                        <strong>Action required:</strong>{" "}
                        The other person has confirmed the exchange.
                        Please open Chat to review and confirm your side.
                      </p>
                    ) : myConfirmation ? (
                      <p>
                        You have confirmed. Waiting for the other person.
                      </p>
                    ) : (
                      <p>
                        Discuss the exchange in Chat. Both people
                        must confirm before it is finalized.
                      </p>
                    )}

                    <button
                      className="open-chat-button"
                      onClick={() => navigate(`/chat/${request.id}`)}
                    >
                      Open Chat
                    </button>

                  </div>
                )}

                {/* Both users confirmed */}
                {request.status === "Confirmed" && (
                  <div className="exchange-confirmation">

                    <h4>Exchange Confirmed!</h4>

                    <div className="confirmation-status">
                      <span>Buyer approval</span>
                      <strong>Confirmed ✓</strong>
                    </div>

                    <div className="confirmation-status">
                      <span>Seller approval</span>
                      <strong>Confirmed ✓</strong>
                    </div>

                    <p>
                      Both users have approved this exchange.
                      You can coordinate delivery in Chat.
                    </p>

                    <button
                      className="open-chat-button"
                      onClick={() => navigate(`/chat/${request.id}`)}
                    >
                      Open Chat
                    </button>

                  </div>
                )}

              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}

export default IncomingRequests;
