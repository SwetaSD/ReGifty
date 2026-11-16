
import { useEffect, useState } from "react";

import {
  collection,
  query,
  where,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  onSnapshot,
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

  // LOAD BUYER AND SELLER REQUESTS
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please log in to view your requests.");
      setLoading(false);
      return;
    }

    let buyerRequests = [];
    let sellerRequests = [];
    let active = true;

    const loadRequests = async () => {
      try {
        const requestMap = new Map();

        [...buyerRequests, ...sellerRequests].forEach((request) => {
          requestMap.set(request.id, request);
        });

        const uniqueRequests = Array.from(requestMap.values());

        // CHECK WHETHER EACH ORIGINAL GIFT STILL EXISTS
        const requestsWithGiftStatus = await Promise.all(
          uniqueRequests.map(async (request) => {
            // Use the permanent deletion flag first
            if (request.listingDeleted === true) {
              return {
                ...request,
                giftDeleted: true,
              };
            }

            try {
              const giftSnapshot = await getDoc(
                doc(db, "gifts", request.giftId)
              );

              return {
                ...request,
                giftDeleted: !giftSnapshot.exists(),
              };
            } catch (err) {
              console.error(
                "Error checking gift:",
                request.giftId,
                err
              );

              return {
                ...request,
                giftDeleted: false,
              };
            }
          })
        );

        if (active) {
          requestsWithGiftStatus.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });

          setRequests(requestsWithGiftStatus);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading requests:", err);

        if (active) {
          setError("Unable to load requests. Please try again.");
          setLoading(false);
        }
      }
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
        buyerRequests = snapshot.docs.map((requestDoc) => ({
          id: requestDoc.id,
          ...requestDoc.data(),
        }));

        loadRequests();
      },
      (err) => {
        console.error("Buyer requests error:", err);
        setError("Unable to load sent requests.");
        setLoading(false);
      }
    );

    const unsubscribeSeller = onSnapshot(
      sellerQuery,
      (snapshot) => {
        sellerRequests = snapshot.docs.map((requestDoc) => ({
          id: requestDoc.id,
          ...requestDoc.data(),
        }));

        loadRequests();
      },
      (err) => {
        console.error("Seller requests error:", err);
        setError("Unable to load received requests.");
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribeBuyer();
      unsubscribeSeller();
    };
  }, []);

  // ACCEPT OR REJECT REQUEST (SELLER ONLY)
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

      if (
        request.listingDeleted === true ||
        request.giftDeleted === true
      ) {
        throw new Error(
          "This gift listing has been deleted. The request can no longer be processed."
        );
      }

      if (request.ownerUid !== currentUser.uid) {
        throw new Error(
          "Only the gift owner can accept or reject."
        );
      }

      if (request.status !== "Pending") {
        throw new Error("This request has already been processed.");
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
        err.message ||
        "Unable to update the request. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // OPEN EXISTING CHAT
  const handleOpenChat = (request) => {
    navigate(`/chat/${request.id}`);
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
          View your sent and received requests, and check
          exchange confirmation notifications.
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
            const isBuyer =
              request.requesterUid === currentUid;

            const isSeller =
              request.ownerUid === currentUid;

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
              otherConfirmation &&
              !myConfirmation;

            const isListingDeleted =
              request.listingDeleted === true ||
              request.giftDeleted === true;

            return (
              <div
                className="request-card"
                key={request.id}
              >

                <h3>{request.giftName}</h3>

                <p>
                  {isBuyer
                    ? "You sent a request for this gift."
                    : "A ReGifty user is interested in your gift."}
                </p>

                <div className="request-status">
                  Status: <strong>{request.status}</strong>
                </div>

                {/* DELETED GIFT NOTICE */}
                {isListingDeleted && (
                  <div className="deleted-listing-notice">
                    <h4>Listing deleted by owner</h4>

                    <p>
                      This gift is no longer available on ReGifty.
                      The previous exchange request is retained
                      for your records.
                    </p>

                    <p>
                      This exchange cannot continue because
                      the original listing has been deleted.
                    </p>
                  </div>
                )}

                {/* PENDING REQUEST */}
                {!isListingDeleted &&
                  request.status === "Pending" && (
                    isSeller ? (
                      <div className="request-actions">

                        <button
                          className="accept-request-button"
                          disabled={updatingId === request.id}
                          onClick={() =>
                            handleRequestAction(
                              request.id,
                              "Accepted"
                            )
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
                            handleRequestAction(
                              request.id,
                              "Rejected"
                            )
                          }
                        >
                          Reject
                        </button>

                      </div>
                    ) : (
                      <p>
                        Waiting for the seller to respond
                        to your request.
                      </p>
                    )
                  )}

                {/* REJECTED REQUEST */}
                {!isListingDeleted &&
                  request.status === "Rejected" && (
                    <p>
                      This exchange request was rejected.
                    </p>
                  )}

                {/* ACCEPTED REQUEST */}
                {!isListingDeleted &&
                  request.status === "Accepted" && (
                    <div className="exchange-confirmation">

                      <h4>Exchange Confirmation</h4>

                      <div className="confirmation-status">
                        <span>Buyer approval</span>

                        <strong>
                          {buyerConfirmed
                            ? "Confirmed ✓"
                            : "Pending"}
                        </strong>
                      </div>

                      <div className="confirmation-status">
                        <span>Seller approval</span>

                        <strong>
                          {sellerConfirmed
                            ? "Confirmed ✓"
                            : "Pending"}
                        </strong>
                      </div>

                      {needsMyConfirmation && (
                        <div className="confirmation-notification">
                          <h4>Your action is required!</h4>

                          <p>
                            {isBuyer
                              ? "The seller has confirmed the exchange. Now it's your turn to confirm."
                              : "The buyer has confirmed the exchange. Now it's your turn to confirm."}
                          </p>

                          <p>
                            Open Chat to continue talking
                            and confirm your exchange.
                          </p>
                        </div>
                      )}

                      {myConfirmation && !otherConfirmation && (
                        <p>
                          You have confirmed. Waiting for
                          the other person to confirm.
                        </p>
                      )}

                      {!myConfirmation && !otherConfirmation && (
                        <p>
                          Discuss the exchange in Chat.
                          Confirm when both of you agree.
                        </p>
                      )}

                      <button
                        className="open-chat-button"
                        onClick={() => handleOpenChat(request)}
                      >
                        Open Chat
                      </button>

                    </div>
                  )}

                {/* BOTH USERS CONFIRMED */}
                {!isListingDeleted &&
                  request.status === "Confirmed" && (
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
                        You can continue coordinating in Chat.
                      </p>

                      <button
                        className="open-chat-button"
                        onClick={() => handleOpenChat(request)}
                      >
                        Open Chat
                      </button>

                    </div>
                  )}

                {/* CLOSED CHAT HISTORY */}
                {isListingDeleted &&
                  (request.status === "Accepted" ||
                    request.status === "Confirmed") && (
                    <div className="exchange-confirmation">
                      <h4>Conversation closed</h4>

                      <p>
                        Exchange confirmation and messaging
                        are disabled for this deleted listing.
                      </p>

                      <button
                        className="open-chat-button"
                        onClick={() => handleOpenChat(request)}
                      >
                        View Chat History
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
