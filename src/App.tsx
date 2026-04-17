import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import confetti from 'canvas-confetti';
import { getEmpathyAndNextQuestion, generateDashboardData, chatWithSosCoach, chatWithLogCoach, generateVisionImageKeyword, analyzeGoalsAndHabits, generateCelebrationNote } from './services/gemini';

export default function App() {
  const [appPhase, setAppPhase] = useState<'onboarding' | 'dashboard'>('onboarding');
  const [currentTab, setCurrentTab] = useState<'home' | 'log' | 'goal' | 'settings'>('home');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [completedHabits, setCompletedHabits] = useState<number[]>([]);

  // Gamification & Celebration
  const [userLevel, setUserLevel] = useState(4);
  const [userExp, setUserExp] = useState(650);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);

  // Goal Analysis & Reminders
  const [goalReminder, setGoalReminder] = useState(true);
  const [isAiGoalsLoading, setIsAiGoalsLoading] = useState(false);
  const [aiGoalsAdvice, setAiGoalsAdvice] = useState<string>("「目標と習慣の組み合わせを分析し、科学的なエビデンスに基づいた達成予測とアドバイスを提供します。」");

  const handleAnalyzeGoals = async () => {
    setIsAiGoalsLoading(true);
    const advice = await analyzeGoalsAndHabits(goals, habits);
    setAiGoalsAdvice(advice);
    setIsAiGoalsLoading(false);
  };

  const handleGoalAchieved = () => {
    if (selectedGoalIndex === null) return;
    const goal = goals[selectedGoalIndex];
    const title = goal.title;
    
    setIsGoalDetailsModalOpen(false);
    setIsCelebrationOpen(true);
    
    const addedExp = 350;
    const newExp = userExp + addedExp;
    const newLevel = newExp >= 1000 ? userLevel + 1 : userLevel;
    const finalExp = newExp >= 1000 ? newExp - 1000 : newExp;

    setCelebrationData({
       goalTitle: title,
       note: "",
       addedExp,
       oldLvl: userLevel,
       newLvl: newLevel
    });

    // Move to achieved state right away so it is reflected when we go back
    setGoals(prev => prev.filter((_, i) => i !== selectedGoalIndex));
    setAchievedGoals(prev => [{ ...goal, achievedAt: new Date() }, ...prev]);
    setSelectedGoalIndex(null);

    generateCelebrationNote(title).then(note => {
       setCelebrationData((prev: any) => ({ ...prev, note }));
       setUserLevel(newLevel);
       setUserExp(finalExp);
    });
  };

  const completeCelebration = () => {
    setIsCelebrationOpen(false);
    setCelebrationData(null);
    setCurrentTab('home');
  };

  // Vision Editor State
  const [isVisionEditModalOpen, setIsVisionEditModalOpen] = useState(false);
  const [visionForm, setVisionForm] = useState({ title: '', description: '' });
  const [isVisionSaving, setIsVisionSaving] = useState(false);

  const openVisionEditModal = () => {
    setVisionForm({
      title: dashboardData?.vision?.title || "あなたのFIREの聖域：2029年 ポルトガルの海岸線",
      description: dashboardData?.vision?.description || "ビジュアライゼーション・アンカー：ビジネスが成長していく中で、心地よい海風を感じている自分を想像しましょう。"
    });
    setIsVisionEditModalOpen(true);
  };

  const saveVision = async () => {
    setIsVisionSaving(true);
    const keyword = await generateVisionImageKeyword(visionForm.title, visionForm.description);
    const newImgUrl = `https://picsum.photos/seed/${keyword}/1920/1080?blur=4`;
    
    setDashboardData((prev: any) => ({
      ...prev,
      vision: {
        ...prev?.vision,
        title: visionForm.title,
        description: visionForm.description,
        imgUrl: newImgUrl
      }
    }));
    
    setIsVisionSaving(false);
    setIsVisionEditModalOpen(false);
  };

  // Profile State
  const [profile, setProfile] = useState({
    name: "未来の自分さん",
    email: "ryogajsb927@gmail.com",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7Xa9RVUfOnpANAGM7Yv1_ZYPC_4QhDrA4GbEqknYHdbK0Dag6rSKVgy-iUVapdXIqlviFB5vFamLl4EF_dSvzXsG7zHN8OJ9LmEobb5dB8pYkrJu33igi9pWks6nNC4yuEHVRk70xoDmdp--t3Q4jiMLAtzNJehFvR89BL0t33TYWijp-R2kkgXXFaJt47_DGziQee3EJK2ESeosP1dPqjUt6vWEq9kUi-hy0MqCvAYl8sF4KQSJLfQnAkDkRsmjg9vCdAbM99pE"
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(profile);

  const openProfileModal = () => {
    setProfileForm(profile);
    setIsProfileModalOpen(true);
  };

  const saveProfile = () => {
    setProfile(profileForm);
    setIsProfileModalOpen(false);
  };

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("07:00");

  // Settings/Modals State
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileForm(prev => ({ ...prev, avatarUrl: url }));
    }
  };

  const handleLogout = () => {
    setAppPhase('onboarding');
    setCurrentTab('home');
    setIsLogoutModalOpen(false);
  };

  const handleDeleteAccount = () => {
    setAppPhase('onboarding');
    setDashboardData(null);
    setCompletedHabits([]);
    setGoals(defaultGoals);
    setHabits(defaultHabits);
    setCurrentTab('home');
    setIsDeleteAccountModalOpen(false);
  };

  // Goals State
  const defaultGoals = [
    { category: "ビジネスの成長", title: "SaaSパイプラインの自動化", description: "第4四半期までに、週5時間未満の運用で月商1.5万ドル（約220万円）を達成する。", ifThen: "もしタスクを細かく管理したくなったら、代わりに業務マニュアルを作成する" },
  ];
  const [goals, setGoals] = useState<any[]>(defaultGoals);
  const [achievedGoals, setAchievedGoals] = useState<any[]>([
    { category: "経済的自由", title: "ブリッジファンド・ポートフォリオ完成", description: "早期リタイア後の2年間の生活を支えるため、12万ドルの流動資産を蓄える。", ifThen: "もし市場の変動で不安になったら、10年間の成長チャートを見直す", achievedAt: new Date(new Date().setDate(new Date().getDate() - 5)) }
  ]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);
  const [goalForm, setGoalForm] = useState({ category: '', title: '', description: '', ifThen: '' });

  // Goal Details (SMART-ER) Phase
  const [isGoalDetailsModalOpen, setIsGoalDetailsModalOpen] = useState(false);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState<number | null>(null);

  const openGoalDetails = (index: number) => {
    setSelectedGoalIndex(index);
    setIsGoalDetailsModalOpen(true);
  };

  // Simulation State
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [simulationState, setSimulationState] = useState<'initial' | 'running' | 'finished'>('initial');
  const [simulationTimeLeft, setSimulationTimeLeft] = useState(600);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulationModalOpen && simulationState === 'running') {
      interval = setInterval(() => {
        setSimulationTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setSimulationState('finished');
            if (!audioRef.current) {
              audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
              audioRef.current.loop = true;
            }
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulationModalOpen, simulationState]);

  const startSimulation = () => {
    setSimulationState('running');
    setSimulationTimeLeft(600);
  };

  const closeSimulation = () => {
    setIsSimulationModalOpen(false);
    setSimulationState('initial');
    setSimulationTimeLeft(600);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const openGoalModal = (index: number | null = null) => {
    if (index !== null) {
      setGoalForm(goals[index]);
      setEditingGoalIndex(index);
    } else {
      setGoalForm({ category: '', title: '', description: '', ifThen: '' });
      setEditingGoalIndex(null);
    }
    setIsGoalModalOpen(true);
  };

  const saveGoal = () => {
    if (editingGoalIndex !== null) {
      const newGoals = [...goals];
      newGoals[editingGoalIndex] = goalForm;
      setGoals(newGoals);
    } else {
      if (goals.length < 3) {
        setGoals([...goals, goalForm]);
      } else {
        alert("進行中の目標は最大3つまでです。達成済みの目標がある場合は、先にそれを完了させてください。");
        return;
      }
    }
    setIsGoalModalOpen(false);
  };

  const deleteGoal = () => {
    if (editingGoalIndex !== null) {
      const newGoals = goals.filter((_, i) => i !== editingGoalIndex);
      setGoals(newGoals);
      setIsGoalModalOpen(false);
    }
  };

  // Habits State
  const defaultHabits = [
    { title: "朝6:30に起きる", description: "概日リズムを整える" },
    { title: "1行だけノートを書く", description: "思考の明文化" },
    { title: "2029年のビジョンを見直す", description: "脳のアンテナを立てる" }
  ];
  const [habits, setHabits] = useState<any[]>(defaultHabits);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabitIndex, setEditingHabitIndex] = useState<number | null>(null);
  const [habitForm, setHabitForm] = useState({ title: '', description: '' });

  // Mood/Reflection Tracker State
  const [beforeMood, setBeforeMood] = useState(3);
  const [afterMood, setAfterMood] = useState(3);
  const [reflectionText, setReflectionText] = useState("");
  const [isLogSaved, setIsLogSaved] = useState(false);
  const [dailyLogs, setDailyLogs] = useState<{id: string, date: Date, before: number, after: number, reflection: string}[]>([]);

  // Habituation Graph Data (Mock)
  const habituationData = Array.from({ length: 30 }).map((_, i) => ({
    day: i + 1,
    automation: Math.min(100, Math.floor(10 + Math.pow(i, 1.4) * 1.5 + Math.random() * 5))
  }));

  const handleSaveLog = () => {
    setIsLogSaved(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#45d8ed', '#006874', '#98f0ff']
    });
    
    // Create new log entry
    const newLog = {
      id: Date.now().toString(),
      date: new Date(),
      before: beforeMood,
      after: afterMood,
      reflection: reflectionText
    };

    setTimeout(() => {
      setDailyLogs(prev => [newLog, ...prev]);
      setIsLogSaved(false);
      setReflectionText("");
      setBeforeMood(3);
      setAfterMood(3);
    }, 1500); // 1.5s after confetti
  };

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [habitHistory, setHabitHistory] = useState<Record<string, number[]>>(() => {
    const mock: Record<string, number[]> = {};
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDateStr(d);
        if (i <= 3) {
            mock[dateStr] = [0]; // Contiguous for the last 3 days
        } else {
            if (Math.random() > 0.5) mock[dateStr] = [0];
        }
    }
    return mock;
  });

  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    let isTodayDone = completedHabits.length > 0;
    
    let checkDay = new Date(today);
    if (!isTodayDone) {
       checkDay.setDate(checkDay.getDate() - 1);
       const yDateStr = formatDateStr(checkDay);
       // If empty yesterday, streak is broken -> 0
       if (!habitHistory[yDateStr] || habitHistory[yDateStr].length === 0) {
           return 0;
       }
    } else {
       streak++;
       checkDay.setDate(checkDay.getDate() - 1);
    }

    for (let i = 0; i < 30; i++) {
       const dStr = formatDateStr(checkDay);
       if (habitHistory[dStr] && habitHistory[dStr].length > 0) {
           streak++;
           checkDay.setDate(checkDay.getDate() - 1);
       } else {
           break;
       }
    }
    return streak;
  };

  const openHabitModal = (index: number | null = null) => {
    if (index !== null) {
      setHabitForm(habits[index]);
      setEditingHabitIndex(index);
    } else {
      setHabitForm({ title: '', description: '' });
      setEditingHabitIndex(null);
    }
    setIsHabitModalOpen(true);
  };

  const saveHabit = () => {
    if (editingHabitIndex !== null) {
      const newHabits = [...habits];
      newHabits[editingHabitIndex] = habitForm;
      setHabits(newHabits);
    } else {
      setHabits([...habits, habitForm]);
    }
    setIsHabitModalOpen(false);
  };

  const deleteHabit = () => {
    if (editingHabitIndex !== null) {
      const newHabits = habits.filter((_, i) => i !== editingHabitIndex);
      setHabits(newHabits);
      setCompletedHabits(prev => prev.filter(i => i !== editingHabitIndex).map(i => i > editingHabitIndex ? i - 1 : i));
      setIsHabitModalOpen(false);
    }
  };

  // Onboarding State
  const [onboardingHistory, setOnboardingHistory] = useState<{role: string, text: string}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [onboardingInput, setOnboardingInput] = useState('');
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // SOS State
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [sosHistory, setSosHistory] = useState<{role: string, text: string}[]>([]);
  const [sosInput, setSosInput] = useState('');
  const [isSosLoading, setIsSosLoading] = useState(false);
  const sosChatEndRef = useRef<HTMLDivElement>(null);

  // Log Coach State
  const [logCoachHistory, setLogCoachHistory] = useState<{role: string, text: string}[]>([]);
  const [logCoachInput, setLogCoachInput] = useState('');
  const [isLogCoachLoading, setIsLogCoachLoading] = useState(false);
  const logCoachEndRef = useRef<HTMLDivElement>(null);

  // Initialize Onboarding
  useEffect(() => {
    if (appPhase === 'onboarding' && onboardingHistory.length === 0) {
      startOnboarding();
    }
  }, [appPhase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [onboardingHistory, isOnboardingLoading]);

  useEffect(() => {
    sosChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sosHistory, isSosModalOpen, isSosLoading]);

  useEffect(() => {
    logCoachEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logCoachHistory, isLogCoachLoading]);

  const startOnboarding = async () => {
    setIsOnboardingLoading(true);
    try {
      const firstQuestion = await getEmpathyAndNextQuestion([], 0);
      setOnboardingHistory([{ role: 'model', text: firstQuestion }]);
    } catch (e) {
      console.error(e);
    }
    setIsOnboardingLoading(false);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingInput.trim() || isOnboardingLoading) return;

    const userMessage = onboardingInput.trim();
    setOnboardingInput('');
    const newHistory = [...onboardingHistory, { role: 'user', text: userMessage }];
    setOnboardingHistory(newHistory);
    setIsOnboardingLoading(true);

    try {
      if (currentQuestionIndex >= 4) {
        // Finished questions, generate dashboard
        setOnboardingHistory(prev => [...prev, { role: 'model', text: 'ありがとうございます。すべての質問にお答えいただきました。あなた専用のダッシュボードを作成しています...' }]);
        const data = await generateDashboardData(newHistory);
        setDashboardData(data);
        if (data.goals) setGoals(data.goals);
        if (data.habits) setHabits(data.habits);
        setAppPhase('dashboard');
      } else {
        const nextIndex = currentQuestionIndex + 1;
        const response = await getEmpathyAndNextQuestion(newHistory, nextIndex);
        setOnboardingHistory(prev => [...prev, { role: 'model', text: response }]);
        setCurrentQuestionIndex(nextIndex);
      }
    } catch (e) {
      console.error(e);
      setOnboardingHistory(prev => [...prev, { role: 'model', text: 'エラーが発生しました。もう一度お試しください。' }]);
    }
    setIsOnboardingLoading(false);
  };

  const handleSosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosInput.trim() || isSosLoading) return;

    const userMessage = sosInput.trim();
    setSosInput('');
    const newHistory = [...sosHistory, { role: 'user', text: userMessage }];
    setSosHistory(newHistory);
    setIsSosLoading(true);

    try {
      const response = await chatWithSosCoach(newHistory, userMessage);
      setSosHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
    }
    setIsSosLoading(false);
  };

  const handleLogCoachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logCoachInput.trim() || isLogCoachLoading) return;

    const userMessage = logCoachInput.trim();
    setLogCoachInput('');
    const newHistory = [...logCoachHistory, { role: 'user', text: userMessage }];
    setLogCoachHistory(newHistory);
    setIsLogCoachLoading(true);

    try {
      const response = await chatWithLogCoach(dailyLogs, newHistory, userMessage);
      setLogCoachHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
    }
    setIsLogCoachLoading(false);
  };

  const openSosModal = (initialMessage?: string) => {
    setIsSosModalOpen(true);
    if (sosHistory.length === 0) {
      setSosHistory([{ role: 'model', text: 'おかえりなさい。深呼吸を一度しましょう。今、何に対して一番「心がざわざわ」していますか？ どんな小さなことでも構いません、言葉にしてみてください。' }]);
    }
    if (initialMessage) {
       setSosInput(initialMessage);
    }
  };

  if (appPhase === 'onboarding') {
    return (
      <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
        <header className="fixed top-0 z-50 w-full px-6 py-4 flex justify-between items-center bg-stone-50/70 backdrop-blur-xl shadow-sm">
          <div className="w-20"></div> {/* Spacer for centering */}
          <h1 className="font-headline font-bold text-primary text-xl">現状解剖セッション</h1>
          <button 
            onClick={() => setAppPhase('dashboard')}
            className="w-20 text-sm text-on-surface-variant hover:text-primary transition-colors text-right"
          >
            スキップ
          </button>
        </header>
        <main className="flex-1 pt-24 pb-32 px-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
          {onboardingHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-6 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface-container-lowest shadow-md rounded-bl-sm'}`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isOnboardingLoading && (
            <div className="flex justify-start">
              <div className="bg-surface-container-lowest shadow-md p-6 rounded-2xl rounded-bl-sm flex gap-2 items-center">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </main>
        <div className="fixed bottom-0 w-full bg-stone-50/90 backdrop-blur-md p-4 border-t border-outline-variant/20">
          <form onSubmit={handleOnboardingSubmit} className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              value={onboardingInput}
              onChange={e => setOnboardingInput(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleOnboardingSubmit(e as any);
                }
              }}
              disabled={isOnboardingLoading}
              placeholder="メッセージを入力... (改行: Enter / 送信設定: 送信ボタンまたはCmd+Enter)"
              rows={3}
              className="flex-1 bg-surface-container-highest border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary resize-y"
            />
            <button type="submit" disabled={isOnboardingLoading || !onboardingInput.trim()} className="bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform disabled:opacity-50">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Phase
  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-24">
      <header className="fixed top-0 z-40 w-full px-6 py-4 flex justify-between items-center bg-stone-50/70 dark:bg-stone-900/70 backdrop-blur-xl shadow-[0_32px_64px_rgba(26,28,26,0.04)] border-none tonal-transition">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
            <img className="w-full h-full object-cover" alt="profile" src={profile.avatarUrl} />
          </div>
          <h1 className="font-headline font-bold text-cyan-900 dark:text-cyan-200">おはようございます、{profile.name}</h1>
        </div>
      </header>

      {currentTab === 'home' && (
        <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12 pb-32">
          {/* Hero */}
        <section className="relative rounded-xl overflow-hidden min-h-[400px] flex flex-col justify-end p-8 md:p-12 shadow-2xl group">
          <div className="absolute inset-0 z-0">
            <img className="w-full h-full object-cover brightness-75 transition-all duration-700" alt="vision" src={dashboardData?.vision?.imgUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBzryvOtWfZA7a1Y1TO66PtEL0wJSUwAn9iFzyzHwVr2iQMdqIXgjpSUvxUhzAQ_m5GPqyO0ulp5IVZp_3DVIzFnuf__L2SBsUb1ba7mEXr-8EpXOZpwUjyf7Ipj-LIlHyNyxddkFE0TO5FrIDklook4J9JmxJdi4byyCIrAWpgw-cc_wzjVtJ4Q1TOdzqYV88pprLQN3lsdk4LZAjIpeyqOrHf1wLUl1Q88O5lb3upuDPyN0yWbyNiVFbhAGsPTNW5NnKISLL6zp0"} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
          
          <button 
            onClick={openVisionEditModal}
            className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>

          <div className="relative z-10 space-y-6 max-w-2xl">
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
              {dashboardData?.vision?.title || "あなたのFIREの聖域：2029年 ポルトガルの海岸線"}
            </h2>
            <div className="glass-card p-6 rounded-lg space-y-4">
              <p className="text-white/90 font-medium">{dashboardData?.vision?.description || "ビジュアライゼーション・アンカー：ビジネスが成長していく中で、心地よい海風を感じている自分を想像しましょう。"}</p>
              <div className="space-y-2">
                <label className="text-xs font-label uppercase tracking-widest text-white/70">この景色を見て、今どんな気持ちですか？</label>
                <input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-white placeholder-white/40 focus:ring-2 focus:ring-primary-fixed-dim transition-all" placeholder="穏やかで、集中できていて..." type="text" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Goals (Restored to home based on request) */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-end">
              <h3 className="font-headline text-2xl font-bold text-primary">主要な成長の柱</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal: any, idx: number) => (
                <div onClick={() => openGoalDetails(idx)} key={idx} className="bg-surface-container-lowest p-8 rounded-lg shadow-[0_32px_64px_rgba(0,0,0,0.04)] space-y-6 flex flex-col border border-outline-variant/10 cursor-pointer hover:-translate-y-1 transition-transform relative">
                  <div className="flex justify-between items-start">
                    <div className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{goal.category}</div>
                  </div>
                  <div>
                    <h4 className="font-headline text-xl font-bold mb-2">{goal.title}</h4>
                    <p className="text-on-surface-variant text-sm">{goal.description}</p>
                  </div>
                  <div className="bg-tertiary-container p-4 rounded-lg mt-auto">
                    <p className="text-xs font-bold text-on-tertiary-container uppercase mb-2">If-Thenプランニング</p>
                    <p className="text-on-tertiary-fixed-variant italic text-sm">「{goal.ifThen}」</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Habits Check in for Home */}
          <section className="space-y-6">
            <div className="flex justify-between items-end">
              <h3 className="font-headline text-2xl font-bold text-primary">今日の小さな一歩</h3>
            </div>
            
            {(() => {
              const progress = habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0;
              
              return (
                <div className="bg-surface-container-low rounded-lg p-6 space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-on-surface-variant">達成度</span>
                      <span className="font-bold text-primary">{progress}% ({completedHabits.length}/{habits.length})</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {habits.map((habit: any, idx: number) => {
                      const isCompleted = completedHabits.includes(idx);
                      // Derive a matched goal if possible
                      const matchedGoal = goals.length > 0 ? goals[idx % goals.length] : null;
                      return (
                        <div key={idx} className="space-y-2">
                          <motion.div 
                            onClick={() => setCompletedHabits(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                            initial={false}
                            animate={isCompleted ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                            transition={{ duration: 0.3 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex items-center gap-4 p-4 rounded-xl shadow-sm group cursor-pointer transition-all duration-300 ${isCompleted ? 'bg-surface-container-lowest opacity-60' : 'bg-surface-container-lowest hover:shadow-md hover:-translate-y-0.5'}`}
                          >
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isCompleted ? 'border-primary bg-primary text-white scale-110' : 'border-outline-variant group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary'}`}>
                              <span className={`material-symbols-outlined text-lg transition-all duration-300 ${isCompleted ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover:opacity-50 group-hover:scale-100'}`}>check</span>
                            </div>
                            <div className="flex-1">
                               <p className={`font-headline font-semibold transition-all duration-300 ${isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{habit.title}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 {matchedGoal && <span className="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{matchedGoal.category}</span>}
                                 <p className="text-xs text-on-surface-variant flex-1">{habit.description}</p>
                               </div>
                            </div>
                          </motion.div>
                          
                          {/* If-Then Reminder if not completed */}
                          {!isCompleted && matchedGoal && (
                            <div className="pl-14 pr-4">
                              <div className="bg-tertiary-container/50 border border-tertiary/20 rounded-lg p-3 flex items-start gap-3">
                                <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">lightbulb</span>
                                <div>
                                  <p className="text-xs font-bold text-on-surface mb-1">途切れそうな時は代替行動を（If-Then）</p>
                                  <p className="text-xs text-on-surface-variant leading-relaxed">
                                    目標「{matchedGoal.title}」のため：「{matchedGoal.ifThen}」
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Simulation Orb */}
            <div 
              onClick={() => setIsSimulationModalOpen(true)}
              className="relative group cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-container p-8 text-center orb-glow transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <span className="material-symbols-outlined text-4xl text-white mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                <h4 className="text-white font-headline font-bold text-xl mb-2">未来への没入シミュレーション</h4>
                <p className="text-white/80 text-sm">10分間、未来の自分になりきって神経系をリセットしましょう。</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      )}

      {currentTab === 'goal' && (
        <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12 pb-32">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-3xl text-primary">emoji_events</span>
            <h2 className="font-headline text-2xl font-bold text-primary">目標と習慣の設定</h2>
          </div>

          {/* AI Coach Goal Analysis & Reminder */}
          <section className="bg-surface-container-low rounded-2xl p-6 md:p-8 space-y-6 shadow-sm border border-outline-variant/10">
             <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
                <span className="material-symbols-outlined text-3xl text-secondary">psychology</span>
                <h3 className="font-headline text-2xl font-bold text-secondary">AIコーチの目標達成度分析</h3>
             </div>
             <div className="flex flex-col md:flex-row gap-8">
                 <div className="flex-1 space-y-4">
                     <p className="text-on-surface-variant text-sm leading-relaxed min-h-[60px]">{aiGoalsAdvice}</p>
                     <button onClick={handleAnalyzeGoals} disabled={isAiGoalsLoading} className="px-5 py-3 bg-secondary text-on-secondary rounded-full font-bold text-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors disabled:opacity-70">
                       {isAiGoalsLoading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">insights</span>}
                       {isAiGoalsLoading ? "分析中..." : "最新の状況を分析する"}
                     </button>
                 </div>
                 <div className="w-full md:w-1/3 bg-surface-container p-5 rounded-xl border border-outline-variant/20 flex flex-col justify-center">
                     <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">event_available</span> 目標フォローアップ</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={goalReminder} onChange={(e) => setGoalReminder(e.target.checked)}/>
                          <div className="w-11 h-6 bg-outline-variant/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                     </div>
                     <p className="text-xs text-on-surface-variant leading-relaxed">あなたの目標進捗と習慣定着度を週に1度AIが見直し、軌道修正のリマインド通知を送ります。</p>
                 </div>
             </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Goals Setting */}
            <section className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-4">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-primary">主要な成長の柱</h3>
                  <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    進行中の目標は最大3つまで
                  </p>
                </div>
                {goals.length < 3 && (
                  <button onClick={() => openGoalModal()} className="text-sm font-bold text-primary hover:bg-primary-container px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">add</span>追加
                  </button>
                )}
              </div>
              
              {goals.length === 0 ? (
                <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-dashed border-outline-variant text-center space-y-3">
                  <span className="material-symbols-outlined text-4xl text-outline">flag</span>
                  <p className="text-on-surface-variant font-bold">現在進行中の目標はありません</p>
                  <button onClick={() => openGoalModal()} className="text-sm font-bold bg-primary text-on-primary px-4 py-2 rounded-full transition-colors">新しい目標を設定する</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {goals.map((goal: any, idx: number) => (
                    <div onClick={() => openGoalDetails(idx)} key={idx} className="bg-surface-container-lowest p-8 rounded-lg shadow-[0_32px_64px_rgba(0,0,0,0.04)] space-y-6 flex flex-col border border-outline-variant/10 cursor-pointer hover:-translate-y-1 transition-transform relative group">
                      <div className="flex justify-between items-start">
                        <div className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{goal.category}</div>
                        <button onClick={(e) => { e.stopPropagation(); openGoalModal(idx); }} className="text-outline-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </div>
                      <div>
                        <h4 className="font-headline text-xl font-bold mb-2">{goal.title}</h4>
                        <p className="text-on-surface-variant text-sm">{goal.description}</p>
                      </div>
                      <div className="bg-tertiary-container p-4 rounded-lg mt-auto">
                        <p className="text-xs font-bold text-on-tertiary-container uppercase mb-2">If-Thenプランニング</p>
                        <p className="text-on-tertiary-fixed-variant italic text-sm">「{goal.ifThen}」</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Habits Setting */}
            <section className="space-y-6">
              <div className="flex justify-between items-end">
                <h3 className="font-headline text-2xl font-bold text-primary">日々の小さな一歩</h3>
                <button onClick={() => openHabitModal()} className="text-sm font-bold text-primary hover:bg-primary-container px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">add</span>追加
                </button>
              </div>
              
              <div className="bg-surface-container-low rounded-lg p-6 space-y-4">
                <div className="space-y-4">
                  {habits.map((habit: any, idx: number) => {
                    const matchedGoal = goals.length > 0 ? goals[idx % goals.length] : null;
                    return (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl shadow-sm bg-surface-container-lowest border border-outline-variant/10 group transition-all duration-300">
                        <div className="flex-1">
                            <p className={`font-headline font-semibold text-on-surface`}>{habit.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {matchedGoal && <span className="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{matchedGoal.category}</span>}
                              <p className="text-xs text-on-surface-variant flex-1">{habit.description}</p>
                            </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openHabitModal(idx); }} 
                          className="text-outline-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-2"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Achieved Goals Section */}
          {achievedGoals.length > 0 && (
            <section className="pt-8 border-t border-outline-variant/20 mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-3xl">workspace_premium</span>
                  達成の殿堂
                </h3>
                <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-xs font-bold">
                  {achievedGoals.length}個の目標を達成！
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievedGoals.map((ag: any, idx: number) => (
                  <div key={idx} className="bg-gradient-to-br from-surface-container-lowest to-surface-container p-6 rounded-xl shadow-sm border border-tertiary/20 flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform">
                    <div className="flex items-start justify-between w-full">
                       <span className="text-[10px] bg-tertiary/10 text-tertiary px-2 py-1 rounded border border-tertiary/20 font-bold tracking-widest uppercase">ACHIEVED</span>
                       {ag.achievedAt && (
                         <span className="text-xs text-on-surface-variant font-medium">
                           {ag.achievedAt.toLocaleDateString('ja-JP')}
                         </span>
                       )}
                    </div>
                    <div>
                      <h4 className="font-headline text-lg font-bold text-on-surface">{ag.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{ag.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      )}

      {currentTab === 'log' && (
        <main className="pt-24 px-6 max-w-7xl mx-auto space-y-8 pb-32">
          {/* Restored Goals Section at the top of log */}
          <section className="space-y-4 mb-12">
            <h3 className="font-headline text-2xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">flag</span>
              主要な成長の柱
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal: any, idx: number) => (
                <div onClick={() => openGoalDetails(idx)} key={idx} className="bg-surface-container-lowest p-5 rounded-lg shadow-sm border border-outline-variant/10 cursor-pointer hover:-translate-y-1 transition-transform relative">
                  <div className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block mb-3">{goal.category}</div>
                  <h4 className="font-headline text-base font-bold text-on-surface line-clamp-1">{goal.title}</h4>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-3xl text-primary">calendar_month</span>
            <h2 className="font-headline text-2xl font-bold text-primary">
              習慣ログ <span className="text-sm font-normal text-on-surface-variant ml-2">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}現在</span>
            </h2>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 relative">
            {calculateStreak() >= 7 && (
              <div className="absolute -top-3 -right-2 bg-[#ff6b6b] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-bounce z-10">
                🔥 {calculateStreak()}日連続！脳回路が強化中
              </div>
            )}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 text-center flex flex-col items-center justify-center gap-2 relative overflow-hidden">
              <span className="material-symbols-outlined text-secondary text-3xl">local_fire_department</span>
              <p className="text-sm text-on-surface-variant font-bold">連続達成</p>
              <p className="text-4xl font-headline font-bold text-on-surface">{calculateStreak()}<span className="text-lg text-on-surface-variant ml-1">日</span></p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">task_alt</span>
              <p className="text-sm text-on-surface-variant font-bold">今日の達成率</p>
              <p className="text-4xl font-headline font-bold text-on-surface">{habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0}<span className="text-lg text-on-surface-variant ml-1">%</span></p>
            </div>
          </div>

          {/* Real Calendar View */}
          <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 space-y-6">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              過去30日間の活動
            </h3>
            
            {(() => {
              // Generate Calendar for the current month
              const todayObj = new Date();
              const year = todayObj.getFullYear();
              const month = todayObj.getMonth();
              
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDayIndex = new Date(year, month, 1).getDay();
              
              const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
              
              return (
                <div className="max-w-md mx-auto">
                  <h4 className="text-center font-bold text-lg mb-4 text-on-surface">{year}年 {month + 1}月</h4>
                  <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
                    {dayLabels.map(label => (
                      <div key={label} className="text-xs font-bold text-on-surface-variant uppercase">{label}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-full aspect-square" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayDate = new Date(year, month, i + 1);
                      const isToday = dayDate.toDateString() === todayObj.toDateString();
                      const dateStr = formatDateStr(dayDate);
                      const displayDate = dayDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                      
                      let intensity = 0;
                      if (isToday) {
                        intensity = habits.length > 0 ? Math.ceil((completedHabits.length / habits.length) * 3) : 0;
                      } else {
                        const doneList = habitHistory[dateStr] || [];
                        intensity = habits.length > 0 && doneList.length > 0 ? Math.ceil((doneList.length / habits.length) * 3) : 0;
                      }
                      
                      const colors = [
                        'bg-surface-container-highest dark:bg-stone-800 text-on-surface-variant', 
                        'bg-primary/30 text-on-surface', 
                        'bg-primary/60 text-white', 
                        'bg-primary text-white'
                      ];
                      
                      // Highlight today with secondary color border
                      const activeClass = isToday ? 'ring-2 ring-secondary ring-offset-2 ring-offset-background' : '';
                      
                      return (
                         <div 
                           key={`day-${i}`} 
                           className={`w-full aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-110 ${colors[intensity]} ${activeClass}`}
                           title={`${displayDate} : ${isToday ? completedHabits.length : (habitHistory[dateStr]?.length || 0)}/${habits.length} 達成`}
                         >
                           {i + 1}
                         </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              習慣の定着度グラフ（自動化レベル）
            </h3>
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={habituationData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                  <YAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }} 
                    formatter={(value) => [`${value}%`, '定着度']}
                    labelFormatter={(label) => `${label}日目`}
                  />
                  <Line type="monotone" dataKey="automation" stroke="var(--color-primary)" strokeWidth={4} dot={false} activeDot={{ r: 6, fill: 'var(--color-primary)' }} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-on-surface-variant text-center mt-2">右肩上がりは努力が確実に身についている証拠です。最初は意識的な努力が必要ですが、徐々に考えずにできるようになります。</p>
            </div>
          </section>

          {/* Habit specific stats */}
          <section className="space-y-4">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              習慣ごとの記録
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habits.map((habit, idx) => {
                const mockRate = Math.floor(Math.random() * 40 + 60); // 60-99%
                return (
                  <div key={idx} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/10 flex justify-between items-center">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-on-surface line-clamp-1">{habit.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1">累計達成: {Math.floor(Math.random() * 20 + 10)}回</p>
                    </div>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center relative">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-container-highest" />
                        <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary" strokeDasharray={`${(mockRate / 100) * 150} 150`} strokeLinecap="round" />
                      </svg>
                      <span className="text-xs font-bold text-on-surface">{mockRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AI Coach Advice */}
          <section className="bg-primary-container p-6 rounded-2xl shadow-sm border border-primary/20 space-y-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 text-primary opacity-10 blur-xl">
              <span className="material-symbols-outlined text-9xl">psychology</span>
            </div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-primary-container text-sm">脳の可塑性に関するコーチからのアドバイス</h4>
                <p className="text-on-primary-container text-sm leading-relaxed">
                  「繰り返すたびに脳の回路（シナプス）が確実に強くなっています。今日のその少しの努力が、自動化された未来のあなたを作っています。単調に思えるかもしれませんが、脳は確実に進化しています！」
                </p>
              </div>
            </div>
          </section>

          {/* Mood Tracking and Reflection Form */}
          <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 space-y-6">
             <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">mood</span>
              感情の変化と行動の記録
            </h3>
            
            <div className="space-y-6 bg-surface-container/30 p-5 rounded-xl border border-outline-variant/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-on-surface text-center">行動前の気分</p>
                  <input type="range" min="1" max="5" value={beforeMood} onChange={(e) => setBeforeMood(Number(e.target.value))} className="w-full accent-secondary" />
                  <div className="flex justify-between text-2xl px-1">
                    <span className="grayscale opacity-50">😖</span>
                    <span className="grayscale opacity-70">😕</span>
                    <span>😐</span>
                    <span>🙂</span>
                    <span>🤩</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-bold text-on-surface text-center">行動後の気分</p>
                  <input type="range" min="1" max="5" value={afterMood} onChange={(e) => setAfterMood(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-2xl px-1">
                    <span className="grayscale opacity-50">😖</span>
                    <span className="grayscale opacity-70">😕</span>
                    <span>😐</span>
                    <span>🙂</span>
                    <span>🤩</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-bold text-on-surface-variant block mb-2">今日の気づき（メタ認知）</label>
                <textarea 
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="「やる前は少し眠かったけど、やった後は爽快になった」など、行動による変化や気づきを記入しましょう。"
                  className="w-full bg-surface-container p-4 rounded-xl text-sm border-none focus:ring-2 focus:ring-primary outline-none transition-shadow text-on-surface resize-none h-24"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveLog}
                  disabled={isLogSaved}
                  className={`flex items-center gap-2 font-bold px-6 py-3 rounded-full transition-all ${isLogSaved ? 'bg-primary-container text-on-primary-container cursor-default scale-95' : 'bg-primary text-on-primary hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md'}`}
                >
                  {isLogSaved ? (
                     <>
                       <span className="material-symbols-outlined animate-spin">sync</span>
                       保存しました
                     </>
                  ) : (
                     <>
                       <span className="material-symbols-outlined">save</span>
                       ログを保存する
                     </>
                  )}
                </button>
              </div>
            </div>

            {/* Visualized Logs Output */}
            {dailyLogs.length > 0 && (
              <div className="pt-8 space-y-4 border-t border-outline-variant/10">
                <h4 className="font-bold text-sm text-on-surface-variant uppercase tracking-wider">最近の振り返り</h4>
                <div className="space-y-3">
                  {dailyLogs.map(log => {
                    const moodEmojis = ["", "😖", "😕", "😐", "🙂", "🤩"];
                    return (
                      <div key={log.id} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-on-surface-variant">
                            {log.date.toLocaleDateString('ja-JP')} {log.date.getHours()}:{String(log.date.getMinutes()).padStart(2, '0')}
                          </span>
                          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full text-sm">
                            <span title="行動前" className="grayscale opacity-70">{moodEmojis[log.before]}</span>
                            <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
                            <span title="行動後" className="text-lg">{moodEmojis[log.after]}</span>
                          </div>
                        </div>
                        {log.reflection && (
                          <p className="text-sm text-on-surface leading-relaxed mt-2 p-3 bg-surface-container-highest/30 rounded-lg">
                            <span className="font-bold text-primary mr-2">気づき:</span>
                            {log.reflection}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* AI Log Coach Section */}
          <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col h-[500px]">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-xl">psychology</span>
              <h3 className="font-headline text-lg font-bold text-primary">振り返りコーチに質問する</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
              {logCoachHistory.length === 0 ? (
                <div className="text-center text-on-surface-variant my-8 text-sm flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl mb-3 opacity-50">forum</span>
                  <p>「最近の傾向はどうなってる？」<br />「もっとモチベーションを上げるには？」</p>
                  <p className="mt-2 text-xs opacity-70">これまでの行動ログをもとに、コーチが客観的な気づきを提供します。</p>
                </div>
              ) : (
                logCoachHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface-container-high text-on-surface rounded-bl-sm border border-outline-variant/10'}`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              {isLogCoachLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-high p-4 rounded-2xl rounded-bl-sm flex gap-2 items-center">
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={logCoachEndRef} />
            </div>

            <form onSubmit={handleLogCoachSubmit} className="flex gap-3 items-end mt-auto pt-4 border-t border-outline-variant/20">
              <textarea
                value={logCoachInput}
                onChange={e => setLogCoachInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleLogCoachSubmit(e as any);
                  }
                }}
                disabled={isLogCoachLoading}
                placeholder="コーチに聞いてみましょう... (改行: Enter / 送信: Cmd+Enter)"
                rows={2}
                className="flex-1 bg-surface-container border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary resize-y"
              />
              <button type="submit" disabled={isLogCoachLoading || !logCoachInput.trim()} className="bg-primary text-on-primary w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </form>
          </section>

        </main>
      )}

      {currentTab === 'settings' && (
        <main className="pt-24 px-6 max-w-3xl mx-auto space-y-8 pb-32">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-3xl text-primary">settings</span>
            <h2 className="font-headline text-2xl font-bold text-primary">設定</h2>
          </div>

          <div className="space-y-6">
            {/* Account Section */}
            <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
              <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/10">
                <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-wider">アカウント</h3>
              </div>
              <div className="p-4 space-y-4">
                <div onClick={openProfileModal} className="flex items-center justify-between cursor-pointer hover:bg-surface-container-low p-2 -mx-2 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary border border-outline-variant/20">
                      {profile.avatarUrl ? (
                         <img className="w-full h-full object-cover" alt="profile" src={profile.avatarUrl} />
                      ) : (
                         <span className="material-symbols-outlined">person</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{profile.name}</p>
                      <p className="text-xs text-on-surface-variant">{profile.email}</p>
                    </div>
                  </div>
                  <button className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors opacity-50 group-hover:opacity-100">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Preferences Section */}
            <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
              <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/10">
                <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-wider">環境設定</h3>
              </div>
              <div className="p-4 space-y-4">
                <div onClick={() => setIsThemeModalOpen(true)} className="flex items-center justify-between cursor-pointer hover:bg-surface-container-low p-2 -mx-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                      <span className="material-symbols-outlined">
                        {theme === 'system' ? 'brightness_auto' : theme === 'dark' ? 'dark_mode' : 'light_mode'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">テーマ</p>
                      <p className="text-xs text-on-surface-variant">
                        {theme === 'system' ? 'システム設定に従う' : theme === 'dark' ? 'ダークモード' : 'ライトモード'}
                      </p>
                    </div>
                  </div>
                  <button className="text-on-surface-variant p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
                <div className="h-[1px] w-full bg-outline-variant/10"></div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                        <span className="material-symbols-outlined">notifications_active</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">プッシュ通知</p>
                        <p className="text-xs text-on-surface-variant">習慣のリマインダー</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationsEnabled} 
                        onChange={(e) => setNotificationsEnabled(e.target.checked)} 
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {notificationsEnabled && (
                    <motion.div 
                      className="flex items-center justify-between pl-14 pr-2 pt-1 pb-1 text-sm overflow-hidden"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <p className="font-bold text-on-surface-variant">通知時間</p>
                      <input 
                        type="time" 
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1 focus:ring-2 focus:ring-primary outline-none transition-all font-mono text-on-surface"
                      />
                    </motion.div>
                  )}
                </div>
                <div className="h-[1px] w-full bg-outline-variant/10"></div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                      <span className="material-symbols-outlined">language</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">言語 (Language)</p>
                      <p className="text-xs text-on-surface-variant">日本語</p>
                    </div>
                  </div>
                  <button className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Data & Privacy Section */}
            <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
              <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/10">
                <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-wider">データとプライバシー</h3>
              </div>
              <div className="p-2 space-y-1">
                <button onClick={() => setIsDeleteAccountModalOpen(true)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-error-container/30 transition-colors group">
                  <div className="flex items-center gap-3 text-error">
                    <span className="material-symbols-outlined">delete_forever</span>
                    <span className="font-bold text-sm">アカウントを削除</span>
                  </div>
                  <span className="material-symbols-outlined text-error/50">chevron_right</span>
                </button>
              </div>
            </section>
            
            {/* Logout */}
            <div className="pt-4 pb-8 flex justify-center">
              <button 
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold text-sm transition-colors p-3 rounded-full hover:bg-surface-container">
                <span className="material-symbols-outlined">logout</span>
                ログアウト
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-surface-container-lowest/90 backdrop-blur-md border-t border-outline-variant/20 flex justify-around py-2 pb-safe z-40">
        <button onClick={() => setCurrentTab('home')} className={`flex flex-col items-center gap-1 w-20 py-2 rounded-xl transition-colors ${currentTab === 'home' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="text-[10px] font-bold">ホーム</span>
        </button>
        <button onClick={() => setCurrentTab('goal')} className={`flex flex-col items-center gap-1 w-20 py-2 rounded-xl transition-colors ${currentTab === 'goal' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === 'goal' ? "'FILL' 1" : "'FILL' 0" }}>emoji_events</span>
          <span className="text-[10px] font-bold">目標</span>
        </button>
        <button onClick={() => setCurrentTab('log')} className={`flex flex-col items-center gap-1 w-20 py-2 rounded-xl transition-colors ${currentTab === 'log' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === 'log' ? "'FILL' 1" : "'FILL' 0" }}>calendar_month</span>
          <span className="text-[10px] font-bold">ログ</span>
        </button>
        <button onClick={() => setCurrentTab('settings')} className={`flex flex-col items-center gap-1 w-20 py-2 rounded-xl transition-colors ${currentTab === 'settings' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
          <span className="text-[10px] font-bold">設定</span>
        </button>
      </nav>

      {/* SOS FAB */}
      <button
        onClick={() => openSosModal()}
        className="fixed bottom-24 right-6 md:bottom-12 md:right-12 w-16 h-16 rounded-full bg-secondary text-on-secondary shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <span className="material-symbols-outlined text-3xl group-hover:hidden">favorite</span>
        <span className="hidden group-hover:block font-headline font-bold text-sm tracking-tighter">SOS</span>
      </button>

      {/* SOS Modal */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsSosModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest z-10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-3xl">favorite</span>
                <h2 className="font-headline text-xl font-bold text-secondary">SOS コーチング</h2>
              </div>
              <button onClick={() => setIsSosModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface">
              {sosHistory.length === 1 && (
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {['圧倒されている', '不安', '疑念', '落ち着かない'].map(label => (
                    <button 
                      key={label}
                      onClick={() => {
                        setSosInput(label);
                      }}
                      className="px-4 py-2 rounded-full border border-outline-variant text-sm hover:bg-primary-container hover:text-on-primary-container transition-colors bg-surface-container-lowest"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {sosHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-secondary text-on-secondary rounded-br-sm' : 'bg-surface-container-lowest shadow-sm rounded-bl-sm border border-outline-variant/10'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isSosLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-lowest shadow-sm p-4 rounded-2xl rounded-bl-sm flex gap-2 items-center border border-outline-variant/10">
                    <div className="w-2 h-2 bg-secondary/50 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-secondary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-secondary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={sosChatEndRef} />
            </div>

            <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20">
              <form onSubmit={handleSosSubmit} className="flex gap-3 items-end">
                <textarea
                  value={sosInput}
                  onChange={e => setSosInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      handleSosSubmit(e as any);
                    }
                  }}
                  disabled={isSosLoading}
                  placeholder="今の気持ちを吐き出す... (改行: Enter / 送信設定: 送信ボタンまたはCmd+Enter)"
                  rows={3}
                  className="flex-1 bg-surface-container-high border-none rounded-2xl px-6 py-3 focus:ring-2 focus:ring-secondary resize-y"
                />
                <button type="submit" disabled={isSosLoading || !sosInput.trim()} className="bg-secondary text-on-secondary w-12 h-12 rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform disabled:opacity-50">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsGoalModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest z-10">
              <h2 className="font-headline text-xl font-bold text-primary">{editingGoalIndex !== null ? '目標を編集' : '新しい目標を追加'}</h2>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">カテゴリ</label>
                <input value={goalForm.category} onChange={e => setGoalForm({...goalForm, category: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="例: ビジネスの成長" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">目標タイトル</label>
                <input value={goalForm.title} onChange={e => setGoalForm({...goalForm, title: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="例: SaaSパイプラインの自動化" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">具体的な説明 (SMART)</label>
                <textarea value={goalForm.description} onChange={e => setGoalForm({...goalForm, description: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary min-h-[80px] outline-none transition-all" placeholder="期限や数値を具体的に..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">If-Then プランニング</label>
                <textarea value={goalForm.ifThen} onChange={e => setGoalForm({...goalForm, ifThen: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary min-h-[80px] outline-none transition-all" placeholder="もし〜〜が起きたら、〜〜する" />
              </div>
            </div>
            <div className="p-4 border-t border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
              {editingGoalIndex !== null ? (
                <button onClick={deleteGoal} className="px-4 py-2 text-sm font-bold text-error hover:bg-error-container rounded-full transition-colors">削除</button>
              ) : <div></div>}
              <div className="flex gap-3">
                <button onClick={() => setIsGoalModalOpen(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
                <button onClick={saveGoal} className="px-4 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-full transition-colors">保存する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Habit Modal */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsHabitModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest z-10">
              <h2 className="font-headline text-xl font-bold text-primary">{editingHabitIndex !== null ? '習慣を編集' : '新しい習慣を追加'}</h2>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">習慣タイトル</label>
                <input value={habitForm.title} onChange={e => setHabitForm({...habitForm, title: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="例: 朝6:30に起きる" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">目的・理由</label>
                <textarea value={habitForm.description} onChange={e => setHabitForm({...habitForm, description: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary min-h-[80px] outline-none transition-all" placeholder="例: 概日リズムを整えるため" />
              </div>
            </div>
            <div className="p-4 border-t border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
              {editingHabitIndex !== null ? (
                <button onClick={deleteHabit} className="px-4 py-2 text-sm font-bold text-error hover:bg-error-container rounded-full transition-colors">削除</button>
              ) : <div></div>}
              <div className="flex gap-3">
                <button onClick={() => setIsHabitModalOpen(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
                <button onClick={saveHabit} className="px-4 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-full transition-colors">保存する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details (SMART-ER) Modal */}
      {isGoalDetailsModalOpen && selectedGoalIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 backdrop-blur-sm p-4 md:p-6 pb-24 md:pb-6 animate-in fade-in duration-200" onClick={() => setIsGoalDetailsModalOpen(false)}>
          <div className="relative bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start bg-surface-container-lowest sticky top-0 z-20">
              <div className="space-y-1 pr-4">
                <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{goals[selectedGoalIndex].category}</span>
                <h2 className="font-headline text-2xl font-bold text-on-surface leading-tight mt-2">{goals[selectedGoalIndex].title}</h2>
              </div>
              <button onClick={() => setIsGoalDetailsModalOpen(false)} className="text-outline hover:text-on-surface bg-surface-container p-2 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto z-10 relax-scroll pb-20">
              {/* Progress Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">trending_up</span> 現在の進捗</span>
                  <span className="font-bold text-primary">64%</span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[64%] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
                </div>
              </div>

              {/* SMART-ER Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <span className="material-symbols-outlined text-primary text-lg">target</span>
                  SMART-ER 目標設計
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/10">
                     <p className="text-[10px] text-primary font-bold uppercase mb-1">S: 具体性 (Specific)</p>
                     <p className="text-xs text-on-surface-variant">曖昧さを排除し、誰が見ても明確な行動として定義されています。</p>
                  </div>
                  <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/10">
                     <p className="text-[10px] text-primary font-bold uppercase mb-1">M: 計量性 (Measurable)</p>
                     <p className="text-xs text-on-surface-variant">達成度「64%」のように、進行状況を数値で追跡可能な状態です。</p>
                  </div>
                  <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/10">
                     <p className="text-[10px] text-primary font-bold uppercase mb-1">A: 達成可能性 (Achievable)</p>
                     <p className="text-xs text-on-surface-variant">今のリソースとスキルで十分に手が届くステップに分解されています。</p>
                  </div>
                  <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/10">
                     <p className="text-[10px] text-primary font-bold uppercase mb-1">R: 関連性 (Relevant)</p>
                     <p className="text-xs text-on-surface-variant">コアバリューである「{goals[selectedGoalIndex].category}」の向上に直結しています。</p>
                  </div>
                </div>
              </div>

              {/* If-Then Planning Card */}
              <div className="bg-error-container/30 border border-error/20 p-5 rounded-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <span className="material-symbols-outlined text-6xl text-error">warning</span>
                 </div>
                 <h3 className="text-sm font-bold text-on-error-container flex items-center gap-2 mb-4 relative z-10">
                  <span className="material-symbols-outlined">alt_route</span>
                  実行意図（If-Then Planning）
                </h3>
                <p className="text-xs text-on-surface-variant mb-2 relative z-10">心理学的な事前対策。つまずきやすいポイントへの先回り：</p>
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-error uppercase block mb-1">If (トリガー)</span>
                    <p className="text-sm font-bold text-on-surface">「{goals[selectedGoalIndex].ifThen?.split('、')[0] || '何か障害が起きたら'}」</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant hidden md:block">arrow_forward</span>
                  <span className="material-symbols-outlined text-outline-variant md:hidden rotate-90">arrow_forward</span>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-primary uppercase block mb-1">Then (アクション)</span>
                    <p className="text-sm font-bold text-on-surface">「{goals[selectedGoalIndex].ifThen?.split('、')[1] || goals[selectedGoalIndex].ifThen}」</p>
                  </div>
                </div>
              </div>

              {/* AI Coach Insight */}
              <div className="flex gap-4 p-5 rounded-2xl bg-secondary-container/40 border border-secondary/20">
                <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <div className="space-y-2">
                   <h3 className="text-sm font-bold text-on-secondary-container">コーチからの洞察</h3>
                   <p className="text-sm leading-relaxed text-on-surface-variant">
                     この目標の「If-Then」設計は、脳のワーキングメモリを解放し、決断疲れを防ぐ素晴らしい戦略です。
                     あらかじめ「もしもの時の動き」を決めておくことで、脳の迷いがなくなりスムーズに行動を再開できます。
                     現在の進捗も申し分ありません。この調子で進めましょう。
                   </p>
                </div>
              </div>

            </div>
            
            <div className="p-4 md:p-6 border-t border-outline-variant/20 bg-surface-container-lowest flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleGoalAchieved}
                className="flex-1 py-3 px-4 rounded-full font-bold bg-tertiary-container text-on-tertiary-container hover:bg-tertiary/20 transition-colors flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined">celebration</span>
                目標を達成した！
              </button>
              <button 
                onClick={() => { setIsGoalDetailsModalOpen(false); openGoalModal(selectedGoalIndex); }}
                className="flex-1 py-3 px-4 rounded-full font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined">edit</span>
                プランを微調整する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {isSimulationModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950 text-white p-6 animate-in fade-in duration-1000">
          <div className="absolute inset-0 opacity-20">
            <img className="w-full h-full object-cover" alt="vision background" src={dashboardData?.vision?.imgUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBzryvOtWfZA7a1Y1TO66PtEL0wJSUwAn9iFzyzHwVr2iQMdqIXgjpSUvxUhzAQ_m5GPqyO0ulp5IVZp_3DVIzFnuf__L2SBsUb1ba7mEXr-8EpXOZpwUjyf7Ipj-LIlHyNyxddkFE0TO5FrIDklook4J9JmxJdi4byyCIrAWpgw-cc_wzjVtJ4Q1TOdzqYV88pprLQN3lsdk4LZAjIpeyqOrHf1wLUl1Q88O5lb3upuDPyN0yWbyNiVFbhAGsPTNW5NnKISLL6zp0"} />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center max-w-2xl text-center space-y-12">
            <div className="space-y-4">
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-widest text-primary-container">未来への没入</h2>
              <p className="text-lg md:text-xl text-white/80 leading-relaxed">
                目を閉じて、深く呼吸をしてください。<br/>
                あなたは今、<span className="font-bold text-white">{dashboardData?.vision?.title || "理想の未来"}</span> にいます。<br/>
                その時の感情、周りの音、空気の匂いを感じ取ってください。
              </p>
            </div>
            
            {simulationState === 'initial' && (
               <button onClick={startSimulation} className="px-8 py-4 rounded-full font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors text-lg shadow-lg flex items-center gap-3">
                 <span className="material-symbols-outlined">self_improvement</span>
                 10分間の瞑想を開始する
               </button>
            )}

            {simulationState === 'running' && (
              <div className="flex flex-col items-center space-y-8 animate-in zoom-in duration-500">
                <div className="text-6xl font-mono font-bold text-white tracking-widest shadow-black drop-shadow-md">
                  {Math.floor(simulationTimeLeft / 60).toString().padStart(2, '0')}:{(simulationTimeLeft % 60).toString().padStart(2, '0')}
                </div>
                {/* Breathing Animation */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <motion.div 
                    className="absolute w-full h-full rounded-full border border-primary-container/30"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="absolute w-3/4 h-3/4 rounded-full bg-primary/20 blur-md"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="w-1/2 h-1/2 rounded-full bg-primary-container/80 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(0,104,116,0.5)]">
                    <span className="text-primary-fixed-dim font-bold tracking-widest text-sm">Breathe</span>
                  </div>
                </div>
              </div>
            )}

            {simulationState === 'finished' && (
              <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary-container mb-4 shadow-[0_0_40px_rgba(0,104,116,0.5)]">
                  <span className="material-symbols-outlined text-5xl">notifications_active</span>
                </div>
                <p className="text-xl font-bold text-white">瞑想完了。すばらしい時間でした。</p>
                <button onClick={closeSimulation} className="px-8 py-4 rounded-full font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors text-lg shadow-lg flex items-center gap-3">
                 <span className="material-symbols-outlined">check</span>
                 終了する
                </button>
              </div>
            )}

            {simulationState !== 'finished' && (
              <button 
                onClick={closeSimulation} 
                className="px-8 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors text-sm tracking-widest uppercase mt-8"
              >
                現実に戻る
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest z-10">
              <h2 className="font-headline text-lg font-bold text-primary">プロフィール編集</h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 border-2 border-primary-container flex items-center justify-center text-primary">
                    {profileForm.avatarUrl ? (
                      <img className="w-full h-full object-cover" alt="profile" src={profileForm.avatarUrl} />
                    ) : (
                      <span className="material-symbols-outlined text-4xl">person</span>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">表示名</label>
                  <input 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-on-surface" 
                    placeholder="名前を入力" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">メールアドレス</label>
                  <input 
                    value={profileForm.email} 
                    onChange={e => setProfileForm({...profileForm, email: e.target.value})} 
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface" 
                    placeholder="メールアドレスを入力" 
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-outline-variant/20 flex justify-end items-center bg-surface-container-lowest gap-3">
              <button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
              <button onClick={saveProfile} className="px-6 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-full transition-colors shadow-sm">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsThemeModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-primary mb-2">テーマを選択</h2>
            <div className="space-y-2">
              <button onClick={() => { setTheme('system'); setIsThemeModalOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${theme === 'system' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface'}`}>
                <span className="material-symbols-outlined">brightness_auto</span>システム設定に従う
              </button>
              <button onClick={() => { setTheme('light'); setIsThemeModalOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${theme === 'light' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface'}`}>
                <span className="material-symbols-outlined">light_mode</span>ライトモード
              </button>
              <button onClick={() => { setTheme('dark'); setIsThemeModalOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${theme === 'dark' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface'}`}>
                <span className="material-symbols-outlined">dark_mode</span>ダークモード
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setIsThemeModalOpen(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 p-6 space-y-6">
            <div className="flex flex-col items-center text-center gap-3 pt-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">logout</span>
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">ログアウトしますか？</h2>
              <p className="text-sm text-on-surface-variant">現在のセッションは終了しますが、データは保持されます。</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-on-surface hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
              <button onClick={handleLogout} className="flex-1 py-3 text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-full transition-colors">ログアウト</button>
            </div>
          </div>
        </div>
      )}

      {/* Vision Edit Modal */}
      {isVisionEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsVisionEditModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest z-10">
              <h2 className="font-headline text-xl font-bold text-primary">ビジョンの編集</h2>
              <button onClick={() => setIsVisionEditModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">最高の瞬間の言葉（タイトル）</label>
                <input 
                  value={visionForm.title} 
                  onChange={e => setVisionForm({...visionForm, title: e.target.value})} 
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all" 
                  placeholder="例: 2029年 ポルトガルの海岸線" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">詳細な情景（説明）</label>
                <textarea 
                  value={visionForm.description} 
                  onChange={e => setVisionForm({...visionForm, description: e.target.value})} 
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary min-h-[100px] outline-none transition-all" 
                  placeholder="その瞬間、何を感じ、誰といて、どんな海風が吹いていますか？" 
                />
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                保存後、AIがこの情景に合わせた画像を自動生成します。
              </p>
            </div>
            <div className="p-4 border-t border-outline-variant/20 flex justify-end items-center bg-surface-container-lowest gap-3">
              <button onClick={() => setIsVisionEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
              <button 
                onClick={saveVision} 
                disabled={isVisionSaving}
                className="px-6 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-full transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
              >
                {isVisionSaving ? (
                  <><span className="material-symbols-outlined animate-spin text-sm">sync</span> 生成中...</>
                ) : (
                  "AIで更新する"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsDeleteAccountModalOpen(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 p-6 space-y-6">
            <div className="flex flex-col items-center text-center gap-3 pt-4">
              <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <h2 className="font-headline text-xl font-bold text-error">アカウントを削除しますか？</h2>
              <p className="text-sm text-on-surface-variant">この操作は取り消せません。設定、習慣、目標などすべてのデータが完全に削除されます。</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setIsDeleteAccountModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-on-surface hover:bg-surface-container rounded-full transition-colors">キャンセル</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-3 text-sm font-bold bg-error text-on-error hover:bg-error/90 rounded-full transition-colors">完全に削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Overlay */}
      {isCelebrationOpen && celebrationData && (
        <motion.div 
          className="fixed inset-0 z-[200] bg-stone-900 flex items-center justify-center p-6 text-white overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ backgroundImage: 'radial-gradient(circle at center, rgba(0, 104, 116, 0.4) 0%, rgba(28, 27, 31, 1) 70%)' }}
        >
           <div className="relative z-10 w-full max-w-lg space-y-10 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700">
              
              <div className="text-center space-y-4">
                 <motion.span 
                   className="text-primary-fixed-dim text-lg md:text-xl tracking-widest font-bold inline-block"
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ delay: 0.2, type: "spring" }}
                 >
                   MILESTONE ACHIEVED
                 </motion.span>
                 <motion.h2 
                   className="text-3xl md:text-4xl font-headline font-extrabold leading-tight"
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.4 }}
                 >
                   {celebrationData.goalTitle}
                 </motion.h2>
              </div>

              <motion.div 
                className="w-full bg-stone-800/80 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/10 space-y-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                       <span className="font-bold text-lg font-headline tracking-wider">
                         LEVEL {celebrationData.oldLvl} {celebrationData.newLvl > celebrationData.oldLvl && <span className="text-primary-fixed ml-2 animate-pulse">➔ {celebrationData.newLvl}</span>}
                       </span>
                       <span className="text-primary-fixed font-bold text-xl">+{celebrationData.addedExp} EXP</span>
                    </div>
                    <div className="h-4 bg-stone-950 rounded-full overflow-hidden shadow-inner relative">
                       <motion.div 
                         className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-container to-primary" 
                         initial={{width: celebrationData.newLvl > celebrationData.oldLvl ? 0 : "65%"}} 
                         animate={{width: celebrationData.newLvl > celebrationData.oldLvl ? "15%" : "85%"}} 
                         transition={{delay: 1, duration: 2, ease: "easeOut"}}
                       />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-900/50 p-4 rounded-2xl border border-white/5">
                     <div className="w-16 h-16 rounded-full bg-tertiary-container/20 text-tertiary-fixed border border-tertiary/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,180,165,0.2)]">
                        <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                     </div>
                     <div className="text-center sm:text-left">
                        <h4 className="font-bold text-white tracking-wide text-lg">マイルストーンの覇者</h4>
                        <p className="text-xs text-stone-400 mt-1 leading-relaxed">ひとつの大きな目標を乗り越えた証。この成功体験が、あなたの脳の回路をさらに強固なものにしました。</p>
                     </div>
                  </div>
              </motion.div>

              <motion.div 
                className="w-full bg-secondary-container/20 border border-secondary/30 p-6 md:p-8 rounded-3xl relative"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
              >
                  <div className="absolute -top-4 left-6 px-4 py-1 bg-stone-900 text-secondary-fixed border border-secondary/30 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                     <span className="material-symbols-outlined text-[14px]">psychology</span>
                     Coach's Note
                  </div>
                  {celebrationData.note ? (
                     <p className="text-stone-200 leading-relaxed text-sm md:text-base font-medium">
                        {celebrationData.note}
                     </p>
                  ) : (
                     <div className="flex animate-pulse items-center gap-3 text-stone-400 py-4">
                       <span className="material-symbols-outlined animate-spin">sync</span> 
                       <span className="text-sm">目標に至るまでの道のりを振り返り、メッセージを綴っています...</span>
                     </div>
                  )}
              </motion.div>

              <motion.div 
                className="flex flex-col w-full gap-4 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                 <button onClick={completeCelebration} className="py-4 bg-primary text-on-primary font-bold rounded-full w-full hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg text-lg">
                   次の目標へ向かう
                 </button>
                 <button onClick={() => setIsCelebrationOpen(false)} className="py-4 text-stone-400 font-bold rounded-full w-full hover:text-stone-200 transition-colors text-sm">
                   静かに余韻に浸る
                 </button>
              </motion.div>
           </div>
        </motion.div>
      )}

    </div>
  );
}
