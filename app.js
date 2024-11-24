const express = require("express");
const NodeCache = require("node-cache");
const redis = require("redis");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const localCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const redisClient = redis.createClient();
redisClient.connect();
redisClient.on("error", (err) => console.error("Redis error:", err));
app.use("/static", express.static("static"));

app.get("/products/:productId", async (req, res) => {
  const productId = req.params.productId;

  const cachedProduct = localCache.get(productId);
  if (cachedProduct) {
    return res.json({ ...cachedProduct, source: "local-cache" });
  }

  const redisProduct = await redisClient.get(productId);
  if (redisProduct) {
    localCache.set(productId, JSON.parse(redisProduct));
    return res.json({ ...JSON.parse(redisProduct), source: "redis-cache" });
  }

  const product = { id: productId, name: `${productId} name` };
  setTimeout(() => {
    localCache.set(productId, product);
    redisClient.set(productId, JSON.stringify(product));
    res.json({ ...product, source: "database" });
  }, 2000);
});

app.get("/static/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "static", filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("File not found");
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
