let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentPriority = null;
let currentView = 'all';
let priorityChart = null;
let dragStartIndex = null;

// Initialize the application
function initApp() {
  loadTheme();
  initPriorityChart();
  renderTasks();
  updateStats();
  checkDueDateNotifications();
  setupEventListeners();
  initDatePicker();
}

// Load saved theme from localStorage
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  if (savedTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  } else {
    setTheme(savedTheme);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Theme preference change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('theme') === 'system') {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  // Task input keyboard shortcut
  const taskInput = document.getElementById('taskInput');
  if (taskInput) {
    taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    });
  }

  // Notes input keyboard shortcut
  const notesInput = document.getElementById('notesInput');
  if (notesInput) {
    notesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        addTask();
      }
    });
  }
}

// Initialize date picker
function initDatePicker() {
  if (typeof flatpickr !== 'undefined' && document.getElementById('dueDate')) {
    flatpickr('#dueDate', {
      dateFormat: 'Y-m-d',
      minDate: 'today',
      defaultDate: new Date(),
      onChange: function(selectedDates, dateStr) {
        document.getElementById('dueDate').value = dateStr;
      }
    });
  }
}

// Initialize priority chart
function initPriorityChart() {
  const ctx = document.getElementById('priorityChart');
  if (!ctx) return;

  priorityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444'
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              weight: '600'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100) || 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
  updatePriorityChart();
}

// Update priority chart
function updatePriorityChart() {
  if (!priorityChart) return;
  
  const lowCount = tasks.filter(task => task.priority === 'low').length;
  const mediumCount = tasks.filter(task => task.priority === 'medium').length;
  const highCount = tasks.filter(task => task.priority === 'high').length;
  
  priorityChart.data.datasets[0].data = [lowCount, mediumCount, highCount];
  priorityChart.update();
}

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Show loading spinner
function showLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.classList.remove('hidden');
    setTimeout(() => {
      spinner.classList.add('hidden');
    }, 500);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) return;

  // Set icon based on type
  let icon = '';
  switch(type) {
    case 'success':
      icon = '<i class="fas fa-check-circle"></i>';
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle"></i>';
      break;
    case 'warning':
      icon = '<i class="fas fa-exclamation-triangle"></i>';
      break;
    default:
      icon = '<i class="fas fa-info-circle"></i>';
  }

  notification.innerHTML = `${icon} ${message}`;
  notification.className = `notification ${type} show`;
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.classList.add('hidden'), 300);
  }, 3000);
}

// Theme switcher functions
function toggleThemeMenu() {
  const themeOptions = document.getElementById('theme-options');
  if (!themeOptions) return;

  themeOptions.classList.toggle('show');
  
  if (themeOptions.classList.contains('show')) {
    setTimeout(() => {
      document.addEventListener('click', closeThemeMenuOnClickOutside);
    }, 10);
  } else {
    document.removeEventListener('click', closeThemeMenuOnClickOutside);
  }
}

function closeThemeMenuOnClickOutside(e) {
  const themeSwitcher = document.querySelector('.theme-switcher');
  if (!themeSwitcher?.contains(e.target)) {
    const themeOptions = document.getElementById('theme-options');
    if (themeOptions) themeOptions.classList.remove('show');
    document.removeEventListener('click', closeThemeMenuOnClickOutside);
  }
}

function setTheme(theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.className = prefersDark ? 'dark' : 'light';
  } else {
    document.body.className = theme;
  }
  
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    const lightIcon = themeToggle.querySelector('.light-icon');
    const darkIcon = themeToggle.querySelector('.dark-icon');
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      if (lightIcon) lightIcon.style.display = 'none';
      if (darkIcon) darkIcon.style.display = 'inline-block';
    } else {
      if (lightIcon) lightIcon.style.display = 'inline-block';
      if (darkIcon) darkIcon.style.display = 'none';
    }
  }
  
  localStorage.setItem('theme', theme);
  showNotification(`Theme set to ${theme}`, 'success');
  toggleThemeMenu();
}

// Task management functions
function validateTaskInput(taskText, dueDate) {
  if (taskText.trim() === '') {
    showNotification('Task name cannot be empty!', 'error');
    return false;
  }
  
  if (dueDate && new Date(dueDate) < new Date().setHours(0, 0, 0, 0)) {
    showNotification('Due date cannot be in the past!', 'error');
    return false;
  }
  
  return true;
}

function addTask() {
  const taskInput = document.getElementById('taskInput');
  const notesInput = document.getElementById('notesInput');
  const prioritySelect = document.getElementById('prioritySelect');
  const categorySelect = document.getElementById('categorySelect');
  const dueDateInput = document.getElementById('dueDate');

  if (!taskInput || !notesInput || !prioritySelect || !categorySelect || !dueDateInput) return;

  const priority = prioritySelect.value;
  const category = categorySelect.value;
  const dueDate = dueDateInput.value;
  const taskText = taskInput.value.trim();
  const notesText = notesInput.value.trim();

  if (!validateTaskInput(taskText, dueDate)) return;

  const task = {
    id: Date.now(),
    text: taskText,
    priority: priority,
    category: category,
    dueDate: dueDate,
    notes: notesText,
    completed: false,
    createdAt: new Date().toISOString(),
    order: tasks.length
  };

  tasks.push(task);
  saveTasks();
  renderTasks();
  updateStats();
  
  // Reset form
  taskInput.value = '';
  notesInput.value = '';
  dueDateInput.value = '';
  taskInput.focus();
  
  showNotification('Task added successfully!', 'success');
  checkDueDateNotifications();
}

