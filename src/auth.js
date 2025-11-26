const cfg = {
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
};

const storageKey = 'cc-auth';
const verifierKey = 'cc-pkce-verifier';

function b64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function sha256(input) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return b64UrlEncode(digest);
}

function loadSession() {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function saveSession(session) {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
}

function clearSession() {
    sessionStorage.removeItem(storageKey);
}

function isExpired(session) {
    if (!session || !session.expiresAt) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= session.expiresAt - 60; // 1 minute leeway
}

async function startLogin() {
    if (!cfg.clientId || !cfg.domain) {
        console.warn('Cognito env vars missing; auth disabled');
        return;
    }
    const verifier = b64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = await sha256(verifier);
    sessionStorage.setItem(verifierKey, verifier);

    const redirectUri = window.location.origin + '/';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: cfg.clientId,
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        code_challenge_method: 'S256',
        code_challenge: challenge,
    });
    window.location.href = `https://${cfg.domain}/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
    const verifier = sessionStorage.getItem(verifierKey);
    if (!verifier) throw new Error('Missing PKCE verifier');
    sessionStorage.removeItem(verifierKey);

    const redirectUri = window.location.origin + '/';
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cfg.clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
    });

    const res = await fetch(`https://${cfg.domain}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!res.ok) {
        throw new Error(`Token exchange failed: ${res.status}`);
    }
    const data = await res.json();
    const now = Math.floor(Date.now() / 1000);
    const session = {
        idToken: data.id_token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: now + (data.expires_in || 3600),
    };
    saveSession(session);
    return session;
}

async function refreshTokens() {
    const session = loadSession();
    if (!session || !session.refreshToken) {
        throw new Error('No refresh token available');
    }

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: cfg.clientId,
        refresh_token: session.refreshToken,
    });

    const res = await fetch(`https://${cfg.domain}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        throw new Error(`Token refresh failed: ${res.status}`);
    }

    const data = await res.json();
    const now = Math.floor(Date.now() / 1000);
    const newSession = {
        idToken: data.id_token,
        accessToken: data.access_token,
        refreshToken: session.refreshToken, // Keep existing refresh token
        expiresAt: now + (data.expires_in || 3600),
    };
    saveSession(newSession);
    return newSession;
}

export async function ensureAuthenticated() {
    // Parse auth code from query (Cognito Hosted UI redirects with ?code=)
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    let session = loadSession();
    if (code) {
        try {
            session = await exchangeCodeForToken(code);
            // Clean up URL
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            window.history.replaceState({}, document.title, url.toString());
        } catch (err) {
            console.error('Auth code exchange failed', err);
            clearSession();
            await startLogin();
            return null;
        }
    }

    // If session expired, try refreshing tokens first
    if (session && isExpired(session)) {
        try {
            console.log('Access token expired, refreshing...');
            session = await refreshTokens();
        } catch (err) {
            console.error('Token refresh failed', err);
            clearSession();
            await startLogin();
            return null;
        }
    }

    // If no session at all, start login
    if (!session) {
        clearSession();
        await startLogin();
        return null;
    }

    return session;
}

export function getIdToken() {
    const session = loadSession();
    if (!session || isExpired(session)) return null;
    return session.idToken;
}

export function signOut() {
    clearSession();
    const redirectUri = window.location.origin + '/';
    const params = new URLSearchParams({
        client_id: cfg.clientId,
        logout_uri: redirectUri,
    });
    window.location.href = `https://${cfg.domain}/logout?${params.toString()}`;
}
