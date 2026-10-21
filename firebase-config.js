// ============================================================
// SuperAE — Configuration et initialisation Firebase
// Fichier créé automatiquement. Ne pas modifier les cles
// sans regenerer la configuration depuis la console Firebase.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyB0DIOAeiJeubM2pB5i2Ps_e4ADLmcZTl8",
  authDomain: "superae-prod-358a6.firebaseapp.com",
  databaseURL: "https://superae-prod-358a6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "superae-prod-358a6",
  storageBucket: "superae-prod-358a6.firebasestorage.app",
  messagingSenderId: "103073530190",
  appId: "1:103073530190:web:0ae842d65d9dcdb99f1e1f"
};

const SUPERAE_UID = 'vzXI1BgTauO1pky1LLs4RvndmD02';
const SUPERAE_ROOT = 'superae';

if (typeof firebase === 'undefined' || !firebase.initializeApp) {
  console.error('[SuperAE] SDK Firebase non charge. Verifie les <script> dans le HTML.');
} else {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}

const superaeAuth = firebase.auth();
const superaeDb = firebase.database();

async function superaeEnsureSignedIn() {
  return new Promise((resolve, reject) => {
    const unsub = superaeAuth.onAuthStateChanged(async (user) => {
      unsub();
      if (user) {
        if (user.uid !== SUPERAE_UID) {
          await superaeAuth.signOut();
          reject(new Error('Compte non autorise pour SuperAE.'));
          return;
        }
        resolve(user);
        return;
      }
      const email = prompt('Email SuperAE :');
      if (!email) { reject(new Error('Connexion annulee.')); return; }
      const password = prompt('Mot de passe SuperAE :');
      if (!password) { reject(new Error('Connexion annulee.')); return; }
      try {
        const cred = await superaeAuth.signInWithEmailAndPassword(email, password);
        if (cred.user.uid !== SUPERAE_UID) {
          await superaeAuth.signOut();
          reject(new Error('Compte non autorise pour SuperAE.'));
          return;
        }
        resolve(cred.user);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function superaeSignOut() {
  return superaeAuth.signOut();
}

window.superaeAuth = superaeAuth;
window.superaeDb = superaeDb;
window.SUPERAE_ROOT = SUPERAE_ROOT;
window.SUPERAE_UID = SUPERAE_UID;
window.superaeEnsureSignedIn = superaeEnsureSignedIn;
window.superaeSignOut = superaeSignOut;
