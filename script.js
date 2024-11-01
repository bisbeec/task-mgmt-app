// Elements
const createTaskButton = document.getElementById('createTaskButton');
const createBoardButton = document.getElementById('createBoardButton');
const addTaskModal = document.getElementById('addTaskModal');
const closeAddTask = document.getElementById('closeAddTask');
const addTaskButton = document.getElementById('addTaskButton');
const taskDetailsModal = document.getElementById('taskDetailsModal');
const closeTaskDetails = document.getElementById('closeTaskDetails');
const subtasksContainer = document.getElementById('subtasksContainer');
const addSubtaskButton = document.getElementById('addSubtaskButton');
const asideNav = document.querySelector('.aside-nav ul');

// Function to save boards data to localStorage
function saveBoardsToLocalStorage() {
    localStorage.setItem('boards', JSON.stringify(boards));
}

// Function to load boards data from localStorage
function loadBoardsFromLocalStorage() {
    const savedBoards = localStorage.getItem('boards');
    if (savedBoards) {
        boards = JSON.parse(savedBoards);
    } else {
        boards = { 'Project 1': [] };  // Default if no data found
    }
}

// Current board tracking
let boards;
let currentBoard = 'Project 1';
loadBoardsFromLocalStorage();

// Generate a unique ID for each task
function generateTaskId() {
    return `task-${Math.random().toString(36).substr(2, 9)}`;
}

// Function to add a new board
function addNewBoard(boardName) {
    if (!boards[boardName]) {
        boards[boardName] = [];
        const newBoardElement = document.createElement('li');
        newBoardElement.innerHTML = `
            <a href="#">${boardName}</a>
            <button class="delete-board" onclick="deleteBoard('${boardName}')">
                <i class="fas fa-trash" title="Delete board">
                    <span class="sr-only">Delete board</span>
                </i>
            </button>
        `;

        newBoardElement.querySelector('a').onclick = (e) => {
            e.preventDefault();
            setCurrentBoard(boardName);
        };

        asideNav.appendChild(newBoardElement);

        saveBoardsToLocalStorage();  // Save to localStorage
    }
}

// Function to delete a board
function deleteBoard(boardName) {
    if (confirm(`Are you sure you want to delete the board "${boardName}" and all its tasks?`)) {
        delete boards[boardName];
        const boardElement = Array.from(asideNav.children).find(li => 
            li.querySelector('a').textContent === boardName
        );
        if (boardElement) boardElement.remove();

        if (currentBoard === boardName) {
            currentBoard = Object.keys(boards)[0] || null;
            if (currentBoard) {
                setCurrentBoard(currentBoard);
            } else {
                addTaskButton.disabled = true;
                document.querySelector('.header h1').innerText = "No Project Selected";
                document.querySelectorAll('.column').forEach(col => col.innerHTML = '');
            }
        }

        saveBoardsToLocalStorage();  // Save to localStorage
    }
}

// Set the current board, update active class, and refresh tasks
function setCurrentBoard(boardName) {
    currentBoard = boardName;
    document.querySelector('.header h1').innerText = boardName;

    document.querySelectorAll('.column').forEach(col => {
        col.innerHTML = `<h2 class="column-cat">${col.dataset.status.charAt(0).toUpperCase() + col.dataset.status.slice(1)}</h2>`;
        col.addEventListener('dragover', handleDragOver);
        col.addEventListener('drop', handleDrop);
    });

    asideNav.querySelectorAll('a').forEach(link => {
        link.classList.toggle('active', link.textContent === boardName);
    });

    loadTasksForCurrentBoard();
    updateColumnTaskCounts();
    saveBoardsToLocalStorage();  // Save to localStorage
}

function loadTasksForCurrentBoard() {
    const boardTasks = boards[currentBoard];
    boardTasks.forEach(task => addTaskToColumn(task));
}

