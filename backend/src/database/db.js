import pg from 'pg';
import 'dotenv/config';

// O cliente pg lê a variável de ambiente DATABASE_URL automaticamente.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // A configuração de SSL é geralmente necessária para conexões com serviços em nuvem como o Neon.
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Testa a conexão com o banco de dados.
 * A aplicação será encerrada se a conexão falhar.
 */
export async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    process.exit(1); // Encerra a aplicação se não puder conectar ao DB
  } finally {
    // Libera o cliente de volta para o pool de conexões
    if (client) {
      client.release();
    }
  }
}

// Exporta o pool para que possamos usá-lo para fazer queries em outros arquivos.
export default pool;