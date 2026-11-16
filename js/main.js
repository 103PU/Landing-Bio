// ==========================================================================
// 103_PU BIO — MAIN APPLICATION CONTROLLER
// Includes: Cinematic Intro, Floating Audio Toggle, Refactored Discord Modal,
// Micro-Haptics & Visual Active States, Speech Bubble (Persona 103_PU),
// and Scroll/Tilt Cards.
// ==========================================================================

// --- 1. CINEMATIC INTRO LOGIC ---
const INTRO_KEY = 'pu_intro_seen';

function playIntro() {
    const introOverlay = document.getElementById('cinematic-intro');
    const skipBtn = document.getElementById('intro-skip');
    const body = document.body;
    let done = false;

    const finish = () => {
        if (done) return;
        done = true;
        if (introOverlay) {
            introOverlay.classList.add('fade-out');
            setTimeout(() => { introOverlay.style.display = 'none'; }, 1000);
        }
        body.classList.remove('is-loading');
        body.classList.add('loaded');
        try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
    };

    const seen = (() => { try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } })();
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || noMotion) {
        if (introOverlay) introOverlay.style.display = 'none';
        body.classList.remove('is-loading');
        body.classList.add('loaded');
        return;
    }

    setTimeout(finish, 2200);

    if (introOverlay) {
        introOverlay.style.pointerEvents = 'auto';
        skipBtn?.addEventListener('click', finish);
        introOverlay.addEventListener('click', finish);
        introOverlay.addEventListener('touchstart', finish, { passive: true });
    }
    document.addEventListener('keydown', (e) => {
        if (!done && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) finish();
    });
}

playIntro();

// --- 2. AUDIO PLAYER & FLOATING TOGGLE ---
const bgVideoPlayer = document.getElementById('bg-video-player');
const bgAudioPlayer = document.getElementById('bg-audio-player');
if (bgAudioPlayer) {
    bgAudioPlayer.volume = 0.18;
}
bgVideoPlayer?.play().catch(() => {});
bgAudioPlayer?.play().catch(() => {});

const resumeBackgroundAudio = () => {
    if (bgAudioPlayer) bgAudioPlayer.volume = 0.18;
    bgVideoPlayer?.play().catch(() => {});
    if (bgAudioPlayer && !bgAudioPlayer.muted) {
        bgAudioPlayer.play().catch(() => {});
    }
};

['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, resumeBackgroundAudio, { once: true, passive: true });
});

function initAudioToggle() {
    const audio = document.getElementById('bg-audio-player');
    const toggleBtn = document.getElementById('audio-toggle-btn');
    if (!audio || !toggleBtn) return;

    const STORAGE_KEY = 'pu_audio_muted';
    let isMuted = false;
    try {
        isMuted = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch { /* private mode */ }

    const updateUI = () => {
        if (audio.paused || audio.muted) {
            toggleBtn.classList.add('is-muted');
            toggleBtn.setAttribute('aria-label', 'Bật nhạc nền');
            toggleBtn.setAttribute('title', 'Bật nhạc nền');
        } else {
            toggleBtn.classList.remove('is-muted');
            toggleBtn.setAttribute('aria-label', 'Tắt nhạc nền');
            toggleBtn.setAttribute('title', 'Tắt nhạc nền');
        }
    };

    if (isMuted) {
        audio.muted = true;
    }
    updateUI();

    toggleBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.muted = false;
            audio.play().catch(() => {});
        } else {
            audio.muted = !audio.muted;
        }
        try {
            localStorage.setItem(STORAGE_KEY, String(audio.muted));
        } catch {}
        updateUI();
    });

    audio.addEventListener('play', updateUI);
    audio.addEventListener('pause', updateUI);
    audio.addEventListener('volumechange', updateUI);
}

