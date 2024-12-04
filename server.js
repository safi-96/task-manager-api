const { ApolloServer, gql } = require('apollo-server-lambda');
const { Pool } = require('pg');

require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// GraphQL schema
const typeDefs = gql`
  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    created_at: String!
  }

  type Query {
    tasks: [Task!]
    task(id: ID!): Task
  }

  type Mutation {
    createTask(title: String!, description: String): Task
    updateTask(id: ID!, title: String, description: String, status: String): Task
    deleteTask(id: ID!): String
  }
`;

// Resolvers
const resolvers = {
  Query: {
    tasks: async () => {
      const { rows } = await pool.query('SELECT * FROM tasks');
      return rows;
    },
    task: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      return rows[0];
    },
  },
  Mutation: {
    createTask: async (_, { title, description }) => {
      const { rows } = await pool.query(
        'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
        [title, description]
      );
      return rows[0];
    },
    updateTask: async (_, { id, title, description, status }) => {
      const { rows } = await pool.query(
        `UPDATE tasks
         SET title = COALESCE($2, title),
             description = COALESCE($3, description),
             status = COALESCE($4, status)
         WHERE id = $1
         RETURNING *`,
        [id, title, description, status]
      );
      return rows[0];
    },
    deleteTask: async (_, { id }) => {
      await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      return `Task with ID ${id} deleted successfully`;
    },
  },
};

// Create server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
});

// Export the handler
exports.handler = server.createHandler();
