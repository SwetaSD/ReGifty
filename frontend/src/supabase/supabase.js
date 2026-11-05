
import { createClient } from "@supabase/supabase-js";
import { auth } from "../firebase/firebase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    accessToken: async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User is not logged in.");
      }

      return await currentUser.getIdToken();
    },
  }
);
