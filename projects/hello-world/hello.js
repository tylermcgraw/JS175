const express = require("express");
const morgan = require("morgan");
const app = express();

app.set("views", "./views");
app.set("view engine", "pug");

app.use(express.static("public"));
app.use(morgan("common"));

app.get("/", (req, res) => {
  res.redirect("/english");
});

app.get("/english", (req, res) => {
  res.render("hello-world-english");
});

app.get("/french", (req, res) => {
  res.render("hello-world-french");
});

app.get("/serbian", (req, res) => {
  res.render("hello-world-serbian");
});

app.listen(3000, "localhost", () => {
  console.log("Listening to port 3000.");
});