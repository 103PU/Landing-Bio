// --- 1. CINEMATIC INTRO LOGIC ---
// Intro vẫn giữ nguyên, chỉ bỏ ba thứ làm nó trở thành cổng chặn:
//   - 4s không có cách nào thoát  -> có nút SKIP, bấm đâu cũng skip được
//   - chạy lại mỗi lần vào trang  -> sessionStorage, chỉ chạy 1 lần / phiên
//   - reduced-motion vẫn phải xem -> bỏ qua hẳn
const INTRO_KEY = 'pu_intro_seen';

function playIntro() {
    const introOverlay = document.getElementById('cinematic-intro');
    const skipBtn = document.getElementById('intro-skip');
    const body = document.body;
    let done = false;

    const finish = () => {
        if (done) return;
        done = true;
        introOverlay.classList.add('fade-out');
        body.classList.remove('is-loading');
        body.classList.add('loaded');
        try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
        setTimeout(() => { introOverlay.style.display = 'none'; }, 1000);
    };

    // Đã xem trong phiên này, hoặc user tắt animation -> vào thẳng nội dung.
    const seen = (() => { try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } })();
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || noMotion) {
        introOverlay.style.display = 'none';
        body.classList.remove('is-loading');
        body.classList.add('loaded');
        return;
    }

    // Timeline: 0s line-1, 0.9s line-2, 2.2s nhả trang (trước là 4s).
    setTimeout(finish, 2200);

    // Thoát bằng nút, bằng tap bất kỳ đâu, hoặc bằng Esc / Enter / Space.
    introOverlay.style.pointerEvents = 'auto';
    skipBtn?.addEventListener('click', finish);
    introOverlay.addEventListener('click', finish);
    introOverlay.addEventListener('touchstart', finish, { passive: true });
    document.addEventListener('keydown', (e) => {
        if (!done && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) finish();
    });
}

// Gọi intro
playIntro();

// Browsers may block audible autoplay until the first user gesture. Keep the
// fallback invisible and retry playback without adding a player control.
const bgVideoPlayer = document.getElementById('bg-video-player');
const bgAudioPlayer = document.getElementById('bg-audio-player');
bgVideoPlayer?.play().catch(() => {});
bgAudioPlayer?.play().catch(() => {});

const resumeBackgroundAudio = () => {
    bgVideoPlayer?.play().catch(() => {});
    bgAudioPlayer?.play().catch(() => {});
};

['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, resumeBackgroundAudio, { once: true, passive: true });
});


// --- 2. (đã bỏ) LOCAL VIDEO CONTROL ---
// <video id="bg-video-player"> không có src và không có <source> nào, nên thanh
// volume điều khiển một thứ không tồn tại — mà vẫn che bảng NVIDIA trên mobile.
// Cả thẻ video, .volume-container và ~50 dòng JS ở đây đều đã xoá.


// --- 3. SCROLL & TILT LOGIC (EXISTING) ---
document.addEventListener('DOMContentLoaded', () => {
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
        cards.forEach(card => {
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
            // Hiện một lần rồi thôi. Trước đây .in-view bị remove khi card ra khỏi
            // màn hình, nên animation chạy lại mỗi lần scroll qua — vừa rối mắt vừa
            // làm card biến mất khi scroll lên lại.
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
        });
    }, observerOptions);

    cards.forEach(card => {
        observer.observe(card);
    });
});
