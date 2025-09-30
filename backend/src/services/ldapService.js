import ldap from 'ldapjs';
import logger from '../config/logger.js';

let client;

if (process.env.LDAP_URL) {
    client = ldap.createClient({
        url: process.env.LDAP_URL
    });

    client.on('error', (err) => {
        logger.error('Erro de conexão com o cliente LDAP:', err);
    });
}

export const authenticateLDAP = (username, password) => {
  if (!client) {
      return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        logger.error('LDAP Bind Error (Admin):', err);
        return reject(new Error('Não foi possível conectar ao servidor de autenticação.'));
      }
      
      const searchOptions = {
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        // Pedimos agora o atributo 'memberOf'
        attributes: ['dn', 'mail', 'givenName', 'sn', 'memberOf']
      };

      client.search(process.env.LDAP_SEARCH_BASE, searchOptions, (err, res) => {
        if (err) {
            logger.error('LDAP Search Error:', err);
            return reject(new Error('Erro ao procurar utilizador no servidor de autenticação.'));
        }
        
        let userEntry = null;

        res.on('searchEntry', (entry) => {
          userEntry = entry.object;
        });

        res.on('end', (result) => {
          if (!userEntry) {
            return resolve(null);
          }
          
          const userClient = ldap.createClient({ url: process.env.LDAP_URL });
          userClient.bind(userEntry.dn, password, (bindErr) => {
            userClient.unbind();
            if (bindErr) {
              return resolve(null);
            }
            
            // Retorna os dados do utilizador, incluindo os grupos
            resolve({
                email: userEntry.mail,
                name: `${userEntry.givenName} ${userEntry.sn}`,
                groups: Array.isArray(userEntry.memberOf) ? userEntry.memberOf : [userEntry.memberOf]
            });
          });
        });

        res.on('error', (err) => {
            logger.error('LDAP Search Result Error:', err);
            reject(new Error('Erro durante a busca no servidor de autenticação.'));
        });
      });
    });
  });
};