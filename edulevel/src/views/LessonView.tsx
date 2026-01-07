import { useState, useEffect, useRef } from 'react';
import { Lesson, UserProgress } from '../../types';
import { supabase } from '../../lib/supabase';
import { ProgressionEngine, PROGRESSION_CONFIG } from '../utils/progression';

interface LessonViewProps {
    lesson: Lesson;
    progress?: UserProgress | null;
    onActivity: () => void;
    onBack: () => void;
}

export function LessonView({ lesson, progress: dbProgress, onActivity, onBack }: LessonViewProps) {
    const [videoWatched, setVideoWatched] = useState(false);
    const [practiceComplete, setPracticeComplete] = useState(false);
    const [watchPct, setWatchPct] = useState(0);
    const playerRef = useRef<any>(null);

    // Temporary overrides to bypass database updates (requested by user)
    const VIDEO_OVERRIDES: Record<string, string> = {
        // --- MATEMÁTICAS ---
        // UNIDAD 1: ENTEROS
        "Conjunto Z (Números Enteros)": "g6bG6NjsDT4",
        "Valor Absoluto": "I1-d9I72PUI",
        "Orden en Z (Mayor y Menor)": "D9l0yG-U_S0",
        "El Plano Cartesiano": "kzOzYY-n-wQ",
        "Suma (Igual Signo)": "aGJ00fU5Csw",
        // UNIDAD 2: OPERACIONES Z
        "Suma (Diferente signo)": "2AFZpUbG7HQ",
        "Resta de Enteros": "8U9T8_gU55o",
        "Multiplicación": "ryXzNxvw31o",
        "División Exacta": "g25yIskh1VE",
        "Polinomios Aritméticos": "cbOQh-6uV9M",
        // UNIDAD 3: RACIONALES
        "Fracciones": "TV55A0C888M",
        "Equivalentes": "osePKL39EBo",
        "Fracción a Decimal": "pOm1azhMuYM",
        "Orden en Q": "B-K0u78zmpk",
        "Suma Homogénea": "antZqj9ePys",
        // UNIDAD 4: DOMINIO
        "Suma Heterogénea": "LgMptyzudXU",
        "Multiplicación Q": "VDTZxc1eHZC",
        "División Q": "RNtvQitNbLk",
        "Ecuaciones Aditivas": "D6_w37c7D0Q",
        "PROYECTO FINAL": "mB50d68rN8U",

        // --- ESPAÑOL ---
        "Elementos Comunicación": "rDk-XMg9B9w",
        "Funciones Lenguaje": "pDJ300rA0jc",
        "Signo Lingüístico": "5238L7LrfiO",
        "Variedades Lingüísticas": "Gp4A8E8ueVL",
        "Resumen y Síntesis": "GPY8KF8eitA",
        "Género Narrativo": "HOHGC_xnrmK",
        "El Cuento": "TyUjJg4jP7I",
        "Tipos de Narrador": "XbL-kvrrQ6Y",
        "Tiempo y Espacio": "H6TaHYKzx_Y",
        "Leyenda y Mito": "FBJiFxiVORr",
        "Género Lírico": "C93LrRH9T0h",
        "Verso y Estrofa": "0NO3UvcX1MR",
        "La Rima": "dpjlpRn8SVO",
        "Figuras Literarias I": "3M4pNpL-xCs",
        "Figuras Literarias II": "GyPJRQRrPQI",
        "Sustantivo y Adjetivo": "tnR9BY3RBoc",
        "El Verbo": "EkPr9yIJlf3",
        "Ortografía: Acentuación": "12WZMgeARfz",
        "Signos de Puntuación": "0CsmK8E94GK",

        // --- CIENCIAS NATURALES ---
        "Teoría Celular": "aoj9oGmGGgQ",
        "Procariota vs Eucariota": "5Y3qM4Z8k5I",
        "Organelos Celulares": "Hdnr6xOd0E-",
        "Transporte Celular": "kY41yS5x-4U",
        "De Célula a Organismo": "aoj9oGmGGgQ",
        "Sistema Digestivo": "5DUIc9BchOk",
        "Respiración y Circulación": "Wq_7cZc7h2s",
        "Propiedades de la Materia": "swcjamDFsn0",
        "Estados de la Materia": "c4n-yD1sZ5s",
        "Cambios de Estado": "xZlp4Y291M4",
        "Átomo (Intro)": "D0V-N3TrIkY",
        "Tabla Periódica (Intro)": "PsW0sGF5EBE",
        "Ecosistemas": "XKSgZ0QdgAc",

        // --- CIENCIAS SOCIALES ---
        "Caída del Imperio Romano": "UF_yHrFP1Ls",
        "Invasiones Bárbaras": "P-e2f4J0aYc",
        "Imperio Bizantino": "GjEnSgnlD8Q",
        "Introducción Edad Media": "0CnXN8_z-bU",
        "El Sistema Feudal": "Vy_CyG1aWno",
        "Continentes y Océanos": "mnR2MTjOBG4",
        "Derechos Humanos": "PPe5H81Xf2E",
        "La Democracia": "B9d1u_D7I-Y",

        // --- INGLÉS ---
        "Personal Pronouns & To Be": "Z-mX4c3K3gA",
        "Greetings & Farewells": "Fw0rdSHZ6yY",
        "The Alphabet & Spelling": "75p-N9YKqNo",
        "Numbers 1-100": "e0dJWfQHF8Y",
        "Countries & Nationalities": "l6A2EFkjXq4",
        "Simple Present (Affirmative)": "L9OAbtSTPRg",
        "Daily Routine Verbs": "M4FMEmlOqTM",
        "The Time": "fq2tRfHu5s8",

        // --- TECNOLOGÍA ---
        "Historia del Computador": "_v7U_I0W7c8",
        "Hardware y Software": "n_69cZzAbM8",
        "¿Cómo funciona Internet?": "iC40s9-tOQo",
        "Seguridad Digital": "9-z75_kXQyA"
    };

    const videoId = VIDEO_OVERRIDES[lesson.title] || lesson.content.concept?.youtube_id || lesson.content.concept?.data;
    const isVideoPending = !videoId && (lesson.content.concept?.video_pending);

    // Track YouTube Progress
    useEffect(() => {
        if (isVideoPending) {
            setVideoWatched(true);
            setWatchPct(100);
            updateDatabaseProgress({ video_watched_pct: 100 });
            return;
        }

        // Load YouTube API
        if (!(window as any).YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const current = playerRef.current.getCurrentTime();
                const total = playerRef.current.getDuration();
                if (total > 0) {
                    const pct = Math.round((current / total) * 100);
                    setWatchPct(prev => Math.max(prev, pct));
                    if (pct >= PROGRESSION_CONFIG.VIDEO_REQUIREMENT) {
                        setVideoWatched(true);
                        updateDatabaseProgress({ video_watched_pct: pct });
                    }
                }
            }
        }, 3000);

        (window as any).onYouTubeIframeAPIReady = () => {
            new (window as any).YT.Player(`yt-player-${lesson.id}`, {
                events: {
                    onReady: (event: any) => { playerRef.current = event.target; }
                }
            });
        };

        return () => clearInterval(interval);
    }, [lesson.id, isVideoPending]);

    const updateDatabaseProgress = async (data: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            await supabase.from('user_progress').upsert({
                user_id: user.id,
                lesson_id: lesson.id,
                ...data,
                updated_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Non-blocking lesson progress save error:", e);
        }
    };

    const progress = Math.min(100, (watchPct * 0.5) + (practiceComplete ? 50 : 0));

    return (
        <div className="bg-[#f8f9fa] min-h-screen font-sans text-slate-900">
            {/* Header 'Clase Digital' */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                        <div className="w-8 h-8 bg-[#7c5dfa] rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[20px]">school</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight">Clase Digital</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
                        <button onClick={onBack} className="hover:text-[#7c5dfa] transition-colors">Inicio</button>
                        <button className="text-[#7c5dfa] font-bold">Mis Clases</button>
                        <button className="hover:text-[#7c5dfa] transition-colors">Progreso</button>
                        <button className="hover:text-[#7c5dfa] transition-colors">Comunidad</button>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                        <input
                            type="text"
                            placeholder="Buscar lecciones..."
                            className="bg-[#f1f5f9] pl-10 pr-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-[#7c5dfa]/20 w-64 transition-all"
                        />
                    </div>
                    <button className="w-9 h-9 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                    </button>
                    <button className="w-9 h-9 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 px-2">
                    <span onClick={onBack} className="hover:text-[#7c5dfa] cursor-pointer">Matemáticas</span>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <span>Séptimo Grado</span>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <span className="text-slate-900">{lesson.title}</span>
                </div>

                {/* Title Section */}
                <div className="mb-8 px-2">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="bg-[#eef2ff] text-[#7c5dfa] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            Unidad {lesson.unit || 1}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                            <span className="material-symbols-outlined text-[16px]">bolt</span>
                            <span>{lesson.xp} XP</span>
                        </div>
                    </div>
                    {dbProgress?.is_reinforced && (
                        <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl mb-4 border border-orange-200 animate-pulse">
                            <span className="material-symbols-outlined text-lg">history_edu</span>
                            <span className="text-sm font-bold uppercase tracking-wider">Modo Refuerzo Activado</span>
                        </div>
                    )}
                    <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">{lesson.title}</h1>
                    <p className="text-slate-500 text-lg max-w-3xl leading-relaxed">{lesson.description}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Video & Content */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Video Player */}
                        <div className="aspect-video bg-black rounded-[24px] overflow-hidden relative shadow-xl group">
                            {videoId ? (
                                <iframe
                                    id={`yt-player-${lesson.id}`}
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                                    title={lesson.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <>
                                    <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Video placeholder" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-20 h-20 bg-[#7c5dfa]/90 backdrop-blur-sm rounded-full flex items-center justify-center pl-1 shadow-2xl">
                                            <span className="material-symbols-outlined text-white text-5xl">play_arrow</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Lesson Summary */}
                        <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#7c5dfa]">description</span> Resumen de la lección
                            </h3>
                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                                <div className="space-y-4">
                                    {(lesson.content.explanation || "").split('\n').map((line, i) => (
                                        <p key={i} className={line.startsWith('•') ? 'ml-4 flex items-start gap-2' : ''}>
                                            {line.startsWith('•') && <span className="text-[#7c5dfa] font-bold">•</span>}
                                            {line.replace('•', '')}
                                        </p>
                                    ))}
                                </div>

                                <div className="bg-[#f8fafc] p-6 rounded-2xl border-l-4 border-[#7c5dfa] mt-8">
                                    <h4 className="font-bold text-slate-900 mb-2 italic">Aprenderás hoy:</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li>✅ Conceptos básticos y vocabulario.</li>
                                        <li>✅ Aplicación práctica inmediata.</li>
                                        <li>✅ Reto final de evaluación.</li>
                                    </ul>
                                </div>

                                <p className="mt-6 text-sm text-slate-500">
                                    Al final de este video, serás capaz de plantear tu primera ecuación simple.
                                    ¡Recuerda tomar notas de los conceptos clave en tu cuaderno digital!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* CTA Button */}
                        <button
                            onClick={onActivity}
                            className="w-full py-4 bg-[#7c5dfa] hover:bg-[#6a4df0] text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                        >
                            <span className="material-symbols-outlined">play_circle</span> Comenzar práctica
                        </button>

                        {/* Teacher Note */}
                        <div className="bg-[#f3f0ff] p-6 rounded-3xl border border-indigo-100 relative">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-white p-1 shadow-sm shrink-0">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher" className="w-full h-full rounded-full" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-[#7c5dfa] tracking-widest mb-1">NOTA DE LA PROFE</p>
                                    <p className="text-slate-700 italic text-sm font-medium leading-relaxed">
                                        "{lesson.content.transfer}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-4">Tu Progreso</h4>
                            <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                                <span>Completado</span>
                                <span className="text-slate-900 font-bold">{progress}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-[#7c5dfa]" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-slate-400 text-center">
                                {progress < 100 ? 'Te faltan ver el video y completar el quiz.' : '¡Has completado esta lección!'}
                            </p>
                        </div>

                        {/* Resources */}
                        {lesson.content.resources && lesson.content.resources.length > 0 && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h4 className="font-bold text-slate-900 mb-4">Material Complementario</h4>
                                <div className="space-y-3">
                                    {lesson.content.resources.map((r, i) => (
                                        <div key={i} className="group p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-[#f8fafc] transition-all cursor-pointer flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${r.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                <span className="material-symbols-outlined">{r.type === 'pdf' ? 'picture_as_pdf' : 'link'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-700 text-sm truncate">{r.title}</p>
                                                <p className="text-xs text-slate-400">{r.size || 'Recurso externo'}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-300 group-hover:text-[#7c5dfa]">download</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
