const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
let db = null;

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

//Get Todos API with query parameters
app.get("/todos/", async (request, response) => {
  const queryParameters = request.query;
  const { search_q = "", status, priority } = queryParameters;
  let getQuery;
  if ("status" in queryParameters) {
    getQuery = `
        SELECT * 
        FROM todo
        WHERE todo LIKE '%${search_q}%' AND status = '${status}'
    `;
  } else if ("priority" in queryParameters) {
    getQuery = `
        SELECT * 
        FROM todo
        WHERE todo LIKE '%${search_q}%' AND priority = '${priority}'
    `;
  } else if ("status" in queryParameters && "priority" in queryParameters) {
    getQuery = `
        SELECT * 
        FROM todo
        WHERE todo LIKE '%${search_q}%' AND (priority = '${priority}' AND status = '${status})
    `;
  } else {
    getQuery = `
        SELECT * 
        FROM todo
        WHERE todo LIKE '%${search_q}%'
    `;
  }

  const todosArray = await db.all(getQuery);
  response.send(todosArray);
});

//Get Todo API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT * 
        FROM todo
        WHERE id = ${todoId};
    `;
  const todoArray = await db.get(getTodoQuery);
  response.send(todoArray);
});

//Post Todo API
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status } = request.body;
  const postTodoQuery = `
        INSERT INTO todo
            (id, todo, priority, status) 
        VALUES
            (${id}, '${todo}', '${priority}','${status}')
    `;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

//Put Todo API
app.put("/todos/:todoId", async (request, response) => {
  const todoDetails = request.body;
  const { todoId } = request.params;

  const getTodoQuery = `
        SELECT * 
        FROM todo
        WHERE id = ${todoId};
    `;
  const previousTodo = await db.get(getTodoQuery);

  const {
    todo = previousTodo.todo,
    status = previousTodo.status,
    priority = previousTodo.priority,
  } = todoDetails;

  let updatedColumn;
  if ("todo" in todoDetails) {
    updatedColumn = "Todo";
  } else if ("status" in todoDetails) {
    updatedColumn = "Status";
  } else if ("priority" in todoDetails) {
    updatedColumn = "Priority";
  }

  const updateTodoQuery = `
    UPDATE todo
    SET 
    todo = '${todo}', 
    status = '${status}', 
    priority = '${priority}'
    WHERE id = ${todoId};
  `;
  await db.run(updateTodoQuery);
  response.send(`${updatedColumn} Updated`);
});

//Delete Todo API
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM todo 
        WHERE id = ${todoId};
    `;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
