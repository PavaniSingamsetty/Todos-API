const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
let db;

app.use(express.json());

const filePath = path.join(__dirname, "todoApplication.db");

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const validateDate = (date) => isValid(new Date(date));

const validateStatus = (status) => {
  const validStatusValues = ["TO DO", "IN PROGRESS", "DONE"];
  return validStatusValues.includes(status);
};

const validatePriority = (priority) => {
  const validPriorityValues = ["HIGH", "MEDIUM", "LOW"];
  return validPriorityValues.includes(priority);
};

const validateCategory = (category) => {
  const validCategoryValues = ["WORK", "HOME", "LEARNING"];
  return validCategoryValues.includes(category);
};

//Get Todos API
app.get("/todos/", async (request, response) => {
  const queryParameters = request.query;
  const { priority, status, category, search_q = "" } = queryParameters;
  let getTodoQuery;
  if ("priority" in queryParameters) {
    const validPriority = await validatePriority(priority);
    if (!validPriority) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else {
      getTodoQuery = `
            SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
            FROM todo
            WHERE priority = '${priority}' AND todo LIKE '%${search_q}%'
        `;
    }
  } else if ("status" in queryParameters) {
    const validStatus = await validateStatus(status);
    if (!validStatus) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else {
      getTodoQuery = `
            SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
            FROM todo
            WHERE status = '${status}' AND todo LIKE '%${search_q}%'
        `;
    }
  } else if ("category" in queryParameters) {
    const validCategory = await validateCategory(category);
    if (!validCategory) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      getTodoQuery = `
            SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
            FROM todo
            WHERE category = '${category}' AND todo LIKE '%${search_q}%'
        `;
    }
  } else if ("status" in queryParameters && "priority" in queryParameters) {
    getTodoQuery = `
            SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
            FROM todo
            WHERE (status = '${status}' AND priority = '${priority}') AND todo LIKE '%${search_q}%'
        `;
  } else if ("status" in queryParameters && "category" in queryParameters) {
    getTodoQuery = `
            SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
            FROM todo
            WHERE (status = '${status}' AND category = '${category}') AND todo LIKE '%${search_q}%'
        `;
  } else if ("priority" in queryParameters && "category" in queryParameters) {
    getTodoQuery = `
            SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
            FROM todo
            WHERE (priority = '${priority}' AND category = '${category}') AND todo LIKE '%${search_q}%'
        `;
  } else {
    getTodoQuery = ` SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
        FROM todo
        WHERE todo LIKE '%${search_q}%'
      `;
  }
  if (getTodoQuery !== undefined) {
    const todosArray = await db.all(getTodoQuery);
    response.send(todosArray);
  }
});

//Get Todo API
app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
        FROM todo
        WHERE id = ${todoId}
    `;

  const todoItem = await db.get(getTodoQuery);
  response.send(todoItem);
});

//Get Agenda API
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const validDate = await validateDate(date);
  if (!validDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    const getAgendaQuery = `
        SELECT id as id, todo as todo, priority as priority, status as status, category as category, due_date as dueDate
        FROM todo
        WHERE due_date = '${formattedDate}'
    `;

    const todoAgendaArray = await db.all(getAgendaQuery);
    response.send(todoAgendaArray);
  }
});

//Post Todo API
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const validDate = await validateDate(dueDate);
  const validStatus = await validateStatus(status);
  const validPriority = await validatePriority(priority);
  const validCategory = await validateCategory(category);
  if (!validDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else if (!validStatus) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!validPriority) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!validCategory) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
    const postTodoQuery = `
        INSERT INTO todo 
        (id, todo, priority, status, category, due_date)
        VALUES
        (${id}, '${todo}','${priority}','${status}','${category}','${formattedDate}')
    `;

    await db.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
});

//Put Todo API
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoDetails = request.body;
  const getTodoQuery = `
        SELECT *
        FROM todo
        WHERE id = ${todoId}
    `;
  const previousTodo = await db.get(getTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = todoDetails;

  const validDate = await validateDate(dueDate);
  const validStatus = await validateStatus(status);
  const validPriority = await validatePriority(priority);
  const validCategory = await validateCategory(category);
  if (!validDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else if (!validStatus) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!validPriority) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!validCategory) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");

    let updatedColumn;
    if ("priority" in todoDetails) {
      updatedColumn = "Priority";
    } else if ("status" in todoDetails) {
      updatedColumn = "Status";
    } else if ("category" in todoDetails) {
      updatedColumn = "Category";
    } else if ("todo" in todoDetails) {
      updatedColumn = "Todo";
    } else if ("dueDate" in todoDetails) {
      updatedColumn = "Due Date";
    }

    const updateTodoQuery = `
    UPDATE todo
    SET 
        todo = '${todo}', 
        priority = '${priority}', 
        status = '${status}', 
        category = '${category}', 
        due_date = '${formattedDate}'
    WHERE id = ${todoId}
  `;
    await db.run(updateTodoQuery);
    response.send(`${updatedColumn} Updated`);
  }
});

//Delete Todo API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoquery = `
        DELETE FROM todo
        WHERE id = ${todoId}
    `;

  await db.run(deleteTodoquery);
  response.send("Todo Deleted");
});

module.exports = app;
