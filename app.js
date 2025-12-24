document.addEventListener('DOMContentLoaded', () => {
    // State
    let clients = JSON.parse(localStorage.getItem('sofis_clients')) || [];
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


    // Initial Render
    renderClients(clients);

    // Event Listeners
    addBtn.addEventListener('click', openAddModal);
    cancelBtn.addEventListener('click', closeModal);
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

    // --- Functions ---

    function renderClients(clientsToRender) {
        clientList.innerHTML = '';

        // Sort clients: Favorites first, then by creation date (implicitly by array order)
        // Note: To preserve original order for non-favorites, we can't just use simple sort if we care about "creation time" logic unless we have a date field.
        // Assuming current array order is "creation order".
        // We will create a sorted copy for rendering only.
        const sortedClients = [...clientsToRender].sort((a, b) => {
            if (a.isFavorite === b.isFavorite) return 0;
            return a.isFavorite ? -1 : 1;
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
            card.className = `client-card ${client.isFavorite ? 'favorite' : ''}`;

            // Format contacts
            const contactsHTML = client.contacts && client.contacts.length > 0
                ? client.contacts.map((contact, index) => {
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
                                <div class="contact-name-display clickable" onclick="editContact('${client.id}', ${index})" title="Ver/Editar Contato">
                                    ${escapeHtml(contact.name || 'Sem nome')}
                                </div>
                                <button class="btn-icon-small" onclick="editContact('${client.id}', ${index})" title="Editar Contato">
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
                            <div class="client-name clickable" onclick="openClientNotes('${client.id}')" title="Ver Observações">${escapeHtml(client.name)}</div>
                             <button class="btn-icon btn-star ${client.isFavorite ? 'favorite-active' : ''}" onclick="toggleFavorite('${client.id}')" title="${client.isFavorite ? 'Remover Favorito' : 'Favoritar'}">
                                <i class="fa-${client.isFavorite ? 'solid' : 'regular'} fa-star"></i>
                            </button>
                        </div>
                        <div class="client-contact-list">
                            ${contactsHTML}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="addNewContact('${client.id}')" title="Adicionar Contato">
                            <i class="fa-solid fa-user-plus"></i>
                        </button>
                        <button class="btn-icon" onclick="openServerData('${client.id}')" title="Dados de Acesso ao SQL">
                            <i class="fa-solid fa-database"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteClient('${client.id}')" title="Excluir">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            clientList.appendChild(card);
        });
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const mode = form.dataset.mode;

        // Validate Client Name (always required)
        if (!clientNameInput.value.trim()) {
            showToast('⚠️ O nome do cliente é obrigatório.', 'error');
            clientNameInput.focus();
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
                return;
            }
            if (contacts[i].phones.length === 0) {
                showToast('⚠️ Pelo menos um telefone é obrigatório.', 'error');
                return;
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

        const client = editingId ? clients.find(c => c.id === editingId) : null;

        const newClient = {
            id: editingId || Date.now().toString(),
            name: clientNameInput.value,
            contacts: contacts,
            isFavorite: client ? client.isFavorite : false
        };

        if (editingId && mode !== 'addContact') {
            clients = clients.map(c => c.id === editingId ? newClient : c);
            showToast('✅ Cliente atualizado com sucesso!', 'success');
        } else if (editingId && mode === 'addContact') {
            // Append new phone/email to existing contacts of the client?
            // Wait, the structure is: Client -> Contacts[]. Each Contact has Name, Phones[], Emails[].
            // When we "Add Contact", are we adding a NEW Contact Group? YES.

            const clientToUpdate = clients.find(c => c.id === editingId);
            if (clientToUpdate) {
                if (!clientToUpdate.contacts) clientToUpdate.contacts = [];
                clientToUpdate.contacts.push(...contacts);
                // Also update name if changed? Maybe better to keep original name to avoid confusion if field was disabled.
                // clientToUpdate.name = clientNameInput.value; 

                showToast('✅ Contato adicionado com sucesso!', 'success');
            }
        } else {
            clients.push(newClient);
            showToast('✅ Cliente adicionado com sucesso!', 'success');
        }

        saveToLocal();
        renderClients(clients);
        closeModal();
    };

    function deleteClient(id) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            clients = clients.filter(c => c.id !== id);
            saveToLocal();
            renderClients(clients);
            showToast('🗑️ Cliente removido com sucesso!', 'success');
        }
    }

    function editClient(id) {
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
                addContactGroup(contact.name, contact.phones, contact.emails, contact.addresses);
            });
        } else {
            addContactGroup();
        }

        modalTitle.textContent = 'Editar Cliente';
        openModal();
    }

    function saveToLocal() {
        localStorage.setItem('sofis_clients', JSON.stringify(clients));
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
                <button type="button" class="btn-remove-contact" onclick="removeContact(this)" title="Remover Contato" tabindex="-1">
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

    function closeModal() {
        modal.classList.add('hidden');
    }

    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = 'toast'; // Reset classes

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

    // Expose functions to global scope for HTML onclick attributes
    window.editClient = editClient;
    window.deleteClient = deleteClient;

    window.addNewContact = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        editingId = clientId;
        clientNameInput.value = client.name;
        clientNameInput.disabled = true; // Lock client name to focus on contact addition

        // Clear list and add only one empty group
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
            // Re-render to update order
            // If we are searching, we should re-filter, but for simplicity re-rendering search input logic handles it if we trigger input event,
            // or we just re-render current state if no search.
            // A simple approach is just re-render all clients (clearing search if needed) or better yet, re-run search logic if search is active.

            if (searchInput.value.trim() !== '') {
                searchInput.dispatchEvent(new Event('input'));
            } else {
                renderClients(clients);
            }
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

    // Override handleFormSubmit for specific modes
    const originalHandleFormSubmit = handleFormSubmit;
    handleFormSubmit = function (e) {
        e.preventDefault();

        const mode = form.dataset.mode;
        const editingContactIndex = contactList.dataset.editingContactIndex;

        // If explicitly adding a contact (Append mode)
        if (mode === 'addContact') {
            originalHandleFormSubmit(e);
            return;
        }

        if (editingContactIndex !== undefined) {
            // Editing a single contact
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

            // Validate required fields
            if (!name) {
                showToast('⚠️ O nome do contato é obrigatório.', 'error');
                return;
            }

            if (phones.length === 0) {
                showToast('⚠️ Pelo menos um telefone é obrigatório.', 'error');
                return;
            }

            const updatedContact = { name, phones, emails };

            // Check for duplicates with other contacts in the same client
            const client = clients.find(c => c.id === editingId);
            if (client && client.contacts) {
                const currentIndex = parseInt(editingContactIndex);

                // Check if this contact data already exists in another contact
                for (let i = 0; i < client.contacts.length; i++) {
                    if (i === currentIndex) continue; // Skip the contact being edited

                    const existingContact = client.contacts[i];

                    // Check if name, phones, and emails are identical
                    const sameNames = existingContact.name === updatedContact.name;
                    const samePhones = JSON.stringify(existingContact.phones.sort()) === JSON.stringify(updatedContact.phones.sort());
                    const sameEmails = JSON.stringify(existingContact.emails.sort()) === JSON.stringify(updatedContact.emails.sort());

                    if (sameNames && samePhones && sameEmails) {
                        showToast('❌ Já existe um contato com esses mesmos dados.', 'error');
                        return;
                    }

                    // Check for duplicate phones
                    for (const phone of updatedContact.phones) {
                        if (existingContact.phones && existingContact.phones.includes(phone)) {
                            showToast(`❌ O telefone ${phone} já está cadastrado em outro contato.`, 'error');
                            return;
                        }
                    }
                }

                client.contacts[currentIndex] = updatedContact;

                saveToLocal();
                renderClients(clients);
                closeModal();
                delete contactList.dataset.editingContactIndex;
                showToast('✅ Contato atualizado com sucesso!', 'success');
            }
        } else {
            // Normal client editing/creation
            originalHandleFormSubmit(e);
        }
    };

    window.removeContact = (button) => {
        const contactGroup = button.closest('.contact-group');
        const container = contactGroup.parentElement;

        // Check if we are in "Edit Single Contact" mode
        const editingContactIndex = contactList.dataset.editingContactIndex;

        if (editingContactIndex !== undefined && editingId) {
            // We are editing a specific existing contact. The trash button should DELETE it.
            if (confirm('Tem certeza que deseja excluir este contato?')) {
                const client = clients.find(c => c.id === editingId);
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
        const row = btn.closest('.credential-row');
        const valueSpan = row.querySelector('.credential-value');
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

        if (!client.servers || client.servers.length === 0) {
            serversList.innerHTML = `
                <div class="servers-grid-empty">
                    <i class="fa-solid fa-database"></i>
                    <p>Nenhum servidor cadastrado ainda.</p>
                </div>
            `;
            return;
        }

        serversList.innerHTML = client.servers.map((server, index) => {
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
                            <button class="btn-icon" onclick="editServerRecord('${client.id}', ${index})" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="deleteServerRecord('${client.id}', ${index})" title="Excluir">
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
                <button type="button" class="btn-remove-credential" onclick="removeCredentialField(this)" title="Remover Credencial" tabindex="-1">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        credentialList.appendChild(div);
    }

    function handleServerSubmit(e) {
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

        const serverRecord = {
            environment: environmentSelect.value,
            sqlServer: sqlServerInput.value.trim(),
            credentials: credentials,
            notes: serverNotesInput ? serverNotesInput.value.trim() : ''
        };

        // Check if editing existing record
        if (editingServerIndex.value !== '') {
            const index = parseInt(editingServerIndex.value);
            client.servers[index] = serverRecord;
            showToast('✅ Servidor atualizado com sucesso!', 'success');
        } else {
            // Add new record
            client.servers.push(serverRecord);
            showToast('✅ Servidor incluído com sucesso!', 'success');
        }

        saveToLocal();
        renderServersList(client);
        closeServerEntryModal();
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

    window.deleteServerRecord = (clientId, index) => {
        if (!confirm('Tem certeza que deseja excluir este servidor?')) return;

        const client = clients.find(c => c.id === clientId);
        if (!client || !client.servers) return;

        client.servers.splice(index, 1);
        saveToLocal();
        renderServersList(client);
        showToast('🗑️ Servidor removido com sucesso!', 'success');
    };

    // --- Client Notes Functions ---

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

    function handleNotesSubmit(e) {
        e.preventDefault();
        const id = notesClientIdInput.value;
        const client = clients.find(c => c.id === id);

        if (!client) return;

        client.notes = clientNoteInput.value.trim();
        saveToLocal();
        showToast('✅ Observações do cliente salvas!', 'success');
        closeNotesModal();
        renderClients(clients);
    }

});
