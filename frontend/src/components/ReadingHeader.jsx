import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const FONT_OPTIONS = [
    { value: 'serif', label: 'Serif mac dinh' },
    { value: '"Georgia", serif', label: 'Georgia' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet' },
    { value: '"Verdana", sans-serif', label: 'Verdana' }
];

const ReadingHeader = ({
    chapterOptions = [],
    currentChapter = 1,
    canPrev = false,
    canNext = false,
    onGoPrev,
    onGoNext,
    onChangeChapter,
    readingTheme = 'light',
    onChangeTheme,
    fontFamily = 'serif',
    onChangeFontFamily
}) => {
    const [isHidden, setIsHidden] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const menuRef = useRef(null);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        const syncUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data?.user || null);
        };

        syncUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => authListener?.subscription?.unsubscribe?.();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollYRef.current;

            if (currentY < 40) {
                setIsHidden(false);
                lastScrollYRef.current = currentY;
                return;
            }

            if (delta > 8) {
                setIsHidden(true);
            } else if (delta < -8) {
                setIsHidden(false);
            }

            lastScrollYRef.current = currentY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const avatarUrl = useMemo(() => {
        if (!user) return '';

        return (
            user?.user_metadata?.avatar_url
            || `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.user_metadata?.full_name || user?.email || 'User'
            )}&background=random&color=fff`
        );
    }, [user]);

    return (
        <header
            className={`sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur transition-transform duration-300 ${
                isHidden ? '-translate-y-full' : 'translate-y-0'
            }`}
        >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 md:px-6">
                <Link
                    to="/"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-extrabold tracking-wide text-white transition hover:bg-indigo-700"
                >
                    LT
                </Link>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                    <button
                        type="button"
                        disabled={!canPrev}
                        onClick={onGoPrev}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {'<-'}
                    </button>

                    <select
                        value={String(currentChapter)}
                        onChange={(event) => onChangeChapter?.(Number(event.target.value))}
                        className="min-w-[160px] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                        {chapterOptions.map((chapter) => (
                            <option key={chapter.value} value={chapter.value}>
                                {chapter.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        disabled={!canNext}
                        onClick={onGoNext}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {'->'}
                    </button>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-xs font-bold text-gray-600">U</span>
                        )}
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tai khoan</p>
                                <p className="mt-1 truncate text-sm font-semibold text-gray-800">
                                    {user?.user_metadata?.full_name || user?.email || 'Khach'}
                                </p>
                            </div>

                            <div className="space-y-1 px-3 py-3">
                                <button
                                    type="button"
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                    Tu truyen / Yeu thich
                                </button>

                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                        Cai dat doc
                                    </p>

                                    <div className="mt-2 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onChangeTheme?.('light')}
                                            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                                                readingTheme === 'light'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Nen sang
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onChangeTheme?.('dark')}
                                            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                                                readingTheme === 'dark'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Nen toi
                                        </button>
                                    </div>

                                    <label className="mt-3 block text-xs font-semibold text-gray-600">
                                        Font chu
                                    </label>
                                    <select
                                        value={fontFamily}
                                        onChange={(event) => onChangeFontFamily?.(event.target.value)}
                                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    >
                                        {FONT_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default ReadingHeader;
