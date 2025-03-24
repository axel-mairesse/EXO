const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// ✅ Connexion à MongoDB + démarrage serveur
client.connect().then(() => {
  db = client.db("analyticsDB");
  console.log("✅ Connexion à MongoDB (analyticsDB)");

  app.listen(port, () => {
    console.log(`🚀 Serveur REST-ANALYTICS actif sur http://localhost:${port}`);
  });
});

// 🔁 Liste des ressources analytiques
const resources = ["views", "actions", "goals"];

// 🧠 Générer POST + GET génériques pour views/actions/goals
resources.forEach((resource) => {
  // ➕ POST /views | /actions | /goals
  app.post(`/${resource}`, async (req, res) => {
    try {
      const doc = {
        ...req.body,
        createdAt: new Date()
      };
      const result = await db.collection(resource).insertOne(doc);
      res.status(201).json({ _id: result.insertedId, ...doc });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la création", details: err.message });
    }
  });

  // 📥 GET /views | /actions | /goals
  app.get(`/${resource}`, async (req, res) => {
    try {
      const all = await db.collection(resource).find().toArray();
      res.json(all);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération", details: err.message });
    }
  });
});

// 📊 Route avancée : GET /goals/:goalId/details
app.get("/goals/:goalId/details", async (req, res) => {
  try {
    const goalId = req.params.goalId;

    // Récupérer le goal avec cet ID
    const goal = await db.collection("goals").findOne({ _id: new ObjectId(goalId) });

    if (!goal) {
      return res.status(404).json({ error: "Goal non trouvé" });
    }

    const visitor = goal.visitor;

    // Trouver les views et actions du même visiteur
    const [views, actions] = await Promise.all([
      db.collection("views").find({ visitor }).toArray(),
      db.collection("actions").find({ visitor }).toArray()
    ]);

    res.json({
      goal,
      visitor,
      views,
      actions
    });
  } catch (error) {
    console.error("❌ Erreur GET /goals/:goalId/details :", error);
    res.status(400).json({ error: "ID invalide ou autre erreur", details: error.message });
  }
});