// --- 3. REFACTORED DISCORD MODAL CONTROLLER ---
function initDiscordModal() {
    const modal = document.getElementById('discord-modal');
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    const trigger = document.getElementById('val-tweaks-card');
    const cancelBtn = document.getElementById('discord-modal-cancel');
    const joinBtn = document.getElementById('discord-modal-join');

    let hideTimer = null;
    let lastFocus = null;

    const showModal = (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        clearTimeout(hideTimer);
        lastFocus = document.activeElement;
        modal.style.display = 'flex';
        void modal.offsetWidth; // Force reflow for smooth scale transition
        if (content) {
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
        }
        modal.querySelector('a, button')?.focus();
    };

    const closeModal = () => {
        clearTimeout(hideTimer);
        if (content) {
            content.style.transform = 'scale(0.9)';
            content.style.opacity = '0';
        }
        hideTimer = setTimeout(() => { modal.style.display = 'none'; }, 300);
        lastFocus?.focus();
    };

    // Preserve global contract
    window.showDiscordModal = showModal;
    window.closeDiscordModal = closeModal;

    trigger?.addEventListener('click', showModal);
    cancelBtn?.addEventListener('click', closeModal);
    joinBtn?.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (modal.style.display !== 'flex') return;
        if (e.key === 'Escape') {
            closeModal();
            return;
        }
        if (e.key !== 'Tab') return;
        const stops = [...modal.querySelectorAll('a[href], button')];
        if (!stops.length) return;
        const first = stops[0], last = stops[stops.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
}

// --- 4. HAPTICS & VISUAL ACTIVE STATES ---
function initHapticsAndActiveStates() {
    const triggerHaptic = (ms = 10) => {
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(ms); } catch {}
        }
    };

    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        card.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            triggerHaptic(10);
            card.classList.add('card-pressed');
        }, { passive: true });

        const removeState = () => card.classList.remove('card-pressed');
        card.addEventListener('pointerup', removeState, { passive: true });
        card.addEventListener('pointercancel', removeState, { passive: true });
        card.addEventListener('pointerleave', removeState, { passive: true });
    });
}

