(() => {
    const USERNAME_KEY = 'userName';
    const AUTH_FLAG = 'isAuthed';

    function $(id) { return document.getElementById(id); }

    function validateUsername(name) {
        if (typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (trimmed.length < 3 || trimmed.length > 20) return false;
        return /^[a-zA-Z0-9_]+$/.test(trimmed);
    }

    async function login(username) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'Login failed');
        }
        return await res.json();
    }

    function showLoginModal() {
        const modal = $('login-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                const input = $('login-username');
                if (input) input.focus();
            }, 0);
        }
    }

    function hideLoginModal() {
        const modal = $('login-modal');
        if (modal) modal.style.display = 'none';
    }

    function setAuthed(username) {
        cookieManager.updateUserName(username);
        document.cookie = `${AUTH_FLAG}=true;path=/`;
    }

    function isAuthed() {
        const info = cookieManager.getUserInfo();
        const flag = document.cookie.split(';').some(c => c.trim().startsWith(`${AUTH_FLAG}=`));
        return !!info.userName && flag;
    }

    function ensureLogin(onSuccess) {
        if (isAuthed()) {
            if (typeof onSuccess === 'function') onSuccess();
            return;
        }
        showLoginModal();
        const input = $('login-username');
        if (input && !input.value) {
            const fromCookie = cookieManager.getUserInfo().userName;
            if (fromCookie) input.value = fromCookie;
        }
        const submit = $('login-submit');
        const err = $('login-error');
        if (submit) {
            submit.onclick = async () => {
                err && (err.textContent = '');
                const username = input ? input.value.trim() : '';
                if (!validateUsername(username)) {
                    if (err) err.textContent = 'Use 3-20 chars: letters, numbers, _ only';
                    return;
                }
                try {
                    await login(username);
                    setAuthed(username);
                    hideLoginModal();
                    if (typeof onSuccess === 'function') onSuccess();
                } catch (e) {
                    if (err) err.textContent = e.message || 'Login failed';
                }
            };
        }
    }

    window.appAuth = { ensureLogin, isAuthed };
})();