// Enable dragging on task cards and allow task reordering within a column
function addTaskToColumn(task) {
    const column = document.querySelector(`.column[data-status="${task.status}"]`);
    const taskElement = document.createElement('div');
    taskElement.className = 'task-card';
    taskElement.draggable = true;
    taskElement.dataset.taskId = task.id;

    const subtaskCount = task.subtasks.length;
    taskElement.innerHTML = `
        <h3>${task.title}</h3>
        <p>${subtaskCount} Subtask${subtaskCount !== 1 ? 's' : ''}</p>
    `;

    taskElement.addEventListener('click', () => openTaskDetails(task.id));

    // Add drag events to task card for within-column reordering
    taskElement.addEventListener('dragstart', handleDragStart);
    taskElement.addEventListener('dragover', handleDragOverWithinColumn);
    taskElement.addEventListener('drop', (event) => handleDropWithinColumn(event, task.id));
    taskElement.addEventListener('dragenter', (event) => event.preventDefault()); // Prevent default to allow drop

    column.appendChild(taskElement);
}

// "Create Task" button functionality with title validation
createTaskButton.onclick = () => {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value;
    const status = document.getElementById('taskStatus').value;

    if (!title) {
        alert("Please enter a title for the task.");
        return;
    }

    const subtasks = Array.from(document.querySelectorAll('.subtask-input')).map(input => ({
        title: input.value,
        completed: false
    }));

    const task = { id: generateTaskId(), title, description, subtasks, status };
    boards[currentBoard].push(task);
    addTaskToColumn(task);
    addTaskModal.classList.add('hidden');
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    subtasksContainer.innerHTML = '';

    updateColumnTaskCounts();
    saveBoardsToLocalStorage();  // Save to localStorage
};

// "Create New Board" button functionality
createBoardButton.onclick = () => {
    const boardName = prompt('Enter a name for the new board');
    if (boardName) {
        addNewBoard(boardName);
        setCurrentBoard(boardName);
        addTaskButton.disabled = false;
    }
};

// Show "Add New Task" modal and set focus on the task title field
addTaskButton.onclick = () => {
    addTaskModal.classList.remove('hidden');
    document.getElementById('taskTitle').focus();
};

// Close modals when clicking outside modal content
addTaskModal.addEventListener('click', (event) => {
    if (event.target === addTaskModal) {
        addTaskModal.classList.add('hidden');
    }
});
taskDetailsModal.addEventListener('click', (event) => {
    if (event.target === taskDetailsModal) {
        saveTaskChangesFromModal();  // Save changes before hiding the modal
        taskDetailsModal.classList.add('hidden');
    }
});

// Close modals with 'X' button
closeAddTask.onclick = () => addTaskModal.classList.add('hidden');
closeTaskDetails.onclick = () => taskDetailsModal.classList.add('hidden');

// Function to add subtasks in the "Add Task" modal
addSubtaskButton.onclick = () => {
    const subtaskInput = document.createElement('input');
    subtaskInput.type = 'text';
    subtaskInput.className = 'subtask-input';
    subtaskInput.placeholder = 'Subtask title';
    subtasksContainer.appendChild(subtaskInput);
};

// Function to update the column task counts
function updateColumnTaskCounts() {
    document.querySelectorAll('.column').forEach(column => {
        const status = column.dataset.status;
        const taskCount = boards[currentBoard].filter(task => task.status === status).length;
        const columnHeader = column.querySelector('.column-cat');
        columnHeader.innerText = `${status.charAt(0).toUpperCase() + status.slice(1)} (${taskCount})`;
    });
}

