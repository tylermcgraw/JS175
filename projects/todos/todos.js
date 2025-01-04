const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const TodoList = require("./lib/todolist");
const Todo = require("./lib/todo")
const { sortTodoLists, sortTodos } = require("./lib/sort");
const store = require("connect-loki");

const app = express();
const host = "localhost";
const port = 3000;
const LokiStore = store(session);

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in milliseconds
    path: "/",
    secure: false,
  },
  name: "launch-school-todos-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({}),
}));

// Set up persistent session data
app.use((req, res, next) => {
  let todoLists = [];
  if ("todoLists" in req.session) {
    req.session.todoLists.forEach(todoList => {
      todoLists.push(TodoList.makeTodoList(todoList));
    });
  }

  req.session.todoLists = todoLists;
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

const loadTodoList = (todoLists, todoListId) => {
  return todoLists.find(list => list.id === todoListId);
};

app.get("/", (req, res) => {
  res.redirect("/lists");
});

app.get("/lists", (req, res) => {
  res.render("lists", {
    todoLists: sortTodoLists(req.session.todoLists)
  });
});

// Render new todo list page
app.get("/lists/new", (req, res) => {
  res.render("new-list");
});

// Render existing todo list page
app.get("/lists/:todoListId", (req, res, next) => {
  let todoListId = Number(req.params.todoListId);
  let todoList = loadTodoList(req.session.todoLists, todoListId);

  if (todoList === undefined) {
    next(new Error(`Todo list not found.`));
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList),
    });
  }
});

// Render edit todolist page
app.get("/lists/:todoListId/edit", (req, res, next) => {
  let todoListId = Number(req.params.todoListId);
  let todoList = loadTodoList(req.session.todoLists, todoListId);

  if (todoList === undefined) {
    next(new Error(`Todo list not found.`));
  } else {
    res.render("edit-list", {
      todoList: todoList,
    });
  }
});

// Create a new todolist
app.post("/lists",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("List title is required.")
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters.")
      .custom((title, { req }) => {
        let duplicate = req.session.todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("List title must be unique."),
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("new-list", {
        flash: req.flash(),
        todoListTitle: req.body.todoListTitle,
      });
    } else {
      req.session.todoLists.push(new TodoList(req.body.todoListTitle));
      req.flash("success", "The todo list has been created.");
      res.redirect("/lists");
    }
  }
);

// Create new todo
app.post("/lists/:todoListId/todos",
  [
    body("todoTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Todo title is required.")
      .isLength({ max: 100 })
      .withMessage("Todo title must be between 1 and 100 characters.")
  ],
  (req, res, next) => {
    let errors = validationResult(req);
    let todoListId = Number(req.params.todoListId);
    let todoList = loadTodoList(req.session.todoLists, todoListId);
    let todoTitle = req.body.todoTitle;
    if (todoList === undefined) {
      next(new Error(`Todo list not found.`));
    } else if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("list", {
        flash: req.flash(),
        todoList: todoList,
        todos: sortTodos(todoList),
        todoTitle: todoTitle,
      });
    } else {
      todoList.add(new Todo(todoTitle));
      req.flash("success", `${todoTitle} has been created.`);
      res.redirect(`/lists/${todoListId}`);
    }
  }
);

// Edit todolist
app.post("/lists/:todoListId/edit",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Todo list title is required.")
      .isLength({ max: 100 })
      .withMessage("Todo list title must be between 1 and 100 characters.")
      .custom((title, { req }) => {
        let duplicate = req.session.todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("Todo list title must be unique."),
  ],
  (req, res, next) => {
    let errors = validationResult(req);
    let todoListId = Number(req.params.todoListId);
    let todoList = loadTodoList(req.session.todoLists, todoListId);
    let todoListTitle = req.body.todoListTitle
    if (todoList === undefined) {
      next(new Error(`Todo list not found.`));
    } else if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("edit-list", {
        flash: req.flash(),
        todoList: todoList,
        todoListTitle: todoListTitle,
      });
    } else {
      todoList.setTitle(todoListTitle);
      req.flash("success", "The todo list has been edited.");
      res.redirect(`/lists/${todoListId}`);
    }
  }
);

// Toggle a todo done/undone
app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res, next) => {
  let todoListId = Number(req.params.todoListId);
  let todoList = loadTodoList(req.session.todoLists, todoListId);
  if (todoList === undefined) {
    next(new Error(`Todo list not found.`));
  }
  
  let todoId = Number(req.params.todoId);
  let todo = todoList.findById(todoId);
  if (todo === undefined) {
    next(new Error(`Todo not found.`));
  } else {
    if (todo.isDone()) {
      todo.markUndone();
      req.flash("success", `${todo.title} has been marked NOT done.`);
    } else {
      todo.markDone();
      req.flash("success", `${todo.title} has been marked done.`);
    }
    res.redirect(`/lists/${todoListId}`);
  }
});

// Delete a todo
app.post("/lists/:todoListId/todos/:todoId/destroy", (req, res, next) => {
  let todoListId = Number(req.params.todoListId);
  let todoList = loadTodoList(req.session.todoLists, todoListId);
  if (todoList === undefined) {
    next(new Error(`Todo list not found.`));
  }
  
  let todoId = Number(req.params.todoId);
  let todo = todoList.findById(todoId);
  if (todo === undefined) {
    next(new Error(`Todo not found.`));
  } else {
    todoList.removeAt(todoList.findIndexOf(todo));
    req.flash("success", `${todo.title} has been removed.`);
    res.redirect(`/lists/${todoListId}`);
  }
});

// Mark all todos as done (complete all button)
app.post("/lists/:todoListId/complete_all", (req, res, next) => {
  let todoListId = Number(req.params.todoListId);
  let todoList = loadTodoList(req.session.todoLists, todoListId);

  if (todoList === undefined) {
    next(new Error(`Todo list not found.`));
  } else {
    todoList.markAllDone();
    req.flash("success", `Marked all todos as done.`);
    res.redirect(`/lists/${todoListId}`);
  }
});

// Delete todolist
app.post("/lists/:todoListId/destroy", (req, res, next) => {
  let todoListId = Number(req.params.todoListId);
  let todoList = loadTodoList(req.session.todoLists, todoListId);

  if (todoList === undefined) {
    next(new Error(`Todo list not found.`));
  } else {
    req.session.todoLists.shift(req.session.todoLists.indexOf(todoList));
    req.flash("success", `Deleted ${todoList.title}.`);
    res.redirect(`/lists`);
  }
});

app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});