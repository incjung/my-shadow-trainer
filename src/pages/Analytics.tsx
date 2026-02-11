import { useMemo } from 'react';
import { useHistory } from '../hooks/useHistory';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';

const Analytics = () => {
    const { history } = useHistory();

    const stats = useMemo(() => {
        if (history.length === 0) return null;

        const totalSessions = history.length;
        // Total bookmarks calculation removed as per request
        const totalBookmarks = history.reduce((acc, curr) => acc + curr.count, 0); // Kept for average calculation

        // Calculate Average Bookmarks per Audio (Total Bookmarks / Total Sessions)
        const avgBookmarksPerAudio = totalSessions > 0 ? (totalBookmarks / totalSessions).toFixed(1) : 0;

        // Prepare data for Line Chart (Bookmarks per Audio Trend)
        const trendData = history
            .slice()
            .reverse() // Oldest first
            .map((record, index) => ({
                index: index + 1,
                date: record.date.split(' ')[0], // YYYY-MM-DD
                count: record.count,
                fileName: record.fileName
            }));

        // Prepare data for Bar Chart (Sessions per Day)
        const sessionsPerDay = history.reduce((acc, curr) => {
            const date = curr.date.split(' ')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const consistencyData = Object.entries(sessionsPerDay)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .slice(-7) // Last 7 days with activity
            .map(([date, count]) => ({ date, count }));

        return { totalSessions, avgBookmarksPerAudio, trendData, consistencyData };
    }, [history]);

    if (!stats) {
        return (
            <div className="analytics-container">
                <h2>📊 Statistics & Trends</h2>
                <p className="empty-state">Not enough data to generate analytics. Start your first session!</p>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            <h2>📊 Statistics & Trends</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Sessions</h3>
                    <p className="stat-value">{stats.totalSessions}</p>
                </div>
                {/* Total Bookmarks card removed */}
                <div className="stat-card">
                    <h3>Avg Bookmarks per Audio</h3>
                    <p className="stat-value">{stats.avgBookmarksPerAudio}</p>
                    <span className="stat-hint">Lower is better</span>
                </div>
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>📉 Difficulty Trend (Bookmarks per File)</h3>
                    <p className="chart-subtitle">Are you understanding more? (Fewer bookmarks = Better)</p>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats.trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="index" label={{ value: 'Session #', position: 'insideBottomRight', offset: -5 }} />
                                <YAxis label={{ value: 'Bookmarks', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    formatter={(value: number) => [`${value} bookmarks`, 'Difficulty']}
                                    labelFormatter={(idx) => `Session #${idx}`}
                                />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>📅 Training Consistency</h3>
                    <p className="chart-subtitle">Sessions per day (Last 7 active days)</p>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.consistencyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
