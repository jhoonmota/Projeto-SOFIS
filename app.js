
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let clients = [];
    let editingId = null;

    // DOM Elements
    const clientList = document.getElementById('clientList');
    const modal = document.getElementById('modal');
    const form = document.getElementById('clientForm');
    const addBtn = document.getElementById('addClientBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.getElementById('closeModal');
    const searchInput = document.getElementById('searchInput');
    const modalTitle = document.getElementById('modalTitle');
    const toast = document.getElementById('toast');
    const clearSearchBtn = document.getElementById('clearSearch');

    // Inputs
    const clientNameInput = document.getElementById('clientName');
    const contactList = document.getElementById('contactList');
    const addContactBtn = document.getElementById('addContactBtn');

    // Server Modal Elements
    const serverModal = document.getElementById('serverModal');
    const serverForm = document.getElementById('serverForm');
    const closeServerBtn = document.getElementById('closeServerModal');
    const serverClientIdInput = document.getElementById('serverClientId');
    const sqlServerInput = document.getElementById('sqlServerInput');
    const credentialList = document.getElementById('credentialList');
    const addCredentialBtn = document.getElementById('addCredentialBtn');
    const serverNotesInput = document.getElementById('serverNotesInput');

    // Client Notes Modal Elements
    const notesModal = document.getElementById('notesModal');
    const notesForm = document.getElementById('notesForm');
    const closeNotesBtn = document.getElementById('closeNotesModal');
    const cancelNotesBtn = document.getElementById('cancelNotesBtn');
    const notesClientIdInput = document.getElementById('notesClientId');
    const clientNoteInput = document.getElementById('clientNoteInput');
    const notesModalTitle = document.getElementById('notesModalTitle');


    // --- Auth Protection ---
    const { data: { session } } = await supabase.auth.getSession(); // Destructure session
    if (!session) { // Check if session is null
        window.location.href = 'login.html';
        return; // Stop execution
    }

    // Auth successful, show UI
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'block';

    // Logout Functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('Saindo...');
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Initial Render
    console.log('App.js inicializado. Buscando clientes...');
    fetchClients();

    // Event Listeners
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAddModal();
        });
    } else {
        console.error('Botão Novo Cliente #addClientBtn não encontrado no DOM!');
    }
    closeBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    searchInput.addEventListener('input', (e) => {
        handleSearch(e);
        if (e.target.value.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            renderClients(clients);
            searchInput.focus();
        });
    }

    addContactBtn.addEventListener('click', () => addContactGroup());

    // Server Modal Listeners
    if (serverForm) serverForm.addEventListener('submit', handleServerSubmit);
    if (closeServerBtn) closeServerBtn.addEventListener('click', closeServerModal);

    const cancelServerFormBtn = document.getElementById('cancelServerFormBtn');
    if (cancelServerFormBtn) cancelServerFormBtn.addEventListener('click', clearServerForm);

    const closeServerModalBtn = document.getElementById('closeServerModalBtn');
    if (closeServerModalBtn) closeServerModalBtn.addEventListener('click', closeServerModal);

    if (addCredentialBtn) addCredentialBtn.addEventListener('click', () => addCredentialField());

    // Client Notes Listeners
    if (notesForm) notesForm.addEventListener('submit', handleNotesSubmit);
    if (closeNotesBtn) closeNotesBtn.addEventListener('click', closeNotesModal);
    if (cancelNotesBtn) cancelNotesBtn.addEventListener('click', closeNotesModal);

    // --- Core Data Functions (Supabase) ---

    async function fetchClients() {
        try {
            clientList.innerHTML = '<div style="text-align:center; padding: 20px;">Carregando clientes do Supabase...</div>';

            const { data, error } = await supabase
                .from('clients')
                .select('*, contacts(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            clients = data || [];
            // Sort contacts locally if needed, e.g., by created_at, or assume DB order
            renderClients(clients);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            showToast('Erro ao carregar clientes.', 'error');

            clients = [];
            renderClients(clients);
        }
    }

    // --- Functions ---

    function renderClients(clientsToRender) {
        clientList.innerHTML = '';

        const sortedClients = [...clientsToRender].sort((a, b) => {
            if (a.is_favorite === b.is_favorite) return 0;
            return a.is_favorite ? -1 : 1;
        });

        if (sortedClients.length === 0) {
            clientList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhum cliente encontrado.</p>
                </div>
            `;
            return;
        }

        sortedClients.forEach(client => {
            const card = document.createElement('div');
            card.className = `client-card ${client.is_favorite ? 'favorite' : ''}`;

            const contacts = client.contacts || [];

            // Format contacts
            const contactsHTML = contacts.length > 0
                ? contacts.map((contact, index) => {
                    const phonesHTML = contact.phones && contact.phones.length > 0
                        ? contact.phones.map(phone => `
                            <div class="contact-item">
                                <i class="fa-solid fa-phone"></i> ${escapeHtml(phone)}
                            </div>
                        `).join('')
                        : '';

                    const emailsHTML = contact.emails && contact.emails.length > 0
                        ? contact.emails.map(email => `
                            <div class="contact-item">
                                <i class="fa-solid fa-envelope"></i> ${escapeHtml(email)}
                            </div>
                        `).join('')
                        : '';

                    return `
                        <div class="contact-group-display">
                            <div class="contact-header-display">
                                <div class="contact-name-display clickable" onclick="window.editContact('${client.id}', ${index})" title="Ver/Editar Contato">
                                    ${escapeHtml(contact.name || 'Sem nome')}
                                </div>
                                <button class="btn-icon-small" onclick="window.editContact('${client.id}', ${index})" title="Editar Contato">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                            </div>
                            ${phonesHTML}
                            ${emailsHTML}
                        </div>
                    `;
                }).join('')
                : '<div class="contact-item">Nenhum contato cadastrado</div>';

            card.innerHTML = `
                <div class="client-header">
                    <div>
                        <div class="client-header-top">
                            <div class="client-name clickable" onclick="window.openClientNotes('${client.id}')" title="Ver Observações">${escapeHtml(client.name)}</div>
                             <button class="btn-icon btn-star ${client.is_favorite ? 'favorite-active' : ''}" onclick="window.toggleFavorite('${client.id}')" title="${client.is_favorite ? 'Remover Favorito' : 'Favoritar'}">
                                <i class="fa-${client.is_favorite ? 'solid' : 'regular'} fa-star"></i>
                            </button>
                        </div>
                        <div class="client-contact-list">
                            ${contactsHTML}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="window.editClient('${client.id}')" title="Editar Cliente">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon" onclick="window.addNewContact('${client.id}')" title="Adicionar Contato">
                            <i class="fa-solid fa-user-plus"></i>
                        </button>
                        <button class="btn-icon" onclick="window.openServerData('${client.id}')" title="Dados do Servidor">
                            <i class="fa-solid fa-database"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="window.deleteClient('${client.id}')" title="Excluir">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            clientList.appendChild(card);
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';

        const mode = form.dataset.mode;
        const editingContactIndex = contactList.dataset.editingContactIndex;

        try {
            // --- 1. Validation ---
            // Basic Client Name Validation (Needed for Client creation/update, but maybe not for purely adding contact if client exists?)
            // Actually, clientNameInput is present in all modals.
            if (!clientNameInput.value.trim()) {
                showToast('⚠️ O nome do cliente é obrigatório.', 'error');
                clientNameInput.focus();
                throw new Error('Validation failed'); // Jump to finally
            }

            // Collect Form Data (Contacts)
            const contactGroups = contactList.querySelectorAll('.contact-group');
            const extractedContacts = Array.from(contactGroups).map(group => {
                const name = group.querySelector('.contact-name-input').value.trim();
                const phones = Array.from(group.querySelectorAll('.phone-input'))
                    .map(i => i.value.trim()).filter(v => v !== '');
                const emails = Array.from(group.querySelectorAll('.email-input'))
                    .map(i => i.value.trim()).filter(v => v !== '');
                return { name, phones, emails };
            }).filter(c => c.name || c.phones.length > 0 || c.emails.length > 0);

            if (extractedContacts.length === 0 && !mode) {
                // For main client creation, require at least one contact? 
                // Existing logic required it. Let's keep it.
                showToast('⚠️ Preencha pelo menos um telefone ou e-mail.', 'error');
                throw new Error('Validation failed');
            }

            // --- 2. Processing based on Mode ---

            // A. Single Contact ADD
            if (mode === 'addContact' && editingId) {
                // extractedContacts should have 1 item
                const newContact = extractedContacts[0];
                if (!newContact) throw new Error("Contact info missing");

                const { error } = await supabase.from('contacts').insert({
                    client_id: editingId,
                    name: newContact.name,
                    phones: newContact.phones,
                    emails: newContact.emails
                });
                if (error) throw error;
                showToast('✅ Contato adicionado!', 'success');
            }

            // B. Single Contact EDIT
            else if (mode === 'editContact' && editingId && editingContactIndex !== undefined) {
                // We need the Contact ID. 
                // Since we rely on index currently, let's find the ID from the local 'clients' state
                const client = clients.find(c => c.id === editingId);
                const contactId = client.contacts[parseInt(editingContactIndex)].id;

                const updatedContact = extractedContacts[0];

                const { error } = await supabase.from('contacts').update({
                    name: updatedContact.name,
                    phones: updatedContact.phones,
                    emails: updatedContact.emails
                }).eq('id', contactId);

                if (error) throw error;
                showToast('✅ Contato atualizado!', 'success');
            }

            // C. Full Client Create / Update
            else {
                let currentClientId = editingId;

                // 1. Client Table Upsert
                const clientPayload = { name: clientNameInput.value.trim() };

                if (currentClientId) {
                    // Update
                    const { error } = await supabase.from('clients').update(clientPayload).eq('id', currentClientId);
                    if (error) throw error;
                    showToast('✅ Cliente atualizado!', 'success');
                } else {
                    // Insert
                    const { data, error } = await supabase.from('clients').insert(clientPayload).select().single();
                    if (error) throw error;
                    currentClientId = data.id;
                    showToast('✅ Cliente criado!', 'success');
                }

                // 2. Sync Contacts (Delete All + Insert)
                // Only if we are in "Full Edit" mode (which populates the whole list). 
                // If we were in a mode that hides contacts, we shouldn't do this. 
                // But "else" block covers specific "editClient" or "newClient" flows which show all contacts.

                if (currentClientId) {
                    // Delete existing
                    const { error: delError } = await supabase.from('contacts').delete().eq('client_id', currentClientId);
                    if (delError) throw delError;

                    // Insert new ones
                    if (extractedContacts.length > 0) {
                        const contactsToInsert = extractedContacts.map(c => ({
                            client_id: currentClientId,
                            name: c.name,
                            phones: c.phones,
                            emails: c.emails
                        }));
                        const { error: insError } = await supabase.from('contacts').insert(contactsToInsert);
                        if (insError) throw insError;
                    }
                }
            }

            // --- 3. Finish ---
            await fetchClients();
            closeModal();

        } catch (error) {
            if (error.message !== 'Validation failed') {
                console.error('Erro ao salvar:', error);
                showToast('Erro ao processar requisição: ' + error.message, 'error');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };

    window.deleteClient = async (id) => {
        console.log('Tentando excluir cliente:', id);
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                const { error } = await supabase
                    .from('clients')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Erro Supabase ao excluir:', error);
                    throw error;
                }

                console.log('Cliente excluído com sucesso do banco.');
                showToast('🗑️ Cliente removido com sucesso!', 'success');
                await fetchClients(); // Força recarregar a lista
            } catch (error) {
                console.error('Erro ao excluir:', error);
                showToast('Erro ao excluir cliente: ' + (error.message || 'Erro desconhecido'), 'error');
            }
        }
    }

    window.editClient = (id) => {
        const client = clients.find(c => c.id === id);
        if (!client) return;

        editingId = id;
        clientNameInput.value = client.name;
        clientNameInput.disabled = false;
        delete form.dataset.mode;
        delete contactList.dataset.editingContactIndex;

        // Populate contacts
        contactList.innerHTML = '';
        if (client.contacts && client.contacts.length > 0) {
            client.contacts.forEach(contact => {
                addContactGroup(contact.name, contact.phones, contact.emails);
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
                <h4 class="contact-group-title">
                    <i class="fa-solid fa-user"></i> Informações do Contato
                </h4>
                <button type="button" class="btn-remove-contact" onclick="window.removeContact(this)" title="Remover Contato" tabindex="-1">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            
            <div class="contact-details">
                <div class="contact-section">
                    <label class="section-label section-label-left">
                        <span><i class="fa-solid fa-user"></i> Nome do Contato<span class="required">*</span></span>
                    </label>
                    <input type="text" class="contact-name-input" placeholder="Ex: João Silva, Comercial" value="${escapeHtml(name)}">
                </div>

                <div class="contact-section">
                    <label class="section-label section-label-left">
                        <span><i class="fa-solid fa-phone"></i> Telefones<span class="required">*</span></span>
                        <button type="button" class="btn-add-phone" onclick="window.addPhone(this)" title="Adicionar Telefone" tabindex="-1">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </label>
                    <div class="phone-list"></div>
                </div>

                <div class="contact-section">
                    <label class="section-label section-label-left">
                        <span><i class="fa-solid fa-envelope"></i> E-mails</span>
                        <button type="button" class="btn-add-email" onclick="window.addEmail(this)" title="Adicionar E-mail" tabindex="-1">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </label>
                    <div class="email-list"></div>
                </div>

            </div>
        `;
        contactList.appendChild(groupDiv);

        const phoneListDiv = groupDiv.querySelector('.phone-list');
        if (phones.length > 0) {
            phones.forEach(phone => addPhoneField(phoneListDiv, phone));
        } else {
            addPhoneField(phoneListDiv, '');
        }

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
            <button type="button" class="btn-remove-field-small" onclick="window.removeContactField(this)" title="Remover" tabindex="-1">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(fieldDiv);

        const phoneInput = fieldDiv.querySelector('.phone-input');
        phoneInput.addEventListener('input', applyPhoneMask);
    }

    function addEmailField(container, value = '') {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'contact-field';
        fieldDiv.innerHTML = `
            <input type="email" class="email-input" placeholder="contato@empresa.com" value="${escapeHtml(value)}">
            <button type="button" class="btn-remove-field-small" onclick="window.removeContactField(this)" title="Remover" tabindex="-1">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(fieldDiv);
    }

    function applyPhoneMask(e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 13) {
            value = value.substring(0, 13);
        }

        if (value.length <= 10) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else {
            value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        }

        e.target.value = value.trim();
    }

    function openAddModal() {
        console.log('Abrindo modal de novo cliente...');
        editingId = null;
        form.reset();
        clientNameInput.disabled = false;
        delete form.dataset.mode;
        delete contactList.dataset.editingContactIndex;

        contactList.innerHTML = '';
        addContactGroup();

        modalTitle.textContent = 'Novo Cliente';
        openModal();
    }

    // Expose needed functions to global scope
    window.openAddModal = openAddModal;
    window.closeModal = closeModal;

    function openModal() {
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = 'toast';

        if (type === 'error') {
            toast.classList.add('toast-error');
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

    // Expose functions to global scope (Required for onclick handlers in HTML)
    window.openAddModal = openAddModal;
    window.closeModal = closeModal;

    window.addNewContact = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        editingId = clientId;
        clientNameInput.value = client.name;
        clientNameInput.disabled = true;

        contactList.innerHTML = '';
        addContactGroup();

        form.dataset.mode = 'addContact';

        modalTitle.textContent = 'Adicionar Novo Contato';
        openModal();
    };

    window.toggleFavorite = async (id) => {
        const client = clients.find(c => c.id === id);
        if (client) {
            const newStatus = !client.is_favorite;
            // Optimistic update
            client.is_favorite = newStatus;

            if (searchInput.value.trim() !== '') {
                searchInput.dispatchEvent(new Event('input'));
            } else {
                renderClients(clients);
            }

            try {
                const { error } = await supabase
                    .from('clients')
                    .update({ is_favorite: newStatus })
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                console.error('Erro ao favoritar', error);
                client.is_favorite = !newStatus;
                renderClients(clients);
                showToast('Erro ao atualizar favorito', 'error');
            }
        }
    };

    window.editContact = (clientId, contactIndex) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.contacts || !client.contacts[contactIndex]) return;

        editingId = clientId;
        clientNameInput.value = client.name;

        contactList.innerHTML = '';
        const contact = client.contacts[contactIndex];
        addContactGroup(contact.name, contact.phones, contact.emails);

        contactList.dataset.editingContactIndex = contactIndex;
        form.dataset.mode = 'editContact';

        modalTitle.textContent = 'Editar Contato - ' + client.name;
        openModal();
    };

    const originalHandleFormSubmit = handleFormSubmit;
    handleFormSubmit = async function (e) {
        e.preventDefault();

        const mode = form.dataset.mode;
        const editingContactIndex = contactList.dataset.editingContactIndex;

        if (mode === 'addContact') {
            originalHandleFormSubmit(e);
            return;
        }

        if (editingContactIndex !== undefined) {
            // Editing a single contact logic
            const contactGroups = contactList.querySelectorAll('.contact-group');
            if (contactGroups.length !== 1) {
                originalHandleFormSubmit(e);
                return;
            }

            const group = contactGroups[0];
            const name = group.querySelector('.contact-name-input').value.trim();

            const phoneInputs = group.querySelectorAll('.phone-input');
            const phones = Array.from(phoneInputs)
                .map(input => input.value.trim())
                .filter(val => val !== '');

            const emailInputs = group.querySelectorAll('.email-input');
            const emails = Array.from(emailInputs)
                .map(input => input.value.trim())
                .filter(val => val !== '');

            if (!name || phones.length === 0) {
                showToast('Preencha nome e telefone.', 'error');
                return;
            }

            const updatedContact = { name, phones, emails };

            // Logic to update array in database
            const client = clients.find(c => c.id === editingId);
            if (client && client.contacts) {
                const currentIndex = parseInt(editingContactIndex);
                const newContacts = [...client.contacts];
                newContacts[currentIndex] = updatedContact;

                try {
                    const { error } = await supabase
                        .from('clients')
                        .update({ contacts: newContacts })
                        .eq('id', editingId);

                    if (error) throw error;

                    showToast('✅ Contato atualizado com sucesso!', 'success');
                    await fetchClients();
                    closeModal();
                    delete contactList.dataset.editingContactIndex;

                } catch (error) {
                    console.error(error);
                    showToast('Erro ao atualizar contato', 'error');
                }
            }
        } else {
            originalHandleFormSubmit(e);
        }
    };

    window.removeContact = (button) => {
        const contactGroup = button.closest('.contact-group');
        const container = contactGroup.parentElement;
        const editingContactIndex = contactList.dataset.editingContactIndex;

        if (editingContactIndex !== undefined && editingId) {
            if (confirm('Tem certeza que deseja excluir este contato?')) {
                const client = clients.find(c => c.id === editingId);
                if (client && client.contacts) {
                    const contactId = client.contacts[parseInt(editingContactIndex)].id;

                    supabase.from('contacts').delete().eq('id', contactId)
                        .then(({ error }) => {
                            if (error) throw error;
                            showToast('✅ Contato excluído!', 'success');
                            fetchClients();
                            closeModal();
                        })
                        .catch(err => {
                            console.error(err);
                            showToast('Erro ao excluir contato', 'error');
                        });
                }
            }
            return;
        }

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
            const input = field.querySelector('input');
            if (input) input.value = '';
        }
    };

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Copiado!', 'success');
        });
    };

    // --- Server Data Functions ---

    window.openServerData = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        serverClientIdInput.value = clientId;

        if (!client.servers) {
            client.servers = [];
        }

        clearServerForm();
        renderServersList(client);
        serverModal.classList.remove('hidden');
    };

    function closeServerModal() {
        serverModal.classList.add('hidden');
        clearServerForm();
    }

    function clearServerForm() {
        const environmentSelect = document.getElementById('environmentSelect');
        if (environmentSelect) environmentSelect.value = '';
        if (sqlServerInput) sqlServerInput.value = '';
        if (serverNotesInput) serverNotesInput.value = '';

        const editingServerIndex = document.getElementById('editingServerIndex');
        if (editingServerIndex) editingServerIndex.value = '';

        credentialList.innerHTML = '';
        addCredentialField();
    }

    function renderServersList(client) {
        const serversList = document.getElementById('serversList');
        if (!serversList) return;

        const servers = client.servers || [];

        if (servers.length === 0) {
            serversList.innerHTML = `
                <div class="servers-grid-empty">
                    <i class="fa-solid fa-database"></i>
                    <p>Nenhum servidor cadastrado ainda.</p>
                </div>
            `;
            return;
        }

        serversList.innerHTML = servers.map((server, index) => {
            const environmentClass = server.environment === 'homologacao' ? 'homologacao' : 'producao';
            const environmentLabel = server.environment === 'homologacao' ? 'Homologação' : 'Produção';

            const credentialsHTML = server.credentials && server.credentials.length > 0
                ? `
                    <div class="server-credentials">
                        <div class="server-credentials-title">
                            <i class="fa-solid fa-key"></i> Credenciais
                        </div>
                        ${server.credentials.map(cred => `
                            <div class="credential-item">
                                <div class="credential-row">
                                    <span class="credential-label">Usuário:</span>
                                    <span class="credential-value">${escapeHtml(cred.user)}</span>
                                    <button class="btn-copy-small" onclick="window.copyToClipboard(this.dataset.value)" data-value="${escapeHtml(cred.user)}" title="Copiar Usuário">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                </div>
                                <div class="credential-row">
                                    <span class="credential-label">Senha:</span>
                                    <span class="credential-value">${escapeHtml(cred.password)}</span>
                                    <button class="btn-copy-small" onclick="window.copyToClipboard(this.dataset.value)" data-value="${escapeHtml(cred.password)}" title="Copiar Senha">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `
                : '';

            const notesHTML = server.notes
                ? `<div class="server-notes"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(server.notes)}</div>`
                : '';

            return `
                <div class="server-card">
                    <div class="server-card-header">
                        <span class="server-environment ${environmentClass}">${environmentLabel}</span>
                        <div class="server-card-actions">
                            <button class="btn-icon" onclick="window.editServerRecord('${client.id}', ${index})" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="window.deleteServerRecord('${client.id}', ${index})" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="server-info">
                        <div class="server-info-label">SQL Server</div>
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
                <button type="button" class="btn-remove-credential" onclick="window.removeCredentialField(this)" title="Remover Credencial" tabindex="-1">
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

        const currentServers = client.servers || [];
        const updatedServers = [...currentServers];

        const environmentSelect = document.getElementById('environmentSelect');
        const editingServerIndex = document.getElementById('editingServerIndex');

        const credDivs = credentialList.querySelectorAll('.credential-field-group');
        const credentials = Array.from(credDivs).map(div => {
            return {
                user: div.querySelector('.server-user-input').value.trim(),
                password: div.querySelector('.server-pass-input').value.trim()
            };
        }).filter(c => c.user !== '' || c.password !== '');

        const serverRecord = {
            environment: environmentSelect.value,
            sqlServer: sqlServerInput.value.trim(),
            credentials: credentials,
            notes: serverNotesInput ? serverNotesInput.value.trim() : ''
        };

        if (editingServerIndex.value !== '') {
            const index = parseInt(editingServerIndex.value);
            updatedServers[index] = serverRecord;
        } else {
            updatedServers.push(serverRecord);
        }

        try {
            const { error } = await supabase
                .from('clients')
                .update({ servers: updatedServers })
                .eq('id', id);

            if (error) throw error;

            showToast('✅ Servidor salvo com sucesso!', 'success');
            await fetchClients();
            clearServerForm();
            const updatedClient = clients.find(c => c.id === id);
            if (updatedClient) {
                renderServersList(updatedClient);
            }
        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar servidor', 'error');
        }
    }

    window.editServerRecord = (clientId, index) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.servers || !client.servers[index]) return;

        const server = client.servers[index];
        const environmentSelect = document.getElementById('environmentSelect');
        const editingServerIndex = document.getElementById('editingServerIndex');

        if (environmentSelect) environmentSelect.value = server.environment;
        if (sqlServerInput) sqlServerInput.value = server.sqlServer;
        if (serverNotesInput) serverNotesInput.value = server.notes || '';
        if (editingServerIndex) editingServerIndex.value = index;

        credentialList.innerHTML = '';
        if (server.credentials && server.credentials.length > 0) {
            server.credentials.forEach(cred => addCredentialField(cred.user, cred.password));
        } else {
            addCredentialField();
        }

        const modalContent = document.querySelector('#serverModal .modal-content');
        if (modalContent) modalContent.scrollTop = 0;
    };

    window.deleteServerRecord = async (clientId, index) => {
        if (!confirm('Tem certeza que deseja excluir este servidor?')) return;

        const client = clients.find(c => c.id === clientId);
        if (!client || !client.servers) return;

        const updatedServers = client.servers.filter((_, idx) => idx !== index);


        try {
            const { error } = await supabase
                .from('clients')
                .update({ servers: updatedServers })
                .eq('id', clientId);

            if (error) throw error;

            showToast('🗑️ Servidor removido!', 'success');
            await fetchClients();
            const updatedClient = clients.find(c => c.id === clientId);
            if (updatedClient) renderServersList(updatedClient);

        } catch (error) {
            console.error(error);
            showToast('Erro ao remover servidor', 'error');
        }
    };

    window.openClientNotes = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        notesClientIdInput.value = clientId;
        notesModalTitle.textContent = `Observações - ${client.name}`;
        clientNoteInput.value = client.notes || '';

        notesModal.classList.remove('hidden');
    };

    function closeNotesModal() {
        notesModal.classList.add('hidden');
    }

    async function handleNotesSubmit(e) {
        e.preventDefault();
        const id = notesClientIdInput.value;

        try {
            const { error } = await supabase
                .from('clients')
                .update({ notes: clientNoteInput.value.trim() })
                .eq('id', id);

            if (error) throw error;

            showToast('✅ Observações salvas!', 'success');
            closeNotesModal();
            fetchClients();
        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar observações', 'error');
        }
    }

});
