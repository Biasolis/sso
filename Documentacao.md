
# Documentação de Integração SSO (OAuth 2.0)

Este documento descreve como integrar a sua aplicação com o nosso serviço de **Single Sign-On (SSO)** utilizando o protocolo **OAuth 2.0 (Authorization Code Flow)**.

---

## Visão Geral

O fluxo de autenticação permite que a sua aplicação delegue a autenticação de utilizadores ao nosso SSO. O processo, em resumo, é o seguinte:

1. A sua aplicação redireciona o utilizador para o SSO para fazer login.  
2. O utilizador faz login no SSO e consente em partilhar as suas informações.  
3. O SSO redireciona o utilizador de volta para a sua aplicação com um código de autorização.  
4. O backend da sua aplicação troca secretamente esse código por um `access_token`.  
5. Com o `access_token`, a sua aplicação pode obter as informações do utilizador.

---

## Pré-requisitos: Registar a sua Aplicação

Antes de começar, a sua aplicação (denominada **"cliente OAuth"**) precisa de ser registada no nosso sistema. Para tal, contacte um superadministrador do SSO e forneça as seguintes informações:

- **Nome da Aplicação**: Um nome amigável (ex.: `Plataforma de Vendas`).  
- **Redirect URIs (URIs de Redirecionamento)**: Uma ou mais URLs absolutas para as quais o SSO pode redirecionar o utilizador em segurança após o login.

Exemplos:
- Desenvolvimento: `http://localhost:3001/callback`  
- Produção: `https://suaapp.com/auth/callback`

Após o registo o administrador irá fornecer as credenciais que devem ser guardadas com segurança no **backend** da sua aplicação:

- `client_id`  
- `client_secret`

---

## Fluxo de Autenticação — Passo a Passo

### Passo 1 — Redirecionar o Utilizador para o SSO

Redirecione o navegador do utilizador para o endpoint `/oauth/authorize` do SSO, incluindo os seguintes parâmetros na URL:

- `response_type`: deve ser sempre `code`.  
- `client_id`: o `client_id` fornecido pelo administrador.  
- `redirect_uri`: a URL de callback da sua aplicação (deve corresponder exatamente a uma das URIs registadas).  
- `scope`: lista de permissões solicitadas, separadas por espaços.  
- `state` (opcional, **altamente recomendado**): string aleatória e opaca para prevenir CSRF.

Escopos disponíveis (exemplos):
- `openid` — Obrigatório para fluxos de autenticação.  
- `profile` — Acesso a informações básicas do perfil (nome, etc.).  
- `email` — Acesso ao e-mail do utilizador.

**Exemplo de URL de redirecionamento:**
```
http://localhost:4000/oauth/authorize?response_type=code&client_id=SEU_CLIENT_ID&redirect_uri=https://suaapp.com/auth/callback&scope=openid%20profile%20email&state=xyz123abc
```

> Nota: os espaços em `scope` devem ser codificados na URL (ex.: `%20`).

---

### Passo 2 — O Utilizador Faz Login e Consente

O SSO apresenta a interface de login e, se necessário, um ecrã de consentimento onde o utilizador aprova os `scopes` solicitados. A sua aplicação não precisa de intervir nesta etapa.

---

### Passo 3 — Receber o Código de Autorização

Se o utilizador aprovar, o SSO redireciona para a `redirect_uri` com os parâmetros `code` e `state` (se fornecido).

**Exemplo de redirecionamento de sucesso:**
```
https://suaapp.com/auth/callback?code=CODIGO_RECEBIDO_DO_SSO&state=xyz123abc
```

Se o utilizador negar, o SSO pode redirecionar com um parâmetro de erro.

**Exemplo de redirecionamento de erro:**
```
https://suaapp.com/auth/callback?error=access_denied
```

O backend da sua aplicação **deve verificar** se o `state` recebido corresponde ao `state` enviado no Passo 1.

---

### Passo 4 — Trocar o Código por um Access Token

Esta comunicação é **servidor-para-servidor**. O backend deve fazer um `POST` para o endpoint `/oauth/token` para trocar o `code` por um `access_token`.

- **Endpoint:**  
  `POST http://localhost:4000/oauth/token`

- **Cabeçalhos:**  
  `Content-Type: application/x-www-form-urlencoded`

- **Corpo (application/x-www-form-urlencoded):**
  - `grant_type`: `authorization_code`  
  - `code`: o código de autorização recebido no passo anterior  
  - `redirect_uri`: a mesma `redirect_uri` usada no Passo 1  
  - `client_id`: o seu `client_id`  
  - `client_secret`: o seu `client_secret`

**Exemplo de resposta de sucesso (JSON):**
```json
{
  "access_token": "um_jwt_longo_e_seguro...",
  "refresh_token": "um_refresh_token_ainda_mais_longo...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Guarde o `access_token` e o `refresh_token` de forma segura, associados à sessão do utilizador.

---

## Utilizar o Access Token

### Obter Informações do Utilizador

Com o `access_token`, a sua aplicação pode obter os dados do utilizador autenticado:

- **Endpoint:**  
  `GET http://localhost:4000/oauth/userinfo`

- **Cabeçalhos:**  
  `Authorization: Bearer SEU_ACCESS_TOKEN`

**Exemplo de resposta (JSON):**
```json
{
  "sub": "id-do-utilizador-no-sso",
  "name": "Nome Completo do Utilizador",
  "email": "email.do.utilizador@example.com"
}
```

A resposta contém os campos permitidos pelos `scopes` aprovados.

### Renovar o Access Token (Usar o Refresh Token)

Quando o `access_token` expirar (`expires_in` segundos), use o `refresh_token` para obter um novo par de tokens (sem pedir login ao utilizador).

- **Endpoint:**  
  `POST http://localhost:4000/oauth/token`

- **Corpo (application/x-www-form-urlencoded):**
  - `grant_type`: `refresh_token`  
  - `refresh_token`: o `refresh_token` guardado  
  - `client_id`: o seu `client_id`  
  - `client_secret`: o seu `client_secret`

A resposta será semelhante à do Passo 4, contendo um novo `access_token` e um novo `refresh_token`. Substitua os tokens antigos pelos novos.

---

## Boas práticas de segurança (resumo)

- Guarde `client_secret`, `access_token` e `refresh_token` **somente** no backend (não no cliente/browser).  
- Utilize HTTPS em produção para todas as `redirect_uri` e endpoints.  
- Valide sempre o `state` para mitigar CSRF.  
- Armazene tokens de forma segura (ex.: encriptação em repouso).  
- Trate e logue erros (sem expor tokens ou segredos).
