/**
 * Gemini AI Task Breakdown - Main Application Logic
 */

// ==========================================
// 1. 状態管理（State）
// ==========================================
let todos = [];
let apiKey = '';
let currentGoal = '';
let timerInterval = null;

// ==========================================
// 2. DOM要素の取得
// ==========================================
const documentElement = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-modal-btn');
const settingsModal = document.getElementById('settings-modal');

// 条件選択要素
const difficultySelect = document.getElementById('difficulty-select');
const timeframeSelect = document.getElementById('timeframe-select');
const granularitySelect = document.getElementById('granularity-select');
const targetDateInput = document.getElementById('target-date');

// ビュー関連
const setupView = document.getElementById('setup-view');
const taskView = document.getElementById('task-view');
const displayGoalText = document.getElementById('display-goal-text');
const backToSetupBtn = document.getElementById('back-to-setup-btn');

// APIキー関連
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const deleteKeyBtn = document.getElementById('delete-key-btn');

// カウントダウン関連
const cdDays = document.getElementById('cd-days');
const cdHours = document.getElementById('cd-hours');
const cdMinutes = document.getElementById('cd-minutes');

// タスク生成関連
const goalInput = document.getElementById('goal-input');
const generateBtn = document.getElementById('generate-btn');
const loadingSpinner = document.getElementById('loading');

// TODOリスト関連
const todoListEl = document.getElementById('todo-list');
const todoCountEl = document.getElementById('todo-count');
const manualInput = document.getElementById('manual-input');
const addManualBtn = document.getElementById('add-manual-btn');


// ==========================================
// 3. 初期化処理（アプリ起動時）
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
	loadTheme();
	loadApiKey();
	setDefaultTargetDate(); // 目標期間に初期値（当日）をセット
	loadGoalAndTodos();
	setupEventListeners();
	startCountdown();
	registerServiceWorker(); // PWA用 Service Worker の登録
});


// ==========================================
// 4. イベントリスナーの設定
// ==========================================
function setupEventListeners() {
	// テーマ切り替え
	themeToggleBtn.addEventListener('click', toggleTheme);

	// 設定モーダル開閉
	openSettingsBtn.addEventListener('click', () => modalToggle(true));
	closeSettingsBtn.addEventListener('click', () => modalToggle(false));

	// APIキーの保存・削除
	saveKeyBtn.addEventListener('click', saveApiKey);
	deleteKeyBtn.addEventListener('click', deleteApiKey);

	// AIタスク生成
	generateBtn.addEventListener('click', handleGenerateTasks);

	// 画面切替（目標変更ボタン）
	backToSetupBtn.addEventListener('click', () => switchView('setup'));

	// 手動タスク追加
	addManualBtn.addEventListener('click', handleAddManualTask);
	manualInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') handleAddManualTask();
	});

	// 目標日変更時にカウントダウン更新
	targetDateInput.addEventListener('change', updateCountdown);
}


// ==========================================
// 5. PWA (Service Worker) 登録処理
// ==========================================
function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./sw.js')
			.then(() => console.log('Service Worker 登録成功'))
			.catch((err) => console.error('Service Worker 登録失敗:', err));
	}
}


// ==========================================
// 6. 画面切り替え (SPA View Switcher)
// ==========================================
function switchView(viewName) {
	if (viewName === 'task') {
		setupView.classList.remove('active');
		taskView.classList.add('active');
	} else {
		taskView.classList.remove('active');
		setupView.classList.add('active');
	}
}


// ==========================================
// 7. テーマ（ダークモード）管理
// ==========================================
function loadTheme() {
	const savedTheme = localStorage.getItem('app_theme') || 'light';
	documentElement.setAttribute('data-theme', savedTheme);
	themeToggleBtn.textContent = savedTheme === 'dark' ? 'ライトモード' : 'ダークモード';
}

