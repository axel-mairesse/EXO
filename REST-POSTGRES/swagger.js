const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marketplace API",
      version: "1.0.0",
      description: "API RESTful pour produits, utilisateurs, commandes et avis",
    },
    servers: [
      {
        url: "http://localhost:8000",
        description: "Serveur local",
      },
    ],
  },
  apis: ["./server.js"], // ou "./routes/*.js" si tu as séparé
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