function removeTask(taskId) {
  tasks = tasks.filter(task => task.id !== taskId);
  saveTasks();
  renderTasks();
  updateStats();
  showNotification('Task deleted successfully!', 'success');
}

function toggleTaskCompletion(taskId) {
  tasks = tasks.map(task => {
    if (task.id === taskId) {
      task.completed = !task.completed;
    }
    return task;
  });
  
  saveTasks();
  renderTasks();
  updateStats();
  
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    showNotification(`Task marked as ${task.completed ? 'completed' : 'incomplete'}!`, 'success');
  }
}

function editNotes(taskId) {
  const task = tasks.find(task => task.id === taskId);
  if (!task) return;

  const notes = prompt('Enter notes for this task:', task.notes || '');
  if (notes !== null) {
    tasks = tasks.map(t => {
      if (t.id === taskId) {
        t.notes = notes.trim();
      }
      return t;
    });
    
    saveTasks();
    renderTasks();
    showNotification('Notes updated successfully!', 'success');
  }
}

function exportTasks() {
  if (tasks.length === 0) {
    showNotification('No tasks to export!', 'warning');
    return;
  }

  const csvContent = [
    'ID,Text,Priority,Category,Due Date,Notes,Completed,Created At',
    ...tasks.map(task => 
      `${task.id},"${task.text.replace(/"/g, '""')}",${task.priority},${task.category},${task.dueDate || ''},"${task.notes.replace(/"/g, '""')}",${task.completed},${task.createdAt}`
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `taskify_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  showNotification('Tasks exported successfully!', 'success');
}

function filterTasks(priority) {
  currentPriority = priority;
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-btn.priority-${priority}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  const homePage = document.getElementById('homePage');
  const taskPage = document.getElementById('taskPage');
  if (homePage) homePage.classList.add('hidden');
  if (taskPage) taskPage.classList.remove('hidden');
  
  renderTasks();
}

function clearFilter() {
  currentPriority = null;
  currentView = 'all';
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const homePage = document.getElementById('homePage');
  const taskPage = document.getElementById('taskPage');
  if (homePage) homePage.classList.remove('hidden');
  if (taskPage) taskPage.classList.add('hidden');
  
  const viewAll = document.getElementById('viewAll');
  const viewActive = document.getElementById('viewActive');
  const viewCompleted = document.getElementById('viewCompleted');
  if (viewAll) viewAll.classList.add('active');
  if (viewActive) viewActive.classList.remove('active');
  if (viewCompleted) viewCompleted.classList.remove('active');
  
  renderTasks();
  updateStats();
}

function changeView(view) {
  currentView = view;
  const viewAll = document.getElementById('viewAll');
  const viewActive = document.getElementById('viewActive');
  const viewCompleted = document.getElementById('viewCompleted');
  
  if (viewAll) viewAll.classList.toggle('active', view === 'all');
  if (viewActive) viewActive.classList.toggle('active', view === 'active');
  if (viewCompleted) viewCompleted.classList.toggle('active', view === 'completed');
  
  renderTasks();
}

function searchTasks() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  renderTasks(searchTerm);
}

function checkDueDateNotifications() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  tasks.forEach(task => {
    if (task.dueDate && !task.completed) {
      const dueDate = new Date(task.dueDate);
      const timeDiff = dueDate - now;
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      if (task.dueDate === today) {
        showNotification(`Reminder: "${task.text}" is due today!`, 'warning');
      } else if (daysDiff === 1) {
        showNotification(`Reminder: "${task.text}" is due tomorrow!`, 'info');
      } else if (daysDiff < 0) {
        showNotification(`Overdue: "${task.text}" was due on ${formatDate(task.dueDate)}`, 'error');
      }
    }
  });
}

function updateStats() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const today = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(task => task.dueDate === today && !task.completed).length;
  const overdueTasks = tasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0) && !task.completed
  ).length;

  const totalTasksEl = document.getElementById('totalTasks');
  const completedTasksEl = document.getElementById('completedTasks');
  const dueTodayTasksEl = document.getElementById('dueTodayTasks');
  const overdueTasksEl = document.getElementById('overdueTasks');
  
  if (totalTasksEl) totalTasksEl.textContent = totalTasks;
  if (completedTasksEl) completedTasksEl.textContent = completedTasks;
  if (dueTodayTasksEl) dueTodayTasksEl.textContent = dueTodayTasks;
  if (overdueTasksEl) overdueTasksEl.textContent = overdueTasks;
  
  updatePriorityChart();
}

function renderTasks(searchTerm = '') {
  const homePage = document.getElementById('homePage');
  const taskPage = document.getElementById('taskPage');
  const taskList = document.getElementById('taskList');
  
  if (!homePage || !taskPage || !taskList) return;

  if (!currentPriority) {
    homePage.classList.remove('hidden');
    taskPage.classList.add('hidden');
    updateStats();
    return;
  }

  taskList.innerHTML = '';
  
  let filteredTasks = tasks
    .filter(task => task.priority === currentPriority)
    .filter(task => {
      const matchesSearch = task.text.toLowerCase().includes(searchTerm) || 
                          (task.notes && task.notes.toLowerCase().includes(searchTerm));
      const matchesView = currentView === 'all' || 
                         (currentView === 'active' && !task.completed) ||
                         (currentView === 'completed' && task.completed);
      return matchesSearch && matchesView;
    });

  const sortSelect = document.getElementById('sortSelect');
  const sortOption = sortSelect ? sortSelect.value : 'default';

  if (sortOption === 'name') {
    filteredTasks.sort((a, b) => a.text.localeCompare(b.text));
  } else if (sortOption === 'dueDate') {
    filteredTasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (sortOption === 'createdAt') {
    filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortOption === 'priority') {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  } else {
    filteredTasks.sort((a, b) => a.order - b.order);
  }

  const taskCount = document.querySelector('.task-count');
  if (taskCount) taskCount.textContent = `(${filteredTasks.length} tasks)`;

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.completed).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const progressBar = document.querySelector('.task-progress-bar');
  const progressText = document.querySelector('.progress-text');
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `${Math.round(progress)}% Complete`;
  
  const progressElement = document.querySelector('.task-progress');
  if (progressElement) progressElement.setAttribute('aria-valuenow', Math.round(progress));

  if (filteredTasks.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="fas fa-tasks"></i>
      <p>No tasks found. Add a new task to get started!</p>
    `;
    taskList.appendChild(emptyState);
    return;
  }

  filteredTasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.style.setProperty('--task-index', index);
    li.className = task.completed ? 'completed' : '';
    li.setAttribute('draggable', 'true');
    li.setAttribute('data-id', task.id);
    li.setAttribute('role', 'listitem');
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0) && !task.completed;
    
    li.innerHTML = `
      <span class="priority ${task.priority}" aria-label="${task.priority} priority"></span>
      <div class="task-content">
        <span class="task-text">${task.text}</span>
        <div class="task-meta">
          <span class="category" data-category="${task.category}">${task.category}</span>
          ${task.dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">Due: ${formatDate(task.dueDate)}</span>` : ''}
        </div>
        ${task.notes ? `<div class="notes">${task.notes}</div>` : ''}
      </div>
      <div class="task-actions">
        <button onclick="toggleTaskCompletion(${task.id})" aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
          ${task.completed ? '<i class="fas fa-undo"></i>' : '<i class="fas fa-check"></i>'}
        </button>
        <button onclick="editNotes(${task.id})" aria-label="Edit notes">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="removeTask(${task.id})" aria-label="Delete task">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    taskList.appendChild(li);
  });

  // Reinitialize drag and drop for the new task items
  setupDragAndDrop();
  updateStats();
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Drag and drop functions
function setupDragAndDrop() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  const taskItems = taskList.querySelectorAll('li');
  
  taskItems.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