function toggleTheme() {
	const currentTheme = documentElement.getAttribute('data-theme');
	const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
	documentElement.setAttribute('data-theme', newTheme);
	localStorage.setItem('app_theme', newTheme);
	themeToggleBtn.textContent = newTheme === 'dark' ? 'ライトモード' : 'ダークモード';
}


// ==========================================
// 8. APIキー管理（LocalStorage）
// ==========================================
function loadApiKey() {
	apiKey = localStorage.getItem('gemini_api_key') || '';
	apiKeyInput.value = apiKey;
}

function saveApiKey() {
	const inputVal = apiKeyInput.value.trim();
	if (!inputVal) {
		alert('APIキーを入力してください。');
		return;
	}
	apiKey = inputVal;
	localStorage.setItem('gemini_api_key', apiKey);
	alert('APIキーを保存しました。');
	modalToggle(false);
}

function deleteApiKey() {
	if (confirm('保存されているAPIキーを削除しますか？')) {
		apiKey = '';
		apiKeyInput.value = '';
		localStorage.removeItem('gemini_api_key');
		alert('APIキーを削除しました。');
	}
}

function modalToggle(show) {
	if (show) {
		settingsModal.showModal();
	} else {
		settingsModal.close();
	}
}


// ==========================================
// 9. カウントダウンタイマー（Safari互換対応）
// ==========================================
function startCountdown() {
	updateCountdown();
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(updateCountdown, 60000);
}

function updateCountdown() {
	const targetDateVal = targetDateInput.value;
	if (!targetDateVal) return;

	// iOS Safari 互換性のためハイフンをスラッシュに変換
	const formattedDate = targetDateVal.replace(/-/g, '/');
	const target = new Date(`${formattedDate} 23:59:59`).getTime();
	const now = new Date().getTime();
	const diff = target - now;

	if (isNaN(target) || diff <= 0) {
		cdDays.textContent = '00';
		cdHours.textContent = '00';
		cdMinutes.textContent = '00';
		return;
	}

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	cdDays.textContent = String(days).padStart(2, '0');
	cdHours.textContent = String(hours).padStart(2, '0');
	cdMinutes.textContent = String(minutes).padStart(2, '0');
}

function setDefaultTargetDate() {
	if (!targetDateInput) return;

	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0');
	const dd = String(today.getDate()).padStart(2, '0');
	const todayStr = `${yyyy}-${mm}-${dd}`;

	if (!targetDateInput.value) {
		targetDateInput.value = todayStr;
	}
	targetDateInput.min = todayStr;
}


// ==========================================
// 10. Gemini API連携 ＆ AI生成処理
// ==========================================
async function handleGenerateTasks() {
	const goalText = goalInput.value.trim();

	if (!goalText) {
		alert('目標を入力してください。');
		return;
	}

	if (!apiKey) {
		alert('Gemini APIキーが未設定です。設定画面からAPIキーを登録してください。');
		modalToggle(true);
		return;
	}

	if (!navigator.onLine) {
		alert('オフライン状態のため、AIタスク生成機能は利用できません。ネット接続を確認してください。');
		return;
	}

	const granularity = granularitySelect ? granularitySelect.value : 'standard';
	const difficulty = difficultySelect ? difficultySelect.value : 'standard';
	const timeframe = timeframeSelect ? timeframeSelect.value : 'all';

	loadingSpinner.style.display = 'block';
	generateBtn.disabled = true;

	try {
		const generatedTasks = await fetchTasksFromGemini(goalText, granularity, difficulty, timeframe);
		if (generatedTasks && generatedTasks.length > 0) {
			currentGoal = goalText;
			todos = generatedTasks.map((taskText, index) => ({
				id: Date.now() + index,
				text: taskText,
				completed: false
			}));

			saveGoalAndTodos();
			renderTodoList();
			displayGoalText.textContent = currentGoal;
			goalInput.value = '';
			switchView('task');
		}
	} catch (error) {
		console.error('Task Generation Error:', error.message);
		alert(error.message || 'タスクの生成に失敗しました。キーが正しいか確認してください。');
	} finally {
		loadingSpinner.style.display = 'none';
		generateBtn.disabled = false;
	}
}

