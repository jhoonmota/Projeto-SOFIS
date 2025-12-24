-- 1. Criar a nova tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phones TEXT[], -- Array de textos para telefones
    emails TEXT[], -- Array de textos para emails
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);

-- 2. Migrar dados existentes (Do JSON para a Tabela)
-- Esta query extrai os objetos do array JSON e os insere como linhas na tabela contacts
INSERT INTO contacts (client_id, name, phones, emails)
SELECT 
    c.id as client_id,
    elem->>'name' as name,
    -- Conversão segura de JSON array para Text Array do Postgres
    ARRAY(SELECT jsonb_array_elements_text(elem->'phones')) as phones,
    ARRAY(SELECT jsonb_array_elements_text(elem->'emails')) as emails
FROM 
    clients c,
    jsonb_array_elements(c.contacts) elem
WHERE 
    c.contacts IS NOT NULL AND jsonb_array_length(c.contacts) > 0;

-- 3. (OPCIONAL) Limpar a coluna antiga
-- Execute apenas se tiver certeza que a migração funcionou.
-- UPDATE clients SET contacts = NULL;
-- ALTER TABLE clients DROP COLUMN contacts;
