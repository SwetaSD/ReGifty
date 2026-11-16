
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
  const [chatError, setChatError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");

  const [confirming, setConfirming] = useState(false);
  const [giftDeleted, setGiftDeleted] = useState(false);

  const messagesEndRef = useRef(null);

  // CHECK WHETHER THE CHAT HAS BEEN CLOSED
  const isChatClosed =
    chat?.isClosed === true ||
    requestData?.listingDeleted === true ||
    giftDeleted;

  // 1. LOAD AND VERIFY CHAT
  useEffect(() => {
    const currentUser = auth.currentUser;

    setLoading(true);
    setChat(null);
    setRequestData(null);
    setMessages([]);
    setChatError("");
    setMessageError("");
    setConfirmationError("");
    setGiftDeleted(false);
    setMessageText("");

    if (!currentUser) {
      setChatError("Please log in to access this chat.");
      setLoading(false);
      return;
    }

    const chatRef = doc(db, "chats", chatId);

    const unsubscribeChat = onSnapshot(
      chatRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setChat(null);
          setChatError(
            "This conversation is no longer available."
          );
          setLoading(false);
          return;
        }

        const chatData = snapshot.data();

        if (!chatData.participants?.includes(currentUser.uid)) {
          setChat(null);
          setChatError(
            "You are not authorized to access this conversation."
          );
          setLoading(false);
          return;
        }

        setChat({
          id: snapshot.id,
          ...chatData,
        });

        setChatError("");
        setLoading(false);
      },
      (err) => {
        console.error(
          "Error loading conversation:",
          err.code,
          err.message
        );

        setChatError(
          err.code === "permission-denied"
            ? "You do not have permission to access this conversation."
            : "Unable to load this conversation. Please try again."
        );

        setLoading(false);
      }
    );

    return () => unsubscribeChat();
  }, [chatId]);

  // 2. LOAD MESSAGES ONLY AFTER CHAT ACCESS IS VERIFIED
  useEffect(() => {
    if (!chat || chat.id !== chatId) return;

    setMessageError("");

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

        setMessageError("");
      },
      (err) => {
        console.error(
          "Error loading messages:",
          err.code,
          err.message
        );

        setMessageError(
          err.code === "permission-denied"
            ? "You do not have permission to access these messages."
            : "Unable to load messages. Please try again."
        );
      }
    );

    return () => unsubscribeMessages();
  }, [chat?.id, chatId]);

  // 3. CHECK WHETHER THE ORIGINAL GIFT STILL EXISTS
  useEffect(() => {
    if (!chat || !chat.giftId) return;

    const giftRef = doc(db, "gifts", chat.giftId);

    const unsubscribeGift = onSnapshot(
      giftRef,
      (snapshot) => {
        setGiftDeleted(!snapshot.exists());
      },
      (err) => {
        console.error("Error checking gift listing:", err);
      }
    );

    return () => unsubscribeGift();
  }, [chat?.id, chat?.giftId]);

  // 4. LIVE EXCHANGE CONFIRMATION STATUS
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

          setConfirmationError("");
        } else {
          setRequestData(null);
          setConfirmationError(
            "The exchange request record is unavailable."
          );
        }
      },
      (err) => {
        console.error(
          "Error loading exchange status:",
          err.code,
          err.message
        );

        setConfirmationError(
          "Unable to load exchange confirmation status."
        );
      }
    );

    return () => unsubscribeRequest();
  }, [chat?.id, chatId]);

  // 5. AUTO-SCROLL TO LATEST MESSAGE
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // 6. SEND CHAT MESSAGE
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = messageText.trim();
    const currentUser = auth.currentUser;

    if (!text || !currentUser || !chat) return;

    // Never allow messages after listing/chat closure
    if (
      chat.isClosed === true ||
      requestData?.listingDeleted === true ||
      giftDeleted
    ) {
      setMessageError(
        "This chat is closed. You can no longer send messages."
      );
      return;
    }

    try {
      setMessageText("");
      setMessageError("");

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

      setMessageError(
        "Message could not be sent. The chat may have been closed."
      );

      setMessageText(text);
    }
  };

  // 7. BUYER AND SELLER CONFIRM THEIR OWN APPROVAL
  const handleConfirmExchange = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser || !requestData || confirming) return;

    // Never allow confirmation after listing/chat closure
    if (
      chat?.isClosed === true ||
      requestData.listingDeleted === true ||
      giftDeleted
    ) {
      setConfirmationError(
        "This listing has been deleted. Exchange confirmation is no longer available."
      );
      return;
    }

    try {
      setConfirming(true);
      setConfirmationError("");

      const requestRef = doc(
        db,
        "requests",
        requestData.id
      );

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(requestRef);

        if (!snapshot.exists()) {
          throw new Error("Exchange request not found.");
        }

        const data = snapshot.data();

        if (data.listingDeleted === true) {
          throw new Error(
            "This listing has been deleted. Exchange confirmation is no longer available."
          );
        }

        if (data.status !== "Accepted") {
          throw new Error(
            "This exchange is not awaiting confirmation."
          );
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
          throw new Error(
            "You are not part of this exchange."
          );
        }

        if (data[ownField] === true) {
          throw new Error(
            "You have already confirmed this exchange."
          );
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
        err.message ||
        "Unable to confirm the exchange. Please try again."
      );
    } finally {
      setConfirming(false);
    }
  };

  // 8. FORMAT MESSAGE TIME
  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "";

    return timestamp.toDate().toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // 9. LOADING SCREEN
  if (loading) {
    return (
      <div className="chat-window-page">
        <p>Loading conversation...</p>
      </div>
    );
  }

  // 10. CHAT ACCESS ERROR
  if (chatError && !chat) {
    return (
      <div className="chat-window-page">
        <div className="chat-window-container">
          <p className="chat-window-error">
            {chatError}
          </p>

          <button onClick={() => navigate("/chats")}>
            Back to Chats
          </button>

          <button
            onClick={() => navigate("/incoming-requests")}
          >
            Back to Incoming Requests
          </button>
        </div>
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
    : isSeller
    ? sellerConfirmed
    : false;

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
            <p>
              {isChatClosed
                ? "Closed Conversation"
                : "ReGifty Exchange Chat"}
            </p>
          </div>

        </div>

        {/* CLOSED CHAT NOTICE */}
        {isChatClosed && (
          <div className="chat-window-error">
            <h3>Chat Closed</h3>

            <p>
              This gift listing has been deleted by its owner.
              This conversation is now closed.
            </p>

            <p>
              You can still view your previous messages, but
              sending new messages and confirming the exchange
              are no longer possible.
            </p>
          </div>
        )}

        {/* EXCHANGE CONFIRMATION PANEL */}
        {!isChatClosed &&
          requestData &&
          (requestData.status === "Accepted" ||
            requestData.status === "Confirmed") && (

          <div className="exchange-confirmation-panel">

            <h3>Exchange Confirmation</h3>

            <p>
              Confirm only when you and the other person
              have agreed to the exchange.
            </p>

            <div className="chat-confirmation-status">
              <span>Buyer's Approval</span>

              <strong>
                {buyerConfirmed
                  ? "Confirmed ✓"
                  : "Waiting"}
              </strong>
            </div>

            <div className="chat-confirmation-status">
              <span>Seller's Approval</span>

              <strong>
                {sellerConfirmed
                  ? "Confirmed ✓"
                  : "Waiting"}
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
                      : "Confirm Exchange"}
                  </button>
                )}

                {alreadyConfirmed && (
                  <p className="chat-confirmation-waiting">
                    You have confirmed. Waiting for the
                    other person to approve.
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

          {messages.length === 0 && !messageError && (
            <p className="chat-empty-message">
              {isChatClosed
                ? "There are no previous messages in this conversation."
                : "Start your conversation! Send a message below."}
            </p>
          )}

          {messages.map((message) => {
            const isOwnMessage =
              message.senderUid === currentUid;

            if (message.type === "system") {
              return (
                <div
                  className="system-message"
                  key={message.id}
                >
                  {message.text}
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`message-row ${
                  isOwnMessage
                    ? "own-message"
                    : "other-message"
                }`}
              >
                <div className="message-bubble">
                  <p>{message.text}</p>
                  <span>
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />

        </div>

        {/* MESSAGE ERROR */}
        {messageError && (
          <p className="chat-window-error">
            {messageError}
          </p>
        )}

        {/* MESSAGE INPUT - ONLY WHEN CHAT IS OPEN */}
        {!isChatClosed && (
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
        )}

      </div>
    </div>
  );
}

export default ChatWindow;
