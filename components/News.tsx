
import React from 'react';
import { NewsArticle } from '../types';

interface NewsProps {
    news: NewsArticle[];
}

const News: React.FC<NewsProps> = ({ news }) => (
    <div className="p-4 h-[calc(100vh-90px)] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center mb-4">League News</h2>
        <div className="space-y-4">
            {news.map(article => (
                <div key={article.id} className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md border-l-4 border-teal-500">
                    <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-lg text-teal-600 dark:text-teal-400 leading-tight">{article.headline}</h3>
                         <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 whitespace-nowrap ml-2">{article.date}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{__html: article.content}}></p>
                </div>
            ))}
            {news.length === 0 && <p className="text-center text-gray-500">No news yet.</p>}
        </div>
    </div>
);

export default News;
