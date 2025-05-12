FROM python:3.10-slim

WORKDIR /help_desk

COPY pyproject.toml poetry.lock ./

RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --only main --no-root

COPY . .

WORKDIR /help_desk/helpdesk

RUN chmod +x /help_desk/entrypoint.sh && \
        chmod +x /help_desk/helpdesk/testapp/management/commands/create_superuser_if_not_exists.py


ENV PYTHONFAULTHANDLER=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["sh", "/help_desk/entrypoint.sh"]

