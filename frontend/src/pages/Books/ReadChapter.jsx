import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReadingHeader from '../../components/ReadingHeader';
import MockComments from '../../components/MockComments';
import { storyService } from '../../services/storyService';
import api from '../../services/axiosConfig';

const READING_SETTINGS_KEY = 'reading_settings_v1';
const CHAPTER_FETCH_BATCH = 200;

const parseChapterNumber = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return Math.floor(parsed);
};

const normalizeChapterList = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
};

const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "00:00";
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const ReadChapter = () => {
    const { bookId, chapterNumber } = useParams();
    const navigate = useNavigate();

    const [book, setBook] = useState(null);
    const [chapter, setChapter] = useState(null);
    const [chapterList, setChapterList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [readingTheme, setReadingTheme] = useState('light');
    const [fontFamily, setFontFamily] = useState('serif');

    // ==========================================
    // 🎧 AUDIO PLAYER STATE (CHẾ ĐỘ 1 FILE)
    // ==========================================
    const audioRef = useRef(null);

    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const currentChapterNumber = useMemo(() => parseChapterNumber(chapterNumber), [chapterNumber]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(READING_SETTINGS_KEY);
            if (!raw) return;
            const settings = JSON.parse(raw);
            if (settings?.readingTheme === 'light' || settings?.readingTheme === 'dark') setReadingTheme(settings.readingTheme);
            if (typeof settings?.fontFamily === 'string' && settings.fontFamily.trim()) setFontFamily(settings.fontFamily);
        } catch (error) {
            console.error('Loi parse reading settings:', error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(READING_SETTINGS_KEY, JSON.stringify({ readingTheme, fontFamily }));
    }, [readingTheme, fontFamily]);

    // ==========================================
    // 🎧 FETCH FILE MP3 TỪ BACKEND
    // ==========================================
    useEffect(() => {
        if (!chapter?._id) return;

        setAudioUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        const loadAudio = async () => {
            try {
                const response = await storyService.getChapterAudio(chapter._id);
                const rawUrl = response?.url || response?.data?.url;
                
                if (rawUrl) {
                    const fullAudioUrl = rawUrl.startsWith('http') ? rawUrl : `http://localhost:5000${rawUrl}`;
                    setAudioUrl(fullAudioUrl);
                    
                    // Reload lại thẻ audio khi link mới về
                    setTimeout(() => {
                        if (audioRef.current) audioRef.current.load();
                    }, 100);
                }
            } catch (error) {
                console.error("Lỗi khi tải file audio:", error);
            }
        };
        loadAudio();
    }, [chapter?._id]);

    // ==========================================
    // 🎧 LOGIC ĐIỀU KHIỂN AUDIO 
    // ==========================================
    const handleTogglePlay = () => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) return; 

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => setIsPlaying(true)).catch(err => {
                    console.error("Lỗi Play Audio:", err);
                    setIsPlaying(false);
                });
            }
        }
    };

    const handleStop = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0; 
        setIsPlaying(false);
    };

    const handleRateChange = (e) => {
        const newRate = parseFloat(e.target.value);
        setPlaybackRate(newRate);
        if (audioRef.current) audioRef.current.playbackRate = newRate;
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    // ==========================================
    // LOGIC DỮ LIỆU
    // ==========================================
    const fetchBook = useCallback(async () => {
        const response = await storyService.getBookById(bookId);
        return response?.book || null;
    }, [bookId]);

    const fetchAllChapters = useCallback(async () => {
        let page = 1, totalPages = 1;
        const output = [];
        do {
            const response = await storyService.getAllChapters(bookId, page, CHAPTER_FETCH_BATCH);
            output.push(...normalizeChapterList(response));
            totalPages = Number(response?.totalPages) || 1;
            page += 1;
        } while (page <= totalPages);
        return output.sort((a, b) => (a?.chapter_number || 0) - (b?.chapter_number || 0));
    }, [bookId]);

    const fetchChapter = useCallback(async (targetChapterNumber) => {
        const response = await storyService.getChapterDetailByNumber(bookId, targetChapterNumber);
        return response?.data || null;
    }, [bookId]);

    useEffect(() => {
        const loadReadingData = async () => {
            setLoading(true);
            setErrorMessage('');
            try {
                const [bookData, chapterData, chapterListData] = await Promise.all([
                    fetchBook(), fetchChapter(currentChapterNumber), fetchAllChapters()
                ]);
                setBook(bookData); setChapter(chapterData); setChapterList(chapterListData);
            } catch (error) {
                setErrorMessage('Không thể tải trang đọc chương này.'); setChapter(null); setChapterList([]);
            } finally {
                setLoading(false);
            }
        };
        loadReadingData();
    }, [currentChapterNumber, fetchBook, fetchChapter, fetchAllChapters]);

    const chapterOptions = useMemo(() => chapterList.map((item) => ({ value: item.chapter_number, label: `Chương ${item.chapter_number}` })), [chapterList]);
    const currentIndex = useMemo(() => chapterList.findIndex((item) => item.chapter_number === currentChapterNumber), [chapterList, currentChapterNumber]);
    const prevChapterNumber = currentIndex > 0 ? chapterList[currentIndex - 1]?.chapter_number : null;
    const nextChapterNumber = currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1]?.chapter_number : null;

    const goToChapter = (targetChapterNumber) => {
        if (!targetChapterNumber) return;
        navigate(`/truyen/${book.slug || book._id}/chuong/${targetChapterNumber}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <ReadingHeader chapterOptions={chapterOptions} currentChapter={currentChapterNumber} canPrev={false} canNext={false} />
                <div className="mx-auto max-w-4xl p-6 text-sm text-gray-600">Đang tải chương...</div>
            </div>
        );
    }

    if (!chapter) {
        return (
            <div className="min-h-screen bg-gray-50">
                <ReadingHeader chapterOptions={chapterOptions} currentChapter={currentChapterNumber} canPrev={Boolean(prevChapterNumber)} canNext={Boolean(nextChapterNumber)} onGoPrev={() => goToChapter(prevChapterNumber)} onGoNext={() => goToChapter(nextChapterNumber)} onChangeChapter={goToChapter} />
                <div className="mx-auto max-w-4xl p-6">
                    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{errorMessage || 'Chương không tồn tại.'}</div>
                </div>
            </div>
        );
    }

    const wrapperClass = readingTheme === 'dark' ? 'min-h-screen bg-slate-900 text-slate-100' : 'min-h-screen bg-[#f8f6ee] text-gray-900';
    const articleClass = readingTheme === 'dark' ? 'rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow-sm md:p-8' : 'rounded-2xl border border-[#e5decf] bg-[#fffdf8] p-5 shadow-sm md:p-8';
    const audioPanelClass = readingTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-indigo-50/60 border-indigo-100 text-indigo-900';

    return (
        <div className={wrapperClass}>
            <ReadingHeader
                chapterOptions={chapterOptions}
                currentChapter={currentChapterNumber}
                canPrev={Boolean(prevChapterNumber)}
                canNext={Boolean(nextChapterNumber)}
                onGoPrev={() => goToChapter(prevChapterNumber)}
                onGoNext={() => goToChapter(nextChapterNumber)}
                onChangeChapter={goToChapter}
                readingTheme={readingTheme}
                onChangeTheme={setReadingTheme}
                fontFamily={fontFamily}
                onChangeFontFamily={setFontFamily}
            />

            <main className="mx-auto max-w-4xl space-y-5 px-3 py-6 md:px-6">
                {/* THẺ AUDIO ẨN */}
                {audioUrl && (
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onLoadedMetadata={(e) => {
                            setDuration(e.target.duration);
                            e.target.playbackRate = playbackRate;
                        }}
                        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                        onEnded={() => setIsPlaying(false)}
                    />
                )}

                {/* KHUNG AUDIO GỌN GÀNG */}
                <section className={`relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border p-4 shadow-sm backdrop-blur-sm transition-colors ${audioPanelClass}`}>
                    
                    {duration > 0 && (
                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-300 ease-linear" style={{ width: `${progress}%` }}></div>
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${readingTheme === 'dark' ? 'bg-slate-700' : 'bg-indigo-100'}`}>
                            <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold">Nghe truyện tự động</h3>
                            <p className="text-xs opacity-70">
                                {!audioUrl 
                                    ? "Đang tải Audio..." 
                                    : isPlaying 
                                        ? `Đang phát (${formatTime(currentTime)} / ${formatTime(duration)})` 
                                        : "Đã dừng"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="relative">
                            <select value={playbackRate} onChange={handleRateChange} disabled={!audioUrl} className={`appearance-none rounded-lg border py-2 pl-3 pr-8 text-sm font-medium outline-none cursor-pointer disabled:opacity-50 ${readingTheme === 'dark' ? 'border-slate-600 bg-slate-700 text-white' : 'border-indigo-200 bg-white text-indigo-700'}`}>
                                <option value={0.75}>0.75x</option>
                                <option value={1}>1.0x (Chuẩn)</option>
                                <option value={1.25}>1.25x</option>
                                <option value={1.5}>1.5x</option>
                            </select>
                        </div>

                        <button onClick={handleTogglePlay} disabled={!audioUrl} className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 ${readingTheme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>
                            {isPlaying ? (
                                <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                            ) : (
                                <svg className="h-5 w-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>

                        {isPlaying && (
                            <button onClick={handleStop} className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${readingTheme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`} title="Dừng hẳn">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                            </button>
                        )}
                    </div>
                </section>

                <article className={articleClass} style={{ fontFamily }}>
                    <header className="border-b border-gray-200 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">{book?.title || 'Truyen'}</p>
                        <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">Chương {chapter.chapter_number}: {chapter.title}</h1>
                    </header>
                    <div className="mt-6 text-[18px] leading-9 md:text-[20px] md:leading-10 [&>p]:indent-8 [&>p]:mb-6 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 text-justify" dangerouslySetInnerHTML={{ __html: chapter?.content || '<p class="text-sm text-gray-500 text-center">Nội dung rỗng.</p>' }} />
                </article>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Điều hướng</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => goToChapter(prevChapterNumber)} disabled={!prevChapterNumber} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">{'<- Chương trước'}</button>
                        <Link to={`/truyen/${book?.slug || book?._id}`} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Quay lại bìa</Link>
                        <button type="button" onClick={() => goToChapter(nextChapterNumber)} disabled={!nextChapterNumber} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">{'Chương sau ->'}</button>
                    </div>
                </section>

                {book?._id && <MockComments bookId={book._id} chapterId={chapter.chapter_number} title={`Bình luận chương ${chapter.chapter_number}`} placeholder="Đọc xong rồi thì để lại bình luận nhé..." />}
            </main>
        </div>
    );
};

export default ReadChapter;