/**
 * Script de Migração: LocalStorage -> Supabase
 * 
 * Como usar:
 * 1. Preencha o SUPABASE_URL e SUPABASE_ANON_KEY no arquivo supabase-client.js
 * 2. Abra o sistema no navegador
 * 3. Abra o Console do Desenvolvedor (F12)
 * 4. Cole este código e pressione Enter
 */

async function migrateData() {
    if (!window.supabaseClient) {
        console.error('Supabase Client não inicializado. Verifique as chaves.');
        return;
    }

    const localData = JSON.parse(localStorage.getItem('sofis_clients') || '[]');
    if (localData.length === 0) {
        console.log('Nenhum dado encontrado no LocalStorage para migrar.');
        return;
    }

    console.log(`Iniciando migração de ${localData.length} clientes...`);

    for (const client of localData) {
        console.log(`Migrando: ${client.name}...`);

        // 1. Inserir Cliente
        const { data: insertedClient, error: clientError } = await window.supabaseClient
            .from('clients')
            .insert([{
                name: client.name,
                is_favorite: client.isFavorite || false,
                notes: client.notes || '',
                web_laudo: client.webLaudo || ''
            }])
            .select()
            .single();

        if (clientError) {
            console.error(`Erro ao inserir cliente ${client.name}:`, clientError);
            continue;
        }

        const clientId = insertedClient.id;

        // 2. Inserir Contatos
        if (client.contacts && client.contacts.length > 0) {
            const contactsToInsert = client.contacts.map(c => ({
                client_id: clientId,
                name: c.name,
                phones: c.phones || [],
                emails: c.emails || []
            }));

            const { error: contactsError } = await window.supabaseClient
                .from('contacts')
                .insert(contactsToInsert);

            if (contactsError) console.error(`Erro nos contatos de ${client.name}:`, contactsError);
        }

        // 3. Inserir Servidores (SQL)
        if (client.servers && client.servers.length > 0) {
            const serversToInsert = client.servers.map(s => ({
                client_id: clientId,
                environment: s.environment,
                sql_server: s.sqlServer,
                notes: s.notes || '',
                credentials: s.credentials || []
            }));

            const { error: serversError } = await window.supabaseClient
                .from('servers')
                .insert(serversToInsert);

            if (serversError) console.error(`Erro nos servidores de ${client.name}:`, serversError);
        }

        // 4. Inserir VPNs
        if (client.vpns && client.vpns.length > 0) {
            const vpnsToInsert = client.vpns.map(v => ({
                client_id: clientId,
                username: v.user,
                password: v.password,
                notes: v.notes || ''
            }));

            const { error: vpnsError } = await window.supabaseClient
                .from('vpns')
                .insert(vpnsToInsert);

            if (vpnsError) console.error(`Erro nas VPNs de ${client.name}:`, vpnsError);
        }

        // 5. Inserir URLs
        if (client.urls && client.urls.length > 0) {
            const urlsToInsert = client.urls.map(u => ({
                client_id: clientId,
                environment: u.environment,
                system: u.system,
                bridge_data_access: u.bridgeDataAccess,
                bootstrap: u.bootstrap || '',
                exec_update: u.execUpdate || '',
                notes: u.notes || ''
            }));

            const { error: urlsError } = await window.supabaseClient
                .from('urls')
                .insert(urlsToInsert);

            if (urlsError) console.error(`Erro nas URLs de ${client.name}:`, urlsError);
        }
    }

    console.log('Migração concluída!');
    alert('Migração concluída com sucesso! Verifique seu dashboard do Supabase.');
}

// migrateData(); // Descomente para rodar automaticamente ao carregar (não recomendado sem as chaves)
