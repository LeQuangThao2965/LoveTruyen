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
                console.error('Lỗi load trang:', error);
                setErrorMessage('Không thể tải trang đọc chương này.');
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
                label: `Chương ${item.chapter_number}`
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
        navigate(`/truyen/${book.slug || book._id}/chuong/${targetChapterNumber}`);
    };

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
                        {errorMessage || 'Chương không tồn tại.'}
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
                            Chương {chapter.chapter_number}: {chapter.title}
                        </h1>
                    </header>

                    {/* SỬ DỤNG dangerouslySetInnerHTML ĐỂ RENDER HTML CHUẨN */}
                    <div 
                        className="mt-6 text-[18px] leading-9 md:text-[20px] md:leading-10 [&>p]:indent-8 [&>p]:mb-6 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 text-justify"
                        dangerouslySetInnerHTML={{ 
                            __html: chapter?.content || '<p class="text-sm text-gray-500 text-center">Nội dung chương đang rỗng.</p>' 
                        }}
                    />
                    
                </article>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                        Điều hướng
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => goToChapter(prevChapterNumber)}
                            disabled={!prevChapterNumber}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {'<- Chương trước'}
                        </button>

                        <Link
                            to={`/truyen/${book.slug || book._id}`}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                            Quay lại bìa
                        </Link>

                        <button
                            type="button"
                            onClick={() => goToChapter(nextChapterNumber)}
                            disabled={!nextChapterNumber}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {'Chương sau ->'}
                        </button>
                    </div>
                </section>


                {/* ĐÃ SỬA: Bọc điều kiện book._id để chống lỗi 500 */}
                {book?._id && (
                    <MockComments
                        bookId={book._id}
                        chapterId={chapter.chapter_number}
                        title={`Bình luận chương ${chapter.chapter_number}`}
                        placeholder="Đọc xong rồi thì để lại bình luận nhé..."
                    />
                )}
            </main>
        </div>
    );
};

export default ReadChapter;
