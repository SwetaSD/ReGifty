
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

import { auth } from "./firebase";

let recaptchaVerifier = null;

export function createRecaptchaVerifier() {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA verified");
      },
      "expired-callback": () => {
        resetRecaptchaVerifier();
      },
    }
  );

  return recaptchaVerifier;
}

export function resetRecaptchaVerifier() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

export async function sendPhoneOTP(phoneNumber, verifier) {
  return await signInWithPhoneNumber(
    auth,
    phoneNumber,
    verifier
  );
}