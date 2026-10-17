# Final Playwright network evidence (sensitive query values redacted)

- `GET /studio/news` and `GET /studio/news/a2o-lite-neon-melon-peak`: HTTP 200.
- `GET /api/news.json`: HTTP 200; 201 public records.
- `GET /api/news-content/en/a2o-lite-neon-melon-peak.json`: HTTP 200; article data and `thumbnailPosition` present.
- Article thumbnail and inline WebP assets: HTTP 200.
- Read-only Supabase view/comment GET requests: HTTP 200; request query values omitted.
- Two `POST /rest/v1/rpc/increment_kcl_news_view` attempts: intercepted and aborted before network transmission.
- Analytics and advertising requests were observed during browser rendering; request query values omitted.
