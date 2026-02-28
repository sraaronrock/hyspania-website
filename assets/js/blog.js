/* ===================================
   HYSPANIA - Blog JavaScript
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    
    // ===================================
    // Category Filter
    // ===================================
    const categoryButtons = document.querySelectorAll('.blog-category');
    const postCards = document.querySelectorAll('.post-card');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const category = button.getAttribute('data-category');
            
            // Filter posts with animation
            postCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                if (category === 'all' || cardCategory === category) {
                    card.classList.remove('hidden');
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
    
    // ===================================
    // Copy IP (Blog page)
    // ===================================
    const copyBlogIP = document.getElementById('copy-ip-blog');
    
    if (copyBlogIP) {
        copyBlogIP.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText('jugar.hyspania.net');
                const originalText = copyBlogIP.textContent;
                copyBlogIP.textContent = '¡Copiado!';
                
                setTimeout(() => {
                    copyBlogIP.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Error al copiar:', err);
            }
        });
    }
    
    // ===================================
    // Newsletter Form
    // ===================================
    const newsletterForm = document.querySelector('.newsletter__form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const input = newsletterForm.querySelector('.newsletter__input');
            const email = input.value;
            
            if (email) {
                // Here you would send to your backend
                console.log('Newsletter signup:', email);
                
                // Show success message
                const btn = newsletterForm.querySelector('.btn');
                const originalText = btn.textContent;
                btn.textContent = '¡Suscrito!';
                btn.style.background = 'var(--color-success)';
                input.value = '';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 3000);
            }
        });
    }
    
    // ===================================
    // Scroll Animation for Posts
    // ===================================
    const animatedElements = document.querySelectorAll('.post-card, .featured-post');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // ===================================
    // Pagination (Mock)
    // ===================================
    const paginationNumbers = document.querySelectorAll('.pagination__number');
    
    paginationNumbers.forEach(number => {
        number.addEventListener('click', () => {
            paginationNumbers.forEach(n => n.classList.remove('active'));
            number.classList.add('active');
            
            // Scroll to top of posts
            const blogPosts = document.querySelector('.blog-posts');
            if (blogPosts) {
                blogPosts.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Here you would load new posts via AJAX
            console.log('Load page:', number.textContent);
        });
    });
    
    // ===================================
    // Search Functionality (Future)
    // ===================================
    function searchPosts(query) {
        const normalizedQuery = query.toLowerCase();
        
        postCards.forEach(card => {
            const title = card.querySelector('.post-card__title').textContent.toLowerCase();
            const excerpt = card.querySelector('.post-card__excerpt').textContent.toLowerCase();
            
            if (title.includes(normalizedQuery) || excerpt.includes(normalizedQuery)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }
    
    // ===================================
    // Reading Time Calculator (for article pages)
    // ===================================
    function calculateReadingTime(text) {
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return minutes;
    }
    
    // ===================================
    // Table of Contents Generator (for article pages)
    // ===================================
    function generateTableOfContents() {
        const articleContent = document.querySelector('.article__content');
        if (!articleContent) return;
        
        const headings = articleContent.querySelectorAll('h2, h3');
        if (headings.length === 0) return;
        
        const toc = document.createElement('nav');
        toc.className = 'article__toc';
        toc.innerHTML = '<h4>Contenido</h4>';
        
        const list = document.createElement('ul');
        
        headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            heading.id = id;
            
            const li = document.createElement('li');
            li.className = heading.tagName.toLowerCase() === 'h3' ? 'toc-sub' : '';
            
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = heading.textContent;
            
            li.appendChild(link);
            list.appendChild(li);
        });
        
        toc.appendChild(list);
        
        const articleHeader = document.querySelector('.article__header');
        if (articleHeader) {
            articleHeader.parentNode.insertBefore(toc, articleHeader.nextSibling);
        }
    }
    
    // Initialize TOC if on article page
    if (document.querySelector('.article__content')) {
        generateTableOfContents();
    }
    
    // ===================================
    // Share Buttons (for article pages)
    // ===================================
    const shareButtons = document.querySelectorAll('.article__share-link');
    
    shareButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const platform = button.getAttribute('data-platform');
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            
            let shareUrl = '';
            
            switch (platform) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${title}%20${url}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
});
