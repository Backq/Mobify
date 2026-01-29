import { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, ChevronDown } from 'lucide-react';
import { searchAPI } from '../services/api';
import './Search.css';

const Search = ({ onTrackSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        setPage(1);

        try {
            const data = await searchAPI.search(query.trim(), 1);
            setResults(data.results || []);
            setHasMore(data.has_more);
        } catch (error) {
            console.error("Search failed", error);
            setResults([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        const nextPage = page + 1;

        try {
            const data = await searchAPI.search(query.trim(), nextPage);
            setResults(prev => [...prev, ...(data.results || [])]);
            setPage(nextPage);
            setHasMore(data.has_more);
        } catch (error) {
            console.error("Load more failed", error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="search-container">
            <header className="app-header">
                <h1 className="logo">Mobify</h1>
                <p className="tagline">Stream music, your way</p>
            </header>

            <form className="search-form" onSubmit={handleSearch}>
                <div className="search-wrapper">
                    <SearchIcon className="search-icon" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search for songs, artists..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <button type="submit" className="search-btn" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {isLoading && (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span className="loading-text">Searching for "{query}"...</span>
                </div>
            )}

            {!isLoading && !hasSearched && (
                <div className="empty-state">
                    <div className="empty-icon">🎵</div>
                    <h3 className="empty-title">Discover Music</h3>
                    <p className="empty-subtitle">Search for your favorite songs and artists</p>
                </div>
            )}

            {!isLoading && hasSearched && results.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3 className="empty-title">No results found</h3>
                    <p className="empty-subtitle">Try searching for something else</p>
                </div>
            )}

            {!isLoading && results.length > 0 && (
                <div className="results-container">
                    <h2 className="results-title">Results for "{query}"</h2>
                    <div className="results-grid">
                        {results.map((track) => (
                            <div
                                key={`${track.id}-${results.indexOf(track)}`}
                                className="track-card"
                                onClick={() => onTrackSelect(track, results)}
                            >
                                <div className="track-thumbnail">
                                    <img src={track.thumbnail} alt={track.title} />
                                    <div className="play-overlay">
                                        <Play size={24} fill="white" />
                                    </div>
                                </div>
                                <div className="track-info">
                                    <div className="track-title">{track.title}</div>
                                    <div className="track-artist">{track.uploader}</div>
                                </div>
                                <div className="track-duration">
                                    {formatDuration(track.duration)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            className="load-more-btn glass-panel"
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? (
                                <div className="btn-loader"></div>
                            ) : (
                                <>
                                    <span>Load More</span>
                                    <ChevronDown size={20} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Search;
