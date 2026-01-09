// ===========================================
// MODULE: VERSION CONTROL - FULL PRECISE v7.1
// ===========================================

(function () {
    console.log("🚀 [SOFIS] Version Control Premium Module v7.1 Loaded");

    // Internal state
    let versionControls = [];
    window.currentVersionFilter = 'all';
    let sofis_isUpdating = false;
    let sofis_isSaving = false;

    // Helper functions
    const utils = {
        escapeHtml: (text) => {
            if (!text) return '';
            return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        },
        formatDate: (dateString) => {
            if (!dateString) return '-';
            try {
                // Adjust for UTC/Local mismatch
                const date = new Date(dateString);
                return date.toLocaleDateString('pt-BR');
            } catch (e) { return '-'; }
        },
        getStatus: (updatedAt) => {
            if (!updatedAt) return 'outdated';
            const diffDays = Math.floor((new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24));
            if (diffDays <= 60) return 'recent';
            if (diffDays <= 90) return 'warning';
            return 'outdated';
        },
        getTimeInfo: (updatedAt) => {
            if (!updatedAt) return 'Nunca atualizado';
            const lastUpdate = new Date(updatedAt);
            const now = new Date();

            // Handle future dates gracefully
            if (lastUpdate > now) {
                return 'Atualização agendada';
            }

            const diffTime = Math.abs(now - lastUpdate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Atualizado hoje';
            if (diffDays === 1) return 'Atualizado ontem';
            return `Atualizado há ${diffDays} dias`;
        }
    };

    // Core Logic
    async function loadVersionControls() {
        if (sofis_isUpdating) console.log("⚠️ Update already in progress...");
        sofis_isUpdating = true;

        // Cache Buster
        const _t = new Date().getTime();
        console.log(`🔄 [${_t}] Fetching versions...`);

        try {
            if (!window.supabaseClient) {
                console.warn("❌ supabaseClient not ready");
                return;
            }

            console.log("🔄 Loading Version Controls (Fresh)...");

            const { data, error } = await window.supabaseClient
                .from('version_controls')
                .select(`*, clients (id, name, inactive_contract)`)
                .order('updated_at', { ascending: false }); // Primary: User's Date of Update

            if (error) throw error;

            versionControls = data || [];
            window.versionControls = versionControls;

            renderVersionControls();

            // NOTE: We do NOT render Dashboard here anymore.

        } catch (err) {
            console.error('❌ Error loadVersionControls:', err);
        } finally {
            sofis_isUpdating = false;
        }
    }

    function renderVersionControls() {
        // Removed re-entrancy guard "sofis_isRendering" to ensure always renders the current state
        try {
            const list = document.getElementById('versionList');
            if (!list) return;

            // Clear IMMEDIATELY to prevent stale state visualization
            list.innerHTML = '';

            // 1. DEDUPLICAÇÃO: Manter apenas a última versão por Cliente/Sistema/Ambiente
            const seenKeys = new Set();
            const uniqueVersions = [];

            versionControls.forEach(v => {
                const cId = v.client_id || v.clients?.id;
                const key = `${cId}|${v.system}|${v.environment}`;

                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueVersions.push(v);
                }
            });

            let filtered = uniqueVersions;
            const searchInput = document.getElementById('versionSearchInput');
            const search = searchInput ? searchInput.value.toLowerCase() : '';

            if (search) {
                filtered = filtered.filter(v =>
                    (v.clients?.name || '').toLowerCase().includes(search) ||
                    (v.system || '').toLowerCase().includes(search) ||
                    (v.version || '').toLowerCase().includes(search)
                );
            }

            if (window.currentVersionFilter !== 'all') {
                filtered = filtered.filter(v => utils.getStatus(v.updated_at) === window.currentVersionFilter);
            }

            // Environment Filter Logic
            if (window.currentEnvFilter && window.currentEnvFilter !== 'all') {
                // Removed global logic as per user request
            }

            if (filtered.length === 0) {
                list.innerHTML = '<div class="version-empty-state"><p>Nenhuma versão encontrada</p></div>';
                return;
            }

            // Grouping by client
            const grouped = {};
            filtered.forEach(v => {
                const name = v.clients?.name || 'Desconhecido';
                // Use clients.id as fallback if client_id is missing/null, ensuring we have a valid reference
                const cId = v.client_id || v.clients?.id;

                const inactiveContract = v.clients?.inactive_contract;
                if (!grouped[name]) grouped[name] = { id: cId, name, inactiveContract, versionsMap: {} };

                // Keep only the most recent version for each [system + environment] combination
                // Note: filtered array is already sorted by updated_at desc.
                // So the first one we encounter is the latest.
                const key = `${v.system}_${v.environment}`;
                const existing = grouped[name].versionsMap[key];

                if (!existing) {
                    grouped[name].versionsMap[key] = v;
                }
            });

            // Sort by Inactive Contract, then Favorite, then Client Name
            Object.values(grouped).sort((a, b) => {
                const isFavA = window.userFavorites && window.userFavorites.has(a.id);
                const isFavB = window.userFavorites && window.userFavorites.has(b.id);

                // Inactive contracts come first
                if (a.inactiveContract && !b.inactiveContract) return -1;
                if (!a.inactiveContract && b.inactiveContract) return 1;

                // Then favorites
                if (isFavA && !isFavB) return -1;
                if (!isFavA && isFavB) return 1;

                // Then alphabetically
                return a.name.localeCompare(b.name);
            }).forEach(group => {
                // Convert Map back to array for rendering
                group.versions = Object.values(group.versionsMap);
                list.appendChild(createClientGroupCard(group));
            });
        } catch (e) {
            console.error("Error in renderVersionControls:", e);
        }
    }

    function createClientGroupCard(group) {
        const card = document.createElement('div');
        card.className = 'client-version-group-card';

        // Permissions
        const P = window.Permissions;
        const canEditHistory = P ? P.can('Controle de Versões - Histórico', 'can_view') : false;
        const canEditVersion = P ? P.can('Controle de Versões', 'can_edit') : false;
        const canCreateVersion = P ? P.can('Controle de Versões', 'can_create') : false;
        const canDeleteVersion = P ? P.can('Controle de Versões', 'can_delete') : false;
        const canEditClient = P ? P.can('Gestão de Clientes', 'can_edit') : false;

        // General status of the card based on items
        let overallStatus = 'recent';
        group.versions.forEach(v => {
            const s = utils.getStatus(v.updated_at);
            if (s === 'outdated') overallStatus = 'outdated';
            else if (s === 'warning' && overallStatus !== 'outdated') overallStatus = 'warning';
        });

        // Check availabilities for auto-filter
        const hasProd = group.versions.some(v => v.environment === 'producao');
        const hasHomol = group.versions.some(v => v.environment === 'homologacao');

        // Default to production unless only homologation exists
        let activeFilter = 'producao';
        if (!hasProd && hasHomol) {
            activeFilter = 'homologacao';
        }

        // Building row HTML precisely as the reference image
        const versionsHtml = group.versions.map(v => {
            const status = utils.getStatus(v.updated_at);
            const timeInfo = utils.getTimeInfo(v.updated_at);

            // Lógica de Logo
            let logoHtml = '';
            const sysName = (v.system || '').trim();
            if (sysName === 'CellVida') {
                logoHtml = '<img src="cellvida-logo.jpg" alt="CellVida" class="system-card-logo">';
            } else if (['Hemote Plus', 'Hemote Web', 'Hemote'].includes(sysName)) {
                logoHtml = '<img src="hemote-logo.jpg" alt="Hemote" class="system-card-logo">';
            } else if (sysName === 'Monetário') {
                logoHtml = '<img src="monetario-logo.jpg" alt="Monetário" class="system-card-logo">';
            }

            return `
                <div class="version-item-row status-${status}" data-environment="${v.environment}" style="${v.environment !== activeFilter ? 'display:none;' : ''}">
                    <div class="version-row-main">
                        <!-- Left section: System and Badge -->
                        <div class="version-left-info">
                            <span class="version-system-name">${utils.escapeHtml(v.system || '⚠️ Sem Sistema')}</span>
                            <div class="version-badge-container">
                                <span class="environment-badge-small ${v.environment}">${v.environment === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}</span>
                            </div>
                        </div>

                        <!-- Right section: Version, Edit and Meta -->
                        <div class="version-right-data">
                            <div class="version-right-new-layout">
                                <!-- Text Group: Version + Metas (Aligned Left) -->
                                <div class="version-text-group">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                                        <div style="display: flex; align-items: baseline;">
                                            <span style="color: #ffffff; font-size: 0.75rem; margin-right: 5px; font-weight: 400;">Versão:</span>
                                            <span class="version-number-display">${utils.escapeHtml(v.version)}</span>
                                        </div>
                                        ${v.has_alert ?
                    `<i class="fa-solid fa-bell client-note-indicator" onclick="window.openVersionNotes('${v.id}')" title="Possui observações importantes" style="color: #ffc107; cursor: pointer; font-size: 0.9rem;"></i>` :
                    ``
                }
                                    </div>
                                    <div class="version-meta-area">
                                        <div class="meta-line">Data da atualização: ${utils.formatDate(v.updated_at)}</div>
                                        <div class="meta-line">${timeInfo}</div>
                                    </div>
                                </div>
                                <!-- Actions Group: Icons (Aligned Right) -->
                                <div class="version-actions-group">
                                    ${canDeleteVersion ? `
                                    <button class="btn-edit-version-small btn-danger" onclick="window.deleteVersionControl('${v.id}', '${v.system}', '${group.name}')" title="Excluir" style="margin-left:5px;">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    ${logoHtml}
                </div>
            `;
        }).join('');

        const inactiveClass = group.inactiveContract ? 'inactive-contract-version-header' : '';
        const inactiveIcon = group.inactiveContract ?
            `<span class="inactive-info-icon" title="Contrato Inativo desde ${utils.formatDate(group.inactiveContract.date)}">i</span>` : '';

        card.innerHTML = `
                <div class="client-group-header status-${overallStatus} ${inactiveClass}">
                    <div class="client-group-title">
                        <h3 style="cursor:default" title="Nome do Cliente">${utils.escapeHtml(group.name)}</h3>
                        ${inactiveIcon}
                    </div>
                <div class="client-header-actions">
                    <!-- Card Level Filter -->
                    <div class="card-filter-dropdown">
                        <button class="btn-card-action" onclick="window.toggleCardFilterMenu(this)" title="Filtrar Ambiente">
                            <i class="fa-solid fa-filter"></i>
                        </button>
                        <div class="card-filter-menu hidden">
                            <div class="filter-menu-item ${activeFilter === 'producao' ? 'active' : ''}" onclick="window.applyCardEnvFilter(this, 'producao')">
                                <i class="fa-solid fa-server"></i> Produção
                            </div>
                            <div class="filter-menu-item ${activeFilter === 'homologacao' ? 'active' : ''}" onclick="window.applyCardEnvFilter(this, 'homologacao')">
                                <i class="fa-solid fa-flask"></i> Homologação
                            </div>
                        </div>
                    </div>

                    ${canEditHistory ? `
                    <button class="btn-card-action" onclick="window.openClientVersionsHistory('${group.id}')" title="Ver Histórico">
                        <i class="fa-solid fa-rotate"></i>
                    </button>` : ''}
                    
                    ${P && P.can('Controle de Versões - Produtos', 'can_view') ? `
                    <button class="btn-card-action" onclick="window.openProductManagement()" title="Gerenciar Produtos">
                        <i class="fa-solid fa-cube"></i>
                    </button>` : ''}

                    ${canCreateVersion ? `
                    <button class="btn-card-action" onclick="window.prefillClientVersion('${group.id}', '${utils.escapeHtml(group.name)}')" title="Registrar Atualização">
                        <i class="fa-solid fa-plus"></i>
                    </button>` : ''}
                </div>
            </div>
            <div class="client-group-body">${versionsHtml}</div>
        `;
        return card;
    }

    async function handleVersionSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (sofis_isSaving) return;
        sofis_isSaving = true;

        try {
            const fields = {
                id: document.getElementById('versionId').value,
                clientId: document.getElementById('versionClientSelect').value,
                env: document.getElementById('versionEnvironmentSelect').value,
                sys: document.getElementById('versionSystemSelect').value,
                ver: document.getElementById('versionNumberInput').value,
                date: document.getElementById('versionDateInput').value,
                alert: document.getElementById('versionNotesInput').value.trim().length > 0, // Auto-set alert if notes exist
                notes: document.getElementById('versionNotesInput').value,
                responsible: document.getElementById('versionResponsibleSelect').value
            };

            // Permissions Check
            const P = window.Permissions;
            if (fields.id) {
                if (P && !P.can('Controle de Versões', 'can_edit')) {
                    if (window.showToast) window.showToast('🚫 Sem permissão para editar versões.', 'error');
                    sofis_isSaving = false;
                    return;
                }
            } else {
                if (P && !P.can('Controle de Versões', 'can_create')) {
                    if (window.showToast) window.showToast('🚫 Sem permissão para registrar novas versões.', 'error');
                    sofis_isSaving = false;
                    return;
                }
            }

            if (!fields.clientId || fields.clientId === 'undefined') {
                if (window.showToast) window.showToast('⚠️ Selecione um cliente válido.', 'warning');
                sofis_isSaving = false;
                return;
            }

            // Client Validation
            if (!fields.clientId) {
                if (window.showToast) window.showToast('⚠️ Selecione um cliente válido da lista sugerida.', 'warning');
                sofis_isSaving = false;
                return;
            }

            // System Validation
            if (!fields.sys || fields.sys.trim() === '') {
                if (window.showToast) window.showToast('⚠️ Selecione ou digite um Sistema.', 'warning');
                sofis_isSaving = false;
                return;
            }

            // Version Validation
            if (!fields.ver || fields.ver.trim() === '') {
                if (window.showToast) window.showToast('⚠️ O campo de versão é obrigatório.', 'warning');
                sofis_isSaving = false;
                return;
            }

            const productType = getSelectedProductType();
            const minLength = productType === 'Build' ? 8 : 10;

            // Strict Validation by Product Type
            if (productType === 'Build') {
                if (/[^0-9]/.test(fields.ver)) {
                    if (window.showToast) window.showToast('⚠️ Para produtos do tipo Build, use apenas números.', 'warning');
                    sofis_isSaving = false;
                    return;
                }
            } else {
                const pacoteRegex = /^\d{4}\.\d{2}-\d{2}$/;
                if (!pacoteRegex.test(fields.ver)) {
                    if (window.showToast) window.showToast('⚠️ Formato de versão inválido para Pacote. Use YYYY.MM-XX.', 'warning');
                    sofis_isSaving = false;
                    return;
                }
            }

            if (fields.ver.length < minLength) {
                if (window.showToast) window.showToast(`⚠️ Versão do sistema incompleta! (Mínimo ${minLength} caracteres)`, 'warning');
                sofis_isSaving = false;
                return;
            }

            // Date Validation (No future dates)
            if (fields.date) {
                const selectedDate = new Date(fields.date + 'T12:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);

                if (selectedDate > today) {
                    if (window.showToast) window.showToast('⚠️ A data de atualização não pode ser superior à data atual.', 'warning');
                    sofis_isSaving = false;
                    return;
                }

                const year = parseInt(fields.date.split('-')[0]);
                if (year < 2000 || year > 2099) {
                    if (window.showToast) window.showToast('⚠️ Ano inválido na data. Por favor verifique.', 'warning');
                    sofis_isSaving = false;
                    return;
                }
            }

            const payload = {
                client_id: fields.clientId,
                environment: fields.env,
                system: fields.sys,
                version: fields.ver,
                has_alert: fields.alert,
                notes: fields.notes,
                responsible: fields.responsible,
                updated_at: fields.date ? `${fields.date}T12:00:00+00:00` : new Date().toISOString()
            };

            let result;
            if (fields.id) {
                result = await window.supabaseClient.from('version_controls').update(payload).eq('id', fields.id);
                if (!result.error) {
                    await logHistory(fields.id, null, fields.ver, fields.notes, fields.responsible);
                }
            } else {
                result = await window.supabaseClient.from('version_controls').insert([payload]).select();
                if (result.data && result.data[0]) {
                    await logHistory(result.data[0].id, null, fields.ver, 'Registro de nova versão', fields.responsible);
                }
            }

            if (result.error) throw result.error;

            if (window.showToast) window.showToast('Concluído com sucesso!');
            window.closeVersionModal();

            try {
                // Sutil delay para garantir a consistência do banco antes de ler
                await new Promise(r => setTimeout(r, 500));

                // Force reload of EVERYTHING
                await loadVersionControls();

                // Re-render dashboard unconditionally (just in case it's open or about to be)
                calculateAndRenderPulse();
            } catch (refreshErr) {
                console.warn("⚠️ Data refresh failed after save:", refreshErr);
            }

        } catch (err) {
            console.error('❌ handleVersionSubmit Error:', err);
            if (window.showToast) window.showToast('Falha ao salvar dados', 'error');
        } finally {
            sofis_isSaving = false;
        }
    }

    async function logHistory(vcId, oldV, newV, notes, responsible = null) {
        try {
            const userObj = JSON.parse(localStorage.getItem('sofis_user') || '{}');
            let displayName = 'Sistema';

            if (responsible) {
                // Look up full name from cache if it's a username
                const found = cachedUsersForResponsible.find(u => u.username === responsible || u.full_name === responsible);
                displayName = found ? (found.full_name || found.username) : responsible;
            } else {
                displayName = userObj.full_name || userObj.username || 'Sistema';
            }

            await window.supabaseClient.from('version_history').insert([{
                version_control_id: vcId,
                previous_version: oldV,
                new_version: newV,
                updated_by: displayName,
                notes: notes || ''
            }]);
        } catch (e) {
            console.warn('History log failed skipped');
        }
    }

    // EXPORTS
    window.loadVersionControls = loadVersionControls;
    window.renderVersionControls = renderVersionControls;
    window.handleVersionSubmit = handleVersionSubmit;

    // Cache for clients list
    let cachedClientsForVersion = [];

    // Unified function to get clients list
    async function getClientsForDropdown() {
        // 1. Try Global Window Clients (fastest)
        if (window.clients && window.clients.length > 0) {
            return window.clients;
        }
        // 2. Try Local Cache
        if (cachedClientsForVersion && cachedClientsForVersion.length > 0) {
            return cachedClientsForVersion;
        }
        // 3. Fetch from Supabase
        try {
            console.log("🔄 Fetching clients for dropdown...");
            const { data, error } = await window.supabaseClient
                .from('clients')
                .select('id, name')
                .order('name');

            if (error) {
                console.error("Supabase Error (Clients):", error);
                if (window.showToast) window.showToast("Erro ao carregar clientes: " + error.message, "error");
                throw error;
            }

            if (data) {
                cachedClientsForVersion = data;
                return data;
            }
        } catch (e) {
            console.error("Erro ao buscar clientes:", e);
            if (window.showToast && !e.message?.includes('Supabase Error')) window.showToast("Erro de conexão ao buscar clientes.", "error");
        }
        return [];
    }

    window.populateVersionClientSelect = async () => {
        const select = document.getElementById('versionClientSelect');
        if (!select) return;

        const currentVal = select.value; // Store current value
        const isDisabled = select.disabled;

        const clientsList = await getClientsForDropdown();

        // Get all unique client IDs that already have version records
        let clientsWithVersions = new Set();
        if (window.versionControls && window.versionControls.length > 0) {
            window.versionControls.forEach(vc => {
                if (vc.client_id) {
                    clientsWithVersions.add(vc.client_id);
                }
            });
        }

        // Filter out clients that already have ANY version record
        const availableClients = clientsList.filter(c => !clientsWithVersions.has(c.id));

        // Clear existing (keep default)
        select.innerHTML = '<option value="">Selecione o cliente...</option>';

        if (availableClients.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = "Todos os clientes já possuem registros";
            select.appendChild(opt);
            return;
        }

        // Sort and Append
        availableClients.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });

        // Restore value if still valid
        if (currentVal) select.value = currentVal;
        select.disabled = isDisabled;
    };

    window.editVersion = async (id) => {
        // Permission Check
        const P = window.Permissions;
        if (id) {
            if (P && !P.can('Controle de Versões', 'can_edit')) {
                if (window.showToast) window.showToast('🚫 Sem permissão para editar versões.', 'error');
                return;
            }
        } else {
            if (P && !P.can('Controle de Versões', 'can_create')) {
                if (window.showToast) window.showToast('🚫 Sem permissão para registrar novas versões.', 'error');
                return;
            }
        }

        const modal = document.getElementById('versionModal');
        if (!modal) return;

        // Reset and Prep
        const form = document.getElementById('versionForm');
        if (form) form.reset();
        document.getElementById('versionId').value = id || '';

        // Ensure Dropdowns are populated
        await window.populateVersionClientSelect();
        await loadProducts(); // Load dynamic products
        if (window.populateResponsibleSelect) await window.populateResponsibleSelect();

        const v = id ? versionControls.find(x => x.id === id) : null;

        if (v) {
            const clientSelect = document.getElementById('versionClientSelect');
            if (clientSelect) {
                clientSelect.value = v.client_id || v.clients?.id || '';
                clientSelect.disabled = true; // Lock client on edit
            }

            document.getElementById('versionEnvironmentSelect').value = v.environment;
            document.getElementById('versionSystemSelect').value = v.system;
            document.getElementById('versionNumberInput').value = v.version;
            document.getElementById('versionResponsibleSelect').value = v.responsible || '';
            if (v.updated_at) document.getElementById('versionDateInput').value = v.updated_at.split('T')[0];

            // Notes logic
            const notes = document.getElementById('versionNotesInput');
            notes.value = v.notes || '';
            notes.disabled = false;
        } else {
            // New Entry Mode
            const clientSelect = document.getElementById('versionClientSelect');
            if (clientSelect) {
                clientSelect.disabled = false;
                clientSelect.value = '';
            }

            // Auto-select current user
            const currentUser = JSON.parse(localStorage.getItem('sofis_user') || '{}').username;
            const respSelect = document.getElementById('versionResponsibleSelect');
            if (currentUser && respSelect) respSelect.value = currentUser;
        }

        // Sync version mask
        if (typeof updateVersionMask === 'function') updateVersionMask();

        modal.classList.remove('hidden');
    };

    window.prefillClientVersion = async (clientId, clientName) => {
        const P = window.Permissions;
        if (P && !P.can('Controle de Versões', 'can_create')) {
            if (window.showToast) window.showToast('🚫 Sem permissão para registrar novas atualizações.', 'error');
            return;
        }

        const modal = document.getElementById('versionModal');
        if (!modal) return;

        document.getElementById('versionForm').reset();
        document.getElementById('versionId').value = '';

        // Wait for population
        await window.populateVersionClientSelect();
        await loadProducts(); // Ensure products are loaded and mask logic is ready
        if (window.populateResponsibleSelect) await window.populateResponsibleSelect();

        const select = document.getElementById('versionClientSelect');

        // Select Client
        if (select) {
            select.value = clientId || '';
            if (select.value === '' && clientName) {
                // Fallback attempt to find by text if ID failed (should not happen if logic is correct)
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].text === clientName) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
            select.disabled = true;
        }

        // Auto-select current user
        const currentUser = JSON.parse(localStorage.getItem('sofis_user') || '{}').username;
        const respSelect = document.getElementById('versionResponsibleSelect');
        if (currentUser && respSelect) respSelect.value = currentUser;

        // Sync version mask
        if (typeof updateVersionMask === 'function') updateVersionMask();

        modal.classList.remove('hidden');
    };

    window.closeVersionModal = () => {
        const m = document.getElementById('versionModal');
        if (m) m.classList.add('hidden');
    };

    window.submitVersionForm = () => {
        const f = document.getElementById('versionForm');
        if (f && f.checkValidity()) {
            setTimeout(() => handleVersionSubmit(null), 0);
        } else if (f) {
            f.reportValidity();
        }
    };

    window.openVersionNotes = (id) => {
        const v = versionControls.find(x => x.id === id);
        if (!v || !v.notes) return;

        const modal = document.getElementById('versionNotesModal');
        if (!modal) return;

        const contentBox = document.getElementById('versionNotesContent');
        const titleEl = document.getElementById('versionNotesTitle');

        const clientName = v.clients?.name || 'Cliente';
        titleEl.innerHTML = `Observações: <span style="color:var(--accent)">${utils.escapeHtml(clientName)}</span> <small style="opacity:0.6; font-size:0.8em">(${v.system} ${v.version})</small>`;
        contentBox.textContent = v.notes;

        modal.classList.remove('hidden');
    };

    window.closeVersionNotesModal = () => {
        const m = document.getElementById('versionNotesModal');
        if (m) m.classList.add('hidden');
    };

    window.deleteVersionControl = async (id, system, clientName) => {
        // Permission Check
        const P = window.Permissions;
        if (P && !P.can('Controle de Versões', 'can_delete')) {
            if (window.showToast) window.showToast('🚫 Sem permissão para excluir atualizações.', 'error');
            return;
        }

        const confirmed = await window.showConfirm(`Tem certeza que deseja excluir o registro do sistema "${system}" para o cliente "${clientName}"?`, 'Confirmar Exclusão', 'fa-trash');
        if (!confirmed) return;

        try {
            if (window.showToast) window.showToast('⏳ Excluindo registro...', 'info');

            const { error } = await window.supabaseClient
                .from('version_controls')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (window.showToast) window.showToast('🗑️ Registro excluído com sucesso!', 'success');

            // Log de Auditoria (Opcional, se existir a função globalmente)
            if (window.registerAuditLog) {
                await window.registerAuditLog('EXCLUSÃO', 'Exclusão de Controle de Versão', `Cliente: ${clientName}, Sistema: ${system}`, { id, system, clientName }, null);
            }

            loadVersionControls(); // Refresh list
        } catch (err) {
            console.error('Erro ao excluir versão:', err);
            if (window.showToast) window.showToast('❌ Erro ao excluir registro.', 'error');
        }
    };

    // Filter Menu Logic
    window.toggleCardFilterMenu = (btn) => {
        document.querySelectorAll('.card-filter-menu').forEach(m => {
            if (m !== btn.nextElementSibling) m.classList.add('hidden');
        });
        btn.nextElementSibling.classList.toggle('hidden');
    };

    window.applyCardEnvFilter = (item, env) => {
        const card = item.closest('.client-version-group-card');
        const rows = card.querySelectorAll('.version-item-row');
        const items = item.parentNode.querySelectorAll('.filter-menu-item');

        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        rows.forEach(row => {
            if (env === 'all' || row.dataset.environment === env) {
                row.style.display = 'flex';
            } else {
                row.style.display = 'none';
            }
        });
        item.parentNode.classList.add('hidden');
    };

    // Global listeners
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.card-filter-dropdown')) {
            document.querySelectorAll('.card-filter-menu').forEach(m => m.classList.add('hidden'));
        }
    });

    window.setupVersionControlFilters = () => {
        const sInput = document.getElementById('versionSearchInput');
        const clearBtn = document.getElementById('clearVersionSearch');

        if (sInput) {
            sInput.oninput = () => {
                if (clearBtn) {
                    if (sInput.value.length > 0) clearBtn.classList.remove('hidden');
                    else clearBtn.classList.add('hidden');
                }
                renderVersionControls();
            };
        }

        if (clearBtn && sInput) {
            clearBtn.onclick = () => {
                sInput.value = '';
                clearBtn.classList.add('hidden');
                sInput.focus();
                renderVersionControls();
            };
        }

        document.querySelectorAll('[data-version-filter]').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('[data-version-filter]').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                window.currentVersionFilter = b.dataset.versionFilter;
                renderVersionControls();
            };
        });


        // Removed legacy YYYY.MM-DD mask to use dynamic Product-based mask logic

    };





    let cachedUsersForResponsible = [];

    async function getClientsForDropdown() {
        // 1. Try Global Window Clients (fastest)
        if (window.clients && window.clients.length > 0) {
            console.log("✅ [VersionControl] Usando lista de clientes global (window.clients).");
            return window.clients;

        }
        // 2. Try Local Cache
        if (cachedClientsForVersion && cachedClientsForVersion.length > 0) {
            return cachedClientsForVersion;
        }
        // 3. Fetch from Supabase
        try {
            console.log("🔄 Fetching clients for dropdown...");
            const { data, error } = await window.supabaseClient
                .from('clients')
                .select('id, name')
                .order('name');

            if (error) {
                console.error("Supabase Error (Clients):", error);
                if (window.showToast) window.showToast("Erro ao carregar clientes: " + error.message, "error");
                throw error;
            }

            if (data) {
                cachedClientsForVersion = data;
                return data;
            }
        } catch (e) {
            console.error("Erro ao buscar clientes:", e);
            if (window.showToast && !e.message?.includes('Supabase Error')) window.showToast("Erro de conexão ao buscar clientes.", "error");
        }
        return [];
    }

    window.populateResponsibleSelect = async () => {
        const select = document.getElementById('versionResponsibleSelect');
        if (!select) return;

        // If we have cached users, verify if select is already populated
        if (cachedUsersForResponsible.length === 0) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('users')
                    .select('username, full_name')
                    .order('username');

                if (error) {
                    console.error("Supabase Error (Users):", error);
                    if (window.showToast) window.showToast("Erro ao carregar usuários: " + error.message, "error");
                } else if (data) {
                    cachedUsersForResponsible = data;
                }
            } catch (e) {
                console.error("Erro ao buscar usuários para responsável:", e);
                if (window.showToast) window.showToast("Erro ao carregar usuários.", "error");
            }
        }

        // Save current selection if any
        const currentVal = select.value;

        // Clear and add default
        select.innerHTML = '<option value="">Selecione...</option>';

        cachedUsersForResponsible.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = u.full_name || u.username;
            select.appendChild(opt);
        });

        if (currentVal) {
            select.value = currentVal;
        }
    };

    let currentHistoryData = [];
    window.openClientVersionsHistory = async (clientId) => {
        const P = window.Permissions;
        if (P && !P.can('Controle de Versões - Histórico', 'can_view')) {
            if (window.showToast) window.showToast('🚫 Sem permissão para visualizar o histórico de versões.', 'error');
            return;
        }

        const modal = document.getElementById('versionHistoryModal');
        if (!modal) return;

        const vEntry = versionControls.find(v => v.client_id === clientId);
        const clientName = vEntry?.clients?.name || 'Cliente';

        document.getElementById('versionHistoryTitle').innerHTML = `Histórico: <span style="color:var(--accent)">${utils.escapeHtml(clientName)}</span>`;
        modal.classList.remove('hidden');

        // Reset filters
        const sysFilter = document.getElementById('historySystemFilter');
        const envFilter = document.getElementById('historyEnvFilter');
        if (sysFilter) sysFilter.value = 'all';
        if (envFilter) envFilter.value = 'all';

        // Populate System Filter dynamically
        if (sysFilter) {
            sysFilter.innerHTML = '<option value="all">Todos os Produtos</option>';
            const uniqueSystems = [...new Set(versionControls.filter(v => v.client_id === clientId).map(v => v.system))].sort();
            uniqueSystems.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                sysFilter.appendChild(opt);
            });
        }

        renderHistoryLoading();

        try {
            const clientVCs = versionControls.filter(vc => vc.client_id === clientId);
            if (clientVCs.length === 0) {
                renderHistoryList([]);
                return;
            }

            const { data } = await window.supabaseClient.from('version_history')
                .select('*, version_controls(system, environment, updated_at)')
                .in('version_control_id', clientVCs.map(vc => vc.id))
                .order('created_at', { ascending: false });

            currentHistoryData = data || [];
            window.filterHistory(); // Apply limits immediately
        } catch (e) {
            document.getElementById('versionHistoryList').innerHTML = '<div style="color:var(--danger); text-align:center; padding:20px;">Erro ao carregar dados.</div>';
        }
    };

    function renderHistoryLoading() {
        document.getElementById('versionHistoryList').innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary)">Buscando histórico...</div>';
    }

    function renderHistoryList(data) {
        const list = document.getElementById('versionHistoryList');

        const envLabels = {
            'producao': 'PRODUÇÃO',
            'homologacao': 'HOMOLOGAÇÃO'
        };

        list.innerHTML = data.map(h => {
            const envDisplay = envLabels[h.version_controls?.environment] || h.version_controls?.environment?.toUpperCase() || 'N/A';

            return `
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; margin-bottom:12px; border-left:4px solid var(--accent); border: 1px solid rgba(255,255,255,0.05); border-left-width: 4px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; align-items: flex-start;">
                        <div>
                            <strong style="color:#ffffff; font-size:1.1rem; display:block;">${h.version_controls?.system}</strong>
                            <span class="environment-badge-small ${h.version_controls?.environment}" style="font-size: 0.6rem; padding: 1px 6px;">${envDisplay}</span>
                        </div>
                        <small style="opacity:0.6; text-align:right;">${new Date(h.created_at).toLocaleDateString('pt-BR')} ${new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                    <div style="font-size:0.9rem; margin:5px 0; color:#fff; font-family:'Outfit', sans-serif;">
                        <span style="font-weight: 400;">Identificação da Versão:</span> <span style="color:var(--success); font-weight:600;">${h.new_version}</span>
                    </div>
                    <div style="font-size:0.9rem; color:#fff; font-family:'Outfit', sans-serif; margin-bottom:2px;">
                        <span style="font-weight: 400;">Data da Atualização:</span> <span>${h.version_controls?.updated_at ? new Date(h.version_controls.updated_at).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    <div style="font-size:0.9rem; color:#fff; font-family:'Outfit', sans-serif;">
                        <span style="font-weight: 400;">Responsável:</span> <span>${h.updated_by}</span>
                    </div>
                    ${h.notes && h.notes !== 'Versão inicial cadastrada' && h.notes !== 'Registro Inicial' && h.notes !== 'Registro de nova versão' ? `<div style="font-size:0.85rem; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05); color:#cfd8dc; border-radius:0;">${utils.escapeHtml(h.notes)}</div>` : ''}
                </div>
            `;
        }).join('') || '<div style="text-align:center; opacity:0.5; padding:30px;">Nenhum registro encontrado para os filtros selecionados.</div>';
    }

    window.filterHistory = () => {
        const sys = document.getElementById('historySystemFilter').value;
        const envFilter = document.getElementById('historyEnvFilter').value;

        // Base filter by system if selected
        let filtered = currentHistoryData;
        if (sys !== 'all') {
            filtered = filtered.filter(h => h.version_controls?.system === sys);
        }

        // Filter by environment if selected
        if (envFilter !== 'all') {
            filtered = filtered.filter(h => h.version_controls?.environment === envFilter);
        }

        // Apply Logic: Top 3 latest updates per System per Environment
        const finalResults = [];
        const counters = {}; // stores count for "System|Environment"

        filtered.forEach(h => {
            const system = h.version_controls?.system || 'Unknown';
            const env = h.version_controls?.environment || 'Unknown';
            const key = `${system}|${env}`;

            if (!counters[key]) counters[key] = 0;

            if (counters[key] < 3) {
                finalResults.push(h);
                counters[key]++;
            }
        });

        // Sort by Environment if a system is selected (Production first)
        if (sys !== 'all') {
            finalResults.sort((a, b) => {
                const envA = a.version_controls?.environment || '';
                const envB = b.version_controls?.environment || '';
                if (envA === 'producao' && envB !== 'producao') return -1;
                if (envA !== 'producao' && envB === 'producao') return 1;
                return 0; // Preserve date order
            });
        }

        renderHistoryList(finalResults);
    };

    window.closeVersionHistoryModal = () => {
        document.getElementById('versionHistoryModal').classList.add('hidden');
    };



    // ==========================================
    // PULSE DASHBOARD LOGIC (Real-time Analytics)
    // ==========================================
    let pulseCharts = {};
    let pulseRefreshInterval = null;

    window.openPulseDashboard = async function () {
        const modal = document.getElementById('pulseDashboardModal');
        if (!modal) return;

        modal.classList.remove('hidden');

        // Animation
        const container = modal.querySelector('.dashboard-container');
        container.style.opacity = '0';
        container.style.transform = 'scale(0.95)';
        setTimeout(() => {
            container.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            container.style.opacity = '1';
            container.style.transform = 'scale(1)';
        }, 50);

        // Loading state
        document.getElementById('kpiTotalClients').innerText = '...';
        document.getElementById('kpiMostPopularSystem').innerText = '...';

        // 1. Fetch Data
        await window.loadVersionControls();

        // 2. Render explicitly
        calculateAndRenderPulse();

        // 3. Start Auto-Refresh
        if (pulseRefreshInterval) clearInterval(pulseRefreshInterval);
        pulseRefreshInterval = setInterval(async () => {
            await window.loadVersionControls();
            calculateAndRenderPulse();
        }, 10000);
    };


    window.closePulseDashboard = function () {
        const modal = document.getElementById('pulseDashboardModal');
        if (modal) modal.classList.add('hidden');

        // Stop auto-refresh
        if (pulseRefreshInterval) {
            clearInterval(pulseRefreshInterval);
            pulseRefreshInterval = null;
        }
    };

    window.printDashboard = async function () {
        try {
            // Show loading toast
            window.showToast?.('Gerando relatório do dashboard...', 'info');

            // Wait LONGER for chart to be fully rendered
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Get current dashboard data
            const totalClients = document.getElementById('kpiTotalClients')?.innerText || '0';
            const mostPopularSystem = document.getElementById('kpiMostPopularSystem')?.innerText || '-';

            // Get versions data from version-card elements
            const versionsContainer = document.getElementById('versionsListContainer');
            let versionsHTML = '';
            if (versionsContainer) {
                const versionCards = versionsContainer.querySelectorAll('.version-card');

                versionCards.forEach(card => {
                    const systemName = card.querySelector('.v-card-title span')?.innerText || '';
                    const versionItems = card.querySelectorAll('.v-item');

                    if (versionItems.length > 0 && systemName) {
                        versionsHTML += `<div style="margin-bottom: 25px; break-inside: avoid;">`;
                        versionsHTML += `<h4 style="color: #7c4dff; margin-bottom: 10px; font-size: 1rem; font-weight: 600;">${systemName}</h4>`;
                        versionsHTML += `<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 15px;">`;
                        versionsHTML += `<thead><tr style="background: #f2f2f2;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Versão</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 70%;">Cliente</th></tr></thead><tbody>`;

                        versionItems.forEach(item => {
                            const version = item.querySelector('.v-version-text')?.innerText || '';
                            const client = item.querySelector('.v-clients-list')?.innerText || '';
                            if (version && client) {
                                versionsHTML += `<tr><td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${version}</td><td style="padding: 10px; border: 1px solid #ddd;">${client}</td></tr>`;
                            }
                        });

                        versionsHTML += `</tbody></table></div>`;
                    }
                });
            }

            // Get system distribution data from the chart
            let systemDistHTML = '';

            // Get table data from Chart.js
            const dashboardModal = document.getElementById('pulseDashboardModal');
            const chartCanvas = dashboardModal ? dashboardModal.querySelector('#systemDistChart') : null;

            if (chartCanvas && window.Chart) {
                try {
                    const chartInstance = Chart.getChart(chartCanvas);
                    if (chartInstance && chartInstance.data) {
                        systemDistHTML = '<table style="width: 60%; margin: 20px auto; border-collapse: collapse; font-size: 0.85rem;"><thead><tr style="background: #f2f2f2;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 70%;">Sistema</th><th style="padding: 10px; border: 1px solid #ddd; text-align: center; width: 30%;">Clientes</th></tr></thead><tbody>';

                        const labels = chartInstance.data.labels || [];
                        const data = chartInstance.data.datasets[0]?.data || [];

                        labels.forEach((label, index) => {
                            const value = data[index] || 0;
                            systemDistHTML += `<tr><td style="padding: 10px; border: 1px solid #ddd;">${label}</td><td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: 600;">${value}</td></tr>`;
                        });

                        systemDistHTML += '</tbody></table>';
                    }
                } catch (e) {
                    console.error('Error extracting chart data:', e);
                }
            }

            // Create print window
            console.log('📊 Final check - systemDistHTML length:', systemDistHTML.length);

            const printWindow = window.open('', '_blank');

            const content = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Dashboard Pulse - Relatório - Sofis</title>
                    <style>
                        @media print {
                            body { margin: 10px; }
                            button { display: none; }
                        }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        h1 { color: #7c4dff; text-align: center; margin-bottom: 5px; font-size: 1.8rem; }
                        .subtitle { text-align: center; color: #6b7280; margin-bottom: 30px; font-size: 0.9rem; }
                        .meta { text-align: center; color: #7f8c8d; margin-bottom: 30px; font-size: 0.9rem; line-height: 1.5; }
                        .kpi-section { display: flex; gap: 20px; margin-bottom: 30px; }
                        .kpi-box { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; background: #f8f9fb; }
                        .kpi-box h3 { margin: 0 0 5px 0; font-size: 0.8rem; color: #6b7280; text-transform: uppercase; }
                        .kpi-box .value { font-size: 2rem; font-weight: 700; color: #111827; margin: 10px 0; }
                        .section-title { color: #2c3e50; font-size: 1.2rem; margin: 30px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #7c4dff; }
                        .footer { text-align: center; font-size: 0.8rem; color: #95a5a6; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <h1>Dashboard Pulse</h1>
                    <div class="subtitle">Visão Geral Inteligente em Tempo Real</div>
                    <div class="meta">
                        Gerado em: ${new Date().toLocaleString('pt-BR')}
                    </div>
                    
                    <div class="kpi-section">
                        <div class="kpi-box">
                            <h3>Total de Clientes</h3>
                            <div class="value">${totalClients}</div>
                        </div>
                        <div class="kpi-box">
                            <h3>Sistemas Mais Utilizados</h3>
                            <div class="value" style="font-size: 1.2rem;">${mostPopularSystem}</div>
                        </div>
                    </div>

                    ${versionsHTML ? `<h2 class="section-title">Distribuição de Versões</h2>${versionsHTML}` : ''}
                    
                    ${systemDistHTML ? `<h2 class="section-title">Distribuição por Sistema</h2>` : ''}
                    ${systemDistHTML}
                    
                    <div class="footer">Sofis - Sistema de Gerenciamento de Clientes</div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(content);
            printWindow.document.close();

        } catch (err) {
            console.error('Erro ao gerar relatório do dashboard:', err);
            window.showToast?.('Erro ao gerar relatório.', 'danger');
        }
    };



    function calculateAndRenderPulse() {
        console.log("📊 [Pulse] Calculating metrics...");

        if (!window.versionControls || window.versionControls.length === 0) {
            console.warn("📊 [Pulse] No data available, tempting lazy load...");
            // Optional: trigger load if empty? 
            // Better to rely on the main loop, but we can set UI to '...'
            document.getElementById('kpiTotalClients').innerText = '...';
            return;
        }

        const allData = window.versionControls;

        // ===== FILTRAR APENAS PRODUÇÃO (Validação Rigorosa) =====
        const data = allData.filter(d => {
            const env = (d.environment || '').toLowerCase().trim();
            const normalized = env.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // Aceitar: producao, produção, PRODUCAO, PRODUÇÃO
            return normalized === 'producao';
        });



        // Helper para parsear datas (aceita ISO ou PT-BR DD/MM/YYYY)
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date(0);
            if (dateStr instanceof Date) return dateStr;

            // Tenta formato ISO direto
            let d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;

            // Tenta formato PT-BR (DD/MM/YYYY)
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // assume DD/MM/YYYY -> YYYY-MM-DD
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }

            return new Date(0);
        };

        // ===== DEDUPLICAÇÃO ROBUSTA (Agrupar e Eleger o Melhor) =====
        const groups = new Map();

        data.forEach(d => {
            const key = `${d.client_id}-${d.system}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(d);
        });

        const cleanData = [];

        groups.forEach((records, key) => {
            // Sort records within the exact same Client-System group to find absolute latest
            records.sort((a, b) => {
                // 1. Updated Date (User Intent)
                const dateA = parseDate(a.updated_at).getTime();
                const dateB = parseDate(b.updated_at).getTime();
                if (dateA !== dateB) return dateB - dateA;

                // 2. Created Date (Tie breaker for same manual date)
                const createdA = new Date(a.created_at || 0).getTime();
                const createdB = new Date(b.created_at || 0).getTime();
                if (createdA !== createdB) return createdB - createdA;

                // 3. ID (Ultimate stability)
                return (b.id > a.id) ? 1 : -1;
            });

            // The winner is the first one
            cleanData.push(records[0]);
        });

        // Usar APENAS os registros mais recentes para o dashboard

        console.log(`📊 [Pulse] Dados Brutos (Produção): ${data.length}`);
        console.log(`📊 [Pulse] Dados Limpos (Apenas Recentes): ${cleanData.length}`);

        if (cleanData.length === 0) {
            console.warn("📊 [Pulse] No clean data available");
            document.getElementById('kpiTotalClients').innerText = '0';
            document.getElementById('kpiMostPopularSystem').innerText = '-';
            return;
        }

        // ===== KPI 1: Total de Clientes Únicos (Produção) =====
        const uniqueClients = new Set(cleanData.map(d => d.client_id)).size;
        document.getElementById('kpiTotalClients').innerText = uniqueClients;

        // ===== KPI 2: Todos os Sistemas com Quantidades (Clientes Únicos) =====
        const systemClientSets = {};
        cleanData.forEach(d => {
            const sys = d.system || 'Desconhecido';
            if (!systemClientSets[sys]) {
                systemClientSets[sys] = new Set();
            }
            systemClientSets[sys].add(d.client_id);
        });

        // Converter Sets para contagens e ordenar
        const sortedSystems = Object.entries(systemClientSets)
            .map(([sys, clientSet]) => [sys, clientSet.size])
            .sort((a, b) => b[1] - a[1]);

        // Renderizar lista de sistemas com quantidades
        const kpiElement = document.getElementById('kpiMostPopularSystem');
        if (sortedSystems.length > 0) {
            const systemsList = sortedSystems.map(([sys, count]) => `${sys} (${count})`).join(', ');
            kpiElement.innerHTML = systemsList;
            kpiElement.style.fontSize = '0.95rem';
            kpiElement.style.lineHeight = '1.4';
        } else {
            kpiElement.innerText = '-';
        }

        // Preparar systemCounts para os gráficos
        const systemCounts = {};
        sortedSystems.forEach(([sys, count]) => {
            systemCounts[sys] = count;
        });

        // ===== Renderizar Gráficos =====
        if (typeof Chart === 'undefined') {
            console.error("❌ [Pulse] Chart.js not loaded");
            return;
        }

        // renderEnvironmentChart(allData); // Gráfico removido do HTML
        renderSystemDistributionChart(cleanData, systemCounts); // Apenas produção (limpo)
        renderVersionsChart(cleanData); // Apenas produção (limpo)
    }

    // Chart Configuration - Modern Vibrant Colors
    const chartColors = {
        purple: '#8b5cf6',
        blue: '#3b82f6',
        green: '#10b981',
        teal: '#14b8a6',
        orange: '#f59e0b',
        pink: '#ec4899',
        red: '#ef4444',
        indigo: '#6366f1',
        text: '#6b7280',
        grid: 'rgba(229, 231, 235, 0.5)',
        gridDark: 'rgba(156, 163, 175, 0.2)'
    };

    function destroyChart(id) {
        if (pulseCharts[id]) {
            pulseCharts[id].destroy();
        }
    }

    // ===== Gráfico 1: Ambientes (Produção vs Homologação) =====
    function renderEnvironmentChart(data) {
        const ctx = document.getElementById('envChart').getContext('2d');
        destroyChart('envChart');

        let prod = 0, homolog = 0;
        data.forEach(d => {
            const env = (d.environment || '').toLowerCase();
            if (env.includes('prod')) prod++;
            else if (env.includes('homolog') || env.includes('test')) homolog++;
        });

        pulseCharts['envChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Produção', 'Homologação'],
                datasets: [{
                    data: [prod, homolog],
                    backgroundColor: [chartColors.teal, chartColors.teal],
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: chartColors.text, font: { size: 12, weight: '600' } }
                    },
                    y: {
                        grid: { color: chartColors.grid },
                        ticks: { color: chartColors.text, precision: 0 },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // ===== Helper de Cores Unificado (Top & Bottom Consistency) =====
    const SYSTEM_COLOR_MAP = {
        'Hemote Plus': '#8b5cf6', // Purple
        'Hemote Web': '#6366f1',  // Indigo
        'CellVida': '#10b981',    // Green
        'Monetário': '#f59e0b',   // Amber
        'Produção': '#10b981',    // Green
        'Homologação': '#3b82f6'  // Blue
    };

    function getPulseSystemColor(sysName) {
        if (!sysName) return '#6b7280';
        // Exact match first
        if (SYSTEM_COLOR_MAP[sysName]) return SYSTEM_COLOR_MAP[sysName];

        // Partial match
        for (const [key, color] of Object.entries(SYSTEM_COLOR_MAP)) {
            if (sysName.includes(key)) return color;
        }

        // Fallback or hash-based color if needed (keeping it gray for safety)
        return '#6b7280'; // Gray
    }

    // ===== Gráfico 2: Distribuição de Clientes por Sistema =====
    function renderSystemDistributionChart(data, counts) {
        const container = document.getElementById('systemDistChart').parentElement;
        const total = Object.values(counts).reduce((a, b) => a + b, 0);

        // Criar layout customizado: Pizza à esquerda + Barras à direita
        container.innerHTML = `
            <div style="display: flex; gap: 32px; align-items: center; height: 100%;">
                <div style="flex: 0 0 280px; position: relative;">
                    <canvas id="systemPieChart"></canvas>
                </div>
                <div id="systemBars" style="flex: 1; display: flex; flex-direction: column; gap: 16px; justify-content: center;">
                </div>
            </div>
        `;

        const labels = Object.keys(counts);
        const values = Object.values(counts);

        // Determinar cores baseadas no NOME do sistema (Consistência)
        const backgroundColors = labels.map(label => getPulseSystemColor(label));

        // Renderizar Pizza
        const ctx = document.getElementById('systemPieChart').getContext('2d');
        destroyChart('systemDistChart');

        pulseCharts['systemDistChart'] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Renderizar Barras Horizontais
        const barsContainer = document.getElementById('systemBars');
        labels.forEach((label, i) => {
            const value = values[i];
            const percentage = ((value / total) * 100).toFixed(1);
            const color = getPulseSystemColor(label);

            const barHtml = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 4px;">${label}</div>
                        <div style="width: 100%; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; background: ${color}; border-radius: 4px; width: ${percentage}%; transition: width 0.6s ease;"></div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #111827; min-width: 80px; text-align: right;">${value} (${percentage}%)</div>
                </div>
            `;
            barsContainer.innerHTML += barHtml;
        });
    }


    // ===== Lista de Versões por Sistema (Cards) =====

    // ===== Lista de Versões por Sistema (Cards) =====
    function renderVersionsChart(data) {
        const container = document.getElementById('versionsListContainer');
        if (!container) return;

        container.innerHTML = '';

        // 1. Agrupar dados: Sistema -> Versão -> Set de {id, name}
        const systemVersions = {};

        data.forEach(d => {
            const sys = (d.system || 'Desconhecido').trim();
            const ver = (d.version || 'S/V').trim();

            // Tenta obter nome do cliente do join, ou usa ID
            let clientName = d.client_id;
            if (d.clients && d.clients.name) {
                clientName = d.clients.name;
            } else if (d.client_name) { // Fallback se vier flattened
                clientName = d.client_name;
            }

            if (!systemVersions[sys]) {
                systemVersions[sys] = {};
            }
            if (!systemVersions[sys][ver]) {
                systemVersions[sys][ver] = new Set();
            }
            systemVersions[sys][ver].add(clientName);
        });

        // CSS Inline para garantir layout dos cards
        const style = document.createElement('style');
        style.innerHTML = `
            .versions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: 16px;
                padding: 4px;
                max-height: 450px;
                overflow-y: auto;
            }
            .version-card {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border: 1px solid #f3f4f6;
                display: flex;
                flex-direction: column;
            }
            .v-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #f9fafb;
            }
            .v-card-title {
                font-weight: 700;
                color: #111827;
                font-size: 0.95rem;
            }
            .v-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .v-item {
                display: flex;
                flex-direction: column; /* Coluna para caber clientes em baixo */
                align-items: flex-start;
                font-size: 0.85rem;
                color: #4b5563;
                padding: 6px 0;
                border-bottom: 1px dashed #f3f4f6;
            }
            .v-item:last-child {
                border-bottom: none;
            }
            .v-row-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            }
            .v-version-text {
                font-family: monospace;
                font-weight: 600;
                color: #374151;
            }
            .v-badge {
                background: #8b5cf6;
                color: white;
                font-weight: 600;
                font-size: 0.75rem;
                min-width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                padding: 0 6px;
            }
            .v-clients-list {
                font-size: 0.75rem;
                color: #9ca3af;
                margin-top: 4px;
                line-height: 1.2;
                word-break: break-word;
            }
        `;
        container.appendChild(style);

        // Helper de cores (usando a função compartilhada)
        // getPulseSystemColor já está definido no escopo superior


        // 2. Gerar HTML dos Cards
        const sortedSystems = Object.keys(systemVersions).sort();

        sortedSystems.forEach(sys => {
            const versionsObj = systemVersions[sys];
            // Lista de versões ordenadas por contagem (decrescente) e depois por nome
            const versionsList = Object.entries(versionsObj)
                .map(([v, clientSet]) => ({
                    version: v,
                    count: clientSet.size,
                    clients: Array.from(clientSet).sort().join(', ')
                }))
                .sort((a, b) => b.count - a.count || b.version.localeCompare(a.version));

            const sysColor = getPulseSystemColor(sys);

            let listHtml = '';
            versionsList.forEach(item => {
                listHtml += `
                    <div class="v-item">
                        <div class="v-row-main">
                            <span class="v-version-text">${item.version}</span>
                            <span class="v-badge" style="background-color: ${sysColor}">${item.count}</span>
                        </div>
                        <div class="v-clients-list">
                            <i class="fa-regular fa-user" style="font-size: 10px; margin-right: 4px;"></i>
                            ${item.clients}
                        </div>
                    </div>
                 `;
            });

            // Determinar qual logo usar baseado no sistema
            let logoHtml = '';
            if (sys === 'CellVida') {
                logoHtml = '<img src="cellvida-logo.jpg" alt="CellVida" style="height: 32px; width: auto; object-fit: contain; display: block;">';
            } else if (sys === 'Hemote Plus' || sys === 'Hemote Web') {
                logoHtml = '<img src="hemote-logo.jpg" alt="Hemote" style="height: 32px; width: auto; object-fit: contain; display: block;">';
            } else if (sys === 'Monetário') {
                logoHtml = '<img src="monetario-logo.jpg" alt="Monetário" style="height: 32px; width: auto; object-fit: contain; display: block;">';
            }

            const cardHtml = `
                <div class="version-card">
                    <div class="v-card-header">
                        <div class="v-card-title" style="color: ${sysColor}; display: flex; align-items: center; gap: 8px;">
                            ${logoHtml}
                            <span>${sys}</span>
                        </div>
                        <i class="fa-solid fa-layer-group" style="color: ${sysColor} opacity: 0.5;"></i>
                    </div>
                    <div class="v-list">
                        ${listHtml}
                    </div>
                </div>
             `;

            container.insertAdjacentHTML('beforeend', cardHtml);
        });
    }


    // Listen for permissions loaded to re-render UI with correct access levels
    document.addEventListener('permissions-loaded', () => {
        console.log("🔄 Re-rendering Version Controls due to permissions update...");
        renderVersionControls();
        loadProducts(); // Refresh products based on new permissions
    });

    // ==========================================
    // PRODUCT MANAGEMENT LOGIC
    // ==========================================
    let productsList = [];
    let editingProductId = null;

    async function loadProducts() {
        if (!window.supabaseClient) return;
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            productsList = data || [];

            // Sync dropdown in version modal
            const sysSelect = document.getElementById('versionSystemSelect');
            if (sysSelect) {
                const current = sysSelect.value;
                sysSelect.innerHTML = '<option value="">Selecione o produto...</option>';
                productsList.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.name;
                    opt.setAttribute('data-type', p.version_type);
                    opt.textContent = `${p.name}`;
                    sysSelect.appendChild(opt);
                });
                if (current) sysSelect.value = current;

                // Trigger mask update if already selected
                updateVersionMask();
            }

            // Sync table in management modal
            renderProductsTable();
        } catch (err) {
            console.error('❌ Error loadProducts:', err);
        }
    }

    function renderProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const canEdit = window.Permissions?.can('Controle de Versões - Produtos', 'can_edit');
        const canDelete = window.Permissions?.can('Controle de Versões - Produtos', 'can_delete');
        const hasActions = canEdit || canDelete;

        // Sync header visibility
        const actionsHeader = document.getElementById('productActionsHeader');
        if (actionsHeader) actionsHeader.style.display = hasActions ? '' : 'none';

        if (productsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${hasActions ? 3 : 2}" style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum produto cadastrado.</td></tr>`;
            return;
        }

        productsList.forEach(p => {
            const tr = document.createElement('tr');
            const typeClass = p.version_type === 'Pacote' ? 'badge-type-pacote' : 'badge-type-build';

            let actionsHtml = '';
            if (hasActions) {
                actionsHtml = `
                    <td class="action-cell">
                        ${canEdit ? `
                            <button class="btn-icon" onclick="window.editProduct('${p.id}')" title="Editar">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn-icon btn-danger" onclick="window.deleteProduct('${p.id}')" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                `;
            }

            tr.innerHTML = `
                <td>${utils.escapeHtml(p.name)}</td>
                <td><span class="badge-product-type ${typeClass}">${p.version_type}</span></td>
                ${actionsHtml}
            `;
            tbody.appendChild(tr);
        });
    }

    window.openProductManagement = async () => {
        if (window.Permissions && !window.Permissions.can('Controle de Versões - Produtos', 'can_view')) {
            if (window.showToast) window.showToast('🚫 Sem permissão para gerenciar produtos.', 'error');
            return;
        }
        await loadProducts();

        // Check if can create or edit to show/hide the form
        const canCreate = window.Permissions?.can('Controle de Versões - Produtos', 'can_create');
        const canEdit = window.Permissions?.can('Controle de Versões - Produtos', 'can_edit');
        const form = document.getElementById('productForm');
        if (form) {
            form.style.display = (canCreate || canEdit) ? 'flex' : 'none';
        }

        document.getElementById('productManagementModal').classList.remove('hidden');
    };

    window.closeProductManagement = () => {
        document.getElementById('productManagementModal').classList.add('hidden');
        window.resetProductForm();
    };

    window.resetProductForm = () => {
        const form = document.getElementById('productForm');
        if (form) form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('cancelProductEdit').classList.add('hidden');
        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) saveBtn.disabled = true;
        editingProductId = null;
    };

    function validateProductForm() {
        const nameInput = document.getElementById('productName');
        const typeSelect = document.getElementById('productType');
        const saveBtn = document.getElementById('saveProductBtn');
        if (!nameInput || !typeSelect || !saveBtn) return;

        const nameValue = nameInput.value.trim();
        const typeValue = typeSelect.value;

        // Find current editing product to compare changes
        const existing = editingProductId ? productsList.find(x => x.id === editingProductId) : null;

        const isChanged = !existing || (existing.name !== nameValue || existing.version_type !== typeValue);
        const isValid = nameValue.length > 0 && typeValue.length > 0;

        saveBtn.disabled = !(isChanged && isValid);
    }

    window.editProduct = (id) => {
        if (window.Permissions && !window.Permissions.can('Controle de Versões - Produtos', 'can_edit')) {
            if (window.showToast) window.showToast('🚫 Sem permissão para editar produtos.', 'error');
            return;
        }
        const p = productsList.find(x => x.id === id);
        if (!p) return;
        editingProductId = id;
        document.getElementById('productId').value = p.id;
        document.getElementById('productName').value = p.name;
        document.getElementById('productType').value = p.version_type;
        document.getElementById('cancelProductEdit').classList.remove('hidden');
        document.getElementById('productName').focus();
        validateProductForm(); // Initial check
    };

    window.deleteProduct = async (id) => {
        if (!window.Permissions?.can('Controle de Versões - Produtos', 'can_delete')) {
            if (window.showToast) window.showToast('🚫 Sem permissão para excluir produtos.', 'error');
            return;
        }

        const p = productsList.find(x => x.id === id);
        if (!p) return;

        const confirmed = await window.showConfirm(`Tem certeza que deseja excluir o produto "${p.name}"?`, 'Excluir Produto', 'fa-trash');
        if (!confirmed) return;

        try {
            const { error } = await window.supabaseClient.from('products').delete().eq('id', id);
            if (error) throw error;
            if (window.showToast) window.showToast('Produto excluído com sucesso!', 'success');
            if (window.registerAuditLog) {
                await window.registerAuditLog('EXCLUSÃO', 'Exclusão de Produto', `Produto: ${p.name}`, p, null);
            }
            await loadProducts();
        } catch (err) {
            console.error('❌ deleteProduct error:', err);
            if (window.showToast) window.showToast('Falha ao excluir produto.', 'error');
        }
    };

    document.getElementById('productForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const canCreate = window.Permissions?.can('Controle de Versões - Produtos', 'can_create');
        const canEdit = window.Permissions?.can('Controle de Versões - Produtos', 'can_edit');

        const id = document.getElementById('productId').value;
        if (id && !canEdit) {
            if (window.showToast) window.showToast('🚫 Sem permissão para editar produtos.', 'error');
            return;
        }
        if (!id && !canCreate) {
            if (window.showToast) window.showToast('🚫 Sem permissão para criar produtos.', 'error');
            return;
        }

        const name = document.getElementById('productName').value.trim();
        const version_type = document.getElementById('productType').value;

        try {
            if (id) {
                const oldProduct = productsList.find(p => p.id === id);
                const { error } = await window.supabaseClient.from('products').update({ name, version_type }).eq('id', id);
                if (error) throw error;
                if (window.registerAuditLog) {
                    await window.registerAuditLog('EDIÇÃO', 'Edição de Produto', `Produto: ${name}`, oldProduct, { name, version_type });
                }
            } else {
                const { error } = await window.supabaseClient.from('products').insert([{ name, version_type }]);
                if (error) throw error;
                if (window.registerAuditLog) {
                    await window.registerAuditLog('CRIAÇÃO', 'Criação de Produto', `Produto: ${name}`, null, { name, version_type });
                }
            }

            if (window.showToast) window.showToast('Produto salvo com sucesso!', 'success');
            window.resetProductForm();
            await loadProducts();
        } catch (err) {
            console.error('❌ productForm error:', err);
            if (window.showToast) window.showToast('Falha ao salvar produto.', 'error');
        }
    });

    // Initial load
    document.addEventListener('DOMContentLoaded', () => {
        loadProducts();
        setupMaskLogic();
        setupProductFormListeners();

        // Limit future dates
        const dateInput = document.getElementById('versionDateInput');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('max', today);
        }
    });

    function setupProductFormListeners() {
        const nameInput = document.getElementById('productName');
        const typeSelect = document.getElementById('productType');

        if (nameInput) nameInput.addEventListener('input', validateProductForm);
        if (typeSelect) typeSelect.addEventListener('change', validateProductForm);
    }

    function setupMaskLogic() {
        const sysSelect = document.getElementById('versionSystemSelect');
        const verInput = document.getElementById('versionNumberInput');
        if (sysSelect) {
            sysSelect.addEventListener('change', updateVersionMask);
        }
        if (verInput) {
            verInput.addEventListener('input', (e) => {
                const type = getSelectedProductType();
                if (type === 'Build') {
                    // Numbers only
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                } else {
                    // Standard Pacote mask: YYYY.MM-XX
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 8) v = v.substring(0, 8);

                    let masked = v;
                    if (v.length > 4) {
                        masked = v.substring(0, 4) + '.' + v.substring(4);
                    }
                    if (v.length > 6) {
                        masked = v.substring(0, 4) + '.' + v.substring(4, 6) + '-' + v.substring(6);
                    }
                    e.target.value = masked;
                }
            });
        }
    }

    function updateVersionMask() {
        const type = getSelectedProductType();
        const verInput = document.getElementById('versionNumberInput');
        if (!verInput) return;

        if (type === 'Build') {
            verInput.placeholder = 'Ex: 20250105006';
            verInput.maxLength = 15;
            verInput.title = 'Apenas números permitidos para o tipo Build';
            // If switched and has content, keep only numbers
            if (verInput.value) {
                verInput.value = verInput.value.replace(/[^0-9]/g, '');
            }
        } else {
            verInput.placeholder = 'Ex: 2025.01-01';
            verInput.maxLength = 10;
            verInput.title = 'Formato sugerido: YYYY.MM-XX';
            // If switched and has content, re-apply mask
            if (verInput.value) {
                let v = verInput.value.replace(/\D/g, '');
                if (v.length > 8) v = v.substring(0, 8);
                let masked = v;
                if (v.length > 4) masked = v.substring(0, 4) + '.' + v.substring(4);
                if (v.length > 6) masked = v.substring(0, 4) + '.' + v.substring(4, 6) + '-' + v.substring(6);
                verInput.value = masked;
            }
        }
    }

    function getSelectedProductType() {
        const sysSelect = document.getElementById('versionSystemSelect');
        if (!sysSelect) return null;
        const opt = sysSelect.options[sysSelect.selectedIndex];
        return opt ? opt.getAttribute('data-type') : null;
    }

})();
