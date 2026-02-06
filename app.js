/**
 * Realtime Chat - Vanilla JS + Firebase Firestore
 * Uses Firebase modular SDK v9+ via CDN (no build tools).
 */

// ========== Firebase (modular v9) - import from CDN ==========
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ========== Placeholder config - replace with your Firebase project config ==========
const firebaseConfig = {
  apiKey: 'AIzaSyDxegnn2RgKcpTwLTQAlRRLt0ZUc_wmabA',
  authDomain: 'chat-web-socket-2711c.firebaseapp.com',
  projectId: 'chat-web-socket-2711c',
  storageBucket: 'chat-web-socket-2711c.firebasestorage.app',
  messagingSenderId: '809483540871',
  appId: '1:809483540871:web:340e39956f435d453c9b22',
  measurementId: 'G-2GEKVXGYRJ',
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore collection name for chat messages
const MESSAGES_COLLECTION = 'messages';

// ========== Two accounts (demo: passwords stored in client; use server/auth in production) ==========
const ACCOUNTS = [
  { name: 'Alice', password: 'alice123' },
  { name: 'Bob', password: 'bob123' },
];

// ========== DOM elements ==========
const loginScreenEl = document.getElementById('loginScreen');
const chatContainerEl = document.getElementById('chatContainer');
const accountOptionsEl = document.getElementById('accountOptions');
const passwordInputEl = document.getElementById('passwordInput');
const loginErrorEl = document.getElementById('loginError');
const loginButtonEl = document.getElementById('loginButton');
const chatMessagesEl = document.getElementById('chatMessages');
const messageInputEl = document.getElementById('messageInput');
const sendButtonEl = document.getElementById('sendButton');

// Current user set after successful login
let currentUsername = null;
let unsubscribeMessages = null;

// ========== Format timestamp for display ==========
function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========== Render a single message in the UI ==========
function renderMessage(doc) {
  const data = doc.data();
  const id = doc.id;
  const text = data.text || '';
  const username = data.username || 'Anonymous';
  const createdAt = data.createdAt || null;
  const isSelf = username === currentUsername;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message--${isSelf ? 'self' : 'other'}`;
  messageDiv.setAttribute('data-id', id);

  messageDiv.innerHTML = `
    <span class="message-username">${escapeHtml(username)}</span>
    <div class="message-bubble">
      <p class="message-text">${escapeHtml(text)}</p>
      <span class="message-time">${escapeHtml(formatTime(createdAt))}</span>
    </div>
  `;

  return messageDiv;
}

// Simple HTML escape to prevent XSS
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== Scroll chat to bottom ==========
function scrollToBottom() {
  if (chatMessagesEl) {
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
}

// ========== Login: account selection ==========
let selectedAccount = null;

accountOptionsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.account-option');
  if (!btn) return;
  accountOptionsEl.querySelectorAll('.account-option').forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
  });
  btn.setAttribute('aria-pressed', 'true');
  selectedAccount = btn.dataset.account;
  loginErrorEl.hidden = true;
  loginErrorEl.textContent = '';
});

// ========== Login: submit (check password and show chat) ==========
function showLoginError(msg) {
  loginErrorEl.textContent = msg;
  loginErrorEl.hidden = false;
}

function doLogin() {
  if (!selectedAccount) {
    showLoginError('Please select an account.');
    return;
  }
  const password = passwordInputEl.value.trim();
  if (!password) {
    showLoginError('Please enter your password.');
    return;
  }

  const account = ACCOUNTS.find((a) => a.name === selectedAccount);
  if (!account || account.password !== password) {
    showLoginError('Wrong password.');
    return;
  }

  currentUsername = account.name;
  loginScreenEl.classList.add('hidden');
  chatContainerEl.classList.remove('hidden');
  passwordInputEl.value = '';
  loginErrorEl.hidden = true;

  startChat();
}

loginButtonEl.addEventListener('click', doLogin);
passwordInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    doLogin();
  }
});

// ========== Start chat after login: realtime listener + send ==========
function startChat() {
  const messagesQuery = query(
    collection(db, MESSAGES_COLLECTION),
    orderBy('createdAt', 'asc'),
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      chatMessagesEl.innerHTML = '';
      snapshot.forEach((doc) => {
        chatMessagesEl.appendChild(renderMessage(doc));
      });
      scrollToBottom();
    },
    (error) => {
      console.error('Firestore listener error:', error);
      chatMessagesEl.innerHTML = `<p class="error-message">Could not load messages. Check console and Firebase config.</p>`;
    },
  );
}

// ========== Send a new message ==========
async function sendMessage() {
  const text = messageInputEl.value.trim();
  if (!text) return;

  messageInputEl.value = '';
  messageInputEl.focus();

  try {
    await addDoc(collection(db, MESSAGES_COLLECTION), {
      text,
      username: currentUsername,
      createdAt: serverTimestamp(),
    });
    scrollToBottom();
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// ========== Chat event listeners (bound after login) ==========
sendButtonEl.addEventListener('click', sendMessage);
messageInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
