document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------
    // 1. Dark Mode Logic
    // ---------------------------------------------
    const themeToggle = document.getElementById('themeToggle');
    const htmlEl = document.documentElement;
    const icon = themeToggle.querySelector('i');

    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        htmlEl.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });

    function updateIcon(theme) {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // ---------------------------------------------
    // 2. Particle Animation (Floating Icons)
    // ---------------------------------------------
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    const iconChars = ['\uf167', '\uf019', '\uf04b', '\uf001']; // FontAwesome Unicodes
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 20 + 10;
            this.speedX = Math.random() * 1 - 0.5;
            this.speedY = Math.random() * 1 - 0.5;
            this.icon = iconChars[Math.floor(Math.random() * iconChars.length)];
            this.opacity = Math.random() * 0.3 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            ctx.font = `900 ${this.size}px "Font Awesome 6 Free", "Font Awesome 6 Brands"`;
            ctx.fillStyle = `rgba(128, 128, 128, ${this.opacity})`;
            ctx.fillText(this.icon, this.x, this.y);
        }
    }

    function initParticles() {
        particles = [];
        const count = window.innerWidth < 768 ? 15 : 30;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    // ---------------------------------------------
    // 3. Download Logic (API Integration)
    // ---------------------------------------------
    // Using Cobalt API (No Key, Open Source)
    
    const downloadBtn = document.getElementById('downloadBtn');
    const inputUrl = document.getElementById('videoUrl');
    const resultContainer = document.getElementById('resultContainer');
    const errorMsg = document.getElementById('error-message');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');

    // UI Elements for result
    const thumbImg = document.getElementById('thumb');
    const videoTitle = document.getElementById('videoTitle');
    const videoAuthor = document.getElementById('videoAuthor');
    const btnVideo = document.getElementById('dl-video');
    const btnAudio = document.getElementById('dl-audio');

    downloadBtn.addEventListener('click', handleDownload);

    // Allow "Enter" key trigger
    inputUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDownload();
    });

    async function handleDownload() {
        const url = inputUrl.value.trim();
        
        // Reset UI
        errorMsg.classList.add('hidden');
        resultContainer.classList.add('hidden');

        // Validation
        if (!url) {
            showError("Please enter a valid YouTube URL.");
            return;
        }
        if (!url.match(/^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/)) {
            showError("Invalid URL. Please paste a link from YouTube.");
            return;
        }

        // Loading State
        setLoading(true);

        try {
            // Step 1: Request JSON data from Cobalt API
            const response = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    vQuality: '1080',
                    filenamePattern: 'basic'
                })
            });

            const data = await response.json();

            if (data.status === 'error') {
                throw new Error(data.text || "Could not fetch video. Try again.");
            }

            // Cobalt returns a stream link directly sometimes, or a picker.
            // For simplicity in this static demo, we use the stream URL provided.
            
            // Note: Cobalt API doesn't always return metadata (title/thumb) in the simple JSON response 
            // depending on the instance load, but it returns the `url` for download.
            // To make the UI look good, we will hack the thumbnail from the input URL for YouTube.

            const ytId = extractVideoID(url);
            const title = "YouTube Video Download"; // Cobalt might not return title in simple mode
            
            // Update UI
            thumbImg.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
            videoTitle.innerText = title; 
            videoAuthor.innerText = "Ready to download"; // Placeholder as API is minimal

            // Set Download Links
            // 1. Video Link
            btnVideo.href = data.url;
            btnVideo.setAttribute('download', '');
            
            // 2. Audio Link (We have to make another request or just let user know)
            // For this 'Client Side Only' demo without backend orchestration, 
            // we will set the audio button to re-trigger fetch with audioOnly mode if clicked,
            // or simply point to the same URL if it's a direct stream.
            
            // Let's attach a specific handler for MP3 to fetch audio version
            btnAudio.onclick = (e) => {
                e.preventDefault();
                fetchAudio(url);
            }

            resultContainer.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            showError("Failed to fetch video. The link might be private or age-restricted.");
        } finally {
            setLoading(false);
        }
    }

    async function fetchAudio(url) {
        // Change button text to indicate loading
        const originalText = btnAudio.innerHTML;
        btnAudio.innerHTML = '<span class="loader" style="width:15px;height:15px;"></span> Converting...';
        
        try {
            const response = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    isAudioOnly: true
                })
            });
            const data = await response.json();
            if(data.url) {
                window.open(data.url, '_blank');
            }
        } catch(e) {
            alert("Could not convert to audio.");
        } finally {
            btnAudio.innerHTML = originalText;
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
            downloadBtn.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
            downloadBtn.disabled = false;
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    function extractVideoID(url) {
        var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
        var match = url.match(regExp);
        return (match && match[7].length == 11) ? match[7] : false;
    }
});
