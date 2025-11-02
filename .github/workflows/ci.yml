# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        # あなたのローカルに合わせて 18
        image: postgres:18
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sharing_place_app_test
        ports:
          - "5432:5432"
        options: >-
          --health-cmd "pg_isready -U postgres -d sharing_place_app_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      RAILS_ENV: test
      # backend/config/database.yml の test: に合わせる
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/sharing_place_app_test
      # devise-jwt が初期化で見るのでダミーを入れておく
      DEVISE_JWT_SECRET_KEY: dummy_jwt_secret_for_ci
      # Rails が起動時に要求するのでダミーでOK
      SECRET_KEY_BASE: dummy_secret_key_base

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.3.4"

      # backend/ の Gemfile を見ることを明示
      - name: Install gems
        working-directory: backend
        run: bundle install --jobs 4 --retry 3

      # structure.sql を読ませると落ちるので、テストDBを作り直して schema.rb を読む
      - name: Prepare database
        working-directory: backend
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/sharing_place_app_test
        run: |
          bin/rails db:drop db:create
          bin/rails db:schema:load --trace

      - name: Run tests
        working-directory: backend
        run: bundle exec rails test

  frontend:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          # Actions で安定してるので 20
          node-version: "20"

      - name: Install deps
        working-directory: frontend
        run: npm ci

      - name: Lint
        working-directory: frontend
        run: npm run lint

      - name: Build
        working-directory: frontend
        run: npm run build