// --- 5. SPEECH BUBBLE & PERSONA "103_PU" CONTROLLER ---
function initSpeechBubble() {
    const bubble = document.getElementById('mascot-speech-bubble');
    if (!bubble) return;
    const textEl = bubble.querySelector('.bubble-text');
    let typeTimer = null;
    let hideTimer = null;

    const DIALOGUES = {
        idle: [
            "Yo anh em! Lại là 103_PU đây! 🎮",
            "Hôm nay leo rank Valorant không anh em?",
            "Check mấy link xịn xò bên dưới nha! ✨",
            "Dừng lại 2 giây bấm sub giùm tui nhen! 💖"
        ],
        tapMascot: [
            "Gâu! Gõ đầu tui chi dợ? Xem link ở dưới kìa! 🐶",
            "Đừng chọc nữa, lo vào Discord nhận Tweaks đi! 😆",
            "Hôm nay bắn Valorant không trúng một viên... Buồn ghê 🥲",
            "Quẩy hết mình cùng 103_PU nào anh em ơi! 🔥"
        ],
        cards: {
            'card--tiktok': "Kênh TikTok toàn clip highlight lầy lội, follow chưa bạn ơi? 🎬",
            'card--portfolio': "Ghé xem mấy project sáng tạo của tui nè! 💻🔥",
            'card--youtube-neon': "Nhấn Đăng Ký kênh YouTube ủng hộ 103_PU nhé! ❤️",
            'card--discord': "Vào Discord hú hét voice chat leo rank chung nàoo! 🎧",
            'card--val-tweaks': "Bản Tweak tối ưu FPS cực mượt cho anh em chiến Valorant! ⚡",
            'card--license': "Tra cứu License key chính chủ 103_PU tại đây! 🔑",
            'card--valorant': "Bắn Valorant không tạch viên nào, kéo rank xuyên màn đêm! 🎯",
            'card--roblox': "Vào Roblox quẩy game cùng 103_PU nào! 🧱",
            'card--zingspeed': "Làm vài ván drift cháy phố ZingSpeed không bạn ơi? 🏎️💨",
            'card--beacons': "Tổng hợp các liên kết & bio mở rộng của 103_PU! 🌐"
        }
    };

    const speak = (text, autoHideMs = 3800) => {
        clearTimeout(typeTimer);
        clearTimeout(hideTimer);
        if (textEl) textEl.textContent = '';
        bubble.classList.add('is-visible');
        bubble.setAttribute('aria-hidden', 'false');

        let i = 0;
        const typeChar = () => {
            if (i < text.length) {
                if (textEl) textEl.textContent += text.charAt(i);
                i++;
                typeTimer = setTimeout(typeChar, 25);
            } else if (autoHideMs > 0) {
                hideTimer = setTimeout(hide, autoHideMs);
            }
        };
        typeChar();
    };

    const hide = () => {
        clearTimeout(typeTimer);
        clearTimeout(hideTimer);
        bubble.classList.remove('is-visible');
        bubble.setAttribute('aria-hidden', 'true');
    };

    const isDesktopHover = window.matchMedia('(hover: hover) and (min-width: 768px)').matches;

    if (isDesktopHover) {
        // Desktop: Hover cards trigger dialogue
        Object.entries(DIALOGUES.cards).forEach(([cls, quote]) => {
            const card = document.querySelector('.' + cls);
            card?.addEventListener('mouseenter', () => speak(quote));
        });

        // Desktop: Idle trigger after 20s
        let idleTimer = null;
        const resetIdle = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                const quote = DIALOGUES.idle[Math.floor(Math.random() * DIALOGUES.idle.length)];
                speak(quote, 4000);
            }, 20000);
        };
        ['mousemove', 'scroll', 'keydown', 'pointerdown'].forEach((ev) => {
            window.addEventListener(ev, resetIdle, { passive: true });
        });
        resetIdle();
    }

    // Both Mobile & Desktop: Tap avatar or mascot directly triggers speech
    const avatar = document.querySelector('.profile-img-box');
    avatar?.addEventListener('click', () => {
        const quote = DIALOGUES.tapMascot[Math.floor(Math.random() * DIALOGUES.tapMascot.length)];
        speak(quote, 3500);
    });

    window.addEventListener('mascot:tap', () => {
        const quote = DIALOGUES.tapMascot[Math.floor(Math.random() * DIALOGUES.tapMascot.length)];
        speak(quote, 3500);
    });

    // Auto-dismiss bubble on scroll so cards and content are never occluded
    window.addEventListener('scroll', hide, { passive: true });

    window.triggerMascotSpeech = speak;
}

// --- 6. SCROLL & TILT LOGIC ---
function initTiltAndScroll() {
    const cards = document.querySelectorAll('.js-tilt');

    const handleTilt = (e, card) => {
        if (!card.classList.contains('in-view')) return;
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const rotateX = -((e.clientY - centerY) / 30);
        const rotateY = ((e.clientX - centerX) / 30);

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    };

    const resetTilt = (card) => {
        card.style.transform = '';
    };

    if (window.matchMedia('(hover: hover)').matches) {
        cards.forEach((card) => {
            card.addEventListener('mousemove', (e) => handleTilt(e, card));
            card.addEventListener('mouseleave', () => resetTilt(card));
        });
    }

    const observerOptions = {
        threshold: 0.0075,
        rootMargin: "10px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
        });
    }, observerOptions);

    cards.forEach((card) => {
        observer.observe(card);
    });
}

// Initialize all features once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAudioToggle();
        initDiscordModal();
        initHapticsAndActiveStates();
        initSpeechBubble();
        initTiltAndScroll();
    });
} else {
    initAudioToggle();
    initDiscordModal();
    initHapticsAndActiveStates();
    initSpeechBubble();
    initTiltAndScroll();
}
