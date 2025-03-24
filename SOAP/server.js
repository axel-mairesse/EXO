const soap = require("soap");
const fs = require("fs");
const http = require("http");
const postgres = require("postgres");

// Connexion à la base de données PostgreSQL
const sql = postgres({
  host: "localhost", // Utilise "postgres" si tu es dans Docker avec un réseau personnalisé
  port: 5432,
  database: "mydb",
  username: "user",
  password: "password",
});

// Définition du service SOAP
const service = {
  ProductsService: {
    ProductsPort: {
      CreateProduct: async function ({ name, about, price }, callback) {
        try {
          // Validation des champs
          if (!name || !about || !price) {
            throw {
              Fault: {
                Code: {
                  Value: "soap:Sender",
                  Subcode: { value: "rpc:BadArguments" },
                },
                Reason: { Text: "Missing required fields: name, about, or price." },
                statusCode: 400, // Bad Request
              },
            };
          }

          // Insertion du produit dans PostgreSQL
          const product = await sql`
            INSERT INTO products (name, about, price)
            VALUES (${name}, ${about}, ${price})
            RETURNING *
          `;

          console.log("Produit inséré :", product[0]);

          // Retourner le produit inséré
          callback(null, product[0]);

        } catch (error) {
          console.error("Erreur lors de l'insertion du produit :", error);

          // Gestion des erreurs
          throw {
            Fault: {
              Code: {
                Value: "soap:Server",
                Subcode: { value: "rpc:DatabaseError" },
              },
              Reason: { Text: "Database error occurred." },
              Detail: error.message,
              statusCode: 500, // Internal Server Error
            },
          };
        }
      },
    },
  },
};

// Création du serveur HTTP
const server = http.createServer((req, res) => {
  res.end("404: Not Found: " + req.url);
});

server.listen(8000, () => {
  console.log("Serveur HTTP démarré sur le port 8000");
});

// Lecture du fichier WSDL
const wsdlPath = __dirname + "/productsService.wsdl";
const xml = fs.readFileSync(wsdlPath, "utf8");

// Création du serveur SOAP
soap.listen(server, "/products", service, xml, () => {
  console.log("SOAP server running at http://localhost:8000/products?wsdl");
});
