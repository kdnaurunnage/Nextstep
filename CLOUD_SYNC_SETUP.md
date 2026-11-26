# NextStep cloud sync — One-time setup

NextStep continues saving locally. Cloud sync is OPTIONAL until a Firebase project is configured.
The app cannot sync devices merely by publishing to GitHub Pages.

## Activate private cloud sync (Firebase Spark / free tier)

1. Sign in at https://console.firebase.google.com/ and create a project such as \`nextstep-study\`. You can skip Google Analytics.
2. In **Project overview → Add app → Web (</>)**, register a web app called NextStep. Copy the **Firebase web app config object** containing values such as \`apiKey\`, \`authDomain\`, \`projectId\`, \`appId\`.
3. In **Build → Authentication → Sign-in method**, enable **Email/Password**.
4. In **Build → Firestore Database**, create the database in **Production mode** and choose a suitable region.
5. In **Firestore → Rules**, replace the rules with the complete contents of \`firestore.rules\` from this repository and **Publish** them. **Do not use test-mode rules**.
6. Open \`firebase-config.js\` in the NextStep GitHub repository. Replace \`null\` with the public **web config object**. Example:

   window.NEXTSTEP_FIREBASE_CONFIG = {
     apiKey: "WEB_APP_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT",
     appId: "1:...:web:..."
   };

   These are Firebase client configuration values, not service-account credentials. **Never upload service-account JSON or private keys**.
7. Wait for GitHub Pages to redeploy. On your tablet, open NextStep → **Settings → Cloud sync**, choose **Create account**, and use an email and a strong unique password. Your existing tablet progress is merged and uploaded on first sign-in.
8. On your PC, open https://kdnaurunnage.github.io/Nextstep/ → **Settings → Cloud sync**, then sign in with the SAME account. Your saved task completion and hours will merge across devices.

### Safeguards

- Use **Settings → Export backup** before first activation.
- If offline, changes stay locally saved and automatically retry when the connection returns.
- Completed tasks, undo actions, study-session deletion, custom tasks, edited tasks, and settings carry timestamps to reduce conflicting updates.
- Both devices must use the same Firebase account.
- The daily queue itself remains device-local, but its completed status and study logs sync.
- Simultaneous offline edits to the exact same item may be resolved by the latest device timestamp.
- Progress is never automatically sent to ChatGPT or GitHub.
- Firebase has service usage limits and can change its free-tier terms.
