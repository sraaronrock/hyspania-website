/**
 * HYSPANIA - Server Voting System
 * Sistema de votación de servidores con API PHP
 */

(function() {
    'use strict';

    // ===================================
    // CONFIGURACIÓN
    // ===================================
    const CONFIG = {
        API_BASE: 'api/',
        VOTE_COOLDOWN: 24 * 60 * 60 * 1000,
        MIN_USERNAME_LENGTH: 3,
        MAX_USERNAME_LENGTH: 16
    };

    // ===================================
    // API CLIENT
    // ===================================
    const API = {
        async getServers() {
            try {
                const response = await fetch(CONFIG.API_BASE + 'servers.php');
                const data = await response.json();
                if (data.success) {
                    return data.data.servers;
                }
                throw new Error(data.error || 'Error al cargar servidores');
            } catch (error) {
                console.error('Error fetching servers:', error);
                return [];
            }
        },

        async addServer(serverData) {
            try {
                const response = await fetch(CONFIG.API_BASE + 'servers.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serverData)
                });
                return await response.json();
            } catch (error) {
                console.error('Error adding server:', error);
                return { success: false, error: 'Error de conexión' };
            }
        },

        async getVoteStatus(serverId = null) {
            try {
                let url = CONFIG.API_BASE + 'vote.php';
                if (serverId) {
                    url += '?serverId=' + encodeURIComponent(serverId);
                }
                const response = await fetch(url);
                return await response.json();
            } catch (error) {
                console.error('Error getting vote status:', error);
                return { success: false, error: 'Error de conexión' };
            }
        },

        async vote(serverId, username) {
            try {
                const response = await fetch(CONFIG.API_BASE + 'vote.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverId, username })
                });
                return await response.json();
            } catch (error) {
                console.error('Error voting:', error);
                return { success: false, error: 'Error de conexión' };
            }
        }
    };

    // ===================================
    // UTILIDADES
    // ===================================
    
    function isValidUsername(username) {
        if (!username) return false;
        username = username.trim();
        if (username.length < CONFIG.MIN_USERNAME_LENGTH) return false;
        if (username.length > CONFIG.MAX_USERNAME_LENGTH) return false;
        return /^[a-zA-Z0-9_]+$/.test(username);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTimeRemaining(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} minutos`;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===================================
    // STATE
    // ===================================
    const State = {
        servers: [],
        voteStatuses: {}
    };

    // ===================================
    // UI MANAGER
    // ===================================
    const UI = {
        elements: {},
        
        async init() {
            this.elements = {
                serversList: document.getElementById('servers-list'),
                filterSort: document.getElementById('filter-sort'),
                filterTag: document.getElementById('filter-tag'),
                filterSearch: document.getElementById('filter-search'),
                voteModal: document.getElementById('vote-modal'),
                addServerForm: document.getElementById('add-server-form'),
                totalServers: document.getElementById('total-servers'),
                totalVotes: document.getElementById('total-votes')
            };
            
            this.bindEvents();
            await this.loadData();
        },

        async loadData() {
            // Mostrar loading
            if (this.elements.serversList) {
                this.elements.serversList.innerHTML = `
                    <div class="servers-loading">
                        <div class="servers-loading__spinner"></div>
                        <p>Cargando servidores...</p>
                    </div>
                `;
            }

            // Cargar servidores
            State.servers = await API.getServers();
            
            // Cargar estados de votos
            const voteResponse = await API.getVoteStatus();
            if (voteResponse.success && voteResponse.data) {
                State.voteStatuses = voteResponse.data.voteStatuses || {};
            }
            
            this.render();
            this.updateStats();
        },
        
        bindEvents() {
            // Filtros
            if (this.elements.filterSort) {
                this.elements.filterSort.addEventListener('change', () => this.render());
            }
            if (this.elements.filterTag) {
                this.elements.filterTag.addEventListener('change', () => this.render());
            }
            if (this.elements.filterSearch) {
                this.elements.filterSearch.addEventListener('input', 
                    debounce(() => this.render(), 300)
                );
            }
            
            // Formulario de agregar servidor
            if (this.elements.addServerForm) {
                this.elements.addServerForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleAddServer();
                });
                
                // Tags seleccionables
                const tagButtons = document.querySelectorAll('.form-tag');
                tagButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btn.classList.toggle('selected');
                    });
                });
            }
            
            // Modal de votar
            if (this.elements.voteModal) {
                this.elements.voteModal.addEventListener('click', (e) => {
                    if (e.target === this.elements.voteModal) {
                        this.closeVoteModal();
                    }
                });
                
                const closeBtn = this.elements.voteModal.querySelector('.vote-modal__close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.closeVoteModal());
                }
                
                const voteForm = document.getElementById('vote-form');
                if (voteForm) {
                    voteForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.handleVote();
                    });
                }
            }
            
            // Delegación de eventos para botones
            if (this.elements.serversList) {
                this.elements.serversList.addEventListener('click', (e) => {
                    const voteBtn = e.target.closest('.btn-vote');
                    if (voteBtn && !voteBtn.disabled) {
                        const serverId = voteBtn.dataset.serverId;
                        this.openVoteModal(serverId);
                    }
                    
                    const copyBtn = e.target.closest('.server-ip__copy');
                    if (copyBtn) {
                        const ip = copyBtn.dataset.ip;
                        this.copyToClipboard(ip, copyBtn);
                    }
                });
            }
        },
        
        getFilters() {
            return {
                sort: this.elements.filterSort?.value || 'votes',
                tag: this.elements.filterTag?.value || 'all',
                search: this.elements.filterSearch?.value || ''
            };
        },

        getSortedServers(sortBy) {
            return [...State.servers].sort((a, b) => {
                // Featured siempre primero
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                
                switch (sortBy) {
                    case 'votes':
                        return (b.votes || 0) - (a.votes || 0);
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'newest':
                        return (b.createdAt || 0) - (a.createdAt || 0);
                    default:
                        return (b.votes || 0) - (a.votes || 0);
                }
            });
        },

        filterServers(servers, filters) {
            return servers.filter(server => {
                // Filtro por tag
                if (filters.tag && filters.tag !== 'all') {
                    if (!server.tags || !server.tags.includes(filters.tag)) return false;
                }
                
                // Filtro por búsqueda
                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    const matchName = server.name.toLowerCase().includes(searchLower);
                    const matchDesc = server.description.toLowerCase().includes(searchLower);
                    const matchIp = server.ip.toLowerCase().includes(searchLower);
                    if (!matchName && !matchDesc && !matchIp) return false;
                }
                
                return true;
            });
        },
        
        render() {
            if (!this.elements.serversList) return;
            
            const filters = this.getFilters();
            let servers = this.getSortedServers(filters.sort);
            servers = this.filterServers(servers, filters);
            
            if (servers.length === 0) {
                this.elements.serversList.innerHTML = `
                    <div class="servers-empty">
                        <div class="servers-empty__icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="2" y="3" width="20" height="14" rx="2"/>
                                <path d="M8 21h8"/>
                                <path d="M12 17v4"/>
                            </svg>
                        </div>
                        <h3 class="servers-empty__title">No se encontraron servidores</h3>
                        <p class="servers-empty__text">Prueba con otros filtros o añade tu servidor.</p>
                    </div>
                `;
                return;
            }
            
            this.elements.serversList.innerHTML = servers.map((server, index) => 
                this.renderServerCard(server, index + 1)
            ).join('');
        },
        
        renderServerCard(server, rank) {
            const voteStatus = State.voteStatuses[server.id] || { canVote: true, timeRemaining: 0 };
            
            let voteButtonHtml;
            if (voteStatus.canVote) {
                voteButtonHtml = `
                    <button class="btn-vote" data-server-id="${server.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                        Votar
                    </button>
                `;
            } else {
                voteButtonHtml = `
                    <button class="btn-vote" disabled>
                        ${formatTimeRemaining(voteStatus.timeRemaining)}
                    </button>
                `;
            }
            
            const featuredClass = server.featured ? 'server-card--featured' : '';
            const rankClass = rank <= 3 ? 'server-rank--top' : '';
            const verifiedBadge = server.verified ? '<span title="Verificado">✓</span>' : '';
            
            return `
                <article class="server-card ${featuredClass}">
                    <div class="server-rank ${rankClass}">#${rank}</div>
                    
                    <div class="server-logo">
                        <span class="server-logo--placeholder">${server.name.charAt(0).toUpperCase()}</span>
                    </div>
                    
                    <div class="server-info">
                        <h3 class="server-name">${escapeHtml(server.name)} ${verifiedBadge}</h3>
                        <div class="server-ip">
                            <span class="server-ip__text">${escapeHtml(server.ip)}</span>
                            <button class="server-ip__copy" data-ip="${escapeHtml(server.ip)}">Copiar</button>
                        </div>
                        <p class="server-description">${escapeHtml(server.description)}</p>
                        <div class="server-tags">
                            ${(server.tags || []).map(tag => `<span class="server-tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="server-actions">
                        <div class="server-votes">
                            <span class="server-votes__count">${server.votes || 0}</span>
                            <span class="server-votes__label">votos</span>
                        </div>
                        ${voteButtonHtml}
                    </div>
                </article>
            `;
        },
        
        openVoteModal(serverId) {
            const server = State.servers.find(s => s.id === serverId);
            if (!server) return;
            
            const modal = this.elements.voteModal;
            if (!modal) return;
            
            modal.dataset.serverId = serverId;
            
            const serverNameEl = modal.querySelector('.vote-modal__server');
            if (serverNameEl) {
                serverNameEl.textContent = server.name;
            }
            
            const input = modal.querySelector('.vote-modal__input');
            if (input) {
                input.value = '';
            }
            
            const message = modal.querySelector('.vote-modal__message');
            if (message) {
                message.style.display = 'none';
            }
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },
        
        closeVoteModal() {
            const modal = this.elements.voteModal;
            if (!modal) return;
            
            modal.classList.remove('active');
            document.body.style.overflow = '';
        },
        
        async handleVote() {
            const modal = this.elements.voteModal;
            const serverId = modal.dataset.serverId;
            const input = modal.querySelector('.vote-modal__input');
            const message = modal.querySelector('.vote-modal__message');
            const submitBtn = modal.querySelector('.vote-modal__submit');
            
            const username = input.value.trim();
            
            // Validar
            if (!isValidUsername(username)) {
                message.textContent = 'Username inválido. Usa 3-16 caracteres (letras, números, _)';
                message.className = 'vote-modal__message vote-modal__message--error';
                message.style.display = 'block';
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Votando...';
            
            const result = await API.vote(serverId, username);
            
            if (result.success) {
                message.textContent = result.data.message;
                message.className = 'vote-modal__message vote-modal__message--success';
                message.style.display = 'block';
                
                // Actualizar estado local
                State.voteStatuses[serverId] = { canVote: false, timeRemaining: 86400 };
                
                // Actualizar votos del servidor
                const server = State.servers.find(s => s.id === serverId);
                if (server) {
                    server.votes = result.data.newVoteCount;
                }
                
                setTimeout(() => {
                    this.closeVoteModal();
                    this.render();
                    this.updateStats();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Confirmar Voto';
                }, 1500);
            } else {
                message.textContent = result.error || 'Error al votar';
                message.className = 'vote-modal__message vote-modal__message--error';
                message.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirmar Voto';
            }
        },
        
        async handleAddServer() {
            const form = this.elements.addServerForm;
            const submitBtn = form.querySelector('.add-server-submit');
            
            const name = form.querySelector('#server-name').value.trim();
            const ip = form.querySelector('#server-ip').value.trim();
            const description = form.querySelector('#server-description').value.trim();
            
            // Obtener tags seleccionados
            const selectedTags = Array.from(form.querySelectorAll('.form-tag.selected'))
                .map(btn => btn.dataset.tag);
            
            // Validar
            if (!name || name.length < 3) {
                this.showFormMessage('El nombre debe tener al menos 3 caracteres.', 'error');
                return;
            }
            
            if (!ip || !ip.includes('.')) {
                this.showFormMessage('Introduce una IP válida.', 'error');
                return;
            }
            
            if (!description || description.length < 20) {
                this.showFormMessage('La descripción debe tener al menos 20 caracteres.', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Añadiendo...';
            
            const result = await API.addServer({
                name,
                ip,
                description,
                tags: selectedTags
            });
            
            if (result.success) {
                this.showFormMessage('¡Servidor añadido correctamente!', 'success');
                form.reset();
                form.querySelectorAll('.form-tag.selected').forEach(btn => btn.classList.remove('selected'));
                
                // Recargar datos
                await this.loadData();
                
                // Scroll arriba
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 500);
            } else {
                this.showFormMessage(result.error || 'Error al añadir servidor', 'error');
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Añadir Servidor';
        },
        
        showFormMessage(text, type) {
            let message = document.querySelector('.form-message');
            if (!message) {
                message = document.createElement('div');
                message.className = 'form-message';
                this.elements.addServerForm.insertBefore(message, this.elements.addServerForm.firstChild);
            }
            
            message.textContent = text;
            message.className = `form-message vote-modal__message vote-modal__message--${type}`;
            message.style.display = 'block';
            
            if (type === 'success') {
                setTimeout(() => {
                    message.style.display = 'none';
                }, 3000);
            }
        },
        
        updateStats() {
            const totalVotes = State.servers.reduce((sum, s) => sum + (s.votes || 0), 0);
            
            if (this.elements.totalServers) {
                this.elements.totalServers.textContent = State.servers.length;
            }
            if (this.elements.totalVotes) {
                this.elements.totalVotes.textContent = totalVotes;
            }
        },
        
        copyToClipboard(text, button) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = button.textContent;
                button.textContent = '¡Copiado!';
                button.style.background = 'var(--color-success)';
                button.style.borderColor = 'var(--color-success)';
                button.style.color = 'white';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.borderColor = '';
                    button.style.color = '';
                }, 2000);
            });
        }
    };

    // ===================================
    // INICIALIZACIÓN
    // ===================================
    function init() {
        UI.init();
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
