const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
  });

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});

const User = mongoose.model("User", userSchema);

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const newUser = new User({ username });
  const savedUser = await newUser.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });

  const dateToSave = date ? new Date(date) : new Date();
  if (isNaN(dateToSave.getTime())) dateToSave = new Date();

  const newExercise = new Exercise({
    userId: user._id,
    description,
    duration: Number(duration),
    date: dateToSave,
  });

  const savedExercise = await newExercise.save();

  res.json({
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString(),
    _id: user._id,
  });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });

  const { from, to, limit } = req.query;
  const filter = { userId: userId };

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const exercises = await Exercise.find(filter).limit(Number(limit) || 0);
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises.map((ex) => {
      return {
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      };
    }),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
