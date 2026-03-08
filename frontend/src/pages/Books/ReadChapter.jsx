import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axiosConfig';
import ReadingHeader from '../../components/ReadingHeader';
import MockComments from '../../components/MockComments';

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

    const currentChapterNumber = useMemo(
        () => parseChapterNumber(chapterNumber),
        [chapterNumber]
    );

    useEffect(() => {
        try {
            const raw = localStorage.getItem(READING_SETTINGS_KEY);
            if (!raw) return;

            const settings = JSON.parse(raw);
            if (settings?.readingTheme === 'light' || settings?.readingTheme === 'dark') {
                setReadingTheme(settings.readingTheme);
            }
            if (typeof settings?.fontFamily === 'string' && settings.fontFamily.trim()) {
                setFontFamily(settings.fontFamily);
            }
        } catch (error) {
            console.error('Loi parse reading settings:', error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(
            READING_SETTINGS_KEY,
            JSON.stringify({ readingTheme, fontFamily })
        );
    }, [readingTheme, fontFamily]);

    const fetchBook = useCallback(async () => {
        const response = await api.get(`/books/${bookId}`);
        return response?.book || null;
    }, [bookId]);

    const fetchAllChapters = useCallback(async () => {
        let page = 1;
        let totalPages = 1;
        const output = [];

        do {
            const response = await api.get(`/chapters/story/${bookId}`, {
                params: {
                    page,
                    limit: CHAPTER_FETCH_BATCH
                }
            });

            output.push(...normalizeChapterList(response));
            totalPages = Number(response?.totalPages) || 1;
            page += 1;
        } while (page <= totalPages);

        return output.sort((a, b) => (a?.chapter_number || 0) - (b?.chapter_number || 0));
    }, [bookId]);

    const fetchChapter = useCallback(
        async (targetChapterNumber) => {
            const response = await api.get(
                `/chapters/story/${bookId}/chapter/${targetChapterNumber}`
            );
            return response?.data || null;
        },
        [bookId]
    );

    useEffect(() => {
        const loadReadingData = async () => {
            setLoading(true);
            setErrorMessage('');

            try {
                const [bookData, chapterData, chapterListData] = await Promise.all([
                    fetchBook(),
                    fetchChapter(currentChapterNumber),
                    fetchAllChapters()
                ]);

                setBook(bookData);
                setChapter(chapterData);
                setChapterList(chapterListData);
            } catch (error) {
                console.error('Loi load trang doc:', error);
                setErrorMessage('Khong the tai trang doc cho chuong nay.');
                setChapter(null);
                setChapterList([]);
            } finally {
                setLoading(false);
            }
        };

        loadReadingData();
    }, [currentChapterNumber, fetchBook, fetchChapter, fetchAllChapters]);

    const chapterOptions = useMemo(
        () =>
            chapterList.map((item) => ({
                value: item.chapter_number,
                label: `Chuong ${item.chapter_number}`
            })),
        [chapterList]
    );

    const currentIndex = useMemo(
        () => chapterList.findIndex((item) => item.chapter_number === currentChapterNumber),
        [chapterList, currentChapterNumber]
    );

    const prevChapterNumber =
        currentIndex > 0 ? chapterList[currentIndex - 1]?.chapter_number : null;
    const nextChapterNumber =
        currentIndex >= 0 && currentIndex < chapterList.length - 1
            ? chapterList[currentIndex + 1]?.chapter_number
            : null;

    const goToChapter = (targetChapterNumber) => {
        if (!targetChapterNumber) return;
        navigate(`/truyen/${bookId}/chuong/${targetChapterNumber}`);
    };

    const paragraphs = useMemo(() => {
        const rawContent = chapter?.content || '';
        return rawContent
            .split(/\n{2,}/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }, [chapter?.content]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <ReadingHeader
                    chapterOptions={chapterOptions}
                    currentChapter={currentChapterNumber}
                    canPrev={false}
                    canNext={false}
                />
                <div className="mx-auto max-w-4xl p-6 text-sm text-gray-600">Dang tai chuong...</div>
            </div>
        );
    }

    if (!chapter) {
        return (
            <div className="min-h-screen bg-gray-50">
                <ReadingHeader
                    chapterOptions={chapterOptions}
                    currentChapter={currentChapterNumber}
                    canPrev={Boolean(prevChapterNumber)}
                    canNext={Boolean(nextChapterNumber)}
                    onGoPrev={() => goToChapter(prevChapterNumber)}
                    onGoNext={() => goToChapter(nextChapterNumber)}
                    onChangeChapter={goToChapter}
                />
                <div className="mx-auto max-w-4xl p-6">
                    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                        {errorMessage || 'Chuong khong ton tai.'}
                    </div>
                </div>
            </div>
        );
    }

    const wrapperClass =
        readingTheme === 'dark'
            ? 'min-h-screen bg-slate-900 text-slate-100'
            : 'min-h-screen bg-[#f8f6ee] text-gray-900';
    const articleClass =
        readingTheme === 'dark'
            ? 'rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow-sm md:p-8'
            : 'rounded-2xl border border-[#e5decf] bg-[#fffdf8] p-5 shadow-sm md:p-8';

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
                <article className={articleClass} style={{ fontFamily }}>
                    <header className="border-b border-gray-200 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                            {book?.title || 'Truyen'}
                        </p>
                        <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">
                            Chuong {chapter.chapter_number}: {chapter.title}
                        </h1>
                    </header>

                    <div className="mt-6 text-[18px] leading-9 md:text-[20px] md:leading-10">
                        {paragraphs.length === 0 ? (
                            <p className="text-sm text-gray-500">Noi dung chuong dang rong.</p>
                        ) : (
                            paragraphs.map((paragraph, index) => (
                                <p key={`${chapter._id || chapter.chapter_number}-p-${index}`} className="mb-6 indent-8">
                                    {paragraph.split('\n').map((line, lineIndex, arr) => (
                                        <span key={`${line}-${lineIndex}`}>
                                            {line}
                                            {lineIndex < arr.length - 1 ? <br /> : null}
                                        </span>
                                    ))}
                                </p>
                            ))
                        )}
                    </div>
                </article>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                        Dieu huong cuoi chuong
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => goToChapter(prevChapterNumber)}
                            disabled={!prevChapterNumber}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {'<- Chuong truoc'}
                        </button>

                        <Link
                            to={`/truyen/${bookId}`}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                            Ve trang chi tiet truyen
                        </Link>

                        <button
                            type="button"
                            onClick={() => goToChapter(nextChapterNumber)}
                            disabled={!nextChapterNumber}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {'Chuong sau ->'}
                        </button>
                    </div>
                </section>

                <MockComments
                    storageKey={`mock_comments_book_${bookId}_chapter_${chapter.chapter_number}`}
                    title="Binh luan chuong (frontend tam)"
                    placeholder="Doc xong roi thi de lai binh luan..."
                />
            </main>
        </div>
    );
};

export default ReadChapter;
