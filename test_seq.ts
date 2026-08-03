import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('sqlite::memory:');

async function test() {
  await sequelize.query('CREATE TABLE Products (name TEXT, description TEXT, deletedAt TEXT)');
  await sequelize.query('INSERT INTO Products VALUES ("apple", "a red fruit", NULL)');
  
  const criteria = 'app';
  const result = await sequelize.query('SELECT * FROM Products WHERE ((name LIKE :criteria OR description LIKE :criteria) AND deletedAt IS NULL) ORDER BY name', { replacements: { criteria: `%${criteria}%` } });
  console.log('Result is Array?', Array.isArray(result));
  console.log('Result length:', result.length);
  console.log('Result[0]:', result[0]);
  console.log('Result[1]:', result[1]);
}

test();
