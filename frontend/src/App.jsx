import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import AddGift from "./pages/AddGift";
import ExploreGifts from "./pages/ExploreGifts";

import { auth } from "./firebase/firebase";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import MyGifts from "./pages/MyGifts";
import EditGift from "./pages/EditGift";


import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Signup />} />

      <Route path="/signup" element={<Signup />} />

      <Route path="/login" element={<Login />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-gift"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <AddGift />
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <ExploreGifts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-gifts"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <MyGifts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-gift/:giftId"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <EditGift />
          </ProtectedRoute>
        }
      />


    </Routes>
  );
}

export default App;