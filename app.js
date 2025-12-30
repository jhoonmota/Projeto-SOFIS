document.addEventListener('DOMContentLoaded', async () => {
    // State
    let clients = JSON.parse(localStorage.getItem('sofis_clients') || '[]');
    window.clients = clients;

    // Remove duplicates based on ID
    const uniqueClients = [];
    const seenIds = new Set();
    clients.forEach(client => {
        if (!seenIds.has(client.id)) {
            seenIds.add(client.id);
            uniqueClients.push(client);
        }
    });
    clients = uniqueClients;

    // Save cleaned data back to localStorage
    if (uniqueClients.length !== JSON.parse(localStorage.getItem('sofis_clients') || '[]').length) {
        localStorage.setItem('sofis_clients', JSON.stringify(clients));
        console.log('Removed duplicate clients');
    }

    let editingId = null;
    let currentClientFilter = 'all'; // 'all', 'favorites', 'regular'
    let isModalFavorite = false;
    let favoritesCollapsed = JSON.parse(localStorage.getItem('sofis_favorites_collapsed')) || false;
    let regularCollapsed = JSON.parse(localStorage.getItem('sofis_regular_collapsed')) || false;
    let currentView = localStorage.getItem('sofis_view_mode') || 'list'; // 'list' or 'grid'

    // --- Audit Log Helper ---
    async function registerAuditLog(opType, action, details = '', oldVal = null, newVal = null) {
        const user = JSON.parse(localStorage.getItem('sofis_user') || '{}');
        const username = user.username || 'Sistema';

        if (window.supabaseClient) {
            try {
                await window.supabaseClient.from('audit_logs').insert([{
                    username: username,
                    operation_type: opType,
                    action: action,
                    details: details,
                    old_value: oldVal,
                    new_value: newVal
                }]);
                // Refresh activity feed if sidebar is open or after an action
                await fetchRecentActivities();
            } catch (err) {
                console.error('Erro ao registrar log:', err);
            }
        }
    }

    // DOM Elements
    const clientList = document.getElementById('clientList');
    const modal = document.getElementById('modal');
    const form = document.getElementById('clientForm');
    const addBtn = document.getElementById('addClientBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.getElementById('closeModal');
    const searchInput = document.getElementById('searchInput');
    const modalTitle = document.getElementById('modalTitle');
    const modalToggleFavorite = document.getElementById('modalToggleFavorite');
    const toast = document.getElementById('toast');
    const clearSearchBtn = document.getElementById('clearSearch');
    const logoutBtn = document.getElementById('logoutBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');

    // Display current user
    const userDisplay = document.getElementById('currentUserDisplay');
    const currentUser = JSON.parse(localStorage.getItem('sofis_user') || '{}');
    if (userDisplay && currentUser.username) {
        userDisplay.innerHTML = `<i class="fa-solid fa-user"></i> ${currentUser.username}`;
    }

    const usersTabBtn = document.getElementById('usersTabBtn');
    if (usersTabBtn && currentUser.role === 'Administrador') {
        usersTabBtn.classList.remove('hidden');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                localStorage.removeItem('sofis_user');
                window.location.href = 'login.html';
            }
        });
    }

    // Inputs
    const clientNameInput = document.getElementById('clientName');
    const contactList = document.getElementById('contactList');
    const addContactBtn = document.getElementById('addContactBtn');

    // Server Modal Elements
    const serverModal = document.getElementById('serverModal');
    const serverEntryModal = document.getElementById('serverEntryModal');
    const serverForm = document.getElementById('serverForm');
    const closeServerBtn = document.getElementById('closeServerModal');
    const closeServerEntryBtn = document.getElementById('closeServerEntryModal');
    const cancelServerEntryBtn = document.getElementById('cancelServerEntryBtn');
    const addServerEntryBtn = document.getElementById('addServerEntryBtn');
    const serverClientIdInput = document.getElementById('serverClientId');
    const sqlServerInput = document.getElementById('sqlServerInput');
    const credentialList = document.getElementById('credentialList');
    const addCredentialBtn = document.getElementById('addCredentialBtn');
    const serverNotesInput = document.getElementById('serverNotesInput');
    const serverEntryModalTitle = document.getElementById('serverEntryModalTitle');

    // Client Notes Modal Elements
    const notesModal = document.getElementById('notesModal');
    const notesForm = document.getElementById('notesForm');
    const closeNotesBtn = document.getElementById('closeNotesModal');
    const cancelNotesBtn = document.getElementById('cancelNotesBtn');
    const notesClientIdInput = document.getElementById('notesClientId');
    const clientNoteInput = document.getElementById('clientNoteInput');
    const notesModalTitle = document.getElementById('notesModalTitle');

    // VPN Modal Elements
    const vpnModal = document.getElementById('vpnModal');
    const vpnEntryModal = document.getElementById('vpnEntryModal');
    const vpnForm = document.getElementById('vpnForm');
    const closeVpnBtn = document.getElementById('closeVpnModal');
    const closeVpnEntryBtn = document.getElementById('closeVpnEntryModal');
    const cancelVpnEntryBtn = document.getElementById('cancelVpnEntryBtn');
    const addVpnEntryBtn = document.getElementById('addVpnEntryBtn');
    const vpnClientIdInput = document.getElementById('vpnClientId');
    const vpnUserInput = document.getElementById('vpnUserInput');
    const vpnPassInput = document.getElementById('vpnPassInput');
    const vpnNotesInput = document.getElementById('vpnNotesInput');
    const vpnEntryModalTitle = document.getElementById('vpnEntryModalTitle');
    const closeVpnModalBtn = document.getElementById('closeVpnModalBtn');

    // URL Modal Elements
    const urlModal = document.getElementById('urlModal');
    const urlEntryModal = document.getElementById('urlEntryModal');
    const urlForm = document.getElementById('urlForm');
    const closeUrlBtn = document.getElementById('closeUrlModal');
    const closeUrlEntryBtn = document.getElementById('closeUrlEntryModal');
    const cancelUrlEntryBtn = document.getElementById('cancelUrlEntryBtn');
    const addUrlEntryBtn = document.getElementById('addUrlEntryBtn');
    const urlClientIdInput = document.getElementById('urlClientId');
    const urlEnvironmentSelect = document.getElementById('urlEnvironmentSelect');
    const urlSystemSelect = document.getElementById('urlSystemSelect');
    const bridgeDataAccessInput = document.getElementById('bridgeDataAccessInput');
    const bootstrapInput = document.getElementById('bootstrapInput');
    const execUpdateInput = document.getElementById('execUpdateInput');
    const webLaudoInput = document.getElementById('webLaudoInput');
    const urlNotesInput = document.getElementById('urlNotesInput');
    const saveWebLaudoBtn = document.getElementById('saveWebLaudoBtn');
    const urlEntryModalTitle = document.getElementById('urlEntryModalTitle');
    const closeUrlModalBtn = document.getElementById('closeUrlModalBtn');

    // Custom Filter State
    let currentServerFilter = 'all';
    let currentUrlFilter = 'all';

    const serverFilterBtn = document.getElementById('serverFilterBtn');
    const serverFilterMenu = document.getElementById('serverFilterMenu');
    const urlFilterBtn = document.getElementById('urlFilterBtn');
    const urlFilterMenu = document.getElementById('urlFilterMenu');

    const webLaudoDisplay = document.getElementById('webLaudoDisplay');
    const webLaudoForm = document.getElementById('webLaudoForm');
    const webLaudoText = document.getElementById('webLaudoText');
    const editWebLaudoBtn = document.getElementById('editWebLaudoBtn');

    const deleteWebLaudoBtn = document.getElementById('deleteWebLaudoBtn');

    // Contact Modal Elements
    const contactModal = document.getElementById('contactModal');
    const closeContactBtn = document.getElementById('closeContactModal');
    const closeContactModalBtn = document.getElementById('closeContactModalBtn');
    const contactModalList = document.getElementById('contactModalList');
    const contactModalClientName = document.getElementById('contactModalClientName');
    const contactModalClientId = document.getElementById('contactModalClientId');
    const addContactModalBtn = document.getElementById('addContactModalBtn');
    const contactModalSearch = document.getElementById('contactModalSearch');

    // Activity Sidebar Elements
    const activitySidebar = document.getElementById('activitySidebar');
    const activityList = document.getElementById('activityList');
    const toggleActivityBtn = document.getElementById('toggleActivityBtn');
    const closeActivityBtn = document.getElementById('closeActivityBtn');
    const activityOverlay = document.getElementById('activityOverlay');

    // History Modal Elements
    const historyModal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    const closeHistoryModalBtn = document.getElementById('closeHistoryModal');
    const historyModalTitle = document.getElementById('historyModalTitle');

    function renderSkeleton() {
        if (!clientList) return;
        clientList.innerHTML = '';
        const skeletonCount = 5;
        for (let i = 0; i < skeletonCount; i++) {
            const skeletonRow = document.createElement('div');
            skeletonRow.className = 'skeleton-row';
            skeletonRow.innerHTML = `
                <div class="skeleton-header">
                    <div class="skeleton-left">
                        <div class="skeleton-star pulse"></div>
                        <div class="skeleton-text pulse" style="width: 150px;"></div>
                    </div>
                    <div class="skeleton-right">
                        <div class="skeleton-icon pulse"></div>
                        <div class="skeleton-icon pulse"></div>
                        <div class="skeleton-icon pulse"></div>
                        <div class="skeleton-icon pulse"></div>
                        <div class="skeleton-icon pulse"></div>
                        <div class="skeleton-icon pulse"></div>
                    </div>
                </div>
            `;
            clientList.appendChild(skeletonRow);
        }
    }

    // Initial Render
    async function initialLoad() {
        renderSkeleton();
        if (window.supabaseClient) {
            try {
                // Fetch all data optimized with Joins
                const { data: dbClients, error } = await window.supabaseClient
                    .from('clients')
                    .select(`
                        *,
                        contacts (*),
                        servers (*),
                        vpns (*),
                        urls (*)
                    `)
                    .order('name');

                if (error) throw error;

                if (dbClients) {
                    clients = dbClients.map(c => ({
                        id: c.id,
                        name: c.name,
                        updatedAt: c.updated_at,
                        isFavorite: c.is_favorite,
                        notes: c.notes,
                        webLaudo: c.web_laudo,
                        contacts: (c.contacts || []).map(con => ({
                            name: con.name,
                            phones: con.phones,
                            emails: con.emails
                        })),
                        servers: (c.servers || []).map(s => ({
                            environment: s.environment,
                            sqlServer: s.sql_server,
                            notes: s.notes,
                            credentials: s.credentials
                        })),
                        vpns: (c.vpns || []).map(v => ({
                            user: v.username,
                            password: v.password,
                            notes: v.notes
                        })),
                        urls: (c.urls || []).map(u => ({
                            environment: u.environment,
                            system: u.system,
                            bridgeDataAccess: u.bridge_data_access,
                            bootstrap: u.bootstrap,
                            execUpdate: u.exec_update,
                            notes: u.notes
                        }))
                    }));
                } else {
                    clients = JSON.parse(localStorage.getItem('sofis_clients')) || [];
                }
            } catch (err) {
                console.error('Erro ao carregar do Supabase:', err);
                clients = JSON.parse(localStorage.getItem('sofis_clients')) || [];
            }
        } else {
            clients = JSON.parse(localStorage.getItem('sofis_clients')) || [];
        }

        // Clean duplicates
        const uniqueClients = [];
        const seenIds = new Set();
        clients.forEach(client => {
            if (!seenIds.has(client.id)) {
                seenIds.add(client.id);
                uniqueClients.push(client);
            }
        });
        clients = uniqueClients;

        renderClients(clients);
        updateFilterCounts();
        applyViewMode();
        fetchRecentActivities();
        populateVersionClientSelect();
    }

    await initialLoad();

    // Event Listeners
    addBtn.addEventListener('click', openAddModal);
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', async (e) => {
        await handleFormSubmit(e);
    });

    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => {
            currentView = 'list';
            localStorage.setItem('sofis_view_mode', 'list');
            applyViewMode();
        });
    }

    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', () => {
            currentView = 'grid';
            localStorage.setItem('sofis_view_mode', 'grid');
            applyViewMode();
        });
    }

    function applyViewMode() {
        if (!clientList) return;

        if (currentView === 'grid') {
            clientList.classList.add('grid-mode');
            if (gridViewBtn) gridViewBtn.classList.add('active');
            if (listViewBtn) listViewBtn.classList.remove('active');
        } else {
            clientList.classList.remove('grid-mode');
            if (listViewBtn) listViewBtn.classList.add('active');
            if (gridViewBtn) gridViewBtn.classList.remove('active');
        }
    }

    if (modalToggleFavorite) {
        modalToggleFavorite.addEventListener('click', () => {
            isModalFavorite = !isModalFavorite;
            updateModalFavoriteUI();
        });
    }



    searchInput.addEventListener('input', (e) => {
        if (e.target.value.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        applyClientFilter();
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            applyClientFilter();
            searchInput.focus();
        });
    }

    addContactBtn.addEventListener('click', () => addContactGroup());

    // Server Modal Listeners
    if (serverForm) serverForm.addEventListener('submit', handleServerSubmit);
    if (closeServerBtn) closeServerBtn.addEventListener('click', closeServerModal);
    if (closeServerEntryBtn) closeServerEntryBtn.addEventListener('click', closeServerEntryModal);
    if (cancelServerEntryBtn) cancelServerEntryBtn.addEventListener('click', closeServerEntryModal);
    if (addServerEntryBtn) addServerEntryBtn.addEventListener('click', openServerEntry);

    const closeServerModalBtn = document.getElementById('closeServerModalBtn');
    if (closeServerModalBtn) closeServerModalBtn.addEventListener('click', closeServerModal);

    if (addCredentialBtn) addCredentialBtn.addEventListener('click', () => addCredentialField());

    // Client Notes Listeners
    if (notesForm) notesForm.addEventListener('submit', handleNotesSubmit);
    if (closeNotesBtn) closeNotesBtn.addEventListener('click', closeNotesModal);
    if (cancelNotesBtn) cancelNotesBtn.addEventListener('click', closeNotesModal);

    // VPN Listeners
    if (vpnForm) vpnForm.addEventListener('submit', handleVpnSubmit);
    if (closeVpnBtn) closeVpnBtn.addEventListener('click', closeVpnModal);
    if (closeVpnEntryBtn) closeVpnEntryBtn.addEventListener('click', closeVpnEntryModal);
    if (cancelVpnEntryBtn) cancelVpnEntryBtn.addEventListener('click', closeVpnEntryModal);
    if (addVpnEntryBtn) addVpnEntryBtn.addEventListener('click', openVpnEntry);
    if (closeVpnModalBtn) closeVpnModalBtn.addEventListener('click', closeVpnModal);


    // URL Listeners
    if (urlForm) urlForm.addEventListener('submit', handleUrlSubmit);
    if (closeUrlBtn) closeUrlBtn.addEventListener('click', closeUrlModal);
    if (closeUrlEntryBtn) closeUrlEntryBtn.addEventListener('click', closeUrlEntryModal);
    if (cancelUrlEntryBtn) cancelUrlEntryBtn.addEventListener('click', closeUrlEntryModal);
    if (addUrlEntryBtn) addUrlEntryBtn.addEventListener('click', openUrlEntry);
    if (closeUrlModalBtn) closeUrlModalBtn.addEventListener('click', closeUrlModal);
    if (saveWebLaudoBtn) saveWebLaudoBtn.addEventListener('click', handleWebLaudoSave);
    if (editWebLaudoBtn) editWebLaudoBtn.addEventListener('click', () => {
        webLaudoDisplay.style.display = 'none';
        webLaudoForm.style.display = 'flex';
        webLaudoInput.focus();
    });
    if (deleteWebLaudoBtn) deleteWebLaudoBtn.addEventListener('click', handleDeleteWebLaudo);

    // Contact Modal Listeners
    if (closeContactBtn) closeContactBtn.addEventListener('click', closeContactModal);
    if (closeContactModalBtn) closeContactModalBtn.addEventListener('click', closeContactModal);
    if (addContactModalBtn) {
        addContactModalBtn.addEventListener('click', () => {
            const clientId = contactModalClientId.value;
            if (clientId) {
                addNewContact(clientId);
            }
        });
    }

    if (contactModalSearch) {
        contactModalSearch.addEventListener('input', () => {
            const clientId = contactModalClientId.value;
            const client = clients.find(c => c.id === clientId);
            if (client) {
                renderContactModalList(client);
            }
        });
    }

    if (urlSystemSelect) {
        urlSystemSelect.addEventListener('change', handleUrlSystemChange);
    }

    // Custom Filters Listeners
    if (serverFilterBtn) {
        serverFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            serverFilterMenu.classList.toggle('active');
            urlFilterMenu.classList.remove('active');
        });
    }

    if (urlFilterBtn) {
        urlFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            urlFilterMenu.classList.toggle('active');
            serverFilterMenu.classList.remove('active');
        });
    }

    // Close menus on click outside
    document.addEventListener('click', () => {
        if (serverFilterMenu) serverFilterMenu.classList.remove('active');
        if (urlFilterMenu) urlFilterMenu.classList.remove('active');
    });

    // Handle Filter Item Clicks
    if (serverFilterMenu) {
        serverFilterMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                currentServerFilter = item.dataset.value;

                // Update UI state
                serverFilterMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                if (currentServerFilter !== 'all') {
                    serverFilterBtn.classList.add('filter-btn-active');
                } else {
                    serverFilterBtn.classList.remove('filter-btn-active');
                }

                const client = clients.find(c => c.id === serverClientIdInput.value);
                if (client) renderServersList(client);
                serverFilterMenu.classList.remove('active');
            });
        });
    }

    if (urlFilterMenu) {
        urlFilterMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                currentUrlFilter = item.dataset.value;

                // Update UI state
                urlFilterMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                if (currentUrlFilter !== 'all') {
                    urlFilterBtn.classList.add('filter-btn-active');
                } else {
                    urlFilterBtn.classList.remove('filter-btn-active');
                }

                const client = clients.find(c => c.id === urlClientIdInput.value);
                if (client) renderUrlList(client);
                urlFilterMenu.classList.remove('active');
            });
        });
    }

    // Filter Chips Functionality
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const filterValue = chip.dataset.filter;
            currentClientFilter = filterValue;

            // Update active state
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Apply filter
            applyClientFilter();
        });
    });

    function applyClientFilter() {
        const searchTerm = searchInput.value.toLowerCase();
        let filteredClients = clients;

        // Apply search filter first
        if (searchTerm) {
            filteredClients = clients.filter(client => {
                const nameMatch = (client.name || "").toLowerCase().includes(searchTerm);
                const phoneMatch = client.contacts?.some(contact =>
                    contact.phones?.some(phone => phone.includes(searchTerm))
                );
                const emailMatch = client.contacts?.some(contact =>
                    contact.emails?.some(email => (email || "").toLowerCase().includes(searchTerm))
                );
                return nameMatch || phoneMatch || emailMatch;
            });
        }

        // Apply favorite filter
        if (currentClientFilter === 'favorites') {
            filteredClients = filteredClients.filter(c => c.isFavorite);
        } else if (currentClientFilter === 'regular') {
            filteredClients = filteredClients.filter(c => !c.isFavorite);
        }

        renderClients(filteredClients);
        updateFilterCounts();
    }

    function updateFilterCounts() {
        const allCount = clients.length;
        const favoritesCount = clients.filter(c => !!c.isFavorite).length;
        const regularCount = clients.filter(c => !c.isFavorite).length;

        const countAllEl = document.getElementById('countAll');
        const countFavoritesEl = document.getElementById('countFavorites');
        const countRegularEl = document.getElementById('countRegular');

        if (countAllEl) countAllEl.textContent = allCount;
        if (countFavoritesEl) countFavoritesEl.textContent = favoritesCount;
        if (countRegularEl) countRegularEl.textContent = regularCount;
    }

    // --- Functions ---

    function renderClients(clientsToRender) {
        if (!clientList) return;

        // Remove skeleton loaders if they exist
        clientList.querySelectorAll('.skeleton-row').forEach(skeleton => skeleton.remove());

        // Separate favorites from regular clients (normalized)
        const favoriteClients = clientsToRender.filter(c => !!c.isFavorite).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const regularClients = clientsToRender.filter(c => !c.isFavorite).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        // Get existing client rows
        const existingRows = {};
        clientList.querySelectorAll('.client-row').forEach(row => {
            const id = row.id.replace('client-row-', '');
            existingRows[id] = row;
        });

        if (clientsToRender.length === 0) {
            let emptyMessage = 'Nenhum cliente encontrado.';
            let emptyIcon = 'fa-folder-open';

            if (currentClientFilter === 'favorites') {
                emptyMessage = 'Nenhum cliente favorito ainda.';
                emptyIcon = 'fa-star';
            } else if (currentClientFilter === 'regular') {
                emptyMessage = 'Nenhum cliente regular encontrado.';
                emptyIcon = 'fa-users';
            } else if (searchInput.value) {
                emptyMessage = 'Nenhum resultado para sua busca.';
                emptyIcon = 'fa-magnifying-glass';
            }

            // Hide all existing rows
            Object.values(existingRows).forEach(row => row.style.display = 'none');

            // Show or create empty state
            let emptyState = clientList.querySelector('.empty-state');
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;';
                clientList.appendChild(emptyState);
            }
            emptyState.innerHTML = `
                <i class="fa-solid ${emptyIcon}" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>${emptyMessage}</p>
            `;
            emptyState.style.display = 'block';

            // Hide section headers
            clientList.querySelectorAll('.clients-section-header').forEach(h => h.style.display = 'none');
            return;
        }

        // Hide empty state if exists
        const emptyState = clientList.querySelector('.empty-state');
        if (emptyState) emptyState.style.display = 'none';

        // Track which clients should be visible
        const visibleClientIds = new Set(clientsToRender.map(c => c.id));

        // Hide clients that shouldn't be visible
        Object.entries(existingRows).forEach(([id, row]) => {
            if (!visibleClientIds.has(id)) {
                row.style.display = 'none';
            }
        });

        // Render Favorites Section
        let favoritesHeader = clientList.querySelector('.favorites-header');
        if (favoriteClients.length > 0) {
            if (!favoritesHeader) {
                favoritesHeader = document.createElement('div');
                favoritesHeader.className = `clients-section-header favorites-header ${favoritesCollapsed ? 'section-collapsed' : ''}`;
                favoritesHeader.onclick = toggleFavoritesSection;
                clientList.appendChild(favoritesHeader);
            }
            favoritesHeader.innerHTML = `
                <div class="section-header-content">
                    <i class="fa-solid fa-chevron-down section-chevron"></i>
                    <i class="fa-solid fa-star"></i>
                    <span class="section-title">Clientes Favoritos</span>
                    <span class="section-count">${favoriteClients.length}</span>
                </div>
            `;
            favoritesHeader.className = `clients-section-header favorites-header ${favoritesCollapsed ? 'section-collapsed' : ''}`;
            favoritesHeader.style.display = 'flex';

            if (!favoritesCollapsed) {
                favoriteClients.forEach(client => {
                    let row = existingRows[client.id];
                    if (!row) {
                        row = createClientRow(client);
                        clientList.appendChild(row);
                        existingRows[client.id] = row;
                    } else {
                        // Update existing row content
                        updateClientRow(row, client);
                    }
                    row.style.display = 'block';
                    // Move after favorites header
                    favoritesHeader.after(row);
                });
            } else {
                // Hide favorite clients when collapsed
                favoriteClients.forEach(client => {
                    if (existingRows[client.id]) {
                        existingRows[client.id].style.display = 'none';
                    }
                });
            }
        } else if (favoritesHeader) {
            favoritesHeader.style.display = 'none';
        }

        // Render Regular Clients Section
        let regularHeader = clientList.querySelector('.regular-header');
        if (regularClients.length > 0) {
            if (!regularHeader) {
                regularHeader = document.createElement('div');
                regularHeader.className = `clients-section-header regular-header ${regularCollapsed ? 'section-collapsed' : ''}`;
                regularHeader.onclick = toggleRegularSection;
                clientList.appendChild(regularHeader);
            }
            regularHeader.innerHTML = `
                <div class="section-header-content">
                    <i class="fa-solid fa-chevron-down section-chevron"></i>
                    <i class="fa-solid fa-users"></i>
                    <span class="section-title">${favoriteClients.length > 0 ? 'Outros Clientes' : 'Clientes'}</span>
                    <span class="section-count">${regularClients.length}</span>
                </div>
            `;
            regularHeader.className = `clients-section-header regular-header ${regularCollapsed ? 'section-collapsed' : ''}`;
            regularHeader.style.display = 'flex';

            if (!regularCollapsed) {
                regularClients.forEach(client => {
                    let row = existingRows[client.id];
                    if (!row) {
                        row = createClientRow(client);
                        clientList.appendChild(row);
                        existingRows[client.id] = row;
                    } else {
                        // Update existing row content
                        updateClientRow(row, client);
                    }
                    row.style.display = 'block';
                    // Move after regular header
                    regularHeader.after(row);
                });
            } else {
                // Hide regular clients when collapsed
                regularClients.forEach(client => {
                    if (existingRows[client.id]) {
                        existingRows[client.id].style.display = 'none';
                    }
                });
            }
        } else if (regularHeader) {
            regularHeader.style.display = 'none';
        }
    }

    // New function to update existing row without recreating
    function updateClientRow(row, client) {
        const hasServers = client.servers && client.servers.length > 0;
        const hasVpns = client.vpns && client.vpns.length > 0;
        const urlCount = (client.urls ? client.urls.length : 0) + (client.webLaudo && client.webLaudo.trim() !== '' ? 1 : 0);
        const hasUrls = urlCount > 0;
        const hasContacts = client.contacts && client.contacts.length > 0;

        // Update favorite status
        row.className = `client-row ${client.isFavorite ? 'favorite' : ''}`;

        // Update favorite button
        const starBtn = row.querySelector('.btn-star');
        if (starBtn) {
            starBtn.className = `btn-icon btn-star ${client.isFavorite ? 'favorite-active' : ''}`;
            starBtn.title = client.isFavorite ? 'Remover Favorito' : 'Favoritar';
            const starIcon = starBtn.querySelector('i');
            if (starIcon) {
                starIcon.className = `fa-${client.isFavorite ? 'solid' : 'regular'} fa-star`;
            }
        }

        // Update client name and note indicator
        const nameContainer = row.querySelector('.client-name-row');
        if (nameContainer) {
            nameContainer.onclick = null; // Remove interaction from name click
            nameContainer.style.cursor = 'default';
            nameContainer.classList.remove('clickable');
            nameContainer.innerHTML = `
                ${escapeHtml(client.name)}
                ${client.notes ? `<i class="fa-solid fa-bell client-note-indicator" style="margin-left: 15px; cursor: pointer;" onclick="window.openClientGeneralNotes('${client.id}'); event.stopPropagation();" title="Possui observações importantes"></i>` : ''}
            `;
        }

        // Update timestamp
        const updatedInfo = row.querySelector('.client-updated-info');
        if (updatedInfo && client.updatedAt) {
            const dateStr = new Date(client.updatedAt).toLocaleDateString('pt-BR');
            const timeStr = new Date(client.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            updatedInfo.querySelector('.hover-underline').textContent = `Atualizado: ${dateStr} ${timeStr}`;
        }

        // Update badges
        const updateBadge = (selector, hasData, count) => {
            const btn = row.querySelector(selector);
            if (btn) {
                btn.className = hasData ? 'btn-icon active-success btn-with-badge' : 'btn-icon btn-with-badge';
                const badge = btn.querySelector('.btn-badge');
                if (hasData && count > 0) {
                    if (!badge) {
                        const newBadge = document.createElement('span');
                        newBadge.className = 'btn-badge';
                        newBadge.textContent = count;
                        btn.appendChild(newBadge);
                    } else {
                        badge.textContent = count;
                    }
                } else if (badge) {
                    badge.remove();
                }
            }
        };

        // Update contact badge and icon
        const contactBtn = row.querySelector('.btn-with-badge:has(.contact-icon-img)');
        if (contactBtn) {
            contactBtn.className = hasContacts ? 'btn-icon active-success btn-with-badge' : 'btn-icon btn-with-badge';
            const contactIcon = contactBtn.querySelector('.contact-icon-img');
            if (contactIcon) {
                contactIcon.className = hasContacts ? 'contact-icon-img vpn-icon-success' : 'contact-icon-img';
            }
            const badge = contactBtn.querySelector('.btn-badge');
            if (hasContacts) {
                if (!badge) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'btn-badge';
                    newBadge.textContent = client.contacts.length;
                    contactBtn.appendChild(newBadge);
                } else {
                    badge.textContent = client.contacts.length;
                }
            } else if (badge) {
                badge.remove();
            }
        }

        // Update server badge
        updateBadge('.btn-with-badge:has(.fa-database)', hasServers, client.servers?.length || 0);

        // Update VPN badge and icon
        const vpnBtn = row.querySelector('.btn-with-badge:has(.vpn-icon-img)');
        if (vpnBtn) {
            vpnBtn.className = hasVpns ? 'btn-icon active-success btn-with-badge' : 'btn-icon btn-with-badge';
            const vpnIcon = vpnBtn.querySelector('.vpn-icon-img');
            if (vpnIcon) {
                vpnIcon.className = hasVpns ? 'vpn-icon-img vpn-icon-success' : 'vpn-icon-img';
            }
            const badge = vpnBtn.querySelector('.btn-badge');
            if (hasVpns) {
                if (!badge) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'btn-badge';
                    newBadge.textContent = client.vpns.length;
                    vpnBtn.appendChild(newBadge);
                } else {
                    badge.textContent = client.vpns.length;
                }
            } else if (badge) {
                badge.remove();
            }
        }

        // Update URL badge
        updateBadge('.btn-with-badge:has(.fa-link)', hasUrls, urlCount);
    }

    // Helper function to create a client row
    function createClientRow(client) {
        const row = document.createElement('div');
        row.className = `client-row ${client.isFavorite ? 'favorite' : ''}`;
        row.id = `client-row-${client.id}`;

        const hasServers = client.servers && client.servers.length > 0;
        const hasVpns = client.vpns && client.vpns.length > 0;
        const urlCount = (client.urls ? client.urls.length : 0) + (client.webLaudo && client.webLaudo.trim() !== '' ? 1 : 0);
        const hasUrls = urlCount > 0;
        const hasContacts = client.contacts && client.contacts.length > 0;
        const serverBtnClass = hasServers ? 'btn-icon active-success' : 'btn-icon';
        const vpnBtnClass = hasVpns ? 'btn-icon active-success' : 'btn-icon';
        const urlBtnClass = hasUrls ? 'btn-icon active-success' : 'btn-icon';
        const contactBtnClass = hasContacts ? 'btn-icon active-success' : 'btn-icon';
        const vpnIconClass = hasVpns ? 'vpn-icon-img vpn-icon-success' : 'vpn-icon-img';

        row.innerHTML = `
            <div class="client-row-header">
                <div class="header-left" style="align-items: flex-start;">
                    <button class="btn-icon btn-star ${client.isFavorite ? 'favorite-active' : ''}" onclick="toggleFavorite('${client.id}'); event.stopPropagation();" title="${client.isFavorite ? 'Remover Favorito' : 'Favoritar'}" style="margin-top: 0;">
                        <i class="fa-${client.isFavorite ? 'solid' : 'regular'} fa-star"></i>
                    </button>
                    <div class="client-name-container" style="display: flex; flex-direction: column; justify-content: flex-start;">
                        <div class="client-name-row" title="Nome do Cliente" style="display: flex; align-items: center;">
                            <span>${escapeHtml(client.name)}</span>
                            ${client.notes ? `<i class="fa-solid fa-bell client-note-indicator" title="Possui observações importantes" style="margin-left: 15px; cursor: pointer;" onclick="window.openClientGeneralNotes('${client.id}'); event.stopPropagation();"></i>` : ''}
                        </div>
                        ${client.updatedAt ? `
                            <div class="client-updated-info clickable" onclick="openClientHistory('${client.id}'); event.stopPropagation();" title="Ver Histórico de Alterações" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px; font-weight: normal; display: flex; align-items: center; gap: 4px; cursor: pointer; width: fit-content;">
                                <i class="fa-solid fa-clock-rotate-left" style="font-size: 0.65rem;"></i>
                                <span class="hover-underline">Atualizado: ${new Date(client.updatedAt).toLocaleDateString('pt-BR')} ${new Date(client.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="header-right">
                     <div class="row-actions">
                          <button class="${contactBtnClass} btn-with-badge" onclick="event.stopPropagation(); openContactData('${client.id}');" title="Ver Contatos">
                             <img src="contact-icon.png" class="contact-icon-img ${hasContacts ? 'vpn-icon-success' : ''}" alt="Contatos">
                             ${hasContacts ? `<span class="btn-badge">${client.contacts.length}</span>` : ''}
                         </button>
                          <button class="${serverBtnClass} btn-with-badge" onclick="openServerData('${client.id}'); event.stopPropagation();" title="Dados de acesso ao SQL">
                              <i class="fa-solid fa-database"></i>
                              ${hasServers ? `<span class="btn-badge">${client.servers.length}</span>` : ''}
                          </button>
                          <button class="${vpnBtnClass} btn-with-badge" onclick="openVpnData('${client.id}'); event.stopPropagation();" title="Dados de Acesso VPN">
                             <img src="vpn-icon.png" class="${vpnIconClass}" alt="VPN">
                             ${hasVpns ? `<span class="btn-badge">${client.vpns.length}</span>` : ''}
                         </button>
                          <button class="${urlBtnClass} btn-with-badge" onclick="event.stopPropagation(); openUrlData('${client.id}');" title="URL">
                             <i class="fa-solid fa-link"></i>
                             ${hasUrls ? `<span class="btn-badge">${urlCount}</span>` : ''}
                         </button>
                         <button class="btn-icon btn-edit-client" onclick="window.openClientInteraction('${client.id}', '${escapeHtml(client.name)}'); event.stopPropagation();" title="Editar Cliente" style="color: var(--text-secondary);">
                             <i class="fa-solid fa-pencil"></i>
                         </button>
                         <button class="btn-icon btn-danger btn-delete-client" onclick="deleteClient('${client.id}'); event.stopPropagation();" title="Excluir">
                             <i class="fa-solid fa-trash"></i>
                         </button>
                     </div>
                </div>
            </div>
        `;
        return row;
    }

    // --- Contact Modal Functions ---
    window.openContactData = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        if (contactModalClientId) contactModalClientId.value = clientId;
        if (contactModalClientName) contactModalClientName.textContent = client.name;
        if (contactModalSearch) contactModalSearch.value = '';

        renderContactModalList(client);
        contactModal.classList.remove('hidden');
    };

    function closeContactModal() {
        contactModal.classList.add('hidden');
    }
    window.closeContactModal = closeContactModal;

    function renderContactModalList(client) {
        if (!contactModalList) return;
        contactModalList.innerHTML = '';

        if (!client.contacts || client.contacts.length === 0) {
            contactModalList.innerHTML = `
                <div style="width: 100%; text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fa-solid fa-address-book" style="font-size: 3rem; opacity: 0.3; margin-bottom: 12px;"></i>
                    <p>Nenhum contato cadastrado.</p>
                </div>
            `;
            return;
        }

        const searchTerm = contactModalSearch ? contactModalSearch.value.toLowerCase() : '';
        const cleanSearchTerm = searchTerm.replace(/\D/g, '');

        const filteredContacts = client.contacts.filter(contact => {
            const nameMatch = (contact.name || '').toLowerCase().includes(searchTerm);

            // Flexible phone match: check matches with original formatting OR matching digits only
            const phoneMatch = contact.phones && contact.phones.some(p => {
                const cleanPhone = p.replace(/\D/g, '');
                return p.toLowerCase().includes(searchTerm) || (cleanSearchTerm && cleanPhone.includes(cleanSearchTerm));
            });

            const emailMatch = contact.emails && contact.emails.some(e => e.toLowerCase().includes(searchTerm));
            return nameMatch || phoneMatch || emailMatch;
        });

        if (filteredContacts.length === 0) {
            contactModalList.innerHTML = `
                <div style="width: 100%; text-align: center; padding: 20px; color: var(--text-secondary);">
                    <p>Nenhum contato encontrado para "${searchTerm}".</p>
                </div>
            `;
            return;
        }

        // Reuse the logic from createClientRow for generating contact cards
        const contactsHTML = filteredContacts.map((contact) => {
            // We need to find the original index for editing
            const originalIndex = client.contacts.indexOf(contact);

            const phonesHTML = contact.phones && contact.phones.length > 0
                ? contact.phones.map(phone => `
                        <div class="contact-item">
                            <i class="fa-solid fa-phone"></i> 
                            <span class="contact-value">${escapeHtml(phone)}</span>
                            <button class="btn-copy-tiny" onclick="copyToClipboard('${escapeHtml(phone).replace(/'/g, "\\'")}')" title="Copiar Telefone">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    `).join('')
                : '';

            const emailsHTML = contact.emails && contact.emails.length > 0
                ? contact.emails.map(email => `
                        <div class="contact-item">
                            <i class="fa-solid fa-envelope"></i> 
                            <span class="contact-value">${escapeHtml(email)}</span>
                            <button class="btn-copy-tiny" onclick="copyToClipboard('${escapeHtml(email).replace(/'/g, "\\'")}')" title="Copiar E-mail">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    `).join('')
                : '';

            return `
                    <div class="contact-group-display" style="max-width: 100%; flex: 1 1 300px;">
                        <div class="contact-header-display">
                            <div class="contact-name-display clickable" onclick="editContact('${client.id}', ${originalIndex});" title="Ver/Editar Contato">
                                ${escapeHtml(contact.name || 'Sem nome')}
                            </div>
                            <button class="btn-icon-small" onclick="editContact('${client.id}', ${originalIndex});" title="Editar Contato">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                        ${phonesHTML}
                        ${emailsHTML}
                    </div>
                `;
        }).join('');

        contactModalList.innerHTML = contactsHTML;
    }

    // Save data to localStorage and Supabase
    async function saveToLocal(specificClientId = null) {
        localStorage.setItem('sofis_clients', JSON.stringify(clients));
        updateFilterCounts();

        // Persist to Supabase if available
        if (window.supabaseClient) {
            if (specificClientId) {
                // Only sync the specific client that was modified
                const client = clients.find(c => c.id === specificClientId);
                if (client) {
                    await syncClientToSupabase(client);
                }
            } else {
                // Sync all clients (used for initial load or bulk operations)
                for (const client of clients) {
                    await syncClientToSupabase(client);
                }
            }
        }
    }

    async function syncClientToSupabase(client) {
        if (!window.supabaseClient) return;

        const clientData = {
            name: client.name,
            is_favorite: !!client.isFavorite,
            notes: client.notes || '',
            web_laudo: client.webLaudo || ''
        };

        try {
            let clientId = client.id;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);

            let result;
            if (isUUID) {
                result = await window.supabaseClient.from('clients').upsert({ id: clientId, ...clientData }).select().single();
            } else {
                // New client or old localStorage ID
                result = await window.supabaseClient.from('clients').insert(clientData).select().single();
                if (result.data) {
                    // Update local ID to the new UUID
                    client.id = result.data.id;
                    clientId = result.data.id;
                    localStorage.setItem('sofis_clients', JSON.stringify(clients));
                }
            }

            if (result.error) throw result.error;

            // Update local updatedAt with the value from Supabase
            if (result.data && result.data.updated_at) {
                client.updatedAt = result.data.updated_at;
            }

            // Sync related tables - Delete and Re-insert for simplicity
            await window.supabaseClient.from('contacts').delete().eq('client_id', clientId);
            if (client.contacts?.length > 0) {
                await window.supabaseClient.from('contacts').insert(client.contacts.map(c => ({
                    client_id: clientId,
                    name: c.name,
                    phones: c.phones || [],
                    emails: c.emails || []
                })));
            }

            await window.supabaseClient.from('servers').delete().eq('client_id', clientId);
            if (client.servers?.length > 0) {
                await window.supabaseClient.from('servers').insert(client.servers.map(s => ({
                    client_id: clientId,
                    environment: s.environment,
                    sql_server: s.sqlServer,
                    notes: s.notes || '',
                    credentials: s.credentials || []
                })));
            }

            await window.supabaseClient.from('vpns').delete().eq('client_id', clientId);
            if (client.vpns?.length > 0) {
                await window.supabaseClient.from('vpns').insert(client.vpns.map(v => ({
                    client_id: clientId,
                    username: v.user,
                    password: v.password,
                    notes: v.notes || ''
                })));
            }

            await window.supabaseClient.from('urls').delete().eq('client_id', clientId);
            if (client.urls?.length > 0) {
                await window.supabaseClient.from('urls').insert(client.urls.map(u => ({
                    client_id: clientId,
                    environment: u.environment,
                    system: u.system,
                    bridge_data_access: u.bridgeDataAccess,
                    bootstrap: u.bootstrap || '',
                    exec_update: u.execUpdate || '',
                    notes: u.notes || ''
                })));
            }
        } catch (err) {
            console.error('Erro ao sincronizar com Supabase:', err);
            const errorMsg = err.message || (err.error_description) || 'Erro desconhecido';
            showToast(`❌ Erro no Banco: ${errorMsg}`, 'error');
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const mode = form.dataset.mode;
        const editingContactIndex = contactList.dataset.editingContactIndex;

        // Validate Client Name
        const nameValue = clientNameInput.value.trim();
        if (!nameValue) {
            showToast('⚠️ O nome do cliente é obrigatório.', 'error');
            clientNameInput.focus();
            return;
        }

        // Check for duplicate client name
        // Don't check strictly if we are just adding a contact to an existing client (mode === 'addContact')
        // But wait, if mode is addContact, clientNameInput is disabled or readonly usually? 
        // Logic: if we are creating a new client (!editingId) or updating a client name (editingId && mode !== 'addContact')

        if (mode !== 'addContact') {
            const duplicateClient = clients.find(c => c.name.toLowerCase() === nameValue.toLowerCase() && c.id !== editingId);
            if (duplicateClient) {
                showToast('⚠️ Já existe um cliente cadastrado com este nome.', 'error');
                clientNameInput.focus();
                return;
            }
        }


        // --- MODE: EDITING A SINGLE CONTACT ---
        if (editingContactIndex !== undefined) {
            const contactGroups = contactList.querySelectorAll('.contact-group');
            if (contactGroups.length !== 1) {
                showToast('⚠️ Erro ao salvar contato.', 'error');
                return;
            }

            const group = contactGroups[0];
            const name = group.querySelector('.contact-name-input').value.trim();
            const phones = Array.from(group.querySelectorAll('.phone-input'))
                .map(input => input.value.trim())
                .filter(val => val !== '');
            const emails = Array.from(group.querySelectorAll('.email-input'))
                .map(input => input.value.trim())
                .filter(val => val !== '');

            if (!name || phones.length === 0) {
                showToast('⚠️ Nome e pelo menos um telefone são obrigatórios.', 'error');
                return;
            }

            const client = clients.find(c => c.id === editingId);
            if (!client) return;

            const currentIndex = parseInt(editingContactIndex);

            // Duplicate checks
            if (client.contacts) {
                for (let i = 0; i < client.contacts.length; i++) {
                    if (i === currentIndex) continue;
                    const existing = client.contacts[i];
                    for (const phone of phones) {
                        if (existing.phones && existing.phones.includes(phone)) {
                            showToast(`❌ Telefone ${phone} já cadastrado em outro contato.`, 'error');
                            return;
                        }
                    }
                }
            }

            client.contacts[currentIndex] = { name, phones, emails };
            saveToLocal();
            renderClients(clients);

            // Re-render contact modal if visible for this client
            if (!contactModal.classList.contains('hidden') && contactModalClientId.value === editingId) {
                renderContactModalList(client);
            }

            closeModal();
            delete contactList.dataset.editingContactIndex;
            showToast(`✅ Contato "${name}" do cliente "${client.name}" atualizado com sucesso!`, 'success');
            return;
        }

        // Collect contacts
        const contactGroups = contactList.querySelectorAll('.contact-group');
        const contacts = Array.from(contactGroups).map(group => {
            const name = group.querySelector('.contact-name-input').value.trim();

            const phoneInputs = group.querySelectorAll('.phone-input');
            const phones = Array.from(phoneInputs)
                .map(input => input.value.trim())
                .filter(val => val !== '');

            const emailInputs = group.querySelectorAll('.email-input');
            const emails = Array.from(emailInputs)
                .map(input => input.value.trim())
                .filter(val => val !== '');

            return { name, phones, emails };
        }).filter(contact => contact.phones.length > 0 || contact.emails.length > 0);


        if (contacts.length === 0) {
            showToast('⚠️ Preencha pelo menos um telefone ou e-mail.', 'error');
            return;
        }

        // Validate Contact Name and Phone (required for new contacts)
        for (let i = 0; i < contacts.length; i++) {
            if (!contacts[i].name) {
                showToast('⚠️ O nome do contato é obrigatório.', 'error');
                if (contactGroups[i]) {
                    const input = contactGroups[i].querySelector('.contact-name-input');
                    if (input) {
                        input.focus();
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                return;
            }
            if (contacts[i].phones.length === 0) {
                showToast('⚠️ Pelo menos um telefone é obrigatório.', 'error');
                if (contactGroups[i]) {
                    const btn = contactGroups[i].querySelector('.btn-add-phone');
                    if (btn) {
                        btn.focus();
                        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                return;
            }
        }

        // Check for duplicate contact names within the same client
        const contactNames = contacts.map(c => c.name.toLowerCase());
        const nameDuplicates = contactNames.filter((name, index) => contactNames.indexOf(name) !== index);
        if (nameDuplicates.length > 0) {
            showToast(`⚠️ Nome de contato duplicado: ${contacts.find(c => c.name.toLowerCase() === nameDuplicates[0]).name}`, 'error');
            return;
        }

        // If editing or adding contact to existing client, check against existing contacts
        // Only do this check when adding a new contact, not when editing the entire client
        if (editingId && mode === 'addContact') {
            const currentClient = clients.find(c => c.id === editingId);
            if (currentClient && currentClient.contacts) {
                for (const newContact of contacts) {
                    for (const existingContact of currentClient.contacts) {
                        if (existingContact.name.toLowerCase() === newContact.name.toLowerCase()) {
                            showToast(`⚠️ O nome "${newContact.name}" já está cadastrado para este cliente.`, 'error');
                            return;
                        }
                    }
                }
            }
        }


        // Check for duplicate phones
        const allPhones = contacts.flatMap(c => c.phones);
        const phoneDuplicates = allPhones.filter((phone, index) => allPhones.indexOf(phone) !== index);
        if (phoneDuplicates.length > 0) {
            showToast(`❌ Telefone duplicado: ${phoneDuplicates[0]}`, 'error');
            return;
        }

        // Check for duplicates across other clients (only phones)
        const otherClients = clients.filter(c => c.id !== editingId);

        for (const phone of allPhones) {
            for (const client of otherClients) {
                if (client.contacts) {
                    for (const contact of client.contacts) {
                        if (contact.phones && contact.phones.includes(phone)) {
                            showToast(`❌ Telefone ${phone} já cadastrado para ${client.name}`, 'error');
                            return;
                        }
                    }
                }
            }
        }

        // If in addContact mode, also check against existing contacts of the SAME client
        if (mode === 'addContact' && editingId) {
            const currentClient = clients.find(c => c.id === editingId);
            if (currentClient && currentClient.contacts) {
                for (const phone of allPhones) {
                    for (const existingContact of currentClient.contacts) {
                        if (existingContact.phones && existingContact.phones.includes(phone)) {
                            showToast(`❌ Telefone ${phone} já cadastrado neste cliente`, 'error');
                            return;
                        }
                    }
                }
            }
        }

        const clientBefore = editingId ? JSON.parse(JSON.stringify(clients.find(c => c.id === editingId) || {})) : null;

        const newClient = {
            id: editingId || Date.now().toString(),
            name: clientNameInput.value,
            contacts: contacts,
            isFavorite: isModalFavorite
        };

        // ... updates to clients array ...
        // ... updates to clients array ...
        let addedContactNames = '';
        if (editingId && mode !== 'addContact') {
            const clientToUpdate = clients.find(c => c.id === editingId);

            // Check if only name changed
            const nameChanged = clientToUpdate.name !== newClient.name;
            const contactsChanged = JSON.stringify(clientToUpdate.contacts) !== JSON.stringify(newClient.contacts);
            const favoriteChanged = !!clientToUpdate.isFavorite !== !!newClient.isFavorite;

            // Only update timestamp if contacts or favorite status changed (per user request: excluding name changes from updating "Atualizado")
            if (contactsChanged || favoriteChanged) {
                newClient.updatedAt = new Date().toISOString();
            } else {
                newClient.updatedAt = clientToUpdate.updatedAt;
            }

            clients = clients.map(c => c.id === editingId ? newClient : c);
            showToast(`✅ Cliente "${newClient.name}" atualizado com sucesso!`, 'success');
        } else if (editingId && mode === 'addContact') {
            const clientToUpdate = clients.find(c => c.id === editingId);
            if (clientToUpdate) {
                if (!clientToUpdate.contacts) clientToUpdate.contacts = [];
                clientToUpdate.contacts.push(...contacts);
                clientToUpdate.updatedAt = new Date().toISOString();
                const contactNames = contacts.map(c => c.name).join(', ');
                addedContactNames = contactNames;
                showToast(`✅ Contato "${contactNames}" adicionado ao cliente "${clientToUpdate.name}"!`, 'success');
            }
        } else {
            newClient.updatedAt = new Date().toISOString();
            clients.push(newClient);
            showToast(`✅ Cliente "${newClient.name}" adicionado com sucesso!`, 'success');
        }

        await saveToLocal(newClient.id);
        renderClients(clients);

        if (!contactModal.classList.contains('hidden') && contactModalClientId.value === editingId) {
            const clientToRefresh = clients.find(c => c.id === editingId);
            if (clientToRefresh) {
                renderContactModalList(clientToRefresh);
            }
        }

        closeModal();
        if (typeof populateVersionClientSelect === 'function') {
            populateVersionClientSelect();
        }
        const opType = editingId ? 'EDIÇÃO' : 'CRIAÇÃO';
        const actionLabel = editingId ? (mode === 'addContact' ? 'Adição de Contato' : 'Edição de Cliente') : 'Novo Cliente';
        const clientAfter = JSON.parse(JSON.stringify(clients.find(c => c.id === newClient.id) || newClient));

        let details = `Cliente: ${newClient.name}`;
        if (addedContactNames) details += `, Contato: ${addedContactNames}`;

        // Detect edited contacts if in Edit mode (not Add Contact mode)
        if (editingId && mode !== 'addContact' && clientBefore && clientBefore.contacts) {
            const changedContacts = [];
            newClient.contacts.forEach((curr, i) => {
                const prev = clientBefore.contacts[i] || {};

                const pName = prev.name || '';
                const cName = curr.name || '';
                const pPhones = JSON.stringify((prev.phones || []).slice().sort()); // slice before sort to immutable copy
                const cPhones = JSON.stringify((curr.phones || []).slice().sort());
                const pEmails = JSON.stringify((prev.emails || []).slice().sort());
                const cEmails = JSON.stringify((curr.emails || []).slice().sort());

                if (pName !== cName || pPhones !== cPhones || pEmails !== cEmails) {
                    changedContacts.push(cName);
                }
            });

            if (changedContacts.length > 0) {
                // Avoid duplicating if already added via addedContactNames (unlikely overlap but safe)
                const unique = [...new Set(changedContacts)].filter(name => !addedContactNames.includes(name));
                if (unique.length > 0) details += `, Contato: ${unique.join(', ')}`;
            }
        }

        await registerAuditLog(opType, actionLabel, details, clientBefore, clientAfter);
    };

    async function deleteClient(id) {
        const client = clients.find(c => c.id === id);
        if (!client) return;

        if (confirm(`⚠️ EXCLUIR CLIENTE ⚠️\n\nTem certeza que deseja excluir "${client.name}"?`)) {
            const clientName = client.name;
            const clientSnapshot = JSON.parse(JSON.stringify(client));

            // 1. Atualização Instantânea na Memória e UI de Contatos
            clients = clients.filter(c => c.id !== id);
            window.clients = clients;
            applyClientFilter();
            showToast(`🗑️ Cliente "${clientName}" removido com sucesso!`, 'success');

            // 2. Atualização Instantânea na UI de Controle de Versão
            if (window.versionControls) {
                window.versionControls = window.versionControls.filter(vc => vc.client_id !== id);
                if (typeof window.renderVersionControls === 'function') {
                    window.renderVersionControls();
                }
            }

            // 3. Processamento em segundo plano (LocalStorage, Supabase e Logs)
            (async () => {
                await saveToLocal();

                if (window.supabaseClient) {
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                    if (isUUID) {
                        try {
                            await window.supabaseClient.from('clients').delete().eq('id', id);
                        } catch (err) {
                            console.error('Erro ao deletar do Supabase:', err);
                        }
                    }
                }

                if (window.registerAuditLog) {
                    await registerAuditLog('EXCLUSÃO', 'Exclusão de Cliente', `Cliente: ${clientName}`, clientSnapshot, null);
                }
            })();
        }
    }
    window.deleteClient = deleteClient;

    function editClient(id) {
        const client = clients.find(c => c.id === id);
        if (!client) return;

        editingId = id;
        isModalFavorite = client.isFavorite || false;
        updateModalFavoriteUI();
        clientNameInput.value = client.name;
        clientNameInput.disabled = false;
        delete form.dataset.mode;
        delete contactList.dataset.editingContactIndex;

        // Populate contacts
        contactList.innerHTML = '';
        if (client.contacts && client.contacts.length > 0) {
            client.contacts.forEach(contact => {
                addContactGroup(contact.name, contact.phones, contact.emails, contact.addresses);
            });
        } else {
            addContactGroup();
        }

        modalTitle.textContent = 'Editar Cliente';
        openModal();
    }

    function handleSearch(e) {
        const term = e.target.value.toLowerCase();
        const filtered = clients.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(term);

            const contactMatch = c.contacts && c.contacts.some(contact => {
                const contactNameMatch = contact.name && contact.name.toLowerCase().includes(term);
                const phoneMatch = contact.phones && contact.phones.some(phone => phone.toLowerCase().includes(term));
                const emailMatch = contact.emails && contact.emails.some(email => email.toLowerCase().includes(term));

                return contactNameMatch || phoneMatch || emailMatch;
            });

            return nameMatch || contactMatch;
        });
        renderClients(filtered);
    }

    // --- UI Helpers ---

    function addContactGroup(name = '', phones = [], emails = []) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'contact-group';
        groupDiv.innerHTML = `
            <div class="contact-group-header">
                <h4 class="contact-group-title" style="color: var(--text-primary);">
                    <i class="fa-solid fa-user" style="color: var(--accent);"></i> Informações do Contato
                </h4>
                <button type="button" class="btn-remove-contact" onclick="removeContact(this)" title="Remover Contato" tabindex="-1">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            
            <div class="contact-details">
                <div class="contact-section">
                    <label class="section-label section-label-left">
                        <span><i class="fa-solid fa-user"></i> Nome do Contato <span class="required">*</span></span>
                    </label>
                    <input type="text" class="contact-name-input" placeholder="Ex: João Silva, Comercial" value="${escapeHtml(name)}">
                </div>

                <div class="contact-section">
                    <label class="section-label section-label-left">
                        <span><i class="fa-solid fa-phone"></i> Telefones <span class="required">*</span></span>
                        <button type="button" class="btn-add-phone" onclick="addPhone(this)" title="Adicionar Telefone" tabindex="-1">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </label>
                    <div class="phone-list"></div>
                </div>

                <div class="contact-section">
                    <label class="section-label section-label-left">
                        <span><i class="fa-solid fa-envelope"></i> E-mails</span>
                        <button type="button" class="btn-add-email" onclick="addEmail(this)" title="Adicionar E-mail" tabindex="-1">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </label>
                    <div class="email-list"></div>
                </div>

            </div>
        `;
        contactList.appendChild(groupDiv);

        // Add phones
        const phoneListDiv = groupDiv.querySelector('.phone-list');
        if (phones.length > 0) {
            phones.forEach(phone => addPhoneField(phoneListDiv, phone));
        } else {
            addPhoneField(phoneListDiv, '');
        }

        // Add emails
        const emailListDiv = groupDiv.querySelector('.email-list');
        if (emails.length > 0) {
            emails.forEach(email => addEmailField(emailListDiv, email));
        } else {
            addEmailField(emailListDiv, '');
        }


    }

    function addPhoneField(container, value = '') {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'contact-field';
        fieldDiv.innerHTML = `
            <input type="text" class="phone-input" placeholder="(11) 99999-9999" maxlength="15" value="${escapeHtml(value)}">
            <button type="button" class="btn-remove-field-small" onclick="removeContactField(this)" title="Remover" tabindex="-1">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(fieldDiv);

        // Add phone mask
        const phoneInput = fieldDiv.querySelector('.phone-input');
        phoneInput.addEventListener('input', applyPhoneMask);
    }

    function addEmailField(container, value = '') {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'contact-field';
        fieldDiv.innerHTML = `
            <input type="email" class="email-input" placeholder="contato@empresa.com" value="${escapeHtml(value)}">
            <button type="button" class="btn-remove-field-small" onclick="removeContactField(this)" title="Remover" tabindex="-1">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(fieldDiv);
    }



    function applyPhoneMask(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits

        // Limit to 13 digits
        if (value.length > 13) {
            value = value.substring(0, 13);
        }

        // Apply mask
        if (value.length <= 10) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else {
            value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        }

        e.target.value = value.trim();
    }

    function openAddModal() {
        editingId = null;
        isModalFavorite = false;
        updateModalFavoriteUI();
        form.reset();
        clientNameInput.disabled = false;
        delete form.dataset.mode;
        delete contactList.dataset.editingContactIndex;

        // Reset contact list
        contactList.innerHTML = '';
        addContactGroup();

        modalTitle.textContent = 'Novo Cliente';
        openModal();
    }

    function openModal() {
        modal.classList.remove('hidden');
    }

    function updateModalFavoriteUI() {
        if (!modalToggleFavorite) return;
        const icon = modalToggleFavorite.querySelector('i');
        if (isModalFavorite) {
            modalToggleFavorite.classList.add('favorite-active');
            icon.className = 'fa-solid fa-star';
            modalToggleFavorite.title = 'Remover Favorito';
        } else {
            modalToggleFavorite.classList.remove('favorite-active');
            icon.className = 'fa-regular fa-star';
            modalToggleFavorite.title = 'Favoritar';
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = 'toast'; // Reset classes

        if (type === 'error') {
            toast.classList.add('toast-error');
        } else if (type === 'warning') {
            toast.classList.add('toast-warning');
        } else {
            toast.classList.add('toast-success');
        }

        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Expose functions to global scope for HTML onclick attributes
    window.showToast = showToast;
    window.escapeHtml = escapeHtml;
    window.editClient = editClient;
    window.deleteClient = deleteClient;
    window.registerAuditLog = registerAuditLog;

    window.addNewContact = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        editingId = clientId;
        clientNameInput.value = client.name;
        clientNameInput.disabled = true; // Lock client name to focus on contact addition

        // Clear list and add only one empty group for new contact
        contactList.innerHTML = '';
        addContactGroup();

        form.dataset.mode = 'addContact';

        modalTitle.textContent = 'Adicionar Novo Contato';
        openModal();
    };

    window.toggleFavorite = (id) => {
        const client = clients.find(c => c.id === id);
        if (client) {
            client.isFavorite = !client.isFavorite;
            saveToLocal();
            applyClientFilter(); // Use the unified filter system
        }
    };

    window.editContact = (clientId, contactIndex) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.contacts || !client.contacts[contactIndex]) return;

        editingId = clientId;
        clientNameInput.value = client.name;

        // Populate only the contact being edited
        contactList.innerHTML = '';
        const contact = client.contacts[contactIndex];
        addContactGroup(contact.name, contact.phones, contact.emails, contact.addresses);

        // Store the contact index for later
        contactList.dataset.editingContactIndex = contactIndex;
        form.dataset.mode = 'editContact'; // Explicitly set mode to avoid 'addContact' behavior

        modalTitle.textContent = 'Editar Contato - ' + client.name;
        openModal();
    };




























    window.removeContact = async (button) => {
        const contactGroup = button.closest('.contact-group');
        const container = contactGroup.parentElement;

        // Check if we are in "Edit Single Contact" mode
        const editingContactIndex = contactList.dataset.editingContactIndex;

        if (editingContactIndex !== undefined && editingId) {
            const client = clients.find(c => c.id === editingId);

            // Validation: Cannot delete the last contact
            if (client && client.contacts && client.contacts.length <= 1) {
                showToast('⚠️ O cliente deve possuir pelo menos um contato cadastrado.', 'error');
                return;
            }

            // We are editing a specific existing contact. The trash button should DELETE it.
            if (confirm('Tem certeza que deseja excluir este contato?')) {
                if (client && client.contacts) {
                    const index = parseInt(editingContactIndex);
                    // Ensure the index is valid
                    if (index >= 0 && index < client.contacts.length) {
                        client.contacts.splice(index, 1); // Remove contact
                        saveToLocal();
                        renderClients(clients);
                        closeModal();
                        delete contactList.dataset.editingContactIndex;
                        showToast('✅ Contato excluído com sucesso!', 'success');
                        await registerAuditLog('EXCLUSÃO', 'Exclusão de Contato', `Cliente: ${client.name}, Contato: ${contact.name}`, contact, null);
                        return;
                    }
                }
            }
            return; // Cancelled
        }

        // Default behavior: just remove the DOM element if there's more than one
        if (container.children.length > 1) {
            contactGroup.remove();
        } else {
            showToast('⚠️ Deve haver pelo menos um contato no formulário.', 'error');
        }
    };

    window.addPhone = (button) => {
        const contactSection = button.closest('.contact-section');
        const phoneList = contactSection.querySelector('.phone-list');
        addPhoneField(phoneList, '');
    };

    window.addEmail = (button) => {
        const contactSection = button.closest('.contact-section');
        const emailList = contactSection.querySelector('.email-list');
        addEmailField(emailList, '');
    };



    window.removeContactField = (button) => {
        const field = button.closest('.contact-field');
        const container = field.parentElement;

        if (container.children.length > 1) {
            field.remove();
        } else {
            // Clear the input instead of removing the last field
            const input = field.querySelector('input');
            if (input) input.value = '';
        }
    };

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Copiado!', 'success');
        });
    };

    window.togglePassword = (btn) => {
        const row = btn.closest('.credential-row') || btn.closest('.server-info');
        const valueSpan = row.querySelector('.credential-value') || row.querySelector('.pass-hidden');
        const icon = btn.querySelector('i');
        const isMasked = valueSpan.textContent === '••••••';

        if (isMasked) {
            valueSpan.textContent = valueSpan.dataset.raw;
            icon.className = 'fa-solid fa-eye-slash';
            btn.title = 'Ocultar Senha';
        } else {
            valueSpan.textContent = '••••••';
            icon.className = 'fa-solid fa-eye';
            btn.title = 'Visualizar Senha';
        }
    };

    // --- Server Data Functions ---

    window.openServerData = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        serverClientIdInput.value = clientId;

        // Initialize servers array if it doesn't exist
        if (!client.servers) {
            client.servers = [];
        }

        const serverModalClientName = document.getElementById('serverModalClientName');
        if (serverModalClientName) serverModalClientName.textContent = client.name;

        // Reset filter state
        currentServerFilter = 'all';
        if (serverFilterBtn) serverFilterBtn.classList.remove('filter-btn-active');
        if (serverFilterMenu) {
            serverFilterMenu.querySelectorAll('.dropdown-item').forEach(i => {
                i.classList.toggle('selected', i.dataset.value === 'all');
            });
        }

        // Clear and reset the form
        clearServerForm();

        // Render the servers list
        renderServersList(client);

        serverModal.classList.remove('hidden');
    };

    function closeServerModal() {
        serverModal.classList.add('hidden');
    }

    function openServerEntry() {
        clearServerForm();
        serverEntryModalTitle.textContent = 'Novo Acesso SQL';
        const editingServerIndex = document.getElementById('editingServerIndex');
        if (editingServerIndex) editingServerIndex.value = '';
        serverEntryModal.classList.remove('hidden');
    }

    function closeServerEntryModal() {
        serverEntryModal.classList.add('hidden');
        clearServerForm();
    }

    function clearServerForm() {
        const environmentSelect = document.getElementById('environmentSelect');
        if (environmentSelect) environmentSelect.value = '';
        if (sqlServerInput) sqlServerInput.value = '';
        if (serverNotesInput) serverNotesInput.value = '';

        const editingServerIndex = document.getElementById('editingServerIndex');
        if (editingServerIndex) editingServerIndex.value = '';

        // Clear credentials
        credentialList.innerHTML = '';
        addCredentialField(); // Add one empty credential field
    }

    function renderServersList(client) {
        const serversList = document.getElementById('serversList');
        if (!serversList) return;

        const filterValue = currentServerFilter;
        let filteredServers = client.servers || [];

        if (filterValue !== 'all') {
            filteredServers = filteredServers.filter(s => s.environment === filterValue);
        }

        if (filteredServers.length === 0) {
            serversList.innerHTML = `
                <div class="servers-grid-empty">
                    <i class="fa-solid fa-database"></i>
                    <p>${filterValue === 'all' ? 'Nenhum dado de acesso cadastrado ainda.' : 'Nenhum dado de acesso encontrado para este filtro.'}</p>
                </div>
            `;
            return;
        }

        serversList.innerHTML = filteredServers.map((server, index) => {
            // We need the ACTUAL index for editing/deleting, not the filtered one
            const originalIndex = client.servers.indexOf(server);
            const environmentClass = server.environment === 'homologacao' ? 'homologacao' : 'producao';
            const environmentLabel = server.environment === 'homologacao' ? 'Homologação' : 'Produção';

            const credentialsHTML = server.credentials && server.credentials.length > 0
                ? `
                    <div class="server-credentials">
                        <div class="server-credentials-title">
                            <i class="fa-solid fa-key" style="color: var(--accent);"></i> Credenciais
                        </div>
                        ${server.credentials.map(cred => `
                            <div class="credential-item">
                                <div class="credential-row">
                                    <span class="credential-label">Usuário:</span>
                                    <span class="credential-value">${escapeHtml(cred.user)}</span>
                                    <button class="btn-copy-small" onclick="copyToClipboard(this.dataset.value)" data-value="${escapeHtml(cred.user)}" title="Copiar Usuário">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                </div>
                                <div class="credential-row">
                                    <span class="credential-label">Senha:</span>
                                    <span class="credential-value" data-raw="${escapeHtml(cred.password)}">••••••</span>
                                    <button class="btn-copy-small" onclick="togglePassword(this)" title="Visualizar Senha" style="margin-right: 4px;">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                    <button class="btn-copy-small" onclick="copyToClipboard(this.dataset.value)" data-value="${escapeHtml(cred.password)}" title="Copiar Senha">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `
                : '';

            const notesHTML = server.notes
                ? `<div class="server-notes">
                    <div class="server-notes-title">Observações</div>
                    <div class="server-notes-content">${escapeHtml(server.notes)}</div>
                   </div>`
                : '';

            return `
                <div class="server-card">
                    <div class="server-card-header">
                        <span class="server-environment ${environmentClass}">${environmentLabel}</span>
                        <div class="server-card-actions">
                            <button class="btn-icon" onclick="editServerRecord('${client.id}', ${originalIndex})" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="deleteServerRecord('${client.id}', ${originalIndex})" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="server-info">
                        <div class="server-credentials-title">
                            <i class="fa-solid fa-database" style="color: var(--accent);"></i> Instância do SQL Server
                        </div>
                        <div class="server-info-value">${escapeHtml(server.sqlServer)}</div>
                    </div>
                    ${credentialsHTML}
                    ${notesHTML}
                </div>
            `;
        }).join('');
    }

    window.removeCredentialField = function (btn) {
        const groups = document.querySelectorAll('.credential-field-group');
        if (groups.length <= 1) {
            showToast('⚠️ É necessário ter pelo menos um usuário e senha.', 'error');
            return;
        }
        btn.closest('.credential-field-group').remove();
    };

    function addCredentialField(user = '', password = '') {
        const div = document.createElement('div');
        div.className = 'credential-field-group';
        div.innerHTML = `
            <div class="credential-fields-container">
                <div class="credential-field-item">
                    <label class="credential-label-text">Usuário<span class="required">*</span></label>
                    <input type="text" class="server-user-input" placeholder="Digite o usuário" value="${escapeHtml(user)}" required>
                </div>
                <div class="credential-field-item">
                    <label class="credential-label-text">Senha<span class="required">*</span></label>
                    <input type="text" class="server-pass-input" placeholder="Digite a senha" value="${escapeHtml(password)}" required>
                </div>
                <button type="button" class="btn-remove-credential" onclick="removeCredentialField(this)" title="Remover Credencial" tabindex="-1">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        credentialList.appendChild(div);
    }

    async function handleServerSubmit(e) {
        e.preventDefault();
        const id = serverClientIdInput.value;
        const client = clients.find(c => c.id === id);

        if (!client) return;

        // Initialize servers array if needed
        if (!client.servers) {
            client.servers = [];
        }

        const environmentSelect = document.getElementById('environmentSelect');
        const editingServerIndex = document.getElementById('editingServerIndex');

        // Collect Credentials
        const credDivs = credentialList.querySelectorAll('.credential-field-group');
        const credentials = Array.from(credDivs).map(div => {
            return {
                user: div.querySelector('.server-user-input').value.trim(),
                password: div.querySelector('.server-pass-input').value.trim()
            };
        }).filter(c => c.user !== '' || c.password !== '');

        // Validation
        if (!environmentSelect.value) {
            showToast('⚠️ O ambiente é obrigatório.', 'error');
            environmentSelect.focus();
            return;
        }
        if (!sqlServerInput.value.trim()) {
            showToast('⚠️ A instância do SQL Server é obrigatória.', 'error');
            sqlServerInput.focus();
            return;
        }

        const editingIndex = document.getElementById('editingServerIndex').value;
        const serverBefore = (editingIndex !== '') ? JSON.parse(JSON.stringify(client.servers[parseInt(editingIndex)])) : null;

        const serverRecord = {
            environment: environmentSelect.value,
            sqlServer: sqlServerInput.value.trim(),
            credentials: credentials,
            notes: serverNotesInput ? serverNotesInput.value.trim() : ''
        };

        if (editingIndex !== '') {
            const index = parseInt(editingIndex);
            client.servers[index] = serverRecord;
            showToast(`✅ Acesso SQL do cliente "${client.name}" atualizado com sucesso!`, 'success');
        } else {
            client.servers.push(serverRecord);
            showToast(`✅ Acesso SQL adicionado ao cliente "${client.name}"!`, 'success');
        }

        // Instant UI update
        client.updatedAt = new Date().toISOString();

        await saveToLocal(client.id);
        renderClients(clients);
        renderServersList(client);
        closeServerEntryModal();
        const opType = (editingIndex !== '') ? 'EDIÇÃO' : 'CRIAÇÃO';
        const actionLabel = (editingIndex !== '') ? 'Edição de Acesso SQL' : 'Adição de Acesso SQL';
        await registerAuditLog(opType, actionLabel, `Cliente: ${client.name}, Ambiente: ${serverRecord.environment}`, serverBefore, serverRecord);
    }

    window.editServerRecord = (clientId, index) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.servers || !client.servers[index]) return;

        const server = client.servers[index];
        const environmentSelect = document.getElementById('environmentSelect');
        const editingServerIndex = document.getElementById('editingServerIndex');

        // Populate form with server data
        if (environmentSelect) environmentSelect.value = server.environment;
        if (sqlServerInput) sqlServerInput.value = server.sqlServer;
        if (serverNotesInput) serverNotesInput.value = server.notes || '';
        if (editingServerIndex) editingServerIndex.value = index;

        // Populate credentials
        credentialList.innerHTML = '';
        if (server.credentials && server.credentials.length > 0) {
            server.credentials.forEach(cred => addCredentialField(cred.user, cred.password));
        } else {
            addCredentialField();
        }

        serverEntryModalTitle.textContent = 'Editar Acesso SQL';
        serverEntryModal.classList.remove('hidden');
    };

    window.deleteServerRecord = async (clientId, index) => {
        if (!confirm('Tem certeza que deseja excluir este servidor?')) return;

        const client = clients.find(c => c.id === clientId);
        if (!client || !client.servers) return;

        const deletedServer = JSON.parse(JSON.stringify(client.servers[index]));
        client.servers.splice(index, 1);
        await saveToLocal(client.id);
        renderClients(clients);
        renderServersList(client);
        showToast(`🗑️ Acesso SQL do cliente "${client.name}" removido com sucesso!`, 'success');
        await registerAuditLog('EXCLUSÃO', 'Exclusão de Acesso SQL', `Cliente: ${client.name}, Ambiente: ${deletedServer.environment}`, deletedServer, null);
    };

    // --- VPN Data Functions ---
    function closeVpnModal() {
        vpnModal.classList.add('hidden');
    }

    function openVpnEntry() {
        clearVpnForm();
        vpnEntryModalTitle.textContent = 'Novo Acesso VPN';
        document.getElementById('editingVpnIndex').value = '';
        vpnEntryModal.classList.remove('hidden');
    }

    function closeVpnEntryModal() {
        vpnEntryModal.classList.add('hidden');
        clearVpnForm();
    }

    function clearVpnForm() {
        if (vpnUserInput) vpnUserInput.value = '';
        if (vpnPassInput) vpnPassInput.value = '';
        if (vpnNotesInput) vpnNotesInput.value = '';
        const editIdx = document.getElementById('editingVpnIndex');
        if (editIdx) editIdx.value = '';
    }

    function renderVpnList(client) {
        const listContainer = document.getElementById('vpnList');
        if (!listContainer) return;

        if (!client.vpns || client.vpns.length === 0) {
            listContainer.innerHTML = `
                <div class="servers-grid-empty">
                    <img src="vpn-icon.png" class="vpn-icon-img" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 15px;" alt="VPN">
                    <p>Nenhuma VPN cadastrada ainda.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = client.vpns.map((vpn, index) => {
            return `
                <div class="server-card">
                    <div class="server-card-header">
                        <span class="server-environment producao">VPN</span>
                        <div class="server-card-actions">
                            <button class="btn-icon" onclick="editVpnRecord('${client.id}', ${index})" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="deleteVpnRecord('${client.id}', ${index})" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="credential-item">
                        <div class="credential-row">
                            <span class="credential-label">Usuário:</span>
                            <span class="credential-value">${escapeHtml(vpn.user)}</span>
                            <button class="btn-copy-small" onclick="copyToClipboard('${escapeHtml(vpn.user).replace(/'/g, "\\'")}')" title="Copiar Usuário">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                        <div class="credential-row">
                            <span class="credential-label">Senha:</span>
                            <span class="credential-value" data-raw="${escapeHtml(vpn.password)}">••••••</span>
                            <button class="btn-copy-small" onclick="togglePassword(this)" title="Visualizar Senha" style="margin-right: 4px;">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn-copy-small" onclick="copyToClipboard('${escapeHtml(vpn.password).replace(/'/g, "\\'")}')" title="Copiar Senha">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    ${vpn.notes ? `
                        <div class="server-notes">
                            <div class="server-notes-title"><i class="fa-solid fa-comment-dots" style="margin-right: 6px;"></i> Observações</div>
                            <div class="server-notes-content">${escapeHtml(vpn.notes)}</div>
                        </div>` : ''}
                </div>
            `;
        }).join('');

    }

    async function handleVpnSubmit(e) {
        e.preventDefault();
        const id = vpnClientIdInput.value;
        const client = clients.find(c => c.id === id);
        if (!client) return;

        if (!client.vpns) client.vpns = [];

        const editingIndex = document.getElementById('editingVpnIndex').value;
        const vpnUser = vpnUserInput.value.trim();
        const vpnPass = vpnPassInput.value.trim();

        if (!vpnUser) {
            showToast('⚠️ O usuário da VPN é obrigatório.', 'error');
            vpnUserInput.focus();
            return;
        }
        if (!vpnPass) {
            showToast('⚠️ A senha da VPN é obrigatória.', 'error');
            vpnPassInput.focus();
            return;
        }

        const vpnBefore = (editingIndex !== '') ? JSON.parse(JSON.stringify(client.vpns[parseInt(editingIndex)])) : null;

        const vpnRecord = {
            user: vpnUser,
            password: vpnPass,
            notes: vpnNotesInput.value.trim()
        };

        if (editingIndex !== '') {
            client.vpns[parseInt(editingIndex)] = vpnRecord;
            showToast(`✅ VPN do cliente "${client.name}" atualizada com sucesso!`, 'success');
        } else {
            client.vpns.push(vpnRecord);
            showToast(`✅ VPN adicionada ao cliente "${client.name}"!`, 'success');
        }

        await saveToLocal(client.id);
        renderClients(clients);
        renderVpnList(client);
        closeVpnEntryModal();
        const opType = editingIndex !== '' ? 'EDIÇÃO' : 'CRIAÇÃO';
        const actionLabel = editingIndex !== '' ? 'Edição de Acesso VPN' : 'Adição de Acesso VPN';
        await registerAuditLog(opType, actionLabel, `Cliente: ${client.name}`, vpnBefore, vpnRecord);
    }

    function openVpnData(clientId) {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        vpnClientIdInput.value = clientId;
        if (!client.vpns) client.vpns = [];

        // Set client name in subtitle
        const vpnModalClientName = document.getElementById('vpnModalClientName');
        if (vpnModalClientName) vpnModalClientName.textContent = client.name;

        clearVpnForm();
        renderVpnList(client);
        vpnModal.classList.remove('hidden');
    }

    function editVpnRecord(clientId, index) {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.vpns || !client.vpns[index]) return;

        const vpn = client.vpns[index];
        vpnUserInput.value = vpn.user;
        vpnPassInput.value = vpn.password;
        vpnNotesInput.value = vpn.notes || '';
        document.getElementById('editingVpnIndex').value = index;

        vpnEntryModalTitle.textContent = 'Editar Acesso VPN';
        vpnEntryModal.classList.remove('hidden');
    }

    async function deleteVpnRecord(clientId, index) {
        if (!confirm('Tem certeza que deseja excluir esta VPN?')) return;
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.vpns) return;

        const deletedVpn = JSON.parse(JSON.stringify(client.vpns[index]));
        client.vpns.splice(index, 1);
        await saveToLocal(client.id);
        renderClients(clients);
        renderVpnList(client);
        showToast(`🗑️ VPN do cliente "${client.name}" removida com sucesso!`, 'success');
        await registerAuditLog('EXCLUSÃO', 'Exclusão de Acesso VPN', `Cliente: ${client.name}`, deletedVpn, null);
    }

    // --- Client Notes Functions ---

    window.openClientNotes = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        notesClientIdInput.value = clientId;
        notesModalTitle.innerHTML = `Observações - <span style="color: var(--accent);">${client.name}</span>`;
        clientNoteInput.value = client.notes || '';

        notesModal.classList.remove('hidden');
    };

    function closeNotesModal() {
        notesModal.classList.add('hidden');
    }

    async function handleNotesSubmit(e) {
        e.preventDefault();
        const id = notesClientIdInput.value;
        const client = clients.find(c => c.id === id);

        if (!client) return;

        const notesBefore = client.notes || '';
        client.notes = clientNoteInput.value.trim();
        await saveToLocal(client.id);
        showToast(`✅ Observações do cliente "${client.name}" salvas com sucesso!`, 'success');
        await registerAuditLog('EDIÇÃO', 'Atualização de Observações', `Cliente: ${client.name}`, notesBefore, client.notes);
        closeNotesModal();
        renderClients(clients);
    }

    // --- Global Function Exports ---
    window.renderClients = renderClients;
    window.editClient = editClient; // Defined earlier in file? Need to check.

    window.addNewContact = addNewContact;
    window.openServerData = openServerData;
    window.removeCredentialField = removeCredentialField;
    window.editServerRecord = editServerRecord;
    window.deleteServerRecord = deleteServerRecord;
    window.openVpnData = openVpnData;
    window.editVpnRecord = editVpnRecord;
    window.deleteVpnRecord = deleteVpnRecord;
    window.openClientNotes = openClientNotes;
    window.copyToClipboard = copyToClipboard;
    window.addPhone = addPhone;
    window.addEmail = addEmail;
    window.removeContactField = removeContactField;
    window.removeContact = removeContact;
    window.editContact = editContact;
    window.openAddModal = openAddModal;
    window.closeModal = closeModal;

    // --- URL Data Functions ---
    window.openUrlData = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        urlClientIdInput.value = clientId;
        if (!client.urls) client.urls = [];

        const urlModalClientName = document.getElementById('urlModalClientName');
        if (urlModalClientName) urlModalClientName.textContent = client.name;

        // Reset filter state
        currentUrlFilter = 'all';
        if (urlFilterBtn) urlFilterBtn.classList.remove('filter-btn-active');
        if (urlFilterMenu) {
            urlFilterMenu.querySelectorAll('.dropdown-item').forEach(i => {
                i.classList.toggle('selected', i.dataset.value === 'all');
            });
        }

        // Set WebLaudo
        updateWebLaudoDisplay(client);

        clearUrlForm();
        renderUrlList(client);
        urlModal.classList.remove('hidden');
    };

    function updateWebLaudoDisplay(client) {
        if (client.webLaudo) {
            webLaudoText.textContent = client.webLaudo;
            webLaudoDisplay.style.display = 'flex';
            webLaudoForm.style.display = 'none';
            webLaudoInput.value = client.webLaudo;
        } else {
            webLaudoDisplay.style.display = 'none';
            webLaudoForm.style.display = 'flex';
            webLaudoInput.value = '';
        }
    }

    async function handleDeleteWebLaudo() {
        if (!confirm('Tem certeza que deseja excluir o WebLaudo?')) return;
        const id = urlClientIdInput.value;
        const client = clients.find(c => c.id === id);
        if (!client) return;

        const oldWebLaudo = client.webLaudo || '';
        client.webLaudo = '';
        await saveToLocal(client.id);
        updateWebLaudoDisplay(client);
        applyClientFilter();
        showToast('🗑️ WebLaudo removido com sucesso!', 'success');
        await registerAuditLog('EXCLUSÃO', 'Exclusão de WebLaudo', `Cliente: ${client.name}`, oldWebLaudo, null);
    }

    function handleUrlSystemChange() {
        const bootstrapGroup = document.getElementById('bootstrapGroup');
        const execUpdateGroup = document.getElementById('execUpdateGroup');
        if (urlSystemSelect.value === 'Hemote Web') {
            bootstrapGroup.style.display = 'none';
            execUpdateGroup.style.display = 'none';
        } else {
            bootstrapGroup.style.display = 'block';
            execUpdateGroup.style.display = 'block';
        }
    }

    function closeUrlModal() {
        urlModal.classList.add('hidden');
    }

    function openUrlEntry() {
        clearUrlForm();
        urlEntryModalTitle.textContent = 'URLs de Sistema';
        document.getElementById('editingUrlIndex').value = '';
        urlEntryModal.classList.remove('hidden');
        handleUrlSystemChange();
    }

    function closeUrlEntryModal() {
        urlEntryModal.classList.add('hidden');
        clearUrlForm();
    }

    function clearUrlForm() {
        if (urlEnvironmentSelect) urlEnvironmentSelect.value = '';
        if (urlSystemSelect) urlSystemSelect.value = '';
        if (bridgeDataAccessInput) bridgeDataAccessInput.value = '';
        if (bootstrapInput) bootstrapInput.value = '';
        if (execUpdateInput) execUpdateInput.value = '';
        if (urlNotesInput) urlNotesInput.value = '';
        const editIdx = document.getElementById('editingUrlIndex');
        if (editIdx) editIdx.value = '';
    }

    function renderUrlList(client) {
        const listContainer = document.getElementById('urlsList');
        if (!listContainer) return;

        const filterValue = currentUrlFilter;
        let filteredUrls = client.urls || [];

        if (filterValue !== 'all') {
            filteredUrls = filteredUrls.filter(u => u.environment === filterValue);
        }

        if (filteredUrls.length === 0) {
            listContainer.innerHTML = `
                <div class="servers-grid-empty">
                    <i class="fa-solid fa-link" style="font-size: 3rem; opacity: 0.3; margin-bottom: 12px; display: block;"></i>
                    <p>${filterValue === 'all' ? 'Nenhum sistema cadastrado ainda.' : 'Nenhum sistema encontrado para este filtro.'}</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filteredUrls.map(url => {
            const originalIndex = client.urls.indexOf(url);
            const environmentClass = url.environment === 'producao' ? 'producao' : 'homologacao';
            const environmentLabel = url.environment === 'producao' ? 'Produção' : 'Homologação';

            return `
                <div class="server-card">
                    <div class="server-card-header">
                        <span class="server-environment ${environmentClass}">${environmentLabel}</span>
                        <div class="server-card-actions">
                            <button class="btn-icon" onclick="editUrlRecord('${client.id}', ${originalIndex})" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="deleteUrlRecord('${client.id}', ${originalIndex})" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="server-info">
                        <div class="server-info-label">
                            <i class="fa-solid fa-window-maximize" style="margin-right: 6px;"></i> Sistema
                        </div>
                        <div class="server-info-value" style="font-weight: 600; color: var(--accent);">${escapeHtml(url.system)}</div>
                    </div>
                    ${url.bridgeDataAccess ? `
                        <div class="server-info">
                            <div class="server-info-label">
                                <i class="fa-solid fa-bridge" style="margin-right: 6px;"></i> Bridge data_access
                            </div>
                            <div class="server-info-value" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 8px;">
                                <span style="font-family: monospace; color: var(--text-primary); word-break: break-all; margin-right: 10px; font-size: 0.75rem;">${escapeHtml(url.bridgeDataAccess)}</span>
                                <button class="btn-copy-small" onclick="copyToClipboard('${escapeHtml(url.bridgeDataAccess).replace(/'/g, "\\'")}')" title="Copiar">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                        </div>` : ''
                }
                    ${url.bootstrap ? `
                        <div class="server-info">
                            <div class="server-info-label">
                                <i class="fa-solid fa-bolt" style="margin-right: 6px;"></i> Bootstrap
                            </div>
                            <div class="server-info-value" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 8px;">
                                <span style="font-family: monospace; color: var(--text-primary); word-break: break-all; margin-right: 10px; font-size: 0.75rem;">${escapeHtml(url.bootstrap)}</span>
                                <button class="btn-copy-small" onclick="copyToClipboard('${escapeHtml(url.bootstrap).replace(/'/g, "\\'")}')" title="Copiar">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                        </div>` : ''
                }
                    ${url.execUpdate ? `
                        <div class="server-info">
                            <div class="server-info-label">
                                <i class="fa-solid fa-download" style="margin-right: 6px;"></i> Atualização de Executáveis
                            </div>
                            <div class="server-info-value" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 8px;">
                                <span style="font-family: monospace; color: var(--text-primary); word-break: break-all; margin-right: 10px; font-size: 0.75rem;">${escapeHtml(url.execUpdate)}</span>
                                <button class="btn-copy-small" onclick="copyToClipboard('${escapeHtml(url.execUpdate).replace(/'/g, "\\'")}')" title="Copiar">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                        </div>` : ''
                }
                    ${url.notes ? `
                        <div class="server-notes">
                            <div class="server-notes-title">
                                <i class="fa-solid fa-comment-dots" style="margin-right: 6px;"></i> Observações
                            </div>
                            <div class="server-notes-content">${escapeHtml(url.notes)}</div>
                        </div>` : ''
                }
                </div >
            `;
        }).join('');
    }

    async function handleUrlSubmit(e) {
        e.preventDefault();
        const id = urlClientIdInput.value;
        const client = clients.find(c => c.id === id);
        if (!client) return;

        if (!client.urls) client.urls = [];

        const editingIndex = document.getElementById('editingUrlIndex').value;
        const urlBefore = (editingIndex !== '') ? JSON.parse(JSON.stringify(client.urls[parseInt(editingIndex)])) : null;

        if (!urlEnvironmentSelect.value) {
            showToast('⚠️ O ambiente é obrigatório.', 'error');
            urlEnvironmentSelect.focus();
            return;
        }
        if (!urlSystemSelect.value) {
            showToast('⚠️ O sistema é obrigatório.', 'error');
            urlSystemSelect.focus();
            return;
        }
        if (!bridgeDataAccessInput.value.trim()) {
            showToast('⚠️ O Bridge data_access é obrigatório.', 'error');
            bridgeDataAccessInput.focus();
            return;
        }

        const urlRecord = {
            environment: urlEnvironmentSelect.value,
            system: urlSystemSelect.value,
            bridgeDataAccess: bridgeDataAccessInput.value.trim(),
            bootstrap: bootstrapInput.value.trim(),
            execUpdate: execUpdateInput ? execUpdateInput.value.trim() : '',
            notes: urlNotesInput ? urlNotesInput.value.trim() : ''
        };

        if (editingIndex !== '') {
            client.urls[parseInt(editingIndex)] = urlRecord;
            showToast(`✅ URL do cliente "${client.name}" atualizada com sucesso!`, 'success');
        } else {
            client.urls.push(urlRecord);
            showToast(`✅ URL adicionada ao cliente "${client.name}"!`, 'success');
        }

        await saveToLocal(client.id);
        renderClients(clients);
        renderUrlList(client);
        closeUrlEntryModal();
        const opType = editingIndex !== '' ? 'EDIÇÃO' : 'CRIAÇÃO';
        const actionLabel = editingIndex !== '' ? 'Edição de URL de Sistema' : 'Adição de URL de Sistema';
        await registerAuditLog(opType, actionLabel, `Cliente: ${client.name}, Sistema: ${urlRecord.system}, Ambiente: ${urlRecord.environment}`, urlBefore, urlRecord);
    }

    window.editUrlRecord = (clientId, index) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.urls || !client.urls[index]) return;

        const url = client.urls[index];
        urlEnvironmentSelect.value = url.environment;
        urlSystemSelect.value = url.system;
        bridgeDataAccessInput.value = url.bridgeDataAccess || '';
        bootstrapInput.value = url.bootstrap || '';
        execUpdateInput.value = url.execUpdate || '';
        urlNotesInput.value = url.notes || '';
        document.getElementById('editingUrlIndex').value = index;

        urlEntryModalTitle.textContent = 'URLs de Sistema';
        urlEntryModal.classList.remove('hidden');

        // Trigger change to update bootstrap visibility
        handleUrlSystemChange();
    }

    window.deleteUrlRecord = async (clientId, index) => {
        if (!confirm('Tem certeza que deseja excluir este sistema?')) return;
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.urls) return;

        const deletedUrl = JSON.parse(JSON.stringify(client.urls[index]));
        client.urls.splice(index, 1);
        await saveToLocal(client.id);
        renderClients(clients);
        renderUrlList(client);
        showToast(`🗑️ URL do cliente "${client.name}" removida com sucesso!`, 'success');
        await registerAuditLog('EXCLUSÃO', 'Exclusão de URL de Sistema', `Cliente: ${client.name}, Sistema: ${deletedUrl.system}, Ambiente: ${deletedUrl.environment}`, deletedUrl, null);
    }

    async function handleWebLaudoSave() {
        const id = urlClientIdInput.value;
        const client = clients.find(c => c.id === id);
        if (!client) return;

        const webLaudoBefore = client.webLaudo || '';
        client.webLaudo = webLaudoInput.value.trim();
        await saveToLocal(client.id);
        updateWebLaudoDisplay(client);
        applyClientFilter();
        showToast('✅ WebLaudo salvo com sucesso!', 'success');
        await registerAuditLog('EDIÇÃO', 'Atualização de WebLaudo', `Cliente: ${client.name}`, webLaudoBefore, client.webLaudo);
    }
    window.handleWebLaudoSave = handleWebLaudoSave;
    window.closeUrlModal = closeUrlModal;
    window.openUrlEntry = openUrlEntry;
    window.closeUrlEntryModal = closeUrlEntryModal;

    function toggleFavoritesSection() {
        favoritesCollapsed = !favoritesCollapsed;
        localStorage.setItem('sofis_favorites_collapsed', favoritesCollapsed);
        applyClientFilter();
    }
    window.toggleFavoritesSection = toggleFavoritesSection;

    function toggleRegularSection() {
        regularCollapsed = !regularCollapsed;
        localStorage.setItem('sofis_regular_collapsed', regularCollapsed);
        applyClientFilter();
    }
    window.toggleRegularSection = toggleRegularSection;

    // Initial render
    applyClientFilter();
    updateFilterCounts();

    // Scroll to Top Button Functionality
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    if (scrollToTopBtn) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });

        // Scroll to top when clicked
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // --- Activity Feed Functions ---
    async function fetchRecentActivities() {
        if (!window.supabaseClient || !activityList) return;

        try {
            const { data, error } = await window.supabaseClient
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            renderActivityFeed(data);
        } catch (err) {
            console.error('Erro ao buscar atividades:', err);
        }
    }

    function renderActivityFeed(activities) {
        if (!activityList) return;
        activityList.innerHTML = '';

        if (!activities || activities.length === 0) {
            activityList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhuma atividade recente.</div>';
            return;
        }

        activities.forEach(activity => {
            const date = new Date(activity.created_at);
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('pt-BR');

            const item = document.createElement('div');
            item.className = 'activity-item';

            const opClass = `op-${(activity.operation_type || 'update').toLowerCase()}`;
            const opLabel = activity.operation_type || 'Ação';

            item.innerHTML = `
                <div class="activity-item-header">
                    <span class="activity-user"><i class="fa-solid fa-user"></i> ${escapeHtml(activity.username)}</span>
                    <span class="activity-time">${dateStr} às ${timeStr}</span>
                </div>
                <div class="activity-action">
                    <span class="activity-op-badge ${opClass}">${opLabel}</span>
                    ${escapeHtml(activity.action)}
                </div>
                ${activity.details ? `<div class="activity-details">${escapeHtml(activity.details)}</div>` : ''}
            `;
            activityList.appendChild(item);
        });
    }

    function toggleActivitySidebar() {
        activitySidebar.classList.toggle('hidden');
        activityOverlay.classList.toggle('hidden');
        if (!activitySidebar.classList.contains('hidden')) {
            fetchRecentActivities();
        }
    }

    if (toggleActivityBtn) toggleActivityBtn.addEventListener('click', toggleActivitySidebar);
    if (closeActivityBtn) closeActivityBtn.addEventListener('click', toggleActivitySidebar);
    if (activityOverlay) activityOverlay.addEventListener('click', toggleActivitySidebar);

    // --- History Modal Functions ---
    window.openClientHistory = async (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        if (historyModal) {
            historyModalTitle.innerHTML = `Histórico: <span style="color: var(--accent); font-weight: bold;">${client.name}</span>`;
            historyList.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>';
            historyModal.classList.remove('hidden');
        }

        if (!window.supabaseClient) {
            if (historyList) historyList.innerHTML = '<div style="padding: 20px; text-align: center;">Histórico indisponível offline.</div>';
            return;
        }

        try {
            // FILTER BY TEXT MATCH on 'details' column because jsonb IDs are inconsistent across operation types
            // "Cliente: CLIENT_NAME" is the standard format used in registerAuditLog
            const searchTerm = `Cliente: ${client.name}`;

            const { data, error } = await window.supabaseClient
                .from('audit_logs')
                .select('*')
                .ilike('details', `%${searchTerm}%`)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            renderClientHistory(data);

        } catch (err) {
            console.error('Error fetching history:', err);
            if (historyList) historyList.innerHTML = '<div style="color:var(--danger); padding: 20px; text-align: center;">Erro ao carregar histórico.</div>';
        }
    };

    function renderClientHistory(logs) {
        if (!historyList) return;
        historyList.innerHTML = '';

        if (!logs || logs.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhuma alteração registrada.</div>';
            return;
        }

        logs.forEach((log) => {
            const date = new Date(log.created_at);
            const dateStr = date.toLocaleDateString('pt-BR');
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const opTypeRaw = (log.operation_type || 'UPDATE').toLowerCase();
            const opClass = `op-${opTypeRaw}`;
            const opLabel = (log.operation_type || 'AÇÃO').toUpperCase();

            const item = document.createElement('div');
            item.className = 'activity-item';

            item.innerHTML = `
                <div class="activity-item-header">
                    <span class="activity-user"><i class="fa-solid fa-user"></i> ${escapeHtml(log.username || 'Sistema')}</span>
                    <span class="activity-time">${dateStr} às ${timeStr}</span>
                </div>
                <div class="activity-action">
                    <span class="activity-op-badge ${opClass}">${opLabel}</span>
                    ${escapeHtml(log.action)}
                </div>
                <div class="activity-details">
                    ${escapeHtml(log.details.replace(/Cliente:\s*[^,]+(,\s*)?/, ''))}
                </div>
            `;
            historyList.appendChild(item);
        });

    }

    if (closeHistoryModalBtn) {
        closeHistoryModalBtn.addEventListener('click', () => {
            if (historyModal) historyModal.classList.add('hidden');
        });
    }


    // Close on outside click for modals
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.classList.add('hidden');
        }
        if (e.target === document.getElementById('versionModal')) {
            closeVersionModal();
        }
        if (e.target === document.getElementById('versionHistoryModal')) {
            document.getElementById('versionHistoryModal').classList.add('hidden');
        }
    });


    // ===================================
    // TAB NAVIGATION LOGIC
    // ===================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content sections
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}Tab`) {
                    content.classList.add('active');
                }
            });

            // Load tab specific data
            if (tabId === 'versions' && window.loadVersionControls) {
                window.loadVersionControls();
            }
            if (tabId === 'users' && typeof loadUsers === 'function') {
                loadUsers();
            }
        });
    });

    // ===================================
    // VERSION CONTROL INTEGRATION
    // ===================================
    function populateVersionClientSelect() {
        const datalist = document.getElementById('versionClientList');
        const input = document.getElementById('versionClientInput');
        const hiddenSelect = document.getElementById('versionClientSelect');

        if (!datalist || !input || !hiddenSelect) return;

        datalist.innerHTML = '';

        // Get IDs of clients that already have a Version Control entry
        // This prevents creating duplicate cards for the same client
        const existingClientIds = (window.versionControls || []).map(vc => vc.client_id || (vc.clients && vc.clients.id));

        // Sort and add clients, EXCLUDING those who already have a card
        const availableClients = [...clients].filter(c => !existingClientIds.includes(c.id));
        const sortedClients = availableClients.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        sortedClients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            datalist.appendChild(option);
        });

        // Add input listener to update hidden ID
        input.addEventListener('input', () => {
            const val = input.value.trim().toLowerCase();
            const client = clients.find(c => (c.name || '').toLowerCase() === val);
            if (client) {
                hiddenSelect.value = client.id;
            } else {
                hiddenSelect.value = '';
            }
        });

        // Input validation on blur
        input.addEventListener('change', () => {
            const val = input.value;
            const client = clients.find(c => c.name === val);
            if (!client && val !== '') {
                // Optional: Clear or warn if invalid client
                // input.setCustomValidity("Selecione um cliente da lista");
            } else {
                // input.setCustomValidity("");
            }
        });
    }

    // Re-expose populate function if needed
    window.populateVersionClientSelect = populateVersionClientSelect;
    populateVersionClientSelect();

    // Version Alert Toggle and Filters are handled by window.setupVersionControlFilters() in version-control.js
    if (window.setupVersionControlFilters) {
        window.setupVersionControlFilters();
    }

    // ===================================
    // CLIENT INTERACTION LOGIC (RENAME/NOTES)
    // ===================================

    let interactionClientId = null;
    let interactionClientName = null;

    window.openClientInteraction = function (id, name) {
        interactionClientId = id;
        interactionClientName = name;

        // Safety check if modal elements exist
        const modal = document.getElementById('clientInteractionModal');
        const title = document.getElementById('clientInteractionTitle');

        if (modal && title) {
            title.textContent = name;
            modal.classList.remove('hidden');
        } else {
            console.error('Client Interaction Modal elements not found');
        }
    };

    window.triggerRenameClient = function () {
        const interactionModal = document.getElementById('clientInteractionModal');
        const renameModal = document.getElementById('quickRenameModal');
        const inputId = document.getElementById('quickRenameId');
        const inputName = document.getElementById('quickRenameInput');

        if (interactionModal) interactionModal.classList.add('hidden');

        if (renameModal && inputId && inputName) {
            inputId.value = interactionClientId;
            inputName.value = interactionClientName;
            renameModal.classList.remove('hidden');
            setTimeout(() => inputName.focus(), 100);
        }
    };

    window.triggerClientNotes = function () {
        const interactionModal = document.getElementById('clientInteractionModal');
        if (interactionModal) interactionModal.classList.add('hidden');

        if (interactionClientId) {
            window.openClientGeneralNotes(interactionClientId);
        }
    };

    window.openClientGeneralNotes = function (id) {
        if (typeof clients === 'undefined') return;
        const client = clients.find(c => c.id === id);
        if (!client) return;

        const modal = document.getElementById('notesModal');
        const idInput = document.getElementById('notesClientId');
        const textInput = document.getElementById('clientNoteInput');

        if (modal && idInput && textInput) {
            idInput.value = id;
            textInput.value = client.notes || '';
            modal.classList.remove('hidden');
        }
    };

    window.submitQuickRename = async function () {
        const id = document.getElementById('quickRenameId').value;
        const newName = document.getElementById('quickRenameInput').value.trim();

        if (!newName) {
            showToast('O nome não pode ser vazio', 'error');
            return;
        }

        if (!clients || clients.length === 0) {
            showToast('Erro: Lista de clientes vazia. Tente recarregar a página.', 'error');
            return;
        }

        const client = clients.find(c => c.id === id);
        if (client) {
            const oldName = client.name;
            client.name = newName;

            // 1. Atualização INSTANTÂNEA na tela atual (Contatos)
            document.getElementById('quickRenameModal').classList.add('hidden');

            try {
                // Removed preserveTimestamp=true so both card date and history date match (are updated)
                await saveToLocal(client.id);
                renderClients(clients);
            } catch (err) {
                console.error('Erro ao salvar localmente:', err);
                showToast('Aviso: Erro ao sincronizar com o servidor', 'warning');
            }

            // 2. Atualização INSTANTÂNEA na outra tela (Controle de Versão)
            if (window.versionControls) {
                // Atualiza o nome do cliente em todos os registros de versão em memória
                window.versionControls.forEach(vc => {
                    if (vc.clients && (vc.clients.id === id || vc.client_id === id)) {
                        vc.clients.name = newName;
                    }
                });

                // Re-renderiza a tela de versões se ela estiver disponível
                if (typeof window.renderVersionControls === 'function') {
                    window.renderVersionControls();
                }
            }

            // 3. Sincronização final
            try {
                if (typeof window.loadVersionControls === 'function') {
                    await window.loadVersionControls();
                }
            } catch (err) {
                console.error('Erro na sincronização final:', err);
            }

            // 4. Update dropdown list immediately
            if (typeof populateVersionClientSelect === 'function') {
                populateVersionClientSelect();
            }

            if (window.registerAuditLog) {
                // Standardize format so it appears in history search (which filters by "Cliente: NEW_NAME")
                await window.registerAuditLog('EDIÇÃO', 'Renomeação Rápida de Cliente', `Cliente: ${newName} - Renomeado de "${oldName}"`, oldName, newName);
            }
        } else {
            showToast(`Erro: Cliente não encontrado (ID: ${id})`, 'error');
        }
    };

    // ===================================
    // USER MANAGEMENT LOGIC
    // ===================================
    window.allUsers = [];
    const userForm = document.getElementById('userForm');
    const userTableBody = document.getElementById('userTableBody');
    const userModal = document.getElementById('userModal');
    const userModalTitle = document.getElementById('userModalTitle');

    window.openUserModal = function (userId = null) {
        const manageUserId = document.getElementById('manageUserId');
        const manageUsername = document.getElementById('manageUsername');
        const managePassword = document.getElementById('managePassword');
        const manageFullName = document.getElementById('manageFullName');
        const manageRole = document.getElementById('manageRole');
        const passwordGroup = document.getElementById('passwordGroup');

        if (!userForm) return;
        userForm.reset();
        manageUserId.value = '';
        passwordGroup.style.display = 'block';
        userModalTitle.textContent = 'Novo Usuário';

        if (userId) {
            // Edit mode
            const user = window.allUsers.find(u => u.id === userId);
            if (user) {
                manageUserId.value = user.id;
                manageUsername.value = user.username;
                managePassword.value = user.password;
                manageFullName.value = user.full_name;
                manageRole.value = user.role || 'Técnico';
                userModalTitle.textContent = 'Editar Usuário';
            }
        }

        userModal.classList.remove('hidden');
    };

    window.closeUserModal = function () {
        if (userModal) userModal.classList.add('hidden');
    };

    async function loadUsers() {
        if (!window.supabaseClient) return;
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .order('username');

        if (error) {
            console.error('Error loading users:', error);
            showToast('Erro ao carregar usuários.', 'error');
            return;
        }

        window.allUsers = data;
        renderUsers();
    }

    function renderUsers() {
        if (!userTableBody) return;
        userTableBody.innerHTML = '';

        window.allUsers.forEach(user => {
            const tr = document.createElement('tr');

            const roleClass = user.role === 'Administrador' ? 'role-admin' : (user.role === 'Analista' ? 'role-analyst' : 'role-tech');

            tr.innerHTML = `
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.full_name)}</td>
                <td><span class="role-badge ${roleClass}">${user.role || 'Técnico'}</span></td>
                <td>
                    <div class="user-actions">
                        <button class="btn-icon" onclick="window.openUserModal('${user.id}')" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete-user" onclick="window.deleteUser('${user.id}', '${user.username}')" title="Excluir">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(tr);
        });
    }

    window.deleteUser = async function (id, username) {
        if (username === 'admin') {
            showToast('⚠️ O usuário principal (admin) não pode ser excluído.', 'error');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) {
            const { error } = await window.supabaseClient
                .from('users')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting user:', error);
                showToast('Erro ao excluir usuário.', 'error');
            } else {
                showToast('Usuário excluído com sucesso!');
                loadUsers();
                if (window.registerAuditLog) {
                    await registerAuditLog('EXCLUSÃO', 'Exclusão de Usuário', `Usuário: ${username}`);
                }
            }
        }
    };

    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('manageUserId').value;
            const payload = {
                username: document.getElementById('manageUsername').value.trim(),
                password: document.getElementById('managePassword').value.trim(),
                full_name: document.getElementById('manageFullName').value.trim(),
                role: document.getElementById('manageRole').value
            };

            if (!payload.username || !payload.password) {
                showToast('⚠️ Usuário e senha são obrigatórios.', 'error');
                return;
            }

            let result;
            if (id) {
                result = await window.supabaseClient.from('users').update(payload).eq('id', id);
            } else {
                result = await window.supabaseClient.from('users').insert([payload]);
            }

            if (result.error) {
                console.error('Error saving user:', result.error);
                showToast('Erro ao salvar usuário.', 'error');
            } else {
                showToast('Usuário salvo com sucesso!');
                window.closeUserModal();
                loadUsers();
                if (window.registerAuditLog) {
                    await registerAuditLog(id ? 'EDIÇÃO' : 'CRIAÇÃO', id ? 'Edição de Usuário' : 'Novo Usuário', `Usuário: ${payload.username}`);
                }
            }
        });
    }

    // Export internal functions if needed
    window.loadUsers = loadUsers;
});
