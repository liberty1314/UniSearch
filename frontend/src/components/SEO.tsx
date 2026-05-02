import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = 'UniSearch | 智能网盘资源搜索引擎',
  description = '专业的网盘资源搜索平台，聚合多种主流网盘链接类型，为您提供高效便捷的搜索体验。',
  keywords = '网盘搜索, 资源搜索, 云盘搜索引擎, UniSearch, 聚合搜索',
  image = '/og-image.png',
  url = 'https://unisearch.example.com',
}) => {
  return (
    <Helmet>
      {/* 基础 Meta 标签 */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
