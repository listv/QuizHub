# QuizHub

Корпоративна система тестування знань.

## Стек

- **Backend:** ASP.NET Core 8, PostgreSQL 16, Entity Framework Core
- **Frontend:** Angular 18
- **Інфраструктура:** Docker, GitHub Actions CI/CD

---

## Гілки та середовища

| Гілка | Середовище | Порти |
|-------|-----------|-------|
| `staging` | Staging | UI: 4201, API: 5001, DB: 5433 |
| `main` | Production | UI: 4200, API: 5000, DB: 5432 |

Будь-який `push` в `staging` → автоматичний деплой на staging.
Будь-який `push` в `main` → автоматичний деплой на production.

---

## Перший запуск на VM

### 1. Налаштувати VM

```bash
bash setup-vm.sh
```

Скрипт встановить Docker, .NET SDK, EF tools, створить директорії і SSH ключ для GitHub Actions.

### 2. Налаштувати .env файли

```bash
# Production
cp .env.prod.example /opt/quizhub/QuizHub/.env
nano /opt/quizhub/QuizHub/.env

# Staging
cp .env.staging.example /opt/quizhub/QuizHub/.env.staging
nano /opt/quizhub/QuizHub/.env.staging
```

Обов'язково змінити `GITHUB_OWNER` на ваш GitHub username.

### 3. Додати GitHub Secrets

В репозиторії: **Settings → Secrets and variables → Actions**

| Secret | Значення |
|--------|---------|
| `VM_HOST` | IP вашої VM (напр. `172.30.0.68`) |
| `VM_USER` | SSH користувач (напр. `root`) |
| `VM_SSH_KEY` | Приватний SSH ключ (з `~/.ssh/github_actions`) |

### 4. Налаштувати GitHub Environments

В репозиторії: **Settings → Environments**

Створити два середовища: `staging` і `production`.
Для `production` рекомендується додати **Required reviewers** — деплой на прод вимагатиме підтвердження.

### 5. Перший деплой

```bash
git checkout -b staging
git push origin staging
```

GitHub Actions автоматично збере образи і задеплоїть на staging.

---

## Workflow деплою

```
feature-branch → staging → (тестування) → main → production
```

1. Розробляєте на `feature-branch`
2. Merge в `staging` → автодеплой на staging середовище
3. Тестуєте на staging
4. Merge в `main` → автодеплой на production (з backup БД)

---

## Локальна розробка

```bash
# Запуск API
dotnet run --urls "http://localhost:5000"

# Запуск Angular (в окремому терміналі)
cd client
npx ng serve --proxy-config proxy.conf.json
```

## Міграції БД

```bash
# Створити міграцію
dotnet ef migrations add MigrationName

# Застосувати (локально)
dotnet ef database update

# Застосувати (Docker)
dotnet ef database update --connection "Host=localhost;Port=5432;Database=quizhub;Username=postgres;Password=postgres"
```

---

## Команди Docker

```bash
# Production
docker compose -f docker-compose.prod.yml --env-file .env up -d

# Staging
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# Логи
docker compose -f docker-compose.prod.yml logs api --tail 50
docker compose -f docker-compose.staging.yml logs api-staging --tail 50

# Health check
curl http://localhost:5000/health   # prod
curl http://localhost:5001/health   # staging
```

---

## Імпорт питань

```bash
# Текстові питання (49)
docker cp import_all_questions.sql quizhub-db:/tmp/q.sql
docker exec quizhub-db psql -U postgres -d quizhub -f /tmp/q.sql

# Питання з картинками (12) — через API
cd quiz_images_import
bash run_import_with_images.sh   # або .bat на Windows
```

---

## Accounts (тільки dev/staging)

| Роль | Логін | Пароль |
|------|-------|--------|
| Admin | `admin` | `admin` |
| Manager | `manager` | `1234` |
| Employee | `olena` | `1234` |

> Демо-акаунти приховані на production автоматично.
