
import { useEffect, useState, useRef } from "react";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/ChatWindow.css";

function ChatWindow() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const messagesEndRef = useRef(null);

  // LOAD CHAT AND MESSAGES
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please log in to access this chat.");
      setLoading(false);
      return;
    }

    const chatRef = doc(db, "chats", chatId);

    const unsubscribeChat = onSnapshot(
      chatRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError("This conversation does not exist.");
          setLoading(false);
          return;
        }

        const chatData = snapshot.data();

        if (!chatData.participants?.includes(currentUser.uid)) {
          setError("You are not authorized to access this conversation.");
          setLoading(false);
          return;
        }

        setChat({ id: snapshot.id, ...chatData });
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error loading conversation:", err);
        setError("Unable to load this conversation.");
        setLoading(false);
      }
    );

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data(),
          }))
        );
      },
      (err) => {
        console.error("Error loading messages:", err);
        setError("Unable to load messages.");
      }
    );

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId]);

  // LIVE EXCHANGE CONFIRMATION STATUS
  useEffect(() => {
    if (!chat) return;

    const requestId = chat.requestId || chatId;
    const requestRef = doc(db, "requests", requestId);

    const unsubscribeRequest = onSnapshot(
      requestRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRequestData({
            id: snapshot.id,
            ...snapshot.data(),
          });
        }
      },
      (err) => {
        console.error("Error loading exchange status:", err);
        setConfirmationError(
          "Unable to load exchange confirmation status."
        );
      }
    );

    return () => unsubscribeRequest();
  }, [chat, chatId]);

  // AUTO-SCROLL TO LATEST MESSAGE
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // SEND CHAT MESSAGE
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = messageText.trim();
    const currentUser = auth.currentUser;

    if (!text || !currentUser || !chat) return;

    try {
      setMessageText("");

      const chatRef = doc(db, "chats", chatId);

      const messagesRef = collection(
        db,
        "chats",
        chatId,
        "messages"
      );

      await addDoc(messagesRef, {
        type: "text",
        text,
        senderUid: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(chatRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Message could not be sent. Please try again.");
      setMessageText(text);
    }
  };

  // BUYER AND SELLER CONFIRM THEIR OWN APPROVAL
  const handleConfirmExchange = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser || !requestData || confirming) return;

    try {
      setConfirming(true);
      setConfirmationError("");

      const requestRef = doc(db, "requests", requestData.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(requestRef);

        if (!snapshot.exists()) {
          throw new Error("Exchange request not found.");
        }

        const data = snapshot.data();

        if (data.status !== "Accepted") {
          throw new Error("This exchange is not awaiting confirmation.");
        }

        let ownField;
        let otherField;

        if (currentUser.uid === data.requesterUid) {
          ownField = "buyerConfirmed";
          otherField = "sellerConfirmed";
        } else if (currentUser.uid === data.ownerUid) {
          ownField = "sellerConfirmed";
          otherField = "buyerConfirmed";
        } else {
          throw new Error("You are not part of this exchange.");
        }

        if (data[ownField] === true) {
          throw new Error("You have already confirmed this exchange.");
        }

        const bothConfirmed = data[otherField] === true;

        const changes = {
          [ownField]: true,
          updatedAt: serverTimestamp(),
        };

        if (bothConfirmed) {
          changes.status = "Confirmed";
        }

        transaction.update(requestRef, changes);
      });
    } catch (err) {
      console.error("Error confirming exchange:", err);

      setConfirmationError(
        err.message || "Unable to confirm the exchange. Please try again."
      );
    } finally {
      setConfirming(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "";

    return timestamp.toDate().toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="chat-window-page">
        Loading conversation...
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="chat-window-page">
        <p className="chat-window-error">{error}</p>

        <button onClick={() => navigate("/chats")}>
          Back to Chats
        </button>
      </div>
    );
  }

  if (!chat) return null;

  const currentUid = auth.currentUser?.uid;

  const isBuyer =
    requestData?.requesterUid === currentUid;

  const isSeller =
    requestData?.ownerUid === currentUid;

  const buyerConfirmed =
    requestData?.buyerConfirmed === true;

  const sellerConfirmed =
    requestData?.sellerConfirmed === true;

  const isExchangeConfirmed =
    requestData?.status === "Confirmed";

  const alreadyConfirmed = isBuyer
    ? buyerConfirmed
    : sellerConfirmed;

  return (
    <div className="chat-window-page">
      <div className="chat-window-container">

        {/* CHAT HEADER */}
        <div className="chat-window-header">
          <button
            className="back-to-chats"
            onClick={() => navigate("/chats")}
          >
            ← Back
          </button>

          <div>
            <h2>{chat.giftName || "Gift Exchange"}</h2>
            <p>ReGifty Exchange Chat</p>
          </div>
        </div>

        {/* EXCHANGE CONFIRMATION PANEL */}
        {requestData && (
          <div className="exchange-confirmation-panel">

            <h3>Exchange Confirmation</h3>

            <p>
              Confirm only when you and the other person
              have agreed to the exchange.
            </p>

            <div className="chat-confirmation-status">
              <span>Buyer's Approval</span>

              <strong>
                {buyerConfirmed ? "Confirmed ✓" : "Waiting"}
              </strong>
            </div>

            <div className="chat-confirmation-status">
              <span>Seller's Approval</span>

              <strong>
                {sellerConfirmed ? "Confirmed ✓" : "Waiting"}
              </strong>
            </div>

            {isExchangeConfirmed ? (
              <div className="exchange-confirmed-message">
                <h4>Exchange Confirmed!</h4>
                <p>
                  Both buyer and seller have approved.
                  You can now coordinate delivery.
                </p>
              </div>
            ) : (
              <>
                {(isBuyer || isSeller) && !alreadyConfirmed && (
                  <button
                    className="chat-confirm-button"
                    onClick={handleConfirmExchange}
                    disabled={confirming}
                  >
                    {confirming
                      ? "Confirming..."
                      : isBuyer
                      ? "Confirm as Buyer"
                      : "Confirm as Seller"}
                  </button>
                )}

                {alreadyConfirmed && (
                  <p className="chat-confirmation-waiting">
                    You have confirmed. Waiting for the other
                    person to approve.
                  </p>
                )}
              </>
            )}

            {confirmationError && (
              <p className="chat-window-error">
                {confirmationError}
              </p>
            )}

          </div>
        )}

        {/* CHAT MESSAGES */}
        <div className="chat-messages">

          {messages.map((message) => {
            const isOwnMessage =
              message.senderUid === currentUid;

            if (message.type === "system") {
              return (
                <div className="system-message" key={message.id}>
                  {message.text}
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`message-row ${
                  isOwnMessage ? "own-message" : "other-message"
                }`}
              >
                <div className="message-bubble">
                  <p>{message.text}</p>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />

        </div>

        {error && (
          <p className="chat-window-error">{error}</p>
        )}

        {/* MESSAGE INPUT */}
        <form
          className="chat-input-form"
          onSubmit={handleSendMessage}
        >
          <input
            type="text"
            value={messageText}
            onChange={(event) =>
              setMessageText(event.target.value)
            }
            placeholder="Type your message..."
            maxLength={2000}
          />

          <button
            type="submit"
            disabled={!messageText.trim()}
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}

export default ChatWindow;
