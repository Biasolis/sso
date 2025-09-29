import ldap from 'ldapjs';

const client = ldap.createClient({
  url: process.env.LDAP_URL
});

/**
 * Autentica um usuário contra o servidor LDAP/AD.
 * Retorna os dados do usuário do AD em caso de sucesso, ou null em caso de falha.
 */
export const authenticateLDAP = (username, password) => {
  return new Promise((resolve, reject) => {
    // Primeiro, fazemos o "bind" com um usuário administrativo para poder pesquisar
    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        console.error('LDAP Bind Error (Admin):', err);
        return reject(new Error('Não foi possível conectar ao servidor de autenticação.'));
      }
      
      const searchOptions = {
        // sAMAccountName é o login do usuário no AD (ex: "joao.silva")
        // userPrincipalName é o login no formato "joao.silva@dominio.com"
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        attributes: ['dn', 'mail', 'givenName', 'sn'] // Atributos que queremos buscar
      };

      // Procura pelo usuário no AD
      client.search(process.env.LDAP_SEARCH_BASE, searchOptions, (err, res) => {
        if (err) {
            console.error('LDAP Search Error:', err);
            return reject(new Error('Erro ao procurar usuário no servidor de autenticação.'));
        }
        
        let userEntry = null;

        res.on('searchEntry', (entry) => {
          userEntry = entry.object;
        });

        res.on('end', (result) => {
          if (!userEntry) {
            // Usuário não encontrado no AD
            return resolve(null);
          }
          
          // Se o usuário foi encontrado, tentamos fazer "bind" com a senha dele
          // para verificar se a senha está correta.
          const userClient = ldap.createClient({ url: process.env.LDAP_URL });
          userClient.bind(userEntry.dn, password, (bindErr) => {
            if (bindErr) {
              // Senha incorreta
              return resolve(null);
            }
            // Sucesso!
            userClient.unbind();
            resolve({
                email: userEntry.mail,
                name: `${userEntry.givenName} ${userEntry.sn}`
            });
          });
        });

        res.on('error', (err) => {
            console.error('LDAP Search Result Error:', err);
            reject(new Error('Erro durante a busca no servidor de autenticação.'));
        });
      });
    });
  });
};