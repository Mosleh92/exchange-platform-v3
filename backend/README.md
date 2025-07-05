## Disaster Recovery: Backup & Restore

### بکاپ‌گیری دیتابیس MongoDB

برای بکاپ‌گیری دستی دیتابیس:

```bash
cd backend/scripts
./backup.sh [db_name]
```

فایل‌های بکاپ در پوشه `backend/backups/` با تاریخ و ساعت ذخیره می‌شوند.

### بازیابی دیتابیس

برای بازیابی بکاپ:

```bash
mongorestore --db [db_name] [backup_folder]/[db_name]
```

مثال:
```bash
mongorestore --db exchange_platform ../backups/2024-06-01_02-00-00/exchange_platform
```

> توصیه: بکاپ‌گیری منظم (مثلاً با cron) و تست دوره‌ای بازیابی برای اطمینان از سلامت داده‌ها انجام شود. 