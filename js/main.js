// --- 1. CINEMATIC INTRO LOGIC ---
function playIntro() {
    const introOverlay = document.getElementById('cinematic-intro');
    const body = document.body;

    // Timeline: 
    // 0s: Line 1 (Welcome) hiện
    // 1.5s: Line 2 (103_PU) hiện
    // 4.0s: Intro mờ đi, web chính hiện ra

    setTimeout(() => {
        introOverlay.classList.add('fade-out');
        body.classList.remove('is-loading');
        body.classList.add('loaded');
    }, 4000);

    setTimeout(() => {
        introOverlay.style.display = 'none';
    }, 5000);
}

// Gọi intro
playIntro();


// --- 2. LOCAL VIDEO CONTROL LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('bg-video-player');
    const volSlider = document.getElementById('vol-slider');
    const volIcon = document.getElementById('vol-icon');
    let lastVolume = 30; // Mức âm lượng mặc định khi bật tiếng

    // Hàm cập nhật giao diện volume
    const updateVolUI = (vol) => {
        volSlider.value = vol;
        volSlider.style.setProperty('--vol-percent', `${vol}%`);

        // Cập nhật icon
        if (vol == 0) {
            volIcon.className = 'fa-solid fa-volume-xmark';
        } else if (vol < 50) {
            volIcon.className = 'fa-solid fa-volume-low';
        } else {
            volIcon.className = 'fa-solid fa-volume-high';
        }
    };

    // Khởi tạo: Mute (Bắt buộc để Autoplay chạy được trên trình duyệt)
    video.volume = 0;
    updateVolUI(0);

    // Xử lý khi kéo thanh trượt
    volSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        video.muted = false; // Bỏ mute
        video.volume = val / 100; // Video volume nhận giá trị 0.0 -> 1.0

        if (val > 0) lastVolume = val;
        updateVolUI(val);
    });

    // Xử lý khi bấm vào Icon Loa (Mute/Unmute Toggle)
    volIcon.addEventListener('click', () => {
        if (video.muted || video.volume === 0) {
            // Đang tắt -> Bật lại mức cũ
            video.muted = false;
            let target = lastVolume > 0 ? lastVolume : 30;
            video.volume = target / 100;
            updateVolUI(target);
        } else {
            // Đang bật -> Tắt
            lastVolume = volSlider.value; // Lưu lại mức hiện tại
            video.muted = true;
            updateVolUI(0);
        }
    });
});


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
            const card = entry.target;
            if (entry.isIntersecting) {
                card.classList.add('in-view');
            } else {
                card.classList.remove('in-view');
                card.style.transform = '';
            }
        });
    }, observerOptions);

    cards.forEach(card => {
        observer.observe(card);
    });
});