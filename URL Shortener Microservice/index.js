require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dns = require("dns");

app.use(bodyParser.urlencoded({ extended: false }));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
    unique: true,
  },
});

const Url = mongoose.model("Url", urlSchema);

function extractHostname(url) {
  const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/:]+)/);
  return match ? match[1] : null;
}

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.post("/api/shorturl", function (req, res) {
  const originalUrl = req.body.url;
  const urlPattern = /^https?:\/\/(www\.)?[^ "]+$/;
  if (!urlPattern.test(originalUrl)) {
    return res.json({ error: "invalid url" });
  }

  const hostname = extractHostname(originalUrl);
  if (!hostname) return res.json({ error: "invalid url" });

  dns.lookup(hostname, async (err) => {
    if (err) return res.json({ error: "invalid url" });
    const existingUrl = await Url.findOne({ original_url: originalUrl });
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    } else {
      const count = await Url.countDocuments();
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: count + 1,
      });
      await newUrl.save();
      return res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    }
  });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shortUrl = req.params.short_url;
  const urlEntry = await Url.findOne({ short_url: shortUrl });
  if (!urlEntry)
    return res.json({ error: "No short URL found for the given input" });
  res.redirect(urlEntry.original_url);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
