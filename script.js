document.addEventListener("DOMContentLoaded", function() {
    const createBoardButton = document.getElementById('createBoardButton');
    const addTaskButton = document.getElementById('addTaskButton');
    const asideNav = document.getElementById('boardList');
    const taskModal = document.getElementById('taskModal');
    const closeTaskModal = document.getElementById('closeTaskModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalTaskTitle = document.getElementById('modalTaskTitle');
    const modalTaskDescription = document.getElementById('modalTaskDescription');
    const modalTaskStatus = document.getElementById('modalTaskStatus');
    const modalSubtasksContainer = document.getElementById('modalSubtasksContainer');
    const modalAddSubtaskButton = document.getElementById('modalAddSubtaskButton');
    const modalCreateTaskButton = document.getElementById('modalCreateTaskButton');
    const modalSaveChangesButton = document.getElementById('modalSaveChangesButton');
    const modalDeleteTaskButton = document.getElementById('modalDeleteTaskButton');

    let boards = JSON.parse(localStorage.getItem('boards')) || { 'Project 1': [] };
    let currentBoard = 'Project 1';
    let currentTaskId = null;
    let isDragging = false;

    // Function to save boards to localStorage
    function saveBoardsToLocalStorage() {
        localStorage.setItem('boards', JSON.stringify(boards));
    }

    // Refresh the sidebar with the updated list of boards
    function refreshBoardList() {
        asideNav.innerHTML = ''; // Clear current board list

        Object.keys(boards).forEach(boardName => {
            const boardElement = document.createElement('li');
            boardElement.innerHTML = `
                <a href="#" class="capitalize" data-board-name="${boardName}">${boardName}</a>
                <button class="delete-board" data-board-name="${boardName}">
                    <i class="fas fa-trash" title="Delete board"></i>
                </button>
            `;

            // Set the board as current when its name is clicked
            boardElement.querySelector('a').onclick = (e) => {
                e.preventDefault();
                setCurrentBoard(boardName);
            };

            // Add event listener to delete button
            boardElement.querySelector('.delete-board').onclick = (e) => {
                e.stopPropagation(); // Prevent triggering the board selection
                deleteBoard(boardName);
            };

            asideNav.appendChild(boardElement);
        });
    }

    // Set the current board
    function setCurrentBoard(boardName) {
        currentBoard = boardName;
        document.querySelector('.header h1').innerText = boardName;

        // Remove "active" class from all boards
        asideNav.querySelectorAll('a').forEach(link => link.classList.remove('active'));

        // Add "active" class to the selected board
        const activeBoardLink = asideNav.querySelector(`a[data-board-name="${boardName}"]`);
        if (activeBoardLink) {
            activeBoardLink.classList.add('active');
        }

        loadTasksForCurrentBoard();
        addTaskButton.disabled = false;  // Enable "Add New Task" button for the current board
    }

    // Function to add a new board
    function addNewBoard() {
        const boardName = prompt('Enter a name for the new board');
        if (!boardName || boards[boardName]) {
            alert("Board name is required and must be unique.");
            return;
        }
        boards[boardName] = []; // Add new board with an empty task list
        saveBoardsToLocalStorage();
        refreshBoardList();
        setCurrentBoard(boardName); // Switch to the newly created board
    }

    // Function to delete a board
    function deleteBoard(boardName) {
        if (confirm(`Are you sure you want to delete the board "${boardName}" and all its tasks?`)) {
            delete boards[boardName];
            saveBoardsToLocalStorage();
            
            // If the deleted board was active, switch to another board
            if (currentBoard === boardName) {
                const remainingBoards = Object.keys(boards);
                if (remainingBoards.length > 0) {
                    setCurrentBoard(remainingBoards[0]);
                } else {
                    currentBoard = null;
                    document.querySelector('.header h1').innerText = "No Project Selected";
                    document.querySelectorAll('.column .task-list').forEach(taskList => taskList.innerHTML = '');
                    addTaskButton.disabled = true;
                }
            }
            
            refreshBoardList(); // Update sidebar to reflect the deletion
        }
    }

    // Load tasks for the current board and update task counts
    function loadTasksForCurrentBoard() {
        document.querySelectorAll('.task-list').forEach(taskList => taskList.innerHTML = ''); // Clear only task cards

        const boardTasks = boards[currentBoard];
        boardTasks.forEach(task => addTaskToColumn(task));
        updateTaskCounts();  // Update task counts after loading tasks
    }

    // Function to add tasks to a column
    function addTaskToColumn(task) {
        const taskList = document.querySelector(`.column[data-status="${task.status}"] .task-list`);
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;

        const subtaskCount = task.subtasks.length;
        taskElement.innerHTML = `
            <h3 class="capitalize">${task.title}</h3>
            <p>${subtaskCount} Subtask${subtaskCount !== 1 ? 's' : ''}</p>
        `;

        // Drag start event
        taskElement.addEventListener('dragstart', (event) => {
            isDragging = true;
            event.dataTransfer.setData('text/plain', task.id);
            taskElement.classList.add('dragging');
        });

        // Drag end event
        taskElement.addEventListener('dragend', () => {
            isDragging = false;
            taskElement.classList.remove('dragging');
        });

        // Click event to open modal for editing
        taskElement.addEventListener('click', () => {
            if (!isDragging) openTaskModal(task);
        });

        taskList.appendChild(taskElement);
    }

    // Set up dragover and drop events for each column
    document.querySelectorAll('.column').forEach(column => {
        column.addEventListener('dragover', (event) => {
            event.preventDefault();

            // Only allow dropping within the task list area
            const taskList = column.querySelector('.task-list');
            const afterElement = getDragAfterElement(taskList, event.clientY);
            const draggingElement = document.querySelector('.dragging');

            if (afterElement == null) {
                taskList.appendChild(draggingElement);
            } else {
                taskList.insertBefore(draggingElement, afterElement);
            }
        });

        column.addEventListener('drop', (event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData('text/plain');
            const task = boards[currentBoard].find(t => t.id === taskId);
            const newStatus = column.dataset.status;

            if (task) {
                // Update the task's status if moved to a different column
                if (task.status !== newStatus) {
                    task.status = newStatus;
                }

                // Reorder tasks within the board array based on new position
                reorderTasksInBoard(newStatus);
                saveBoardsToLocalStorage();
                updateTaskCounts();
            }
            
            // Remove the dragging class
            isDragging = false;
            document.querySelector('.dragging').classList.remove('dragging');
        });
    });

    // Helper function to get the closest task card to the drop position
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Reorder tasks in the board based on their new position within the column
    function reorderTasksInBoard(status) {
        const taskList = document.querySelector(`.column[data-status="${status}"] .task-list`);
        const newOrder = Array.from(taskList.children).map(taskCard => {
            const taskId = taskCard.dataset.taskId;
            return boards[currentBoard].find(task => task.id === taskId);
        });

        // Filter out tasks with different statuses and replace them with the reordered list
        boards[currentBoard] = boards[currentBoard].filter(task => task.status !== status).concat(newOrder);
    }

    // Show modal for creating a new task
    addTaskButton.onclick = () => {
        openTaskModal();
    };

    // Function to open the task modal
    function openTaskModal(task = null) {
        if (task) {
            // Editing an existing task
            currentTaskId = task.id;
            modalTitle.textContent = "Edit Task";
            modalTaskTitle.value = task.title;
            modalTaskDescription.value = task.description;
            modalTaskStatus.value = task.status;
            renderSubtasks(task.subtasks);

            // Show "Save Changes" and "Delete Task" buttons, hide "Create Task" button
            modalCreateTaskButton.classList.add('hidden');
            modalCreateTaskButton.style.display = 'none';
            modalSaveChangesButton.classList.remove('hidden');
            modalSaveChangesButton.style.display = 'inline-block';
            modalDeleteTaskButton.classList.remove('hidden');
            modalDeleteTaskButton.style.display = 'inline-block';

            // Add the editing-task class to indicate edit mode
            taskModal.classList.add('editing-task');
        } else {
            // Adding a new task
            currentTaskId = null;
            modalTitle.textContent = "Add New Task";
            modalTaskTitle.value = '';
            modalTaskDescription.value = '';
            modalTaskStatus.value = 'todo';
            modalSubtasksContainer.innerHTML = '';

            // Show "Create Task" button, hide "Save Changes" and "Delete Task" buttons
            modalCreateTaskButton.classList.remove('hidden');
            modalCreateTaskButton.style.display = 'inline-block';
            modalSaveChangesButton.classList.add('hidden');
            modalSaveChangesButton.style.display = 'none';
            modalDeleteTaskButton.classList.add('hidden');
            modalDeleteTaskButton.style.display = 'none';

            // Remove the editing-task class since we're adding a new task
            taskModal.classList.remove('editing-task');
        }

        taskModal.classList.remove('hidden');
    }

    // Close the modal
    closeTaskModal.onclick = () => {
        taskModal.classList.add('hidden');
    };

    // Create Task Button with validation and red border on error
    modalCreateTaskButton.onclick = () => {
        const title = modalTaskTitle.value.trim(); // Get the trimmed title to remove any extra whitespace

        if (!title) {
            // Add the red border to indicate error
            modalTaskTitle.classList.add('input-error');
            modalTaskTitle.placeholder = "Title is required"; // Optional: add placeholder text
            return; // Exit the function if the title is empty
        } else {
            // Remove the error class if the title is valid
            modalTaskTitle.classList.remove('input-error');
        }

        const newTask = {
            id: generateTaskId(),
            title: title,
            description: modalTaskDescription.value,
            status: modalTaskStatus.value,
            subtasks: getSubtasks()
        };
        
        boards[currentBoard].push(newTask);
        saveBoardsToLocalStorage();
        addTaskToColumn(newTask);
        updateTaskCounts();  // Update task counts after adding a new task
        taskModal.classList.add('hidden');
    };

    // Save Changes Button for editing a task
    modalSaveChangesButton.onclick = () => {
        const task = boards[currentBoard].find(t => t.id === currentTaskId);
        if (task) {
            task.title = modalTaskTitle.value;
            task.description = modalTaskDescription.value;
            task.status = modalTaskStatus.value;
            task.subtasks = getSubtasks();
            saveBoardsToLocalStorage();
            setCurrentBoard(currentBoard); // Refresh board to show updated task
            updateTaskCounts();  // Update task counts after editing a task
        }
        taskModal.classList.add('hidden');
    };

    // Delete Task Button with confirmation
    modalDeleteTaskButton.onclick = () => {
        const task = boards[currentBoard].find(t => t.id === currentTaskId);
        if (task && confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
            boards[currentBoard] = boards[currentBoard].filter(t => t.id !== currentTaskId);
            saveBoardsToLocalStorage();
            setCurrentBoard(currentBoard); // Refresh board to remove deleted task
            updateTaskCounts();  // Update task counts after deleting a task
            taskModal.classList.add('hidden');
        }
    };

    // Add Subtask Button in the modal
    modalAddSubtaskButton.onclick = () => {
        const listItem = document.createElement('li');
        
        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.className = 'edit-subtask';
        subtaskInput.placeholder = 'e.g. Make coffee';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'subtask-checkbox';

        listItem.appendChild(checkbox);
        listItem.appendChild(subtaskInput);
        modalSubtasksContainer.appendChild(listItem);
    };

    // Render subtasks for a task with checkboxes and delete buttons
    function renderSubtasks(subtasks) {
        modalSubtasksContainer.innerHTML = '';
        subtasks.forEach((subtask, index) => {
            const listItem = document.createElement('li');
            
            // Add completed class based on subtask completion status
            if (subtask.completed) {
                listItem.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'subtask-checkbox';
            checkbox.checked = subtask.completed;

            // Toggle completed class on li based on checkbox state
            checkbox.addEventListener('change', () => {
                subtask.completed = checkbox.checked;
                listItem.classList.toggle('completed', checkbox.checked);
            });

            const subtaskInput = document.createElement('input');
            subtaskInput.type = 'text';
            subtaskInput.className = 'edit-subtask';
            subtaskInput.placeholder = 'Subtask title';
            subtaskInput.value = subtask.title;

            // Create delete button (trash can icon)
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-subtask';
            deleteButton.innerHTML = '<i class="fas fa-close" title="Delete subtask"></i>';
            
            // Event listener to remove the subtask when delete button is clicked
            deleteButton.addEventListener('click', () => {
                subtasks.splice(index, 1);  // Remove subtask from the array
                renderSubtasks(subtasks);   // Re-render subtasks
            });

            listItem.appendChild(checkbox);
            listItem.appendChild(subtaskInput);
            listItem.appendChild(deleteButton);
            modalSubtasksContainer.appendChild(listItem);
        });
    }

    // Get subtasks from the modal with completion status
    function getSubtasks() {
        return Array.from(modalSubtasksContainer.querySelectorAll('li')).map(li => {
            return {
                title: li.querySelector('.edit-subtask').value,
                completed: li.querySelector('.subtask-checkbox').checked
            };
        });
    }

    // Function to generate a unique task ID
    function generateTaskId() {
        return `task-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Function to update task count in each column
    function updateTaskCounts() {
        const statusCounts = { todo: 0, doing: 0, done: 0 };

        // Count tasks based on their status in the current board
        boards[currentBoard].forEach(task => {
            if (statusCounts.hasOwnProperty(task.status)) {
                statusCounts[task.status]++;
            }
        });

        // Update the count in each column header
        document.querySelectorAll('.task-count').forEach(span => {
            const status = span.getAttribute('data-status');
            span.textContent = statusCounts[status] || 0;
        });
    }

    // Initialize by refreshing the board list and setting the first board
    refreshBoardList();
    setCurrentBoard(currentBoard);

    // Event listener for creating a new board
    createBoardButton.onclick = addNewBoard;

    $(".mobile-board-dropdown-toggle").click(function() {
      $(".site-wrap").toggleClass("mobile-dropdown-active");
    });

    $(".board").click(function() {
      $(".site-wrap").removeClass("mobile-dropdown-active");
    });
    $(".aside").click(function() {
      $(".site-wrap").removeClass("mobile-dropdown-active");
    });

});
