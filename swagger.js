const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lacque API',
      version: '1.0.0',
      description: 'Lacquer API',
    },
    servers: [
      {
        url: 'http://localhost:3000', // or your deployed URL
      },
    ],
  },
  apis: ['./routes/*.js', './controller/*.js'], // path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};