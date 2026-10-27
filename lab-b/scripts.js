const STORAGE_KEY = "todo-tasks";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let editingIndex = null;

const taskList = document.querySelector("#task-list");
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const dueDateInput = document.querySelector("#due-date-input");
const searchInput = document.querySelector("#search-input");
const formError = document.querySelector("#form-error");
const editError = document.querySelector("#edit-error");
const taskTemplate = document.querySelector("#task-template");
const editTemplate = document.querySelector("#edit-template");

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTask(text, dueDate) {
  return { text, dueDate };
}

function validateTask(text, dueDate) {
    if (text.length < 3 || text.length > 255) {
        return "Zadanie musi mieć od 3 do 255 znaków.";
    }
    if (dueDate && new Date(dueDate).getTime() <= Date.now()) {
        return "Termin musi przypadać w przyszłości.";
    }
    return "";
}

function displayTasks() {
    const query = searchInput.value.trim();
    const visibleTasks = tasks
        .map((task, index) => ({ task, index }))
        .filter(({ task }) => query.length < 2 || task.text.toLowerCase().includes(query.toLowerCase()));

    taskList.replaceChildren();

    visibleTasks.forEach(({ task, index }) => {
        if (index === editingIndex) {
            const row = editTemplate.content.firstElementChild.cloneNode(true);
            row.dataset.index = index;
            row.querySelector(".edit-text").value = task.text;
            row.querySelector(".edit-date").value = task.dueDate;
            taskList.appendChild(row);
            return;
        }

        const row = taskTemplate.content.firstElementChild.cloneNode(true);
        row.dataset.index = index;

        const taskText = row.querySelector(".task-text");
        const matchIndex = query.length >= 2
            ? task.text.toLowerCase().indexOf(query.toLowerCase())
            : -1;

        if (matchIndex === -1) {
            taskText.textContent = task.text;
        } else {
            const match = document.createElement("mark");
            match.textContent = task.text.slice(matchIndex, matchIndex + query.length);
            taskText.append(
                document.createTextNode(task.text.slice(0, matchIndex)),
                match,
                document.createTextNode(task.text.slice(matchIndex + query.length))
            );
        }

        const date = row.querySelector(".task-date");
        date.hidden = !task.dueDate;
        date.dateTime = task.dueDate;
        date.textContent = task.dueDate.replace("T", " ");
        row.querySelector(".delete-button").setAttribute("aria-label", `Usuń zadanie: ${task.text}`);
        taskList.appendChild(row);
    });

    if (visibleTasks.length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = query.length >= 2
            ? "Brak zadań pasujących do wyszukiwania."
            : "Nie masz jeszcze żadnych zadań.";
        taskList.appendChild(emptyMessage);
    }
}

function saveEdit() {
    const row = taskList.querySelector(`[data-index="${editingIndex}"]`);
    const text = row.querySelector(".edit-text").value.trim();
    const dueDate = row.querySelector(".edit-date").value;
    editError.textContent = validateTask(text, dueDate);
    if (editError.textContent) {
        return false;
    }

    tasks[editingIndex] = createTask(text, dueDate);
    editingIndex = null;
    saveTasks();
    displayTasks();
    return true;
}

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    const dueDate = dueDateInput.value;
    formError.textContent = validateTask(text, dueDate);
    if (formError.textContent) {
        return;
    }

    tasks.push(createTask(text, dueDate));
    saveTasks();
    taskForm.reset();
    displayTasks();
});

taskList.addEventListener("click", (event) => {
    const row = event.target.closest(".task-row");
    if (!row) return;

    const index = Number(row.dataset.index);
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (editingIndex !== null && editingIndex !== index && !saveEdit()) return;

    if (action === "delete") {
        tasks.splice(index, 1);
        saveTasks();
        displayTasks();
    } else if (action === "save") {
        saveEdit();
    } else if (editingIndex !== index) {
        editingIndex = index;
        editError.textContent = "";
        displayTasks();
        taskList.querySelector(".edit-text").focus();
    }
});

document.addEventListener("click", (event) => {
    if (editingIndex !== null && !event.target.closest(".task-row")) {
        saveEdit();
    }
});

searchInput.addEventListener("input", () => {
    if (editingIndex !== null && !saveEdit()) return;
    displayTasks();
});

taskList.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches(".edit-text, .edit-date")) {
        event.preventDefault();
        saveEdit();
    }
    if (event.key === "Escape" && editingIndex !== null) {
        editingIndex = null;
        editError.textContent = "";
        displayTasks();
    }
});

taskForm.addEventListener("input", () => {
    formError.textContent = "";
});

taskList.addEventListener("input", () => {
    editError.textContent = "";
});

displayTasks();
// kod wygenerowany