function handleDragStart(e) {
  dragStartIndex = Array.from(e.target.parentNode.children).indexOf(e.target);
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', e.target.dataset.id);
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  const draggingElement = document.querySelector('.dragging');
  const targetElement = e.target.closest('li');
  
  if (targetElement && targetElement !== draggingElement) {
    const rect = targetElement.getBoundingClientRect();
    const nextElement = e.clientY > rect.top + rect.height / 2 ? 
      targetElement.nextElementSibling : 
      targetElement;
    
    const taskList = document.getElementById('taskList');
    if (taskList) taskList.insertBefore(draggingElement, nextElement);
    targetElement.classList.add('over');
  }
}

function handleDragLeave(e) {
  e.target.classList.remove('over');
}

function handleDrop(e) {
  e.preventDefault();
  e.target.classList.remove('over');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('#taskList li').forEach(li => li.classList.remove('over'));
  
  const taskElements = Array.from(document.querySelectorAll('#taskList li'));
  const dragEndIndex = taskElements.indexOf(e.target);
  
  // Only reorder if the position changed
  if (dragStartIndex !== dragEndIndex) {
    const taskId = parseInt(e.target.dataset.id);
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      // Remove from old position
      tasks = tasks.filter(t => t.id !== taskId);
      
      // Insert at new position
      const newOrder = taskElements.map(el => parseInt(el.dataset.id));
      const newIndex = newOrder.indexOf(taskId);
      tasks.splice(newIndex, 0, task);
      
      // Update order property for all tasks
      tasks.forEach((task, index) => {
        task.order = index;
      });
      
      saveTasks();
    }
  }
}

function resetData() {
  if (confirm('Are you sure you want to reset all tasks? This cannot be undone.')) {
    tasks = [];
    localStorage.removeItem('tasks');
    renderTasks();
    updateStats();
    showNotification('All tasks reset successfully!', 'success');
  }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initApp);