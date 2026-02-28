/* ===================================
   HYSPANIA - Main JavaScript
   Servidor #1 de Hytale en España
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    
    // ===================================
    // Header Scroll Effect
    // ===================================
    const header = document.getElementById('header');
    
    function handleScroll() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    window.addEventListener('scroll', handleScroll);
    
    // ===================================
    // Mobile Navigation
    // ===================================
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.add('show-menu');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (navClose) {
        navClose.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
            document.body.style.overflow = '';
        });
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
            document.body.style.overflow = '';
        });
    });
    
    // ===================================
    // Active Navigation Link
    // ===================================
    const sections = document.querySelectorAll('section[id]');
    
    function scrollActive() {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 150;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav__link[href="#${sectionId}"]`);
            
            if (navLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink.classList.add('active');
                } else {
                    navLink.classList.remove('active');
                }
            }
        });
    }
    
    window.addEventListener('scroll', scrollActive);
    
    // ===================================
    // Copy IP Functionality
    // ===================================
    const serverIP = 'jugar.hyspania.net';
    const copyButtons = document.querySelectorAll('#copy-ip, #copy-ip-2, #copy-ip-3');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(serverIP);
                
                // Show feedback
                button.classList.add('copied');
                
                // For buttons with text
                const originalText = button.textContent;
                if (button.id === 'copy-ip-3') {
                    button.textContent = '¡Copiado!';
                }
                
                setTimeout(() => {
                    button.classList.remove('copied');
                    if (button.id === 'copy-ip-3') {
                        button.textContent = originalText;
                    }
                }, 2000);
                
            } catch (err) {
                console.error('Error al copiar:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = serverIP;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        });
    });
    
    // ===================================
    // Stats Counter Animation
    // ===================================
    const statNumbers = document.querySelectorAll('.hero__stat-number');
    let countersAnimated = false;
    
    function animateCounters() {
        if (countersAnimated) return;
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += step;
                if (current < target) {
                    stat.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target.toLocaleString();
                    if (stat.getAttribute('data-count') === '99') {
                        stat.textContent += '%';
                    } else {
                        stat.textContent = target.toLocaleString() + '+';
                    }
                }
            };
            
            updateCounter();
        });
        
        countersAnimated = true;
    }
    
    // Trigger counter animation when hero section is visible
    const heroSection = document.querySelector('.hero');
    
    const observerOptions = {
        threshold: 0.5
    };
    
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
            }
        });
    }, observerOptions);
    
    if (heroSection) {
        heroObserver.observe(heroSection);
    }
    
    // ===================================
    // Scroll Reveal Animation
    // ===================================
    const revealElements = document.querySelectorAll(
        '.feature-card, .mode-card, .howto__step, .blog-card, .community-card'
    );
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                revealObserver.unobserve(entry.target);
            }
        });
    }, revealOptions);
    
    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        revealObserver.observe(el);
    });
    
    // ===================================
    // Particle Effect (Hero Background)
    // ===================================
    const particlesContainer = document.getElementById('particles');
    
    if (particlesContainer) {
        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            createParticle();
        }
        
        function createParticle() {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 1}px;
                height: ${Math.random() * 4 + 1}px;
                background: rgba(108, 92, 231, ${Math.random() * 0.5 + 0.2});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s linear infinite;
                pointer-events: none;
            `;
            particlesContainer.appendChild(particle);
        }
        
        // Add floating animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0%, 100% {
                    transform: translateY(0) translateX(0);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ===================================
    // Smooth Scroll for Anchor Links
    // ===================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // ===================================
    // Lazy Loading Images
    // ===================================
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    // ===================================
    // Server Status (Mock - Replace with real API)
    // ===================================
    function updateServerStatus() {
        // This is a mock implementation
        // Replace with actual server status API call
        const onlineElement = document.querySelector('.hero__stat-number[data-count="500"]');
        
        if (onlineElement && countersAnimated) {
            // Simulate online player fluctuation
            const baseOnline = 500;
            const fluctuation = Math.floor(Math.random() * 50) - 25;
            const currentOnline = baseOnline + fluctuation;
            onlineElement.textContent = currentOnline.toLocaleString() + '+';
        }
    }
    
    // Update server status every 30 seconds
    setInterval(updateServerStatus, 30000);
    
    // ===================================
    // Console Easter Egg
    // ===================================
    console.log('%c🎮 HYSPANIA', 'font-size: 40px; font-weight: bold; color: #6c5ce7;');
    console.log('%cServidor #1 de Hytale en España', 'font-size: 16px; color: #a29bfe;');
    console.log('%cIP: jugar.hyspania.net', 'font-size: 14px; color: #00cec9;');
    console.log('%c¿Interesado en desarrollo? Únete a nuestro Discord!', 'font-size: 12px; color: #888;');
});
