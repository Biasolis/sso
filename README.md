# Sistema de Autenticação Centralizado (SSO)

Este projeto é um sistema de Single Sign-On (SSO) construído para fornecer uma identidade centralizada para múltiplas aplicações. Ele atua como um Provedor de Identidade (Identity Provider - IdP) utilizando os protocolos OAuth 2.0 e OpenID Connect (OIDC).

## Stack de Tecnologia

-   **Backend:** Node.js com Express.js
-   **Frontend:** Vite + React
-   **Banco de Dados:** PostgreSQL
-   **Protocolo:** OAuth 2.0 / OpenID Connect (OIDC)

## Estrutura

O projeto é um monorepo com duas pastas principais:

-   `/backend`: A API do Provedor de Identidade, responsável por gerenciar usuários, clientes e o fluxo de autenticação.
-   `/frontend`: A interface do usuário para o servidor de SSO, contendo as telas de login, cadastro, consentimento, etc.