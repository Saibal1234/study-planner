document.addEventListener('DOMContentLoaded', () => {

    const taskForm = document.getElementById('task-form');
    const subjectInput = document.getElementById('subject-input');
    const taskInput = document.getElementById('task-input');
    const deadlineInput = document.getElementById('deadline-input');
    const priorityInput = document.getElementById('priority-input');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const taskList = document.getElementById('task-list');

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const pendingCount = document.getElementById('pending-count');
    const completedCount = document.getElementById('completed-count');
    const totalCount = document.getElementById('total-count');

    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');

    const notifyBtn = document.getElementById('enable-notifications');

    const filterBtns = document.querySelectorAll('.filter-btn');

    // Export Menu
    const exportMenuBtn = document.getElementById('export-menu-btn');
    const exportMenu = document.getElementById('export-menu');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportPdfBtn = document.getElementById('export-pdf');

    // Pomodoro Elements
    const pomodoroTimeDisplay = document.getElementById('pomodoro-time');
    const pomodoroStatus = document.getElementById('pomodoro-status');
    const pomodoroStartBtn = document.getElementById('pomodoro-start');
    const pomodoroPauseBtn = document.getElementById('pomodoro-pause');
    const pomodoroResetBtn = document.getElementById('pomodoro-reset');
    const pomodoroModeBtn = document.getElementById('pomodoro-mode');
    const pomodoroSessionsDisplay = document.getElementById('pomodoro-sessions');

    // AI Elements
    const aiSuggestionContainer = document.getElementById('ai-suggestion-container');
    const aiSuggestionText = document.getElementById('ai-suggestion-text');

    // Auth Elements
    const authSection = document.getElementById('auth-section');
    const mainAppSection = document.getElementById('main-app-section');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.querySelector('.auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const nameGroup = document.getElementById('name-group');
    const regNameInput = document.getElementById('reg-name');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    const logoutBtn = document.getElementById('logout-btn');

    let currentUser = JSON.parse(localStorage.getItem('studyPlannerCurrentUser') || 'null');
    let users = JSON.parse(localStorage.getItem('studyPlannerUsers') || '{}');
    let isLoginMode = true;

    // Load tasks specific to the current user, or empty if none.
    let tasks = [];
    if (currentUser && currentUser.email) {
        tasks = JSON.parse(localStorage.getItem(`studyTasksV2_${currentUser.email}`)) || [];
    } else {
        tasks = JSON.parse(localStorage.getItem('studyTasksV2')) || [];
    }

    let currentFilter = 'all';
    let pendingFileData = null;
    let pendingFileName = null;

    const NOTIFY_THRESH_MINUTES = 60;

    let currentTheme = localStorage.getItem('studyPlannerTheme') || 'dark';

    // Pomodoro State
    const WORK_TIME = 25 * 60;
    const BREAK_TIME = 5 * 60;
    let pomodoroTimeLeft = WORK_TIME;
    let pomodoroTimerId = null;
    let isWorkSession = true;
    let pomodoroSessions = 0;
    if (currentUser && currentUser.email) {
        pomodoroSessions = parseInt(localStorage.getItem(`studyPlannerPomodoroSessions_${currentUser.email}`)) || 0;
    } else {
        pomodoroSessions = parseInt(localStorage.getItem('studyPlannerPomodoroSessions')) || 0;
    }

    applyTheme(currentTheme);

    pomodoroSessionsDisplay.textContent = pomodoroSessions;

    // Check Auth initially
    checkAuthState();

    taskForm.addEventListener('submit', addTask);

    notifyBtn.addEventListener('click', () => {
        requestNotificationPermission(true);
    });

    themeToggleBtn.addEventListener('click', () => {

        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('studyPlannerTheme', currentTheme);
        applyTheme(currentTheme);

    });

    // Export functionality
    exportMenuBtn.addEventListener('click', (e) => {
        exportMenu.classList.toggle('hidden');
        e.stopPropagation();
    });

    document.addEventListener('click', () => {
        exportMenu.classList.add('hidden');
    });

    exportCsvBtn.addEventListener('click', exportToCSV);
    exportPdfBtn.addEventListener('click', exportToPDF);

    // --- Auth Listeners ---
    authToggleBtn.addEventListener('click', toggleAuthMode);
    authForm.addEventListener('submit', handleAuthSubmit);
    logoutBtn.addEventListener('click', logoutUser);

    // Pomodoro Listeners
    pomodoroStartBtn.addEventListener('click', startPomodoro);
    pomodoroPauseBtn.addEventListener('click', pausePomodoro);
    pomodoroResetBtn.addEventListener('click', resetPomodoro);
    pomodoroModeBtn.addEventListener('click', togglePomodoroMode);

    fileInput.addEventListener('change', function () {

        const file = this.files[0];

        if (file) {

            if (file.size > 2 * 1024 * 1024) {

                alert("File must be under 2MB");

                this.value = '';
                return;

            }

            fileNameDisplay.textContent = file.name;

            const reader = new FileReader();

            reader.onload = function (e) {

                pendingFileData = e.target.result;
                pendingFileName = file.name;

            };

            reader.readAsDataURL(file);

        }

    });

    filterBtns.forEach(btn => {

        btn.addEventListener('click', () => {

            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.dataset.filter;

            renderTasks();

        });

    });

    taskList.addEventListener('click', (e) => {

        const checkbox = e.target.closest('input[type="checkbox"]');

        if (checkbox) {

            const taskId = checkbox.closest('.task-item').dataset.id;
            toggleTaskStatus(taskId);
            return;

        }

        const deleteBtn = e.target.closest('.delete-btn');

        if (deleteBtn) {

            const taskId = deleteBtn.closest('.task-item').dataset.id;
            deleteTask(taskId);
            return;

        }

    });

    // --- Core Functions ---
    function checkAuthState() {
        if (currentUser) {
            authSection.classList.add('hidden');
            mainAppSection.classList.remove('hidden');

            // Reload user specific tasks and sessions
            tasks = JSON.parse(localStorage.getItem(`studyTasksV2_${currentUser.email}`)) || [];
            pomodoroSessions = parseInt(localStorage.getItem(`studyPlannerPomodoroSessions_${currentUser.email}`)) || 0;
            pomodoroSessionsDisplay.textContent = pomodoroSessions;

            renderTasks();
            updateDashboard();
            requestNotificationPermission(false);
            startDeadlineChecker();
        } else {
            authSection.classList.remove('hidden');
            mainAppSection.classList.add('hidden');
        }
    }

    function toggleAuthMode(e) {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = "Welcome Back";
            authSubtitle.textContent = "Login to your Study Planner";
            nameGroup.style.display = "none";
            regNameInput.removeAttribute('required');
            authSubmitBtn.textContent = "Login";
            authSwitchText.textContent = "Don't have an account?";
            authToggleBtn.textContent = "Register here";
        } else {
            authTitle.textContent = "Create Account";
            authSubtitle.textContent = "Start organizing your study life";
            nameGroup.style.display = "flex";
            regNameInput.setAttribute('required', 'true');
            authSubmitBtn.textContent = "Register";
            authSwitchText.textContent = "Already have an account?";
            authToggleBtn.textContent = "Login here";
        }
    }

    function handleAuthSubmit(e) {
        e.preventDefault();
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value; // Store as basic string for demo purposes
        const name = regNameInput.value.trim();

        if (isLoginMode) {
            // Login
            if (users[email] && users[email].password === password) {
                currentUser = users[email];
                localStorage.setItem('studyPlannerCurrentUser', JSON.stringify(currentUser));
                authEmailInput.value = '';
                authPasswordInput.value = '';
                checkAuthState();
            } else {
                alert("Invalid email or password!");
            }
        } else {
            // Register
            if (users[email]) {
                alert("Account with this email already exists!");
                return;
            }
            users[email] = {
                name: name,
                email: email,
                password: password
            };
            localStorage.setItem('studyPlannerUsers', JSON.stringify(users));

            // Auto login after reg
            currentUser = users[email];
            localStorage.setItem('studyPlannerCurrentUser', JSON.stringify(currentUser));
            authEmailInput.value = '';
            authPasswordInput.value = '';
            regNameInput.value = '';
            checkAuthState();
        }
    }

    function logoutUser() {
        if (confirm("Are you sure you want to logout?")) {
            currentUser = null;
            localStorage.removeItem('studyPlannerCurrentUser');
            clearInterval(pomodoroTimerId);
            pomodoroTimerId = null;
            checkAuthState();
        }
    }

    function applyTheme(theme) {

        document.documentElement.setAttribute('data-theme', theme);

        if (theme === 'light') {

            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');

        } else {

            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');

        }

    }

    function addTask(e) {

        e.preventDefault();

        const subject = subjectInput.value.trim();
        const desc = taskInput.value.trim();
        const deadline = deadlineInput.value;
        const priority = priorityInput.value;

        if (!subject || !desc || !deadline) return;

        const newTask = {

            id: Date.now().toString(),
            subject,
            desc,
            deadline,
            priority,
            fileData: pendingFileData,
            fileName: pendingFileName,
            completed: false,
            notified: false

        };

        tasks.push(newTask);
        saveTasks();

        taskForm.reset();

        fileNameDisplay.textContent = "Choose a file...";
        pendingFileData = null;
        pendingFileName = null;

        renderTasks();
        updateDashboard();

    }

    function toggleTaskStatus(id) {

        tasks = tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        );

        saveTasks();
        renderTasks();
        updateDashboard();

    }

    function deleteTask(id) {

        tasks = tasks.filter(task => task.id !== id);

        saveTasks();
        renderTasks();
        updateDashboard();

    }

    function renderTasks() {

        taskList.innerHTML = '';

        let filteredTasks = tasks;

        if (currentFilter === 'pending') {

            filteredTasks = tasks.filter(t => !t.completed);

        }

        if (currentFilter === 'completed') {

            filteredTasks = tasks.filter(t => t.completed);

        }

        function getTaskStatus(task) {
            if (task.completed) return { value: 4, class: '' };
            const now = new Date();
            const taskDate = new Date(task.deadline);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const taskDayStart = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();

            if (taskDayStart < todayStart) {
                return { value: 1, class: 'overdue' };
            } else if (taskDayStart === todayStart) {
                return { value: 2, class: 'due-today' };
            } else {
                return { value: 3, class: 'upcoming' };
            }
        }

        filteredTasks.sort((a, b) => {
            const statusA = getTaskStatus(a).value;
            const statusB = getTaskStatus(b).value;
            if (statusA !== statusB) {
                return statusA - statusB;
            }
            return new Date(a.deadline) - new Date(b.deadline);
        });

        if (filteredTasks.length === 0) {

            taskList.innerHTML = `
<div class="empty-state">
<i class="fas fa-clipboard-check"></i>
<p>No tasks yet</p>
</div>
`;

            return;

        }

        filteredTasks.forEach(task => {
            const statusInfo = getTaskStatus(task);

            const li = document.createElement('li');

            li.className = `task-item ${task.completed ? 'completed' : ''} ${statusInfo.class}`;

            li.dataset.id = task.id;
            li.dataset.priority = task.priority;

            li.id = `task-${task.id}`;

            li.innerHTML = `

<div class="task-content">

<label class="checkbox-container">

<input type="checkbox" ${task.completed ? 'checked' : ''}>
<span class="checkmark"></span>

</label>

<div class="task-details">

<div class="task-header-row">

<span class="task-subject">${task.subject}</span>

<span class="priority-badge priority-${task.priority}">${task.priority}</span>

</div>

<span class="task-desc">${task.desc}</span>

<div class="task-meta">

<span class="task-time">

<i class="fas fa-calendar-alt"></i> ${new Date(task.deadline).toLocaleString()}

</span>

</div>

</div>

</div>

<button class="delete-btn">
<i class="fas fa-trash"></i>
</button>

`;

            taskList.appendChild(li);

        });

    }

    function updateDashboard() {

        const total = tasks.length;

        const completed = tasks.filter(t => t.completed).length;

        const pending = total - completed;

        totalCount.textContent = total;

        completedCount.textContent = completed;

        pendingCount.textContent = pending;

        if (total === 0) {

            progressBar.style.width = '0%';
            progressText.textContent = '0%';

            return;

        }

        const percent = Math.round((completed / total) * 100);

        progressBar.style.width = percent + "%";
        progressText.textContent = percent + "%";

        updateAISuggestion();

    }

    function updateAISuggestion() {
        if (!aiSuggestionContainer || !aiSuggestionText) return;

        const pendingTasks = tasks.filter(t => !t.completed);

        if (pendingTasks.length === 0) {
            aiSuggestionContainer.classList.add('hidden');
            return;
        }

        // Find the most urgent task
        pendingTasks.sort((a, b) => {
            const dateA = new Date(a.deadline).getTime();
            const dateB = new Date(b.deadline).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const pWeight = { high: 1, medium: 2, low: 3 };
            return pWeight[a.priority] - pWeight[b.priority];
        });

        const topTask = pendingTasks[0];
        const now = new Date();
        const taskDate = new Date(topTask.deadline);
        const timeDiff = taskDate.getTime() - now.getTime();

        let urgencyText = "";
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const taskDayStart = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();

        if (taskDayStart < todayStart) {
            urgencyText = `<span style="color: var(--danger-color); font-weight: 600;">is overdue</span>`;
        } else if (taskDayStart === todayStart) {
            urgencyText = `<span style="color: var(--warning-color); font-weight: 600;">is due today</span>`;
        } else {
            urgencyText = "is your next upcoming deadline";
        }

        aiSuggestionText.innerHTML = `You should focus on <strong>${topTask.subject}</strong> next. Your task "<em>${topTask.desc}</em>" ${urgencyText}.`;
        aiSuggestionContainer.classList.remove('hidden');
    }

    function saveTasks() {

        if (currentUser) {
            localStorage.setItem(`studyTasksV2_${currentUser.email}`, JSON.stringify(tasks));
        } else {
            localStorage.setItem('studyTasksV2', JSON.stringify(tasks));
        }

    }

    function requestNotificationPermission() {

        if (!("Notification" in window)) return;

        if (Notification.permission !== "granted") {

            Notification.requestPermission();

        }

    }

    function startDeadlineChecker() {

        setInterval(checkDeadlines, 60000);

    }

    function checkDeadlines() {

        if (Notification.permission !== "granted") return;

        const now = new Date();

        tasks.forEach(task => {

            if (task.completed || task.notified) return;

            const taskDate = new Date(task.deadline);

            const diffMinutes = (taskDate - now) / 60000;

            if (diffMinutes > 0 && diffMinutes <= NOTIFY_THRESH_MINUTES) {

                new Notification("Task Reminder", {

                    body: task.desc

                });

                task.notified = true;

                saveTasks();

            }

        });

    }

    // --- Pomodoro Logic ---
    function updatePomodoroDisplay() {
        const minutes = Math.floor(pomodoroTimeLeft / 60);
        const seconds = pomodoroTimeLeft % 60;
        pomodoroTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startPomodoro() {
        if (pomodoroTimerId !== null) return;

        pomodoroStartBtn.classList.add('hidden');
        pomodoroPauseBtn.classList.remove('hidden');

        pomodoroTimerId = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroDisplay();

            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroTimerId);
                pomodoroTimerId = null;
                pomodoroStartBtn.classList.remove('hidden');
                pomodoroPauseBtn.classList.add('hidden');

                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Pomodoro Timer", {
                        body: isWorkSession ? "Focus session complete! Time for a break." : "Break over! Time to focus.",
                        icon: "https://cdn-icons-png.flaticon.com/512/3208/3208076.png"
                    });
                }

                if (isWorkSession) {
                    pomodoroSessions++;
                    if (currentUser) {
                        localStorage.setItem(`studyPlannerPomodoroSessions_${currentUser.email}`, pomodoroSessions);
                    }
                    pomodoroSessionsDisplay.textContent = pomodoroSessions;
                    togglePomodoroMode();
                } else {
                    togglePomodoroMode();
                }
            }
        }, 1000);
    }

    function pausePomodoro() {
        clearInterval(pomodoroTimerId);
        pomodoroTimerId = null;
        pomodoroStartBtn.classList.remove('hidden');
        pomodoroPauseBtn.classList.add('hidden');
        pomodoroStartBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
    }

    function resetPomodoro() {
        clearInterval(pomodoroTimerId);
        pomodoroTimerId = null;
        pomodoroTimeLeft = isWorkSession ? WORK_TIME : BREAK_TIME;
        updatePomodoroDisplay();

        pomodoroStartBtn.classList.remove('hidden');
        pomodoroPauseBtn.classList.add('hidden');
        pomodoroStartBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    }

    function togglePomodoroMode() {
        isWorkSession = !isWorkSession;
        pomodoroStatus.textContent = isWorkSession ? 'Focus Time' : 'Break Time';
        pomodoroStatus.style.color = isWorkSession ? 'var(--primary-color)' : 'var(--success-color)';

        pomodoroTimeDisplay.style.color = isWorkSession ? 'var(--text-primary)' : 'var(--success-color)';

        resetPomodoro();
    }

    // Export Functions
    function exportToCSV() {
        if (tasks.length === 0) {
            alert("No tasks to export!");
            return;
        }

        const headers = ["Subject", "Description", "Priority", "Deadline", "Status"];
        const rows = tasks.map(t => {
            const dateStr = new Date(t.deadline).toLocaleString().replace(/,/g, ''); // Remove commas to prevent CSV breaking
            const status = t.completed ? "Completed" : "Pending";
            // Quote strings to handle commas in description/subject
            return `"${t.subject}","${t.desc}","${t.priority}","${dateStr}","${status}"`;
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);

        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `study_tasks_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
    }

    function exportToPDF() {
        if (tasks.length === 0) {
            alert("No tasks to export!");
            return;
        }

        // Ensure html2pdf is loaded
        if (typeof html2pdf === 'undefined') {
            alert("PDF generation library is loading. Please try again in a moment.");
            return;
        }

        // We will create a temporary beautiful div to generate the PDF from
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.fontFamily = 'Inter, sans-serif';
        element.style.color = '#000'; // Force black text for PDF
        element.style.backgroundColor = '#fff';

        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4f46e5; margin: 0;">Study Planner Report</h1>
                <p style="color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f5f9; text-align: left;">
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Subject</th>
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Task</th>
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Priority</th>
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Due</th>
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(t => {
            const statusColor = t.completed ? '#10b981' : '#f59e0b';
            const priorityColor = t.priority === 'high' ? '#ef4444' : (t.priority === 'medium' ? '#f59e0b' : '#3b82f6');

            return `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${t.subject}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${t.desc}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: ${priorityColor}; text-transform: uppercase; font-size: 0.8em;">${t.priority}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(t.deadline).toLocaleString()}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: ${statusColor}; font-weight: bold;">${t.completed ? 'Done' : 'Pending'}</td>
                        </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        const opt = {
            margin: 10,
            filename: `study_plan_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Create PDF directly from the detached element
        html2pdf().set(opt).from(element).save();
    }

});