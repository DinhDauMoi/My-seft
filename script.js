document.addEventListener('DOMContentLoaded', () => {
    // Custom cursor glow effect
    const cursorGlow = document.querySelector('.cursor-glow');
    
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    document.addEventListener('mouseleave', () => {
        cursorGlow.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        cursorGlow.style.opacity = '1';
    });

    // Scroll Animation for Tool Cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach((card, index) => {
        // Add staggered transition delay based on index
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Data Snake Animation ---
    const canvas = document.getElementById('snakeCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const toolsContainer = document.getElementById('toolsList');

        let points = [];
        const snakeLength = 60;
        let time = 0;

        function resize() {
            if (!toolsContainer) return;
            const rect = toolsContainer.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            canvas.style.top = '0px';
            canvas.style.left = '0px';
        }

        window.addEventListener('resize', resize);
        resize();

        // Initialize snake points
        for (let i = 0; i < snakeLength; i++) {
            points.push({ x: 0, y: 0 });
        }

        function animateSnake() {
            time += 0.015;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate head position - wrapping around the cards area in a wavy figure-8 path
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const widthRange = canvas.width * 0.45;
            const heightRange = canvas.height * 0.45;

            const targetX = centerX + Math.sin(time) * widthRange;
            const targetY = centerY + Math.cos(time * 0.5) * heightRange;

            // Update snake points with physics-like following
            points[0].x = targetX;
            points[0].y = targetY;

            for (let i = 1; i < snakeLength; i++) {
                const dx = points[i - 1].x - points[i].x;
                const dy = points[i - 1].y - points[i].y;
                points[i].x += dx * 0.3;
                points[i].y += dy * 0.3;
            }

            // Draw snake trail (Data particles / Glowing path)
            ctx.beginPath();
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // Gradient for the glow
            const gradient = ctx.createLinearGradient(points[snakeLength-1].x, points[snakeLength-1].y, points[0].x, points[0].y);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, 'rgba(62, 101, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(191, 129, 255, 0.8)');

            ctx.shadowBlur = 30;
            ctx.shadowColor = 'rgba(62, 101, 255, 0.8)';
            ctx.strokeStyle = gradient;

            for (let i = 0; i < snakeLength - 1; i++) {
                const size = (1 - i / snakeLength) * 15;
                ctx.lineWidth = size;
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();

            // Draw leading particle (head)
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, 8, 0, Math.PI * 2);
            ctx.fill();

            requestAnimationFrame(animateSnake);
        }

        // Start animation after a slight delay
        setTimeout(() => {
            animateSnake();
        }, 1500); // 1.5s delay to match CSS fadeIn delay
    }
});
