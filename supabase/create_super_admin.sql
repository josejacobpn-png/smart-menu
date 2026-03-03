-- Script para criar o Super Usuário inicial no Supabase.
-- ATENÇÃO: Execute este script diretamente no SQL Editor do painel do Supabase.

DO $$
DECLARE
  new_admin_id uuid := gen_random_uuid();
  admin_email text := 'smartmenug2@gmail.com'; -- Mude para o e-colocado desejado
  admin_password text := 'Jj@96314725'; -- Mude para a senha desejada
BEGIN
  -- 1. Criar o usuário na tabela de autenticação (auth.users)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_admin_id,
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Super Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 2. Criar a identidade para o login
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_admin_id,
    new_admin_id::text,
    format('{"sub":"%s","email":"%s"}', new_admin_id::text, admin_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- OBSERVAÇÃO: A sua trigger `handle_new_user` configurada no Supabase 
  -- vai de forma automática capturar a criação desse usuário no `auth.users` 
  -- e automaticamente criar o registro correspondente na tabela `public.profiles`.

END $$;