// Open task details modal
function openTaskDetails(taskId) {
    const task = boards[currentBoard].find(t => t.id === taskId);
    if (!task) return; // Exit if task is not found

    taskDetailsModal.setAttribute('data-task-id', taskId);

    const modalTaskTitle = document.getElementById('modalTaskTitle');
    const modalTaskDescription = document.getElementById('modalTaskDescription');
    const subtasksList = document.getElementById('modalSubtasks');
    const modalContent = taskDetailsModal.querySelector('.modal-content');

    modalTaskTitle.innerHTML = `<input type="text" value="${task.title}" id="editTaskTitle">`;
    modalTaskDescription.innerHTML = `<textarea id="editTaskDescription">${task.description}</textarea>`;

    function renderSubtasks() {
        subtasksList.innerHTML = task.subtasks.map((subtask, index) => `
            <li class="${subtask.completed ? 'completed' : ''}">
                <input type="checkbox" ${subtask.completed ? 'checked' : ''} data-index="${index}">
                <input type="text" value="${subtask.title}" class="edit-subtask">
                <i class="fas fa-trash delete-subtask" data-index="${index}"></i>
            </li>
        `).join('');

        subtasksList.querySelectorAll('.delete-subtask').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                task.subtasks.splice(index, 1);
                renderSubtasks();
            });
        });

        subtasksList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const li = e.target.closest('li');
                li.classList.toggle('completed', e.target.checked);
                task.subtasks[e.target.dataset.index].completed = e.target.checked;
            });
        });
    }

    renderSubtasks();

    const existingButtons = modalContent.querySelectorAll('.btn--white, .delete-task-btn');
    existingButtons.forEach(button => button.remove());

    const addSubtaskButton = document.createElement('button');
    addSubtaskButton.innerText = "+ Add New Subtask";
    addSubtaskButton.classList.add('btn', 'btn--white');
    addSubtaskButton.onclick = () => {
        task.subtasks.push({ title: '', completed: false });
        renderSubtasks();
    };
    subtasksList.parentNode.insertBefore(addSubtaskButton, subtasksList.nextSibling);

    const deleteButton = document.createElement('button');
    deleteButton.innerText = "Delete Task";
    deleteButton.classList.add('btn', 'delete-task-btn');
    deleteButton.onclick = () => deleteTask(task);
    modalContent.appendChild(deleteButton);

    taskDetailsModal.classList.remove('hidden');
}

// Function to save task changes
function saveTaskChangesFromModal() {
    const taskId = taskDetailsModal.getAttribute('data-task-id');
    const task = boards[currentBoard].find(t => t.id === taskId);
    if (!task) return;

    task.title = document.getElementById('editTaskTitle').value;
    task.description = document.getElementById('editTaskDescription').value;

    task.subtasks = Array.from(document.querySelectorAll('#modalSubtasks li')).map(li => ({
        title: li.querySelector('.edit-subtask').value,
        completed: li.querySelector('input[type="checkbox"]').checked
    }));

    setCurrentBoard(currentBoard);
    saveBoardsToLocalStorage();  // Save to localStorage
}

// Function to delete a task
function deleteTask(task) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    boards[currentBoard] = boards[currentBoard].filter(t => t.id !== task.id);
    taskDetailsModal.classList.add('hidden');
    setCurrentBoard(currentBoard);

    updateColumnTaskCounts();
    saveBoardsToLocalStorage();  // Save to localStorage
}

// Drag and Drop Handlers
function handleDragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
    event.target.classList.add('dragging');
}

function handleDragOverWithinColumn(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const column = event.currentTarget.closest('.column');

    const afterElement = getDragAfterElement(column, event.clientY);
    if (afterElement == null) {
        column.appendChild(draggingElement);
    } else {
        column.insertBefore(draggingElement, afterElement);
    }
}

function handleDropWithinColumn(event, taskId) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    draggingElement.classList.remove('dragging');

    const column = event.currentTarget.closest('.column');
    const taskOrder = Array.from(column.querySelectorAll('.task-card')).map(taskEl => taskEl.dataset.taskId);

    boards[currentBoard] = boards[currentBoard].filter(task => task.status !== column.dataset.status || taskOrder.includes(task.id));
    taskOrder.forEach(id => {
        const task = boards[currentBoard].find(t => t.id === id);
        if (task) task.status = column.dataset.status;
    });

    boards[currentBoard] = boards[currentBoard].filter(task => task.status !== column.dataset.status).concat(
        taskOrder.map(id => boards[currentBoard].find(task => task.id === id))
    );

    saveBoardsToLocalStorage();  // Save to localStorage after reordering
}

function getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.task-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
}

function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(event) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const task = boards[currentBoard].find(task => task.id === taskId);
    const newStatus = event.target.closest('.column').dataset.status;

    if (task && task.status !== newStatus) {
        task.status = newStatus;
        setCurrentBoard(currentBoard);
        saveBoardsToLocalStorage();  // Save to localStorage after moving tasks
    }
}

// Load boards from localStorage on start
setCurrentBoard(Object.keys(boards)[0] || 'Project 1'); // Set the first board as default or create "Project 1"


const button = document.getElementById("mobile-board-dropdown-toggle");
const element = document.getElementById("aside-nav");

button.addEventListener("click", function() {
    this.classList.toggle("flipIt");
    element.classList.toggle("board-nav-show");
});

element.addEventListener("click", function() {
    element.classList.remove("board-nav-show");
});