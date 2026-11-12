
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { db, auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import "../styles/Chats.css";

function Chats() {
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please log in to view your chats.");
      setLoading(false);
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const chatList = snapshot.docs.map((chatDoc) => ({
          id: chatDoc.id,
          ...chatDoc.data(),
        }));

        chatList.sort((a, b) => {
          const timeA = a.lastMessageAt?.toMillis?.() || 0;
          const timeB = b.lastMessageAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setChats(chatList);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error loading chats:", err);
        setError("Unable to load chats. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "";

    return timestamp.toDate().toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className="chats-page">
      <div className="chats-container">
        <div className="chats-header">
          <h1>My Chats</h1>
          <p>Your accepted gift exchanges appear here.</p>
        </div>

        {loading && (
          <p className="chats-message">Loading your chats...</p>
        )}

        {error && (
          <p className="chats-error">{error}</p>
        )}

        {!loading && !error && chats.length === 0 && (
          <div className="chats-empty">
            <h2>No conversations yet</h2>
            <p>
              Once a gift exchange request is accepted,
              your conversation will appear here.
            </p>
          </div>
        )}

        {!loading && chats.length > 0 && (
          <div className="chats-list">
            {chats.map((chat) => (
              <div className="chat-card" key={chat.id}>
                <div className="chat-card-info">
                  <h3>{chat.giftName || "Gift Exchange"}</h3>

                  <p className="chat-last-message">
                    {chat.lastMessage || "Start your conversation"}
                  </p>

                  <span className="chat-time">
                    {formatTime(chat.lastMessageAt)}
                  </span>
                </div>

                <button
                  className="open-chat-button"
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  Open Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chats;