async function fetchTasksFromGemini(goal, granularity, difficulty, timeframe) {
	// ★修正箇所: モデル名を gemini-1.5-flash に変更
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`;
	
	const granularityInstructions = {
		coarse: '全体の流れを短時間で把握できるよう【3～5個程度】の大まかなステップで分解してください。',
		standard: '時系列に沿った標準的な粒度で【5～8個程度】の実行しやすいステップで分解してください。',
		detailed: 'すぐ行動に移せるよう【8～12個程度】の具体的な短時間アクション単位で細かく分解してください。'
	};

	const difficultyInstructions = {
		easy: '初心者でも迷わないよう、専門用語を避けて噛み砕いた手順にしてください。',
		standard: '標準的な難易度と説明量で構成してください。',
		compact: '要点のみに絞り、シンプルかつ簡潔な記述にしてください。'
	};

	const timeframeInstructions = {
		all: '準備フェーズから当日・実施後の確認まで全体を漏れなく網羅してください。',
		prep: '前日までの「事前準備・学習・リサーチ」を中心に構成してください。',
		today: '当日および直前にすぐ実行すべき「現場アクション・最終確認」を中心に構成してください。'
	};

	const selectedGranularity = granularityInstructions[granularity] || granularityInstructions.standard;
	const selectedDifficulty = difficultyInstructions[difficulty] || difficultyInstructions.standard;
	const selectedTimeframe = timeframeInstructions[timeframe] || timeframeInstructions.all;

	const promptText = `あなたは優れたタスク分解・行動計画のプロフェッショナルです。
目標：「${goal}」

【生成条件】
- 分解の細かさ: ${selectedGranularity}
- 難易度配慮: ${selectedDifficulty}
- 重点期間: ${selectedTimeframe}

【タスク生成ルール】
1. 各タスクの先頭には適切な分類タグ（例: 【計画】【学習】【準備】【当日】など）を必ず付与してください。
2. タスクは「～を確認する」「～を実行する」のように具体的な行動を表す動詞で終えてください。
3. 今から実行可能な未来のアクションのみ抽出し、過去の工程は除外してください。

指示に従ったJSON配列形式のみで返してください。余計な解説文や記法は不要です。
[
	"【分類タグ】具体アクション1",
	"【分類タグ】具体アクション2"
]`;

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: promptText }] }],
				generationConfig: {
					responseMimeType: 'application/json'
				}
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMsg = errorData.error?.message || response.statusText;
			if (response.status === 400 || response.status === 403) {
				throw new Error(`APIキーが無効、または権限がありません (${response.status})`);
			} else if (response.status === 429) {
				throw new Error('APIの利用上限に達しました。時間を置いて再試行してください。');
			} else {
				throw new Error(`通信エラーが発生しました (${response.status})`);
			}
		}

		const data = await response.json();
		let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!rawText) {
			throw new Error('AIから応答を受け取れませんでした。');
		}

		const jsonMatch = rawText.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			throw new Error('AIの応答フォーマットが不適切でした。再試行してください。');
		}

		return JSON.parse(jsonMatch[0]);

	} catch (error) {
		throw error;
	}
}


// ==========================================
// 11. TODO管理 ＆ データ保持
// ==========================================
function loadGoalAndTodos() {
	const savedGoal = localStorage.getItem('gemini_goal');
	const savedTodos = localStorage.getItem('gemini_todos');

	if (savedGoal) currentGoal = savedGoal;
	if (savedTodos) {
		try {
			todos = JSON.parse(savedTodos);
		} catch (e) {
			todos = [];
		}
	}

	if (currentGoal || todos.length > 0) {
		displayGoalText.textContent = currentGoal || '無題の目標';
		renderTodoList();
		switchView('task');
	} else {
		switchView('setup');
	}
}

function saveGoalAndTodos() {
	localStorage.setItem('gemini_goal', currentGoal);
	localStorage.setItem('gemini_todos', JSON.stringify(todos));
}

function renderTodoList() {
	todoListEl.innerHTML = '';

	if (todos.length === 0) {
		todoListEl.innerHTML = `
		<li class="todo-item empty-message">
			タスクがありません。「目標を変更」から作成するか、手動で追加してください。
		</li>`;
		todoCountEl.textContent = '0/0 完了';
		return;
	}

	let completedCount = 0;

	todos.forEach((todo, index) => {
		if (todo.completed) completedCount++;

		const li = document.createElement('li');
		li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

		li.innerHTML = `
			<input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
			<span class="todo-text">${escapeHtml(todo.text)}</span>
			<div class="todo-actions">
				<button class="btn-small move-up-btn" ${index === 0 ? 'disabled' : ''}>▲</button>
				<button class="btn-small move-down-btn" ${index === todos.length - 1 ? 'disabled' : ''}>▼</button>
				<button class="btn-small edit-btn">編集</button>
				<button class="btn-small delete delete-btn">削除</button>
			</div>
		`;

		// イベントリスナーの設定
		const checkbox = li.querySelector('.todo-checkbox');
		checkbox.addEventListener('change', () => toggleTodoComplete(todo.id));

		const editBtn = li.querySelector('.edit-btn');
		editBtn.addEventListener('click', () => editTodoText(todo.id));

		const deleteBtn = li.querySelector('.delete-btn');
		deleteBtn.addEventListener('click', () => deleteTodoItem(todo.id));

		const moveUpBtn = li.querySelector('.move-up-btn');
		moveUpBtn.addEventListener('click', () => moveTodoUp(index));

		const moveDownBtn = li.querySelector('.move-down-btn');
		moveDownBtn.addEventListener('click', () => moveTodoDown(index));

		todoListEl.appendChild(li);
	});

	todoCountEl.textContent = `${completedCount}/${todos.length} 完了`;
}

function moveTodoUp(index) {
	if (index === 0) return;
	const temp = todos[index];
	todos[index] = todos[index - 1];
	todos[index - 1] = temp;
	saveGoalAndTodos();
	renderTodoList();
}

function moveTodoDown(index) {
	if (index === todos.length - 1) return;
	const temp = todos[index];
	todos[index] = todos[index + 1];
	todos[index + 1] = temp;
	saveGoalAndTodos();
	renderTodoList();
}

function toggleTodoComplete(id) {
	todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
	saveGoalAndTodos();
	renderTodoList();
	checkAllTasksCompleted();
}

function handleAddManualTask() {
	const text = manualInput.value.trim();
	if (!text) return;

	todos.push({
		id: Date.now(),
		text: text,
		completed: false
	});

	saveGoalAndTodos();
	renderTodoList();
	manualInput.value = '';
}

function editTodoText(id) {
	const targetTodo = todos.find(t => t.id === id);
	if (!targetTodo) return;

	const newText = prompt('タスク内容を編集:', targetTodo.text);
	if (newText !== null && newText.trim() !== '') {
		todos = todos.map(t => t.id === id ? { ...t, text: newText.trim() } : t);
		saveGoalAndTodos();
		renderTodoList();
	}
}

function deleteTodoItem(id) {
	todos = todos.filter(t => t.id !== id);
	saveGoalAndTodos();
	renderTodoList();
}

// XSS対策：HTML特殊文字のエスケープ
function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/</g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function checkAllTasksCompleted() {
	const isAllCompleted = todos.length > 0 && todos.every(todo => todo.completed);

	if (isAllCompleted) {
		setTimeout(() => {
			alert('お疲れ様でした！すべてのタスクを完了しました！目標達成です！');
		}, 100);
	}
}