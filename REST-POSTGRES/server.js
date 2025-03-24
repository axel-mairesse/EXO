const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
 // tout en haut du fichier
const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto"); // ✅ Import unique
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger"); // si tu as le fichier séparé


const app = express();
const port = 8000;



// ✅ Connexion correcte à PostgreSQL
const sql = postgres({
  host: "localhost",
  port: 5432,
  database: "mydb", // ✅ Correction ici (db ➝ database)
  username: "user",
  password: "password",
});

// ✅ Middleware JSON
app.use(express.json());

// ✅ Schéma de validation avec Zod
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ id: true });

// ✅ Route pour ajouter un produit
app.post("/products", async (req, res) => {
  try {
    const result = CreateProductSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const { name, about, price } = result.data;
    const product = await sql`
      INSERT INTO products (name, about, price)
      VALUES (${name}, ${about}, ${price})
      RETURNING *;
    `;

    res.status(201).json(product[0]);
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// ✅ Route pour récupérer tous les produits
app.get("/products", async (req, res) => {
  try {
    const products = await sql`SELECT * FROM products;`;
    res.json(products);
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Route pour récupérer un produit par ID
app.get("/products/:id", async (req, res) => {
  try {
    const product = await sql`SELECT * FROM products WHERE id=${req.params.id}`;

    if (product.length > 0) {
      res.json(product[0]);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Route pour supprimer un produit
app.delete("/products/:id", async (req, res) => {
  try {
    const product = await sql`DELETE FROM products WHERE id=${req.params.id} RETURNING *`;

    if (product.length > 0) {
      res.json(product[0]);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Fonction pour hacher les mots de passe avec SHA-512
const hashPassword = (password) => {
  return crypto.createHash("sha512").update(password).digest("hex");
};

// ✅ Route pour créer un utilisateur
app.post("/users", async (req, res) => {
  try {
    console.log("📩 Requête reçue avec le body :", req.body);

    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields: username, email, password." });
    }

    const hashedPassword = hashPassword(password);
    const user = await sql`
      INSERT INTO users (username, email, password)
      VALUES (${username}, ${email}, ${hashedPassword})
      RETURNING id, username, email;
    `;

    console.log("✅ Utilisateur créé :", user[0]);
    res.status(201).json(user[0]); // Retourne l'utilisateur sans le mot de passe

  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// ✅ Route pour récupérer un utilisateur par ID
app.get("/users/:id", async (req, res) => {
  try {
    const user = await sql`SELECT id, username, email FROM users WHERE id=${req.params.id}`;

    if (user.length > 0) {
      res.json(user[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Route pour mettre à jour un utilisateur (PUT)
app.put("/users/:id", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields: username, email, password." });
    }

    const hashedPassword = hashPassword(password);
    const result = await sql`
      UPDATE users
      SET username=${username}, email=${email}, password=${hashedPassword}
      WHERE id=${req.params.id}
      RETURNING id, username, email;
    `;

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Route pour mettre à jour partiellement un utilisateur (PATCH)
app.patch("/users/:id", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const fieldsToUpdate = [];

    if (username) fieldsToUpdate.push(sql`username=${username}`);
    if (email) fieldsToUpdate.push(sql`email=${email}`);
    if (password) fieldsToUpdate.push(sql`password=${hashPassword(password)}`);

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    const result = await sql`
      UPDATE users
      SET ${sql.join(fieldsToUpdate, sql`, `)}
      WHERE id=${req.params.id}
      RETURNING id, username, email;
    `;

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("❌ ERREUR PostgreSQL :", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ GET /f2p-games — Liste tous les jeux
app.get("/f2p-games", async (req, res) => {
  try {
    const response = await fetch("https://www.freetogame.com/api/games");
    const games = await response.json();

    res.json(games);
  } catch (error) {
    console.error("Erreur FreeToGame :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des jeux" });
  }
});

// ✅ GET /f2p-games/:id — Détail d’un jeu
app.get("/f2p-games", async (req, res) => {
  try {
    const response = await fetch("https://www.freetogame.com/api/games");

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const games = await response.json();
    res.json(games);
  } catch (error) {
    console.error("❌ Erreur FreeToGame :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des jeux", details: error.message });
  }
});

app.get("/f2p-games/:id", async (req, res) => {
  try {
    const gameId = req.params.id;

    const response = await fetch(`https://www.freetogame.com/api/game?id=${gameId}`);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const game = await response.json();

    // L'API renvoie un objet vide ou message si l'ID est invalide
    if (!game || game.status === 0 || game.message === "Game not found") {
      return res.status(404).json({ message: "Jeu non trouvé" });
    }

    res.json(game);
  } catch (error) {
    console.error("❌ Erreur GET /f2p-games/:id :", error);
    res.status(500).json({ error: "Erreur lors de la récupération du jeu", details: error.message });
  }
});


app.get("/products", async (req, res) => {
  try {
    const { name, about, price } = req.query;

    const conditions = [];

    if (name) {
      conditions.push(sql`name ILIKE ${'%' + name + '%'}`);
    }

    if (about) {
      conditions.push(sql`about ILIKE ${'%' + about + '%'}`);
    }

    if (price && !isNaN(parseFloat(price))) {
      conditions.push(sql`price <= ${parseFloat(price)}`);
    }

    const products = conditions.length > 0
      ? await sql`SELECT * FROM products WHERE ${sql.join(conditions, sql` AND `)}`
      : await sql`SELECT * FROM products`;

    res.json(products);

  } catch (error) {
    console.error("❌ Erreur filtre produits :", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});


app.post("/orders", async (req, res) => {
  try {
    const { userId, productIds } = req.body;

    if (!userId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "userId et productIds requis" });
    }

    // Vérifier que l'utilisateur existe
    const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
    if (user.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Récupérer les produits
    const products = await sql`
      SELECT * FROM products WHERE id = ANY(${productIds})
    `;

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: "Un ou plusieurs produits sont invalides" });
    }

    // Calcul du total TTC
    const totalHT = products.reduce((sum, p) => sum + parseFloat(p.price), 0);
    const total = totalHT * 1.2;

    const [order] = await sql`
      INSERT INTO orders (userId, productIds, total)
      VALUES (${userId}, ${productIds}, ${total})
      RETURNING *;
    `;

    res.status(201).json({ ...order, user: user[0], products });

  } catch (error) {
    console.error("❌ Erreur création commande :", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});


app.get("/orders", async (req, res) => {
  try {
    const orders = await sql`SELECT * FROM orders`;

    const fullOrders = await Promise.all(orders.map(async (order) => {
      const user = await sql`SELECT id, username, email FROM users WHERE id = ${order.userid}`;
      const products = await sql`SELECT * FROM products WHERE id = ANY(${order.productids})`;

      return { ...order, user: user[0], products };
    }));

    res.json(fullOrders);
  } catch (error) {
    console.error("❌ Erreur récupération commandes :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.get("/orders/:id", async (req, res) => {
  try {
    const [order] = await sql`SELECT * FROM orders WHERE id = ${req.params.id}`;
    if (!order) return res.status(404).json({ error: "Commande non trouvée" });

    const user = await sql`SELECT id, username, email FROM users WHERE id = ${order.userid}`;
    const products = await sql`SELECT * FROM products WHERE id = ANY(${order.productids})`;

    res.json({ ...order, user: user[0], products });

  } catch (error) {
    console.error("❌ Erreur récupération commande :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.patch("/orders/:id", async (req, res) => {
  try {
    const updates = [];
    const { productIds, payment } = req.body;

    if (productIds) {
      // recalculer total avec les nouveaux produits
      const products = await sql`SELECT * FROM products WHERE id = ANY(${productIds})`;
      const total = products.reduce((sum, p) => sum + parseFloat(p.price), 0) * 1.2;

      updates.push(sql`productIds = ${productIds}`);
      updates.push(sql`total = ${total}`);
    }

    if (typeof payment === "boolean") {
      updates.push(sql`payment = ${payment}`);
    }

    updates.push(sql`updatedAt = NOW()`);

    const result = await sql`
      UPDATE orders
      SET ${sql.join(updates, sql`, `)}
      WHERE id = ${req.params.id}
      RETURNING *;
    `;

    res.json(result[0]);
  } catch (error) {
    console.error("❌ Erreur update commande :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.delete("/orders/:id", async (req, res) => {
  try {
    const result = await sql`DELETE FROM orders WHERE id = ${req.params.id} RETURNING *`;
    if (result.length === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }
    res.json({ message: "Commande supprimée", deleted: result[0] });
  } catch (error) {
    console.error("❌ Erreur suppression commande :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.post("/reviews", async (req, res) => {
  try {
    const { userId, productId, score, content } = req.body;

    if (!userId || !productId || !score || !content) {
      return res.status(400).json({ error: "Champs requis : userId, productId, score, content" });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ error: "Score doit être entre 1 et 5" });
    }

    const [review] = await sql`
      INSERT INTO reviews (userId, productId, score, content)
      VALUES (${userId}, ${productId}, ${score}, ${content})
      RETURNING *;
    `;

    // 🔄 Mise à jour du produit : ajouter l'id de review + recalculer la moyenne
    await sql`
      UPDATE products
      SET reviewIds = array_append(reviewIds, ${review.id})
      WHERE id = ${productId}
    `;

    const avgResult = await sql`
      SELECT AVG(score)::NUMERIC(3,2) as avg FROM reviews WHERE productId = ${productId}
    `;

    const avg = avgResult[0].avg || 0;

    await sql`
      UPDATE products
      SET averageScore = ${avg}
      WHERE id = ${productId}
    `;

    res.status(201).json(review);
  } catch (error) {
    console.error("❌ Erreur création review :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const [product] = await sql`SELECT * FROM products WHERE id = ${req.params.id}`;
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });

    const reviews = await sql`
      SELECT * FROM reviews WHERE productId = ${req.params.id}
    `;

    res.json({ ...product, reviews });
  } catch (error) {
    console.error("❌ Erreur GET /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const [product] = await sql`SELECT * FROM products WHERE id = ${req.params.id}`;
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });

    const reviews = await sql`
      SELECT * FROM reviews WHERE productId = ${req.params.id}
    `;

    res.json({ ...product, reviews });
  } catch (error) {
    console.error("❌ Erreur GET /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.get("/products/:id", async (req, res) => {
  try {
    const [product] = await sql`SELECT * FROM products WHERE id = ${req.params.id}`;
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });

    const reviews = await sql`
      SELECT * FROM reviews WHERE productId = ${req.params.id}
    `;

    res.json({ ...product, reviews });
  } catch (error) {
    console.error("❌ Erreur GET /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



app.get("/products/:id", async (req, res) => {
  try {
    const [product] = await sql`SELECT * FROM products WHERE id = ${req.params.id}`;
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });

    const reviews = await sql`
      SELECT * FROM reviews WHERE productId = ${req.params.id}
    `;

    res.json({ ...product, reviews });
  } catch (error) {
    console.error("❌ Erreur GET /products/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
/**
 * @swagger
 * /products:
 *   get:
 *     summary: Liste tous les produits (avec recherche possible)
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtrer par nom
 *       - in: query
 *         name: about
 *         schema:
 *           type: string
 *         description: Filtrer par description
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Prix max
 *     responses:
 *       200:
 *         description: Liste des produits
 */
app.get("/products", async (req, res) => {
  // ...
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Créer une commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - productIds
 *             properties:
 *               userId:
 *                 type: integer
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Commande créée
 *       400:
 *         description: Champs manquants ou invalides
 */



// ✅ Démarrer le serveur
app.listen(port, () => {
  console.log(`✅ Serveur en cours d'exécution : http://localhost:${port}`);
});
